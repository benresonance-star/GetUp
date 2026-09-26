const defaultSettings={startDate:getMondayISO(new Date()),bodyweight:0,height:0,age:0,sex:'',steps:7000,maintenanceOverride:0};
const storedSettings=JSON.parse(localStorage.getItem('motion12.settings')||'null')||{};
let settings={...defaultSettings,...storedSettings};
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
function round5(n){return Math.round(n/5)*5}
function round50(n){return Math.round(n/50)*50}
function proteinSplit(){
  const p=protein(); if(!p)return null;
  const breakfast=round5(p*.25);
  const shake=round5(Math.min(35,Math.max(25,p*.20)));
  const lunch=round5((p-breakfast-shake)/2);
  const dinner=Math.max(0,p-breakfast-shake-lunch);
  return {breakfast,lunch,dinner,shake,total:p};
}
function fatLossTargets(){if(!settings.bodyweight)return null;return {low:(settings.bodyweight*.005).toFixed(2),high:(settings.bodyweight*.008).toFixed(2),mid:settings.bodyweight*.0065,cap:(settings.bodyweight*.01).toFixed(2)}}
function activityFactor(){
  const st=Number(settings.steps)||0;
  if(st<4000)return 1.35;
  if(st<7000)return 1.45;
  if(st<10000)return 1.55;
  return 1.65;
}
function maintenanceEstimate(){
  if(Number(settings.maintenanceOverride)>0)return {kcal:round50(Number(settings.maintenanceOverride)),basis:'manual maintenance'};
  const w=Number(settings.bodyweight),h=Number(settings.height),a=Number(settings.age),sex=settings.sex;
  if(w>0&&h>0&&a>0&&(sex==='male'||sex==='female')){
    const rmr=10*w+6.25*h-5*a+(sex==='male'?5:-161);
    return {kcal:round50(rmr*activityFactor()),basis:'Mifflin–St Jeor estimate'};
  }
  if(w>0)return {kcal:round50(w*30),basis:'rough bodyweight estimate'};
  return null;
}
function calorieTargets(){
  const m=maintenanceEstimate(),f=fatLossTargets();
  if(!m||!f)return null;
  const weeklyMaintenance=m.kcal*7;
  const weeklyDeficit=f.mid*7700;
  const eatingDay=round50(Math.max(1200,(weeklyMaintenance-weeklyDeficit)/6));
  return {maintenance:m.kcal,basis:m.basis,eatingDay,fastDay:0,weeklyDeficit:Math.round(weeklyDeficit)};
}
function mealPlan(day){
  const c=calorieTargets(),ps=proteinSplit();
  if(!c||!ps)return null;
  if(day===1)return {total:0,meals:[],note:'Fast after the morning workout. Water, plain tea/coffee; resume meals Tuesday.'};
  const total=c.eatingDay;
  const breakfast=round50(total*.25);
  const lunch=round50(total*.30);
  const dinner=round50(total*.30);
  const shake=total-breakfast-lunch-dinner;
  return {total,meals:[
    {name:'Breakfast',kcal:breakfast,protein:ps.breakfast,portion:'~2 cupped hands high-protein Greek yoghurt · 1 fist berries · 1 thumb nuts'},
    {name:'Lunch',kcal:lunch,protein:ps.lunch,portion:'1½–2 palms lean meat/fish · 1 cupped hand cooked rice · 2 fists vegetables · 1 thumb fat'},
    {name:'Dinner',kcal:dinner,protein:ps.dinner,portion:'1½–2 palms lean meat/fish · 1 cupped hand cooked rice · 2 fists vegetables · 1 thumb fat'},
    {name:'Protein shake',kcal:shake,protein:ps.shake,portion:'1 scoop protein. Use water if calories are tight; milk/fruit only if needed to fill the day’s budget.'}
  ],note:'Keep protein portions stable. Adjust rice/fats first if calories need moving.'};
}
function nutritionSummary(day=programDay()){
  const p=protein(),f=fatLossTargets(),c=calorieTargets(),m=mealPlan(day);
  if(!p||!f)return 'Add bodyweight to calculate protein and weekly fat-loss targets.';
  if(!c)return 'Protein ~'+p+' g/day · target loss '+f.low+'–'+f.high+' kg/week. Add height, age and sex for a better calorie estimate.';
  if(day===1)return 'Monday fast · estimated maintenance ~'+c.maintenance+' kcal · weekly target loss '+f.low+'–'+f.high+' kg.';
  return '~'+m.total+' kcal today · protein ~'+p+' g · target loss '+f.low+'–'+f.high+' kg/week · estimate basis: '+c.basis+'.';
}
function dietText(day){
  const p=protein(),ps=proteinSplit(),c=calorieTargets();
  if(day===1)return ['FAST DAY','Morning workout → fast',c?'0 kcal after the workout today; eating-day target resumes Tuesday at ~'+c.eatingDay+' kcal.':'Water, plain tea/coffee. Add bodyweight for targets.'];
  if(day===2)return ['REFEED',c?'~'+c.eatingDay+' kcal today':'Break fast after recovery',p?'3 whole-food meals + shake · ~'+p+' g protein total.':'Protein-rich first meal.'];
  return p?[c?'~'+c.eatingDay+' KCAL':'~'+p+' G PROTEIN','3 whole-food meals + protein shake',ps?'Protein: ~'+ps.breakfast+' g breakfast · '+ps.lunch+' g lunch · '+ps.dinner+' g dinner · '+ps.shake+' g shake.':'Protein + plants.']:['SET WEIGHT','3 meals + shake','Add bodyweight in settings to calculate targets.'];
}
function formatDate(){return new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short'}).format(new Date())}
function weeklyTarget(day,w){if(day===4)return swingTargets[w-1];if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
function completedOn(date,day){return !!logs[`${date}-${day}`]?.completed}
