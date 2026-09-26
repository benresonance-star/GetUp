const previousDefaultPortionsV1={yogurt:250,berries:200,nuts:25,latteMilk:200,meat:90,lunchRice:275,dinnerRice:275,veg:225,oil:10,powder:30,shakeMilk:250};
const previousDefaultPortionsV2={yogurt:250,berries:200,nuts:25,latteMilk:200,meat:94,lunchRice:180,dinnerRice:180,veg:225,oil:10,powder:30,shakeMilk:250};
const defaultPortions={yogurt:250,berries:200,nuts:20,seeds:10,latteMilk:200,meat:66,lunchRice:90,dinnerRice:90,legumes:120,veg:225,oil:11.5,powder:30,shakeMilk:250};
const defaultSettings={startDate:getMondayISO(new Date()),bodyweight:0,height:0,age:0,sex:'',steps:7000,maintenanceOverride:0,homeMode:'full',portionPresetVersion:4,lunchProtein:'chicken',dinnerProtein:'chicken',portions:defaultPortions};
const storedSettings=JSON.parse(localStorage.getItem('motion12.settings')||'null')||{};
const storedPortions=storedSettings.portions||{};
function matchesPortionPreset(preset){return Object.keys(preset).every(k=>Number(storedPortions[k])===preset[k])}
const shouldUpgradePortions=matchesPortionPreset(previousDefaultPortionsV1)||matchesPortionPreset(previousDefaultPortionsV2);
let settings={...defaultSettings,...storedSettings,portionPresetVersion:4,lunchProtein:storedSettings.lunchProtein||'chicken',dinnerProtein:storedSettings.dinnerProtein||'chicken',portions:shouldUpgradePortions?{...defaultPortions}:{...defaultPortions,...storedPortions}};
let logs=JSON.parse(localStorage.getItem('motion12.logs')||'{}');
let measurements=JSON.parse(localStorage.getItem('motion12.measurements')||'{}');
let timerInt=null;
const defaultSmartTimer={
  mode:'session',
  running:false,
  kind:'',
  remaining:90,
  duration:90,
  endAt:0,
  phaseIndex:0,
  setIndex:0,
  stopwatchElapsed:0,
  stopwatchStartedAt:0,
  exerciseName:'',
  exerciseCategory:'',
  dayKey:''
};
let smartTimer={...defaultSmartTimer,...(JSON.parse(localStorage.getItem('motion12.timer')||'null')||{})};
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function getMondayISO(d){const x=new Date(d);const day=x.getDay()||7;x.setDate(x.getDate()-day+1);return iso(x)}
function todayISO(){const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function weekNo(){const s=new Date(settings.startDate+'T00:00:00');const t=new Date(todayISO()+'T00:00:00');return Math.max(1,Math.min(12,Math.floor((t-s)/604800000)+1))}
function programDay(){return new Date().getDay()}
function sessionKey(day=programDay()){return `${todayISO()}-${day}`}
function protein(){return settings.bodyweight>0?Math.round(settings.bodyweight*1.8):null}
function round5(n){return Math.round(n/5)*5}
function round50(n){return Math.round(n/50)*50}
function foodReferences(){
  return {
    yogurt:{kcal:63,protein:10,carbs:4,fat:.8,per:100},
    berries:{kcal:50,protein:.7,carbs:12,fat:.2,per:100},
    nuts:{kcal:600,protein:20,carbs:20,fat:49,per:100},
    seeds:{kcal:535,protein:18.3,carbs:28.9,fat:42.2,per:100},
    milk:{kcal:64,protein:3.3,carbs:4.8,fat:3.5,per:100},
    chicken:{kcal:165,protein:31,carbs:0,fat:3.6,per:100},
    leanMince:{kcal:180,protein:26,carbs:0,fat:8,per:100},
    oilyFish:{kcal:206,protein:23,carbs:0,fat:12,per:100},
    rice:{kcal:125,protein:3,carbs:26,fat:1,per:100},
    legumes:{kcal:120,protein:8.5,carbs:20.5,fat:.7,per:100},
    veg:{kcal:35,protein:2,carbs:7,fat:.3,per:100},
    oil:{kcal:9,protein:0,carbs:0,fat:1,per:1},
    powder:{kcal:400,protein:80,carbs:10,fat:4.5,per:100},
    fruit:{kcal:80,protein:1,carbs:20,fat:.3,per:1}
  };
}
function itemMacros(refKey,amount){
  const r=foodReferences()[refKey],factor=Number(amount||0)/r.per;
  return {kcal:r.kcal*factor,protein:r.protein*factor,carbs:r.carbs*factor,fat:r.fat*factor};
}
function sumMacros(...items){
  return items.reduce((a,m)=>({kcal:a.kcal+m.kcal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{kcal:0,protein:0,carbs:0,fat:0});
}
function roundMacros(m){
  return {kcal:Math.round(m.kcal),protein:Math.round(m.protein),carbs:Math.round(m.carbs),fat:Math.round(m.fat)};
}
function proteinFood(type){
  const map={
    chicken:{ref:'chicken',label:'chicken breast'},
    leanMince:{ref:'leanMince',label:'lean mince'},
    oilyFish:{ref:'oilyFish',label:'oily fish'}
  };
  return map[type]||map.chicken;
}
function proteinPortion(type,targetProtein=20){
  const food=proteinFood(type),ref=foodReferences()[food.ref];
  return Math.round((targetProtein/ref.protein)*ref.per);
}
function proteinChoiceMacros(type,targetProtein=20){
  const food=proteinFood(type),grams=proteinPortion(type,targetProtein);
  return {food,grams,macros:roundMacros(itemMacros(food.ref,grams))};
}
function proteinPortionGuide(grams){
  return handLabel(grams/80,'palm','palms')+' · '+cupMeasure(grams/140)+' cooked';
}
function proteinEquivalentsText(){
  return 'Chicken ~'+proteinPortion('chicken')+' g · lean mince ~'+proteinPortion('leanMince')+' g · oily fish ~'+proteinPortion('oilyFish')+' g cooked ≈ 20 g protein each';
}
function handCount(n){
  const v=Math.round(n*2)/2;
  if(v===0)return '0';
  if(v===.5)return '½';
  if(v===1.5)return '1½';
  if(v===2.5)return '2½';
  return String(v);
}
function handLabel(n,singular,plural){
  const v=Math.round(n*2)/2;
  return handCount(n)+' '+(v>0&&v<=1?singular:plural);
}
function quarterFraction(n){
  const v=Math.max(.25,Math.round(n*4)/4);
  const whole=Math.floor(v),q=Math.round((v-whole)*4);
  const frac=q===1?'¼':q===2?'½':q===3?'¾':'';
  return whole?(whole+(frac?frac:'')):frac;
}
function cupMeasure(cups){
  const v=Math.max(.25,Math.round(cups*4)/4);
  return '~'+quarterFraction(v)+' cup'+(v>1?'s':'');
}
function tspMeasure(tsp){
  const v=Math.max(.5,Math.round(tsp*2)/2);
  return '~'+(Number.isInteger(v)?v:v.toFixed(1))+' tsp';
}
function tbspMeasure(tbsp){
  const v=Math.max(.25,Math.round(tbsp*4)/4);
  return '~'+quarterFraction(v)+' tbsp';
}
function portionGuide(){
  const p=settings.portions;
  return {
    yogurt:handLabel(p.yogurt/175,'cupped hand','cupped hands')+' · '+cupMeasure(p.yogurt/250),
    berries:handLabel(p.berries/200,'fist','fists')+' · '+cupMeasure(p.berries/135),
    nuts:handLabel(p.nuts/15,'thumb','thumbs')+' · '+cupMeasure(p.nuts/100),
    seeds:tbspMeasure(p.seeds/10),
    lunchRice:handLabel(p.lunchRice/200,'cupped hand','cupped hands')+' · '+cupMeasure(p.lunchRice/180),
    dinnerRice:handLabel(p.dinnerRice/200,'cupped hand','cupped hands')+' · '+cupMeasure(p.dinnerRice/180),
    legumes:handLabel(p.legumes/160,'cupped hand','cupped hands')+' · '+cupMeasure(p.legumes/160),
    veg:handLabel(p.veg/112.5,'fist','fists')+' · '+cupMeasure(p.veg/112.5),
    oil:handLabel(p.oil/7.5,'thumb','thumbs')+' · '+tspMeasure(p.oil/5)
  };
}
function beverageMacros(){
  const p=settings.portions;
  return {
    latte:roundMacros(itemMacros('milk',p.latteMilk)),
    shake:roundMacros(sumMacros(itemMacros('powder',p.powder),itemMacros('milk',p.shakeMilk)))
  };
}
function proteinSplit(){
  const p=settings.portions;
  const breakfast=roundMacros(sumMacros(itemMacros('yogurt',p.yogurt),itemMacros('berries',p.berries),itemMacros('nuts',p.nuts),itemMacros('seeds',p.seeds)));
  const lp=proteinChoiceMacros(settings.lunchProtein),dp=proteinChoiceMacros(settings.dinnerProtein);
  const lunch=roundMacros(sumMacros(lp.macros,itemMacros('rice',p.lunchRice),itemMacros('legumes',p.legumes),itemMacros('veg',p.veg),itemMacros('oil',p.oil)));
  const dinner=roundMacros(sumMacros(dp.macros,itemMacros('rice',p.dinnerRice),itemMacros('legumes',p.legumes),itemMacros('veg',p.veg),itemMacros('oil',p.oil)));
  const bev=beverageMacros(),fruit=roundMacros(itemMacros('fruit',1));
  return {breakfast:breakfast.protein,lunch:lunch.protein,dinner:dinner.protein,shake:bev.shake.protein,latte1:bev.latte.protein,latte2:bev.latte.protein,fruit:fruit.protein*3,total:breakfast.protein+lunch.protein+dinner.protein+bev.shake.protein+bev.latte.protein*2+fruit.protein*3};
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
  const c=calorieTargets(),p=settings.portions,g=portionGuide();
  if(!c)return null;
  if(day===1)return {total:0,target:c.eatingDay,gap:0,macroTotals:{protein:0,carbs:0,fat:0},meals:[],note:'Fast after the morning workout. Water, plain tea/coffee; resume meals Tuesday.'};

  const breakfast=roundMacros(sumMacros(itemMacros('yogurt',p.yogurt),itemMacros('berries',p.berries),itemMacros('nuts',p.nuts),itemMacros('seeds',p.seeds)));
  const latte=roundMacros(itemMacros('milk',p.latteMilk));
  const fruit=roundMacros(itemMacros('fruit',1));
  const lp=proteinChoiceMacros(settings.lunchProtein),dp=proteinChoiceMacros(settings.dinnerProtein);
  const lunch=roundMacros(sumMacros(lp.macros,itemMacros('rice',p.lunchRice),itemMacros('legumes',p.legumes),itemMacros('veg',p.veg),itemMacros('oil',p.oil)));
  const dinner=roundMacros(sumMacros(dp.macros,itemMacros('rice',p.dinnerRice),itemMacros('legumes',p.legumes),itemMacros('veg',p.veg),itemMacros('oil',p.oil)));
  const shake=roundMacros(sumMacros(itemMacros('powder',p.powder),itemMacros('milk',p.shakeMilk)));

  const meals=[
    {id:'breakfast',name:'Breakfast',...breakfast,portion:'~'+p.yogurt+' g high-protein Greek yoghurt ('+g.yogurt+') · ~'+p.berries+' g berries ('+g.berries+') · ~'+p.nuts+' g walnuts/almonds ('+g.nuts+') · ~'+p.seeds+' g ground flax/chia ('+g.seeds+')'},
    {id:'latte1',name:'Latte 1',...latte,portion:'1 espresso + ~'+p.latteMilk+' ml full-cream milk ('+cupMeasure(p.latteMilk/250)+') · no added sugar'},
    {id:'fruit1',name:'Fruit 1',...fruit,portion:'1 medium piece fruit (~1 cup chopped) · vary colours across the week'},
    {id:'lunch',name:'Lunch',...lunch,portion:'~'+lp.grams+' g cooked '+lp.food.label+' ('+proteinPortionGuide(lp.grams)+') · ~20 g protein · ~'+p.lunchRice+' g cooked whole grain ('+g.lunchRice+') · ~'+p.legumes+' g cooked lentils/chickpeas/beans ('+g.legumes+') · ~'+p.veg+' g vegetables ('+g.veg+') · ~'+p.oil+' g extra-virgin olive oil ('+g.oil+')'},
    {id:'latte2',name:'Latte 2',...latte,portion:'1 espresso + ~'+p.latteMilk+' ml full-cream milk ('+cupMeasure(p.latteMilk/250)+') · no added sugar'},
    {id:'fruit2',name:'Fruit 2',...fruit,portion:'1 medium piece fruit (~1 cup chopped) · vary colours across the week'},
    {id:'dinner',name:'Dinner',...dinner,portion:'~'+dp.grams+' g cooked '+dp.food.label+' ('+proteinPortionGuide(dp.grams)+') · ~20 g protein · ~'+p.dinnerRice+' g cooked whole grain ('+g.dinnerRice+') · ~'+p.legumes+' g cooked lentils/chickpeas/beans ('+g.legumes+') · ~'+p.veg+' g vegetables ('+g.veg+') · ~'+p.oil+' g extra-virgin olive oil ('+g.oil+')'},
    {id:'fruit3',name:'Fruit 3',...fruit,portion:'1 medium piece fruit (~1 cup chopped) · vary colours across the week'},
    {id:'shake',name:'Protein shake',...shake,portion:'~'+p.powder+' g protein powder (1 scoop) + ~'+p.shakeMilk+' ml full-cream milk ('+cupMeasure(p.shakeMilk/250)+') + 5 g creatine monohydrate'}
  ];
  const totals=meals.reduce((a,m)=>({kcal:a.kcal+m.kcal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{kcal:0,protein:0,carbs:0,fat:0});
  const total=Math.round(totals.kcal);
  const macroTotals={protein:Math.round(totals.protein),carbs:Math.round(totals.carbs),fat:Math.round(totals.fat)};
  const gap=c.eatingDay-total;
  return {total,target:c.eatingDay,gap,macroTotals,meals,note:'Portion macros use representative foods. Whole-grain and legume grams are cooked weight. Protein portions are cooked weights chosen to provide about 20 g protein: '+proteinEquivalentsText()+'. Extra-virgin olive oil is the default added fat. Household measures are approximate; cups use a 250 ml metric cup. Reference values are approximate and vary by cut, species and brand. Oily fish is more energy-dense, so selecting it raises the meal and day calories unless another component is adjusted.'};
}
function nutritionSummary(day=programDay()){
  const p=protein(),f=fatLossTargets(),c=calorieTargets(),m=mealPlan(day);
  if(!p||!f)return 'Add bodyweight to calculate protein and weekly fat-loss targets.';
  if(!c)return 'Protein ~'+p+' g/day · target loss '+f.low+'–'+f.high+' kg/week. Add height, age and sex for a better calorie estimate.';
  if(day===1)return 'Monday fast · 0 kcal assumption · estimated maintenance ~'+c.maintenance+' kcal · planned loss ~'+c.predictedLoss+' kg/week.';
  return 'Meal plan ~'+m.total+' kcal vs '+c.eatingDay+' kcal target · protein target ~'+p+' g · planned loss ~'+c.predictedLoss+' kg/week ('+c.predictedPct+'% bodyweight).';
}
function dietText(day){
  const p=protein(),ps=proteinSplit(),c=calorieTargets();
  if(day===1)return ['FAST DAY','Morning workout → fast',c?'0 kcal after the workout today; eating-day target resumes Tuesday at ~'+c.eatingDay+' kcal.':'Water, plain tea/coffee. Add bodyweight for targets.'];
  if(day===2)return ['REFEED',c?'~'+c.eatingDay+' kcal today':'Break fast after recovery',p?'3 Mediterranean-style meals + 3 fruit + 2 full-cream lattes + milk-based protein shake with creatine · ~'+p+' g protein total.':'Protein-rich first meal.'];
  return p?[c?'~'+c.eatingDay+' KCAL':'~'+p+' G PROTEIN','3 Mediterranean meals + 3 fruit + 2 lattes + protein shake + creatine',ps?'Protein: ~'+ps.breakfast+' g breakfast · '+ps.lunch+' g lunch · '+ps.dinner+' g dinner · '+ps.shake+' g shake · '+ps.latte1+' g each latte.':'Protein + plants.']:['SET WEIGHT','3 meals + shake','Add bodyweight in settings to calculate targets.'];
}
function formatDate(){const d=new Date();const weekday=new Intl.DateTimeFormat('en-AU',{weekday:'long'}).format(d).toUpperCase();const rest=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short'}).format(d).toUpperCase();return weekday+' · '+rest}
function weeklyTarget(day,w){if(day===4)return swingTargets[w-1];if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
function completedOn(date,day){return !!logs[`${date}-${day}`]?.completed}
function programProgressStats(){
  const start=new Date(settings.startDate+'T00:00:00');
  const today=new Date(todayISO()+'T00:00:00');
  const programEnd=new Date(start); programEnd.setDate(start.getDate()+83);
  if(today<start)return {currentStreak:0,bestStreak:0,completed:0,elapsed:0,programDays:84,weekCompleted:0,weekElapsed:0,adherence:0};

  const effective=today>programEnd?programEnd:today;
  const elapsed=Math.max(0,Math.min(84,Math.floor((effective-start)/86400000)+1));
  const done=[];
  for(let i=0;i<elapsed;i++){
    const dt=new Date(start); dt.setDate(start.getDate()+i);
    const ds=iso(dt),dd=dt.getDay();
    done.push(completedOn(ds,dd));
  }

  let bestStreak=0,run=0;
  done.forEach(v=>{run=v?run+1:0;if(run>bestStreak)bestStreak=run});

  let anchor=done.length-1;
  if(today<=programEnd && anchor>=0 && !done[anchor])anchor--;
  let currentStreak=0;
  while(anchor>=0 && done[anchor]){currentStreak++;anchor--}

  const currentWeek=Math.max(1,Math.min(12,Math.floor((effective-start)/604800000)+1));
  const weekStartIndex=(currentWeek-1)*7;
  const weekElapsed=Math.max(0,Math.min(7,elapsed-weekStartIndex));
  let weekCompleted=0;
  for(let i=weekStartIndex;i<weekStartIndex+weekElapsed;i++)if(done[i])weekCompleted++;

  const completed=done.filter(Boolean).length;
  return {
    currentStreak,bestStreak,completed,elapsed,programDays:84,
    weekCompleted,weekElapsed,
    adherence:elapsed?Math.round((completed/elapsed)*100):0
  };
}
