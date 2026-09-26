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
function dietText(day){if(day===1)return ['FAST DAY','Train → begin fast','Water, plain tea/coffee. Keep hydration normal.'];if(day===2)return ['REFEED','Break fast after recovery','Protein-rich first meal. Eat normally; don’t compensate.'];return protein()?[`~${protein()} G PROTEIN`,'Protein + plants','Three simple meals; vegetables at lunch and dinner.']:[`SET WEIGHT`,'Protein + plants','Add bodyweight in settings to calculate a ~1.8 g/kg protein target.'];}
function formatDate(){return new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short'}).format(new Date())}
function weeklyTarget(day,w){if(day===4)return swingTargets[w-1];if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
function completedOn(date,day){return !!logs[`${date}-${day}`]?.completed}
