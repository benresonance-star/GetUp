const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const ctx={window:{}};
vm.createContext(ctx);
for(const file of ['program.js','ui-domain.js','ui-plans.js','ui-views.js','home-minimal-view.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
}
const domain=ctx.window.Motion12UiDomain;
const plans=ctx.window.Motion12UiPlans;
const views=ctx.window.Motion12UiViews;
const minimalHome=ctx.window.Motion12MinimalHomeView;
const program=vm.runInContext('program',ctx);
const days=vm.runInContext('DAYS',ctx);
const aerobicTargets=vm.runInContext('aerobicTargets',ctx);
const planCtx={
  program,conditioningRounds:vm.runInContext('conditioningRounds',ctx),
  conditioningTarget:vm.runInContext('conditioningTarget',ctx),aerobicTargets,
  aerobicPowerVariant:()=> 'A',timerContextDate:()=> '2026-11-07',
  timerFormat:sec=>String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')
};

test('meal history supports stable IDs and historic numeric log keys, without changing records',()=>{
  const date='2026-11-03';
  const logs={
    ['meal:'+date+':0']:{done:true},
    ['meal:'+date+':lunch']:{done:true},
    ['meal:'+date+':2']:{done:false}
  };
  const original=JSON.stringify(logs);
  const meals=[
    {id:'breakfast',kcal:400,protein:20,carbs:40,fat:10},
    {id:'lunch',kcal:700,protein:40,carbs:60,fat:20},
    {id:'dinner',kcal:500,protein:30,carbs:50,fat:15}
  ];
  const plan={meals,total:1600,target:1700,macroTotals:{protein:90,carbs:150,fat:45},gap:100};
  assert.equal(domain.mealDone(logs,date,meals[0]),true);
  assert.equal(domain.mealDone(logs,date,meals[1]),true);
  assert.equal(domain.mealDone(logs,date,meals[2]),false);
  const totals=domain.intakeTotals(plan,logs,date);
  assert.equal(totals.consumed.kcal,1100);
  assert.equal(totals.remaining.kcal,600);
  assert.equal(totals.remaining.protein,30);
  assert.equal(domain.compactMealCount(plan,logs,date),'2 / 3 ✓');
  assert.equal(domain.compactMealCount({meals:[]},logs,date),'');
  assert.equal(JSON.stringify(logs),original);
});

test('pull-up practice retains the strength day exclusion and assisted threshold',()=>{
  assert.equal(domain.practicePrescription(1,8).enabled,false);
  assert.equal(domain.practicePrescription(3,0).enabled,false);
  assert.equal(domain.practicePrescription(3,3).assisted,true);
  assert.equal(domain.practicePrescription(3,8).reps,3);
  assert.equal(domain.practicePrescription(3,12).reps,5);
});

test('strength prescription, timing and two-session progression are deterministic',()=>{
  const cfg=domain.strengthFlowConfig('Goblet squat','3 × 6–10');
  assert.equal(cfg.sets,3);
  assert.equal(cfg.low,6);
  assert.equal(cfg.top,10);
  const iso=domain.strengthFlowConfig('Calf isometric','3 × 5 sec / side');
  assert.equal(iso.workPerSide,true);
  assert.equal(iso.workSeconds,5);
  const entries=Array.from({length:3},()=>({load:'16',reps:10,rir:2,complete:true}));
  const first=domain.strengthCompletionSummary({name:'Goblet squat',entries,cfg,previous:null,dayLabel:'Monday'});
  assert.equal(first.tone,'ready');
  const second=domain.strengthCompletionSummary({
    name:'Goblet squat',entries,cfg,previous:{id:'prior',sets:entries},dayLabel:'Monday'
  });
  assert.equal(second.tone,'up');
  assert.equal(second.previous,'prior');
  assert.equal(second.loadText,'16 kg');
  assert.equal(domain.strengthCompletionSummary({name:'Goblet squat',entries:[],cfg,previous:null,dayLabel:'Monday'}),null);
  assert.equal(domain.strengthQualifiesForProgression([{...entries[0],rir:1}],10),false);
});

test('session plans keep circuit phases and strength recovery policies',()=>{
  const aerobic=plans.conditioningCircuitPlan(0,1,planCtx);
  assert.equal(aerobic.kind,'intervals');
  assert.equal(aerobic.circuit,true);
  assert.equal(aerobic.phases[0].phaseType,'work');
  assert.equal(aerobic.phases[1].phaseType,'transition');
  assert.equal(plans.exerciseRestPreset('Goblet squat',1,1,planCtx).seconds,120);
  assert.equal(plans.exerciseRestPreset('Push-up',1,1,planCtx).seconds,90);
  assert.equal(plans.exerciseRestPreset('Calf isometric',1,1,planCtx).seconds,75);
  const strength=plans.timerSessionPlan(1,1,'Goblet squat',planCtx);
  assert.equal(strength.kind,'strengthsets');
  assert.equal(strength.exerciseName,'Goblet squat');
  assert.equal(strength.rest,120);
  const power=plans.timerSessionPlan(6,5,'',planCtx);
  assert.equal(power.kind,'intervals');
  assert.equal(power.phases[0].label,'HARD');
  assert.equal(power.phases[0].seconds,180);
  const alternate=plans.timerSessionPlan(6,5,'',{...planCtx,aerobicPowerVariant:()=> 'B'});
  assert.equal(alternate.rounds,4);
  assert.equal(alternate.phases.length,8);
});

test('Days and Progress pages render from view models without DOM or persistence access',()=>{
  const daysHtml=views.daysPage({
    todayDay:1,week:1,program,days,expandedDay:1,aerobicTargets,
    weeklyTarget:()=> 'Week one',supportTarget:()=> 'Practice gently'
  });
  assert.equal((daysHtml.match(/id="day-card-\d"/g)||[]).length,7);
  assert.match(daysHtml,/aria-expanded="true"/);
  assert.match(daysHtml,/Movement prep/);
  assert.match(daysHtml,/Go to session/);
  const progressHtml=views.progressPage({
    protein:155,fatLoss:{low:0.4,high:0.7,cap:0.9},
    calories:{eatingDay:2300,predictedLoss:0.57,maintenance:2800,actualWeeklyDeficit:4400,weeklyIntake:13800},
    progressStats:{weekCompleted:1,completed:1,elapsed:2,adherence:50,programDays:84},
    last7:1,measurements:{weight:86}
  });
  assert.equal((progressHtml.match(/id="measure-/g)||[]).length,6);
  assert.match(progressHtml,/value="86"/);
  assert.match(progressHtml,/Save measures/);
  assert.match(progressHtml,/Program adherence/);
});

test('collapsed Days overview shows all seven days in a compact, accessible schedule',()=>{
  const collapsed=views.daysPage({
    todayDay:6,week:2,program,days,expandedDay:null,aerobicTargets,
    weeklyTarget:()=> 'Week two',supportTarget:()=> 'Practice gently'
  });
  assert.equal((collapsed.match(/class="week-row /g)||[]).length,7);
  assert.equal((collapsed.match(/class="week-row-trigger"/g)||[]).length,7);
  assert.match(collapsed,/Day<\/span><span>Emphasis<\/span><span>Intensity/);
  assert.match(collapsed,/4 × 4 min intervals/);
  assert.match(collapsed,/class="week-level level-easy"/);
  assert.match(collapsed,/class="week-level level-hard"/);
  assert.doesNotMatch(collapsed,/class="day-overview"/);
  assert.match(collapsed,/aria-expanded="false"/);
  assert.equal((collapsed.match(/class="week-row-detail"/g)||[]).length,7);
});

test('Minimal Home preserves four priorities and the Detailed switch without altering input data',()=>{
  const input={
    week:1,calMode:false,canSwitchSystem:true,
    session:{name:'Aerobic Power',time:'30–40 min'},
    sessionAction:"openDay(6,'2026-11-07')",sessionLabel:'START',
    sessionDescription:'4 × 4 intervals',complete:false,
    last7:1,fitness:{weeklySessions:7},loss:'~0.57 kg',
    kcalLeft:'2,300',kcalUnit:'kcal left today',macros:{protein:155},
    fastDay:false,mealCount:'0 / 3 ✓',
    mealChips:'<button class="compact-meal">Meal 1</button>',
    recoveryAction:'openMobilityToday()',recoveryCue:'Mobilise gently.'
  };
  const before=JSON.stringify(input);
  const html=minimalHome.renderMinimalHome(input);
  assert.equal((html.match(/class="motion-minimal-panel /g)||[]).length,4);
  assert.match(html,/Aerobic Power/);
  assert.match(html,/2,300/);
  assert.match(html,/155 g/);
  assert.match(html,/motionMinimalFoodDetails/);
  assert.match(html,/Motion12Flow\.previewTomorrow\(\)/);
  assert.match(html,/Motion12Cal\.switch/);
  assert.equal(JSON.stringify(input),before);
  assert.match(minimalHome.viewSwitch('minimal'),/aria-pressed="true" onclick="setMotionHomeView\('minimal'\)"/);
  assert.match(minimalHome.viewSwitch('detailed'),/aria-pressed="true" onclick="setMotionHomeView\('detailed'\)"/);
  assert.match(minimalHome.renderMinimalHome({...input,session:{name:'<img src=x>',time:'40 min'}}),/&lt;img src=x&gt;/);
});
