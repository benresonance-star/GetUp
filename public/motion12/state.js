const defaultSettings={startDate:getMondayISO(new Date()),bodyweight:0,steps:7000};
let settings=JSON.parse(localStorage.getItem('motion12.settings')||'null')||defaultSettings;
let logs=JSON.parse(localStorage.getItem('motion12.logs')||'{}');
let measurements=JSON.parse(localStorage.getItem('motion12.measurements')||'{}');
let timerInt=null,timerSeconds=0,timerRunning=false;
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function getMondayISO(d){const x=new Date(d);const day=x.getDay()||7;x.setDate(x.getDate()-day+1);return iso(x)}
function todayISO(){const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function weekNo(){const s=new Date(settings.startDate+'T00:00:00');const t=new Date(todayISO()+'T00:00:00');return Math.max(1,Math.min(12,Math.floor((t-s)/604800000)+1))}
function programDay(){return new Date().getDay()}
function sessionKey(day=programDay()){return `${todayISO()}-${day}`}
function protein(){return settings.bodyweight>0?Math.round(settings.bodyweight*1.8):null}
function proteinPerMeal(){return protein()?Math.round(protein()/3):null}
function fatLossTargets(){if(!settings.bodyweight)return null;return {low:(settings.bodyweight*.005).toFixed(2),high:(settings.bodyweight*.008).toFixed(2),cap:(settings.bodyweight*.01).toFixed(2)}}
function nutritionSummary(){const p=protein(),pm=proteinPerMeal(),f=fatLossTargets();if(!p||!f)return 'Add bodyweight to calculate protein and weekly fat-loss targets.';return `Protein ~${p} g/day · ~${pm} g/meal across 3 meals · target loss ${f.low}–${f.high} kg/week · 1% guardrail ${f.cap} kg/week.`}
function dietText(day){const p=protein(),pm=proteinPerMeal();if(day===1)return ['FAST DAY','Train → begin fast',p?`Water, plain tea/coffee. Tomorrow resume ~${p} g protein/day (~${pm} g across 3 meals).`:'Water, plain tea/coffee. Add bodyweight to calculate your refeed protein target.'];if(day===2)return ['REFEED',p?`Break fast after recovery · ~${p} g protein today`:'Break fast after recovery',p?`Aim ~${pm} g protein at each of 3 meals; eat normally rather than compensating.`:'Protein-rich first meal. Eat normally; don’t compensate.'];return p?[`~${p} G PROTEIN`,`~${pm} g protein × 3 meals`,'Protein + plants at each meal; vegetables at lunch and dinner.']:[`SET WEIGHT`,'Protein + plants','Add bodyweight in settings to calculate a ~1.8 g/kg protein target.'];}
function formatDate(){return new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short'}).format(new Date())}
function weeklyTarget(day,w){if(day===4)return swingTargets[w-1];if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
function completedOn(date,day){return !!logs[`${date}-${day}`]?.completed}
