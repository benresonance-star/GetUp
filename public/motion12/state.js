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
function beverageMacros(){
  return {
    latte:{kcal:135,protein:7,carbs:11,fat:7,milkMl:200},
    shake:{kcal:280,protein:32,carbs:15,fat:11,milkMl:250}
  };
}
function proteinSplit(){
  const p=protein(); if(!p)return null;
  const bev=beverageMacros();
  const beverageProtein=bev.shake.protein+bev.latte.protein*2;
  const mealProtein=Math.max(0,p-beverageProtein);
  const breakfast=round5(mealProtein*.32);
  const lunch=round5((mealProtein-breakfast)/2);
  const dinner=Math.max(0,mealProtein-breakfast-lunch);
  return {
    breakfast,lunch,dinner,
    shake:bev.shake.protein,
    latte1:bev.latte.protein,
    latte2:bev.latte.protein,
    total:p
  };
}
function weeklyProteinAverage(){const p=protein();return p?Math.round((p*6)/7):null}
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
  const m=maintenanceEstimate(),f=fatLossTargets(),w=Number(settings.bodyweight);
  if(!m||!f||!w)return null;
  const weeklyMaintenance=m.kcal*7;
  const targetWeeklyDeficit=f.mid*7700;
  const rawEatingDay=(weeklyMaintenance-targetWeeklyDeficit)/6;
  const eatingDay=round50(Math.max(1200,rawEatingDay));
  const weeklyIntake=eatingDay*6;
  const actualWeeklyDeficit=weeklyMaintenance-weeklyIntake;
  const predictedLoss=Math.max(0,actualWeeklyDeficit/7700);
  const predictedPct=(predictedLoss/w)*100;
  return {
    maintenance:m.kcal,basis:m.basis,eatingDay,fastDay:0,
    targetWeeklyDeficit:Math.round(targetWeeklyDeficit),
    actualWeeklyDeficit:Math.round(actualWeeklyDeficit),
    weeklyIntake,
    predictedLoss:Number(predictedLoss.toFixed(2)),
    predictedPct:Number(predictedPct.toFixed(2)),
    constrained:rawEatingDay<1200
  };
}
function mealPlan(day){
  const c=calorieTargets(),ps=proteinSplit(),bev=beverageMacros();
  if(!c||!ps)return null;
  if(day===1)return {total:0,meals:[],note:'Fast after the morning workout. Water, plain tea/coffee; resume meals Tuesday.'};

  const total=c.eatingDay;
  const latte1=bev.latte.kcal;
  const latte2=bev.latte.kcal;
  const shake=bev.shake.kcal;
  const beverageCalories=latte1+latte2+shake;
  const foodCalories=Math.max(0,total-beverageCalories);

  const breakfast=round50(foodCalories*.29);
  const lunch=round50((foodCalories-breakfast)/2);
  const dinner=foodCalories-breakfast-lunch;

  const targetFat=round5((total*.30)/9);
  const beverageFat=bev.shake.fat+bev.latte.fat*2;
  const mealFat=Math.max(0,targetFat-beverageFat);
  const breakfastFat=round5(mealFat*.30);
  const lunchFat=round5((mealFat-breakfastFat)/2);
  const dinnerFat=Math.max(0,mealFat-breakfastFat-lunchFat);

  const macro=(kcal,protein,fat)=>({
    protein,
    fat,
    carbs:Math.max(0,Math.round((kcal-protein*4-fat*9)/4))
  });

  const b=macro(breakfast,ps.breakfast,breakfastFat);
  const l=macro(lunch,ps.lunch,lunchFat);
  const d=macro(dinner,ps.dinner,dinnerFat);
  const sh={protein:bev.shake.protein,carbs:bev.shake.carbs,fat:bev.shake.fat};
  const la={protein:bev.latte.protein,carbs:bev.latte.carbs,fat:bev.latte.fat};

  const macroTotals={
    protein:b.protein+l.protein+d.protein+sh.protein+la.protein*2,
    carbs:b.carbs+l.carbs+d.carbs+sh.carbs+la.carbs*2,
    fat:b.fat+l.fat+d.fat+sh.fat+la.fat*2
  };

  return {total,macroTotals,meals:[
    {name:'Breakfast',kcal:breakfast,...b,portion:'High-protein Greek yoghurt · 1 fist berries · 1–2 thumbs nuts. Adjust yoghurt/nuts to hit the meal calories.'},
    {name:'Latte 1',kcal:latte1,...la,portion:'Espresso + ~200 ml full-cream milk. No added sugar.'},
    {name:'Lunch',kcal:lunch,...l,portion:'1½–2 palms lean meat/fish · 1 cupped hand cooked rice · 2 fists vegetables · 1 thumb fat'},
    {name:'Latte 2',kcal:latte2,...la,portion:'Espresso + ~200 ml full-cream milk. No added sugar.'},
    {name:'Dinner',kcal:dinner,...d,portion:'1½–2 palms lean meat/fish · 1 cupped hand cooked rice · 2 fists vegetables · 1 thumb fat'},
    {name:'Protein shake',kcal:shake,...sh,portion:'1 scoop protein powder + ~250 ml full-cream milk. No extra fruit unless calories are borrowed from a meal.'}
  ],note:'Milk calories are already included. Keep protein stable; adjust rice and added fats first when calories need moving.'};
}
function nutritionSummary(day=programDay()){
  const p=protein(),f=fatLossTargets(),c=calorieTargets(),m=mealPlan(day);
  if(!p||!f)return 'Add bodyweight to calculate protein and weekly fat-loss targets.';
  if(!c)return 'Protein ~'+p+' g/day · target loss '+f.low+'–'+f.high+' kg/week. Add height, age and sex for a better calorie estimate.';
  if(day===1)return 'Monday fast · 0 kcal assumption · estimated maintenance ~'+c.maintenance+' kcal · planned loss ~'+c.predictedLoss+' kg/week.';
  return '~'+m.total+' kcal today · protein ~'+p+' g · planned loss ~'+c.predictedLoss+' kg/week ('+c.predictedPct+'% bodyweight) · target range '+f.low+'–'+f.high+' kg/week.';
}
function dietText(day){
  const p=protein(),ps=proteinSplit(),c=calorieTargets();
  if(day===1)return ['FAST DAY','Morning workout → fast',c?'0 kcal after the workout today; eating-day target resumes Tuesday at ~'+c.eatingDay+' kcal.':'Water, plain tea/coffee. Add bodyweight for targets.'];
  if(day===2)return ['REFEED',c?'~'+c.eatingDay+' kcal today':'Break fast after recovery',p?'3 whole-food meals + 2 full-cream lattes + milk-based protein shake · ~'+p+' g protein total.':'Protein-rich first meal.'];
  return p?[c?'~'+c.eatingDay+' KCAL':'~'+p+' G PROTEIN','3 meals + 2 lattes + protein shake',ps?'Protein: ~'+ps.breakfast+' g breakfast · '+ps.lunch+' g lunch · '+ps.dinner+' g dinner · '+ps.shake+' g shake · '+ps.latte1+' g each latte.':'Protein + plants.']:['SET WEIGHT','3 meals + shake','Add bodyweight in settings to calculate targets.'];
}
function formatDate(){const d=new Date();const weekday=new Intl.DateTimeFormat('en-AU',{weekday:'long'}).format(d).toUpperCase();const rest=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short'}).format(d).toUpperCase();return weekday+' · '+rest}
function weeklyTarget(day,w){if(day===4)return swingTargets[w-1];if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
function completedOn(date,day){return !!logs[`${date}-${day}`]?.completed}
