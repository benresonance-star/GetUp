const previousDefaultPortionsV1={yogurt:250,berries:200,nuts:25,latteMilk:200,meat:90,lunchRice:275,dinnerRice:275,veg:225,oil:10,powder:30,shakeMilk:250};
const previousDefaultPortionsV2={yogurt:250,berries:200,nuts:25,latteMilk:200,meat:94,lunchRice:180,dinnerRice:180,veg:225,oil:10,powder:30,shakeMilk:250};
const defaultPortions={yogurt:250,berries:200,nuts:20,seeds:10,latteMilk:200,meat:66,lunchRice:90,dinnerRice:90,legumes:120,veg:225,oil:11.5,powder:30,shakeMilk:250};
const APP_PALETTES=Object.freeze({
  ember:{volt:'#ff4d2e',orange:'#ff7a1a',cyan:'#3be7e1',pink:'#ff4fa3',accentRgb:'255,77,46',accent2Rgb:'255,122,26'},
  ocean:{volt:'#38a6ff',orange:'#20d6c7',cyan:'#69e7ff',pink:'#8f7cff',accentRgb:'56,166,255',accent2Rgb:'32,214,199'},
  forest:{volt:'#4fd270',orange:'#b4df45',cyan:'#42d9b7',pink:'#efb451',accentRgb:'79,210,112',accent2Rgb:'180,223,69'},
  violet:{volt:'#8c72ff',orange:'#d45cff',cyan:'#63dcff',pink:'#ff71b3',accentRgb:'140,114,255',accent2Rgb:'212,92,255'},
  gold:{volt:'#ffb62e',orange:'#ff7a1a',cyan:'#54d9c7',pink:'#ff786e',accentRgb:'255,182,46',accent2Rgb:'255,122,26'},
  rose:{volt:'#ff5f8f',orange:'#ff8c51',cyan:'#62dce7',pink:'#bc79ff',accentRgb:'255,95,143',accent2Rgb:'255,140,81'}
});
const APP_PALETTE_IDS=Object.freeze(Object.keys(APP_PALETTES));
function normalizeAppPalette(value){return APP_PALETTE_IDS.includes(value)?value:'ember'}
function applyAppPalette(value){
  const palette=normalizeAppPalette(value),tokens=APP_PALETTES[palette];
  const root=document.documentElement;
  root.dataset.appPalette=palette;
  root.style.setProperty('--volt',tokens.volt);
  root.style.setProperty('--orange',tokens.orange);
  root.style.setProperty('--cyan',tokens.cyan);
  root.style.setProperty('--pink',tokens.pink);
  root.style.setProperty('--accent-rgb',tokens.accentRgb);
  root.style.setProperty('--accent2-rgb',tokens.accent2Rgb);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',tokens.volt);
  return palette;
}
const defaultSettings={startDate:getMondayISO(new Date()),bodyweight:0,height:0,age:0,sex:'',steps:7000,maintenanceOverride:0,homeMode:'full',appPalette:'ember',portionPresetVersion:4,lunchProtein:'chicken',dinnerProtein:'chicken',portions:defaultPortions};
const motion12PersistedView=window.Motion12Persistence.view();
const storedSettings=motion12PersistedView.settings||{};
const storedPortions=storedSettings.portions||{};
function matchesPortionPreset(preset){return Object.keys(preset).every(k=>Number(storedPortions[k])===preset[k])}
const shouldUpgradePortions=matchesPortionPreset(previousDefaultPortionsV1)||matchesPortionPreset(previousDefaultPortionsV2);
let settings={...defaultSettings,...storedSettings,appPalette:normalizeAppPalette(storedSettings.appPalette),portionPresetVersion:4,lunchProtein:storedSettings.lunchProtein||'chicken',dinnerProtein:storedSettings.dinnerProtein||'chicken',portions:shouldUpgradePortions?{...defaultPortions}:{...defaultPortions,...storedPortions}};
applyAppPalette(settings.appPalette);
let logs=motion12PersistedView.logs||{};
let measurements=motion12PersistedView.measurements||{};
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
  strengthPhase:'ready',
  totalSets:0,
  restSeconds:0,
  target:'',
  finalRest:false,
  dayKey:''
};
let smartTimer={...defaultSmartTimer,...(motion12PersistedView.smartTimer||{})};
let inlineTimerInt=null;
const defaultInlineTimer={
  activeId:'',
  exerciseName:'',
  kind:'',
  work:0,
  rest:0,
  phase:'work',
  running:false,
  remaining:0,
  duration:0,
  endAt:0,
  sets:0,
  setIndex:0,
  target:'',
  finalRest:false,
  timedWork:false,
  workSeconds:0,
  workMaxSeconds:0,
  workPerSide:false
};
let inlineTimer={...defaultInlineTimer,...(motion12PersistedView.inlineTimer||{})};

function motion12ReloadStateFromPersistence(){
  const v=window.Motion12Persistence.view();
  const nextSettings=v.settings||{};
  settings={
    ...defaultSettings,
    ...nextSettings,
    appPalette:normalizeAppPalette(nextSettings.appPalette),
    portionPresetVersion:4,
    lunchProtein:nextSettings.lunchProtein||'chicken',
    dinnerProtein:nextSettings.dinnerProtein||'chicken',
    portions:{...defaultPortions,...(nextSettings.portions||{})}
  };
  logs=v.logs||{};
  measurements=v.measurements||{};
  smartTimer={...defaultSmartTimer,...(v.smartTimer||{})};
  inlineTimer={...defaultInlineTimer,...(v.inlineTimer||{})};
  applyAppPalette(settings.appPalette);
  try{if(timerInt)clearInterval(timerInt)}catch(_){}
  try{if(inlineTimerInt)clearInterval(inlineTimerInt)}catch(_){}
  timerInt=null;inlineTimerInt=null;
  if(typeof renderHome==='function'){
    renderHome();renderDays();renderProgress();
    if(document.getElementById('timerPage')?.classList.contains('active'))renderTimerPage();
    if(inlineTimer.activeId&&typeof inlineTimerEnsureTick==='function')inlineTimerEnsureTick();
    if(typeof timerEnsureTick==='function')timerEnsureTick();
  }
  return v;
}
window.motion12ReloadStateFromPersistence=motion12ReloadStateFromPersistence;

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

/* Five-component lunch/dinner stack.
   Saved meal swaps live in misc logs so they follow the existing backup/recovery path. */
const MEAL_STACK_COMPONENTS=Object.freeze(['carb','greens','colour','legumes','protein']);
function mealStackLibrary(){
  return {
    carb:[
      {id:'brownRice',label:'Brown rice',kcal:123,protein:2.7,carbs:25.6,fat:1.0},
      {id:'quinoa',label:'Quinoa',kcal:120,protein:4.4,carbs:21.3,fat:1.9},
      {id:'barley',label:'Pearl barley',kcal:123,protein:2.3,carbs:28.2,fat:.4},
      {id:'farro',label:'Farro',kcal:125,protein:4.4,carbs:26,fat:1},
      {id:'wholegrainCouscous',label:'Wholegrain couscous',kcal:112,protein:3.8,carbs:23.2,fat:.2},
      {id:'sweetPotato',label:'Sweet potato',kcal:90,protein:2,carbs:20.7,fat:.2},
      {id:'potato',label:'Potato',kcal:87,protein:1.9,carbs:20.1,fat:.1}
    ],
    greens:[
      {id:'spinach',label:'Spinach',kcal:23,protein:2.9,carbs:3.6,fat:.4},
      {id:'kale',label:'Kale',kcal:35,protein:2.9,carbs:4.4,fat:1.5},
      {id:'rocket',label:'Rocket',kcal:25,protein:2.6,carbs:3.7,fat:.7},
      {id:'broccoli',label:'Broccoli',kcal:35,protein:2.4,carbs:7.2,fat:.4},
      {id:'greenBeans',label:'Green beans',kcal:35,protein:1.9,carbs:7.9,fat:.3},
      {id:'silverbeet',label:'Silverbeet',kcal:19,protein:1.8,carbs:3.7,fat:.2}
    ],
    colour:[
      {id:'capsicum',label:'Capsicum',kcal:31,protein:1,carbs:6,fat:.3},
      {id:'tomato',label:'Tomato',kcal:18,protein:.9,carbs:3.9,fat:.2},
      {id:'carrot',label:'Carrot',kcal:35,protein:.8,carbs:8.2,fat:.2},
      {id:'pumpkin',label:'Pumpkin',kcal:26,protein:1,carbs:6.5,fat:.1},
      {id:'beetroot',label:'Beetroot',kcal:44,protein:1.7,carbs:10,fat:.2},
      {id:'eggplant',label:'Eggplant',kcal:35,protein:.8,carbs:8.7,fat:.2}
    ],
    legumes:[
      {id:'lentils',label:'Lentils',kcal:116,protein:9,carbs:20.1,fat:.4},
      {id:'chickpeas',label:'Chickpeas',kcal:164,protein:8.9,carbs:27.4,fat:2.6},
      {id:'cannellini',label:'Cannellini beans',kcal:114,protein:7.6,carbs:20.2,fat:.5},
      {id:'blackBeans',label:'Black beans',kcal:132,protein:8.9,carbs:23.7,fat:.5},
      {id:'edamame',label:'Edamame',kcal:121,protein:11.9,carbs:8.9,fat:5.2}
    ],
    protein:[
      {id:'chicken',label:'Chicken breast',kcal:165,protein:31,carbs:0,fat:3.6},
      {id:'turkey',label:'Turkey breast',kcal:135,protein:29,carbs:0,fat:1.6},
      {id:'leanBeef',label:'Lean beef / mince',kcal:180,protein:26,carbs:0,fat:8},
      {id:'leanPork',label:'Lean pork',kcal:170,protein:29,carbs:0,fat:5},
      {id:'whiteFish',label:'White fish',kcal:105,protein:23,carbs:0,fat:1},
      {id:'tuna',label:'Tuna',kcal:132,protein:29,carbs:0,fat:1},
      {id:'salmon',label:'Salmon / oily fish',kcal:206,protein:23,carbs:0,fat:12},
      {id:'tofu',label:'Firm tofu',kcal:144,protein:17.3,carbs:2.8,fat:8.7},
      {id:'tempeh',label:'Tempeh',kcal:195,protein:19.9,carbs:7.6,fat:11.4}
    ]
  };
}
function mealStackFood(component,id){
  const list=mealStackLibrary()[component]||[];
  return list.find(x=>x.id===id)||list[0];
}
function mealStackConfigKey(date,mealId){return 'mealConfig:'+date+':'+mealId}
function mealStackDefaultProtein(mealId){
  const current=mealId==='dinner'?settings.dinnerProtein:settings.lunchProtein;
  return current==='leanMince'?'leanBeef':current==='oilyFish'?'salmon':'chicken';
}
function mealStackDefaultSelection(mealId){
  return {carb:'brownRice',greens:'spinach',colour:'capsicum',legumes:'lentils',protein:mealStackDefaultProtein(mealId)};
}
function mealStackStoredConfig(date,mealId){
  const raw=logs[mealStackConfigKey(date,mealId)]||{};
  const defaults=mealStackDefaultSelection(mealId);
  const selection={...defaults,...(raw.selection||{})};
  MEAL_STACK_COMPONENTS.forEach(component=>{
    const list=mealStackLibrary()[component]||[];
    if(!list.some(x=>x.id===selection[component]))selection[component]=defaults[component];
  });
  return {selection,matchTargets:raw.matchTargets!==false};
}
function mealStackTarget(mealId){
  const p=settings.portions;
  const type=mealId==='dinner'?settings.dinnerProtein:settings.lunchProtein;
  const proteinChoice=proteinChoiceMacros(type);
  const riceAmount=mealId==='dinner'?p.dinnerRice:p.lunchRice;
  return roundMacros(sumMacros(
    proteinChoice.macros,
    itemMacros('rice',riceAmount),
    itemMacros('legumes',p.legumes),
    itemMacros('veg',p.veg),
    itemMacros('oil',p.oil)
  ));
}
function mealStackDefaultGrams(mealId,selection){
  const p=settings.portions;
  const vegTotal=Math.max(160,Number(p.veg)||225);
  const greens=round5(vegTotal*.45);
  const colour=Math.max(40,round5(vegTotal-greens));
  const proteinFood=mealStackFood('protein',selection.protein);
  const proteinGrams=round5(Math.max(40,Math.min(280,(20/Math.max(1,proteinFood.protein))*100)));
  return {
    carb:Number(mealId==='dinner'?p.dinnerRice:p.lunchRice)||90,
    greens,
    colour,
    legumes:Number(p.legumes)||120,
    protein:proteinGrams
  };
}
function mealStackMacros(selection,grams){
  const total={kcal:0,protein:0,carbs:0,fat:0};
  MEAL_STACK_COMPONENTS.forEach(component=>{
    const food=mealStackFood(component,selection[component]);
    const amount=Math.max(0,Number(grams[component])||0)/100;
    total.kcal+=food.kcal*amount;
    total.protein+=food.protein*amount;
    total.carbs+=food.carbs*amount;
    total.fat+=food.fat*amount;
  });
  const oil=itemMacros('oil',settings.portions.oil);
  return roundMacros(sumMacros(total,oil));
}
function mealStackMatchedGrams(mealId,selection,target){
  const base=mealStackDefaultGrams(mealId,selection);
  let best={...base},bestScore=Infinity;
  for(let carb=40;carb<=360;carb+=5){
    for(let protein=40;protein<=300;protein+=5){
      const grams={...base,carb,protein};
      const macros=mealStackMacros(selection,grams);
      const kcalError=(macros.kcal-target.kcal)/12;
      const proteinError=(macros.protein-target.protein)/1.5;
      const portionPenalty=(Math.abs(carb-base.carb)/160+Math.abs(protein-base.protein)/140)*.12;
      const score=kcalError*kcalError+proteinError*proteinError*1.6+portionPenalty;
      if(score<bestScore){bestScore=score;best=grams}
    }
  }
  return best;
}
function mealStackPreview(mealId,selection,matchTargets=true){
  const target=mealStackTarget(mealId);
  const grams=matchTargets?mealStackMatchedGrams(mealId,selection,target):mealStackDefaultGrams(mealId,selection);
  const macros=mealStackMacros(selection,grams);
  return {target,selection:{...selection},matchTargets:!!matchTargets,grams,macros};
}
function mealStackFor(mealId,date=todayISO()){
  const cfg=mealStackStoredConfig(date,mealId);
  return mealStackPreview(mealId,cfg.selection,cfg.matchTargets);
}
function mealStackItems(stack){
  const labels={carb:'Carb',greens:'Greens',colour:'Coloured vegetables',legumes:'Legumes',protein:'Lean protein'};
  return MEAL_STACK_COMPONENTS.map(component=>{
    const food=mealStackFood(component,stack.selection[component]);
    const grams=stack.grams[component];
    let guide='';
    if(component==='protein')guide=proteinPortionGuide(grams);
    else if(component==='legumes')guide=cupMeasure(grams/160);
    else guide=cupMeasure(grams/(component==='carb'?180:100));
    return {main:labels[component]+' · ~'+grams+' g '+food.label,guide};
  });
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
function mealPlan(day,date=todayISO()){
  const c=calorieTargets(),p=settings.portions,g=portionGuide();
  if(!c)return null;
  if(day===1)return {total:0,target:c.eatingDay,gap:0,macroTotals:{protein:0,carbs:0,fat:0},meals:[],note:'Fast after the morning workout. Water, plain tea/coffee; resume meals Tuesday.'};

  const breakfast=roundMacros(sumMacros(itemMacros('yogurt',p.yogurt),itemMacros('berries',p.berries),itemMacros('nuts',p.nuts),itemMacros('seeds',p.seeds)));
  const latte=roundMacros(itemMacros('milk',p.latteMilk));
  const fruit=roundMacros(itemMacros('fruit',1));
  const lunchStack=mealStackFor('lunch',date),dinnerStack=mealStackFor('dinner',date);
  const lunch=lunchStack.macros,dinner=dinnerStack.macros;
  const shake=roundMacros(sumMacros(itemMacros('powder',p.powder),itemMacros('milk',p.shakeMilk)));

  const meals=[
    {id:'breakfast',name:'Breakfast',...breakfast,
      items:[
        {main:'~'+p.yogurt+' g high-protein Greek yoghurt',guide:g.yogurt},
        {main:'~'+p.berries+' g berries',guide:g.berries},
        {main:'~'+p.nuts+' g walnuts/almonds',guide:g.nuts},
        {main:'~'+p.seeds+' g ground flax/chia',guide:g.seeds}
      ]},
    {id:'latte1',name:'Latte 1',...latte,
      items:[
        {main:'1 espresso'},
        {main:'~'+p.latteMilk+' ml full-cream milk',guide:cupMeasure(p.latteMilk/250)},
        {main:'No added sugar'}
      ]},
    {id:'fruit1',name:'Fruit 1',...fruit,
      items:[
        {main:'1 medium piece fruit',guide:'~1 cup chopped'},
        {main:'Vary colours across the week'}
      ]},
    {id:'lunch',name:'Lunch',...lunch,configurable:true,stack:lunchStack,
      items:mealStackItems(lunchStack),
      stackNote:'Five-component stack · includes ~'+p.oil+' g extra-virgin olive oil in the meal macros.'},
    {id:'latte2',name:'Latte 2',...latte,
      items:[
        {main:'1 espresso'},
        {main:'~'+p.latteMilk+' ml full-cream milk',guide:cupMeasure(p.latteMilk/250)},
        {main:'No added sugar'}
      ]},
    {id:'fruit2',name:'Fruit 2',...fruit,
      items:[
        {main:'1 medium piece fruit',guide:'~1 cup chopped'},
        {main:'Vary colours across the week'}
      ]},
    {id:'dinner',name:'Dinner',...dinner,configurable:true,stack:dinnerStack,
      items:mealStackItems(dinnerStack),
      stackNote:'Five-component stack · includes ~'+p.oil+' g extra-virgin olive oil in the meal macros.'},
    {id:'fruit3',name:'Fruit 3',...fruit,
      items:[
        {main:'1 medium piece fruit',guide:'~1 cup chopped'},
        {main:'Vary colours across the week'}
      ]},
    {id:'shake',name:'Protein shake',...shake,
      items:[
        {main:'~'+p.powder+' g protein powder',guide:'1 scoop'},
        {main:'~'+p.shakeMilk+' ml full-cream milk',guide:cupMeasure(p.shakeMilk/250)},
        {main:'5 g creatine monohydrate'}
      ]}
  ];
  const totals=meals.reduce((a,m)=>({kcal:a.kcal+m.kcal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{kcal:0,protein:0,carbs:0,fat:0});
  const total=Math.round(totals.kcal);
  const macroTotals={protein:Math.round(totals.protein),carbs:Math.round(totals.carbs),fat:Math.round(totals.fat)};
  const gap=c.eatingDay-total;
  return {total,target:c.eatingDay,gap,macroTotals,meals,note:'Lunch and dinner use a five-component stack: carb, greens, coloured vegetables, legumes and protein. When Match current meal targets is on, carb and protein portions are adjusted to stay close to the existing meal energy and protein targets while greens, coloured vegetables and legumes remain at their baseline portions. Extra-virgin olive oil remains the default added fat. Macro values are representative estimates and vary by food, cut, brand and preparation.'};
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
function weeklyTarget(day,w){if(day===2||day===4||day===0)return conditioningTarget(day,w);if(day===6)return aerobicTargets[w-1];if(w===8)return 'DELOAD — reduce sets 35–40%';if(w===12)return 'CONSOLIDATE — reduce volume ~40%';if(w>=9)return '1–2 reps in reserve on final sets';if(w>=5)return '~2 reps in reserve';return w<=2?'~3 reps in reserve':'~2–3 reps in reserve'}
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
