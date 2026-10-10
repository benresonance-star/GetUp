function updateHomeModeToggle(){
  const b=document.getElementById('homeModeToggle');
  if(!b)return;
  const compact=settings.homeMode==='compact';
  b.setAttribute('aria-checked',compact?'true':'false');
  b.classList.toggle('active',compact);
}
function applySessionCompactMode(){
  const page=document.getElementById('dayPage');
  if(!page)return;
  // Presentation-only: do not add/remove/reorder session stages here.
  const compact=settings.homeMode==='compact';
  page.classList.toggle('compact-active',compact);
  page.dataset.sessionMode=compact?'compact':'full';
  const badge=page.querySelector('.session-mode-badge');
  if(badge){
    const key=(typeof timerContextDate==='function'&&typeof timerContextDay==='function')
      ?timerContextDate()+'-'+timerContextDay():'';
    const paused=key&&typeof sessionPaused==='function'&&sessionPaused(key);
    badge.textContent=paused?(compact?'PAUSED · COMPACT':'PAUSED'):(compact?'COMPACT SESSION':'');
    badge.classList.toggle('paused',!!paused);
  }
  if(compact&&typeof timerViewModel==='function')syncCompactSessionFocus(timerViewModel());
}
function toggleHomeMode(){
  settings.homeMode=settings.homeMode==='compact'?'full':'compact';
  motion12SetItem('motion12.settings',JSON.stringify(settings));
  updateHomeModeToggle();
  if(document.getElementById('homePage')?.classList.contains('active'))renderHome();
  if(document.getElementById('dayPage')?.classList.contains('active'))applySessionCompactMode();
}
function videoButtons(name){return videosFor(name).map(v=>`<a class="video-link" href="${v.url}" target="_blank" rel="noopener noreferrer">▶ ${v.label}</a>`).join('')}
function mealKey(date,id){return 'meal:'+date+':'+id}
function legacyMealIndex(id){return ({breakfast:0,latte1:1,lunch:2,latte2:3,dinner:4,shake:5})[id]}
function mealDone(date,meal){
  const key=mealKey(date,meal.id);
  if(Object.prototype.hasOwnProperty.call(logs,key))return !!logs[key].done;
  const legacy=legacyMealIndex(meal.id);
  return legacy===undefined?false:!!logs['meal:'+date+':'+legacy]?.done;
}
function intakeTotals(day,date){
  const plan=mealPlan(day,date);
  if(!plan||!plan.meals.length)return null;
  const consumed=plan.meals.reduce((acc,m)=>{
    if(mealDone(date,m)){
      acc.kcal+=m.kcal; acc.protein+=m.protein; acc.carbs+=m.carbs; acc.fat+=m.fat;
    }
    return acc;
  },{kcal:0,protein:0,carbs:0,fat:0});
  const remaining={
    kcal:Math.max(0,(plan.target||plan.total)-consumed.kcal),
    protein:Math.max(0,plan.macroTotals.protein-consumed.protein),
    carbs:Math.max(0,plan.macroTotals.carbs-consumed.carbs),
    fat:Math.max(0,plan.macroTotals.fat-consumed.fat)
  };
  return {consumed,remaining,total:{kcal:plan.target||plan.total,...plan.macroTotals},planKcal:plan.total,gap:plan.gap||0};
}
function intakeStripInner(day,date){
  const t=intakeTotals(day,date);
  if(!t)return '';
  return '<div class="intake-row"><span class="intake-label">Consumed</span><b>'+t.consumed.kcal+' kcal</b><span>P '+t.consumed.protein+'g</span><span>C '+t.consumed.carbs+'g</span><span>F '+t.consumed.fat+'g</span></div>'+
         '<div class="intake-row remaining"><span class="intake-label">Remaining</span><b>'+t.remaining.kcal+' kcal</b><span>P '+t.remaining.protein+'g</span><span>C '+t.remaining.carbs+'g</span><span>F '+t.remaining.fat+'g</span></div>';
}
function updateIntakeStrips(day,date){
  document.querySelectorAll('[data-intake-date="'+date+'"]').forEach(el=>{
    el.innerHTML=intakeStripInner(day,date);
  });
}
function mealItemsMarkup(meal){
  if(!meal.items?.length)return meal.portion?'<p>'+meal.portion+'</p>':'';
  return '<ul class="meal-items">'+meal.items.map(item=>
    '<li><strong>'+item.main+'</strong>'+(item.guide?'<span>('+item.guide+')</span>':'')+'</li>'
  ).join('')+'</ul>'+(meal.stackNote?'<div class="meal-stack-note">'+meal.stackNote+'</div>':'');
}
function mealRows(day,date=todayISO()){
  const plan=mealPlan(day,date);
  if(!plan)return '<div class="card"><p>Add bodyweight to create the meal plan.</p></div>';
  if(!plan.meals.length)return '<div class="card fast-card"><h3>Fast after training</h3><p>'+plan.note+'</p></div>';
  return '<div class="intake-strip" data-intake-date="'+date+'">'+intakeStripInner(day,date)+(plan.gap?'<div class="plan-gap '+(plan.gap<0?'over':'')+'">Plan '+plan.total+' kcal · target '+plan.target+' kcal · '+(plan.gap>0?plan.gap+' kcal unallocated':Math.abs(plan.gap)+' kcal over target')+'</div>':'')+'</div><div class="meal-list">'+plan.meals.map(m=>{
    const key=mealKey(date,m.id),done=mealDone(date,m);
    const row='<button class="meal-row meal-toggle '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+date+'\',\''+m.id+'\')"><span class="meal-check" aria-hidden="true">'+(done?'✓':'')+'</span><div class="meal-copy"><span class="meal-name">'+m.name+'</span>'+mealItemsMarkup(m)+'<div class="meal-macros"><span><b>P</b> '+m.protein+'g</span><span><b>C</b> '+m.carbs+'g</span><span><b>F</b> '+m.fat+'g</span></div></div><div class="meal-kcal"><b>'+m.kcal+'</b><span>kcal</span></div></button>';
    if(!m.configurable)return row;
    return '<div class="meal-configurable-wrap">'+row+'<button class="meal-swap-button" type="button" onclick="openMealConfigurator(\''+date+'\',\''+m.id+'\')"><span>↻</span> Swap meal</button></div>';
  }).join('')+'<div class="macro-total"><b>Daily macros</b><span>P '+plan.macroTotals.protein+'g</span><span>C '+plan.macroTotals.carbs+'g</span><span>F '+plan.macroTotals.fat+'g</span></div><div class="meal-note">'+plan.note+' Use labels or a food scale once to calibrate your usual portions.</div></div>';
}
function toggleMeal(date,id){
  const plan=mealPlan(new Date(date+'T00:00:00').getDay(),date);
  const meal=plan?.meals.find(m=>m.id===id);
  if(!meal)return;
  const key=mealKey(date,id),current=mealDone(date,meal);
  logs[key]={...(logs[key]||{}),done:!current};
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const day=new Date(date+'T00:00:00').getDay();
  document.querySelectorAll('[data-meal-key="'+key+'"]').forEach(el=>{
    el.classList.toggle('done',!current);
    const check=el.querySelector('.meal-check');
    if(check)check.textContent=!current?'✓':'';
  });
  updateIntakeStrips(day,date);
  if(settings.homeMode==='compact' && document.getElementById('homePage')?.classList.contains('active'))renderHome();
}
function compactMealChips(day,date){
  const plan=mealPlan(day,date);
  if(!plan)return '<div class="compact-empty">Set bodyweight to build meals</div>';
  if(!plan.meals.length)return '<div class="compact-fast">FAST DAY · water / plain coffee / tea</div>';
  return '<div class="compact-meal-grid">'+plan.meals.map(m=>{
    const key=mealKey(date,m.id),done=mealDone(date,m);
    const label=m.name.replace('Protein shake','Shake');
    const chip='<button class="compact-meal '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+date+'\',\''+m.id+'\')"><span class="meal-check">'+(done?'✓':'')+'</span><span class="compact-meal-name">'+label+'</span><span class="compact-meal-kcal">'+m.kcal+'</span></button>';
    return m.configurable?'<div class="compact-meal-wrap">'+chip+'<button class="compact-meal-swap" type="button" aria-label="Swap '+label+'" onclick="openMealConfigurator(\''+date+'\',\''+m.id+'\')">↻</button></div>':chip;
  }).join('')+'</div>';
}
function compactMealCount(day,date){
  const plan=mealPlan(day,date);
  if(!plan||!plan.meals.length)return '';
  const done=plan.meals.reduce((n,m)=>n+(mealDone(date,m)?1:0),0);
  return done+' / '+plan.meals.length+' ✓';
}

let mealConfiguratorDraft=null;
function mealConfiguratorLabels(){
  return {carb:'Carb',greens:'Greens',colour:'Coloured vegetables',legumes:'Legumes',protein:'Lean protein'};
}
function ensureMealConfigurator(){
  if(document.getElementById('mealConfiguratorOverlay'))return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="meal-config-overlay" id="mealConfiguratorOverlay" hidden onclick="if(event.target===this)closeMealConfigurator()">'+
      '<div class="meal-config-sheet" role="dialog" aria-modal="true" aria-labelledby="mealConfiguratorTitle">'+
        '<div id="mealConfiguratorContent"></div>'+
      '</div>'+
    '</div>'
  );
}
function openMealConfigurator(date,mealId){
  if(mealId!=='lunch'&&mealId!=='dinner')return;
  ensureMealConfigurator();
  const current=mealStackStoredConfig(date,mealId);
  mealConfiguratorDraft={date,mealId,selection:{...current.selection},matchTargets:current.matchTargets};
  renderMealConfigurator();
  const overlay=document.getElementById('mealConfiguratorOverlay');
  overlay.hidden=false;
  requestAnimationFrame(()=>overlay.classList.add('show'));
}
function closeMealConfigurator(){
  const overlay=document.getElementById('mealConfiguratorOverlay');
  if(!overlay)return;
  overlay.classList.remove('show');
  setTimeout(()=>{overlay.hidden=true},160);
  mealConfiguratorDraft=null;
}
function mealConfiguratorOptionMarkup(component,selected){
  return (mealStackLibrary()[component]||[]).map(food=>
    '<option value="'+food.id+'" '+(food.id===selected?'selected':'')+'>'+food.label+'</option>'
  ).join('');
}
function renderMealConfigurator(){
  if(!mealConfiguratorDraft)return;
  const d=mealConfiguratorDraft;
  const preview=mealStackPreview(d.mealId,d.selection,d.matchTargets);
  const labels=mealConfiguratorLabels();
  const content=document.getElementById('mealConfiguratorContent');
  if(!content)return;
  const title=d.mealId==='lunch'?'Lunch':'Dinner';
  const targetText=preview.target.kcal+' kcal · '+preview.target.protein+' g protein';
  const actualText=preview.macros.kcal+' kcal · P '+preview.macros.protein+' g · C '+preview.macros.carbs+' g · F '+preview.macros.fat+' g';
  content.innerHTML=
    '<div class="meal-config-head"><div><span class="meal-config-kicker">FIVE-COMPONENT MEAL</span><h2 id="mealConfiguratorTitle">'+title+' configurator</h2><p>'+d.date+'</p></div><button type="button" class="meal-config-close" onclick="closeMealConfigurator()" aria-label="Close">×</button></div>'+
    '<label class="meal-match-toggle"><span><b>Match current meal targets</b><small>Adjust carb and protein portions to stay close to '+targetText+'.</small></span><input type="checkbox" '+(d.matchTargets?'checked':'')+' onchange="mealConfiguratorSetMatch(this.checked)"><i></i></label>'+
    '<div class="meal-config-components">'+
      MEAL_STACK_COMPONENTS.map((component,index)=>{
        const food=mealStackFood(component,d.selection[component]);
        return '<div class="meal-config-component">'+
          '<div class="meal-config-number">'+(index+1)+'</div>'+
          '<div class="meal-config-choice"><label>'+labels[component]+'</label><select onchange="mealConfiguratorSetChoice(\''+component+'\',this.value)">'+mealConfiguratorOptionMarkup(component,d.selection[component])+'</select><small>~'+preview.grams[component]+' g · '+food.label+'</small></div>'+
          '<button type="button" class="meal-component-swap" onclick="mealConfiguratorSwap(\''+component+'\')">↻<span>Swap</span></button>'+
        '</div>';
      }).join('')+
    '</div>'+
    '<div class="meal-config-summary"><div><span>Configured meal</span><b>'+actualText+'</b></div><div><span>Target</span><b>'+targetText+'</b></div></div>'+
    '<button type="button" class="meal-swap-all" onclick="mealConfiguratorSwapAll()">↻ Swap all five</button>'+
    '<div class="meal-config-actions"><button type="button" onclick="mealConfiguratorReset()">Use defaults</button><button type="button" class="primary" onclick="mealConfiguratorSave()">Use for today</button></div>'+
    '<p class="meal-config-note">Portions and macros are representative cooked-food estimates. Eggs are intentionally not included in the protein choices.</p>';
}
function mealConfiguratorSetChoice(component,value){
  if(!mealConfiguratorDraft||!MEAL_STACK_COMPONENTS.includes(component))return;
  mealConfiguratorDraft.selection[component]=value;
  renderMealConfigurator();
}
function mealConfiguratorSetMatch(checked){
  if(!mealConfiguratorDraft)return;
  mealConfiguratorDraft.matchTargets=!!checked;
  renderMealConfigurator();
}
function mealConfiguratorSwap(component){
  if(!mealConfiguratorDraft)return;
  const list=mealStackLibrary()[component]||[];
  const current=mealConfiguratorDraft.selection[component];
  const index=Math.max(0,list.findIndex(x=>x.id===current));
  if(list.length)mealConfiguratorDraft.selection[component]=list[(index+1)%list.length].id;
  renderMealConfigurator();
}
function mealConfiguratorSwapAll(){
  if(!mealConfiguratorDraft)return;
  MEAL_STACK_COMPONENTS.forEach(component=>{
    const list=mealStackLibrary()[component]||[];
    const current=mealConfiguratorDraft.selection[component];
    const index=Math.max(0,list.findIndex(x=>x.id===current));
    if(list.length)mealConfiguratorDraft.selection[component]=list[(index+1)%list.length].id;
  });
  renderMealConfigurator();
}
function mealConfiguratorSave(){
  if(!mealConfiguratorDraft)return;
  const d=mealConfiguratorDraft;
  logs[mealStackConfigKey(d.date,d.mealId)]={
    selection:{...d.selection},
    matchTargets:!!d.matchTargets,
    updatedAt:new Date().toISOString()
  };
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  closeMealConfigurator();
  if(document.getElementById('homePage')?.classList.contains('active'))renderHome();
}
function mealConfiguratorReset(){
  if(!mealConfiguratorDraft)return;
  const d=mealConfiguratorDraft;
  delete logs[mealStackConfigKey(d.date,d.mealId)];
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const reset=mealStackStoredConfig(d.date,d.mealId);
  mealConfiguratorDraft={date:d.date,mealId:d.mealId,selection:{...reset.selection},matchTargets:reset.matchTargets};
  renderMealConfigurator();
  if(document.getElementById('homePage')?.classList.contains('active'))renderHome();
}

const MOTIVATION_QUOTES=[
  {text:"Don't count the days; make the days count.",by:"Muhammad Ali"},
  {text:"It's hard to beat a person who never gives up.",by:"Babe Ruth"},
  {text:"The first wealth is health.",by:"Ralph Waldo Emerson"},
  {text:"Energy and persistence conquer all things.",by:"Benjamin Franklin"},
  {text:"You miss 100% of the shots you don't take.",by:"Wayne Gretzky"},
  {text:"Exercise is king. Nutrition is queen.",by:"Jack LaLanne"},
  {text:"I can accept failure, but I can't accept not trying.",by:"Michael Jordan"},
  {text:"Everything negative is all an opportunity for me to rise.",by:"Kobe Bryant"},
  {text:"A champion is defined by how they recover when they fall.",by:"Serena Williams"},
  {text:"Strength does not come from winning.",by:"Arnold Schwarzenegger"},
  {text:"Champions keep playing until they get it right.",by:"Billie Jean King"},
  {text:"Start where you are. Use what you have. Do what you can.",by:"Arthur Ashe"}
]
function dailyMotivationQuote(date=todayISO()){
  const day=Math.floor(new Date(date+'T00:00:00').getTime()/86400000);
  return MOTIVATION_QUOTES[((day%MOTIVATION_QUOTES.length)+MOTIVATION_QUOTES.length)%MOTIVATION_QUOTES.length];
}
function sessionsLastSevenDays(){
  const today=new Date(todayISO()+'T00:00:00');
  let count=0;
  for(let i=0;i<7;i++){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const date=iso(d),day=d.getDay();
    reconcileStrengthSessionCompletion(date,day);
    if(completedOn(date,day))count++;
  }
  return count;
}
function streakBand(compact=false){
  const s=programProgressStats(),q=dailyMotivationQuote(),last7=sessionsLastSevenDays();
  const week=s.weekElapsed?(s.weekCompleted+'/'+s.weekElapsed):'—';
  const remaining=Math.max(0,s.programDays-s.completed);
  const progress=Math.max(0,Math.min(100,Math.round((s.completed/s.programDays)*100)));
  const quote=compact
    ? '<div class="streak-quote compact-quote" style="display:block!important;overflow:visible!important;height:auto!important;min-height:44px!important;padding:7px 10px 8px!important"><span class="streak-quote-text" style="display:block!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;-webkit-line-clamp:unset!important">“'+q.text+'”</span><span class="compact-quote-author" style="display:block!important;margin-top:2px!important;color:#c5c9cf!important;font-size:8.5px!important;font-weight:850!important;line-height:1.15!important;text-transform:none!important;white-space:normal!important;overflow:visible!important">— '+q.by+'</span></div>'
    : '<div class="streak-quote" style="display:block!important;overflow:visible!important;height:auto!important;min-height:48px!important;padding:9px 12px 10px!important"><span class="streak-quote-text" style="display:block!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;-webkit-line-clamp:unset!important">“'+q.text+'”</span><span class="streak-quote-by" style="display:block!important;margin-top:4px!important;white-space:normal!important;overflow:visible!important">— '+q.by+'</span></div>';
  return '<div class="streak-band momentum-card '+(compact?'compact-streak':'')+'">'+
    '<div class="momentum-head"><span>12-week momentum</span><b>'+remaining+' <small>to go</small></b></div>'+
    '<div class="momentum-progress" aria-label="'+progress+'% complete"><i style="width:'+progress+'%"></i></div>'+
    '<div class="momentum-metrics">'+
      '<div class="streak-main"><span>Last 7 days</span><b>'+last7+' session'+(last7===1?'':'s')+'</b></div>'+
      '<div class="streak-stat"><span>This week</span><b>'+week+'</b></div>'+
      '<div class="streak-stat"><span>Completed</span><b>'+s.completed+'/'+s.programDays+'</b></div>'+
    '</div>'+
    quote+
  '</div>';
}
function lucideTrophyMarkup(className='session-trophy-icon'){
  return '<svg class="'+className+'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
    '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>'+
    '<path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>'+
    '<path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>'+
    '<path d="M4 22h16"/>'+
    '<path d="M6 9a6 6 0 0 0 12 0V3H6z"/>'+
    '<path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>'+
  '</svg>';
}

function practiceKey(date=todayISO()){return 'practice:'+date+':pull-up'}
function practicePrescription(day=programDay()){
  const max=Math.max(0,Math.round(Number(settings.pullupMax)||0));
  const targetSets=3;
  if(day===1)return {enabled:false,reason:'strength-day',max,targetSets,reps:0,assisted:false,label:'No micro-sets'};
  if(max<=0)return {enabled:false,reason:'needs-max',max:0,targetSets,reps:0,assisted:false,label:'Set clean pull-up max'};
  const assisted=max<5;
  const reps=assisted?1:max===5?1:max===6?2:max<=8?3:max<=10?4:5;
  return {enabled:true,reason:'',max,targetSets,reps,assisted,label:assisted?'1 assisted rep':reps+' clean rep'+(reps===1?'':'s')};
}
function practiceState(date=todayISO()){
  const raw=logs[practiceKey(date)]||{};
  return {
    sets:Math.max(0,Math.min(3,Math.round(Number(raw.sets)||0))),
    stopped:!!raw.stopped,
    stopReason:raw.stopReason||'',
    updatedAt:raw.updatedAt||''
  };
}
function practiceDotsMarkup(state,targetSets=3,compact=false){
  return '<div class="practice-dots '+(compact?'compact-practice-dots':'')+'" aria-label="'+state.sets+' of '+targetSets+' practice sets complete">'+
    Array.from({length:targetSets},(_,i)=>'<span class="'+(i<state.sets?'done':'')+'" aria-hidden="true">'+(i<state.sets?'✓':i+1)+'</span>').join('')+
  '</div>';
}
function persistPractice(date,next){
  const key=practiceKey(date),previous=logs[key]&&typeof logs[key]==='object'?logs[key]:{};
  logs[key]={...previous,...next,updatedAt:new Date().toISOString()};
  motion12SetItem('motion12.logs',JSON.stringify(logs));
}
function refreshPracticeHome(){
  if(document.getElementById('homePage')?.classList.contains('active'))renderHome();
}
function completePracticeSet(){
  const date=todayISO(),rx=practicePrescription(),st=practiceState(date);
  if(!rx.enabled||st.stopped||st.sets>=rx.targetSets)return;
  persistPractice(date,{
    sets:st.sets+1,
    stopped:false,
    stopReason:'',
    movement:'pull-up',
    targetSets:rx.targetSets,
    prescribedReps:rx.reps,
    assisted:rx.assisted,
    cleanMaxAtPrescription:rx.max,
    rirFloor:4,
    lastCompletedAt:new Date().toISOString()
  });
  refreshPracticeHome();
}
function stopPracticeToday(){
  const date=todayISO(),rx=practicePrescription(),st=practiceState(date);
  if(!rx.enabled||st.sets>=rx.targetSets)return;
  persistPractice(date,{
    sets:st.sets,
    stopped:true,
    stopReason:'quality-threshold',
    stoppedAt:new Date().toISOString(),
    movement:'pull-up'
  });
  refreshPracticeHome();
}
function undoPracticeToday(){
  const date=todayISO(),st=practiceState(date);
  if(st.stopped){
    persistPractice(date,{stopped:false,stopReason:'',stoppedAt:null});
  }else if(st.sets>0){
    persistPractice(date,{sets:st.sets-1,lastCompletedAt:null});
  }else{
    return;
  }
  refreshPracticeHome();
}
function openPracticeSettings(){
  document.getElementById('settingsBtn')?.click();
  setTimeout(()=>{
    const input=document.getElementById('pullupMaxInput');
    if(!input)return;
    input.scrollIntoView({behavior:'smooth',block:'center'});
    input.focus();
  },120);
}
function practiceHomeMarkup(compact=false){
  const rx=practicePrescription(),st=practiceState(),done=st.sets>=rx.targetSets;

  if(compact){
    if(rx.reason==='strength-day'){
      return '<div class="compact-practice-strip gated">'+
        '<div class="compact-practice-copy"><span class="compact-label">Practice · Pull-up</span><b>Recovery gate</b><small>Pull-ups are already in Strength A today.</small></div>'+
        '<span class="compact-practice-status">SKIP</span>'+
      '</div>';
    }
    if(rx.reason==='needs-max'){
      return '<div class="compact-practice-strip setup">'+
        '<div class="compact-practice-copy"><span class="compact-label">Practice · Pull-up</span><b>Set a clean pull-up max</b><small>Used to keep micro-sets comfortably submaximal.</small></div>'+
        '<button class="compact-practice-setup" type="button" onclick="openPracticeSettings()">SET MAX</button>'+
      '</div>';
    }
    const actions=st.stopped
      ? '<div class="compact-practice-finished"><span>STOPPED</span><button type="button" onclick="undoPracticeToday()">UNDO</button></div>'
      : done
        ? '<div class="compact-practice-finished done"><span>DONE ✓</span><button type="button" onclick="undoPracticeToday()">UNDO</button></div>'
        : '<div class="compact-practice-actions"><button class="primary" type="button" onclick="completePracticeSet()">+ SET</button><button type="button" onclick="stopPracticeToday()">STOP</button>'+(st.sets?'<button type="button" onclick="undoPracticeToday()">UNDO</button>':'')+'</div>';
    return '<div class="compact-practice-strip '+(st.stopped?'stopped':done?'complete':'')+'">'+
      '<div class="compact-practice-copy"><span class="compact-label">Practice · Pull-up</span><b>'+rx.label+' · RIR ≥4</b><small>Aim for RIR 4–6; never grind a practice set.</small></div>'+
      '<div class="compact-practice-state">'+practiceDotsMarkup(st,rx.targetSets,true)+actions+'</div>'+
    '</div>';
  }

  if(rx.reason==='strength-day'){
    return '<section class="section practice-section"><div class="section-head"><h2>Practice</h2><small>strength skill</small></div>'+
      '<div class="card practice-card gated"><div class="practice-main"><div><span class="tag">Pull-up · recovery gate</span><h3>No micro-sets today</h3><p>Pull-ups are already trained in Strength A. Keep the separate Practice dose off so it does not become hidden extra volume.</p></div><span class="practice-status-chip">SKIP</span></div></div></section>';
  }
  if(rx.reason==='needs-max'){
    return '<section class="section practice-section"><div class="section-head"><h2>Practice</h2><small>strength skill</small></div>'+
      '<div class="card practice-card setup"><div class="practice-main"><div><span class="tag">Pull-up · setup</span><h3>Set your clean pull-up max</h3><p>MOTION12 uses it only to calculate deliberately easy Practice sets. Re-test after four weeks.</p></div><button class="practice-setup-btn" type="button" onclick="openPracticeSettings()">Set clean max</button></div></div></section>';
  }

  const actionMarkup=st.stopped
    ? '<div class="practice-stop-note"><b>Stopped for today.</b><span>The quality threshold was protected; do not make up the missed sets.</span></div><button type="button" onclick="undoPracticeToday()">Undo last action</button>'
    : done
      ? '<div class="practice-stop-note complete"><b>Practice complete.</b><span>Three fresh exposures are enough for today.</span></div><button type="button" onclick="undoPracticeToday()">Undo last set</button>'
      : '<button class="primary" type="button" onclick="completePracticeSet()">Set complete</button><button type="button" onclick="stopPracticeToday()">Too hard · stop today</button>'+(st.sets?'<button type="button" onclick="undoPracticeToday()">Undo last set</button>':'');

  return '<section class="section practice-section"><div class="section-head"><h2>Practice</h2><small>strength skill · micro-dose</small></div>'+
    '<div class="card practice-card '+(st.stopped?'stopped':done?'complete':'')+'">'+
      '<div class="practice-main"><div><span class="tag">Pull-up · clean max '+rx.max+'</span><h3>'+rx.label+' per set</h3><p>Spread 3 micro-sets through the day. Count a set only while technique stays crisp and you still have at least 4 reps in reserve; aim for 4–6.</p></div>'+
      '<div class="practice-progress">'+practiceDotsMarkup(st,rx.targetSets,false)+'<b>'+st.sets+' / '+rx.targetSets+'</b></div></div>'+
      '<div class="practice-actions">'+actionMarkup+'</div>'+
    '</div></section>';
}

function strengthWorkFullyComplete(date,day){
  if(![1,3,5].includes(day))return false;
  const sequence=strengthSessionSequence(day,date);
  return sequence.length>0&&sequence.every(item=>!!logs[item.id]?.done);
}
function reconcileStrengthSessionCompletion(date,day){
  if(!strengthWorkFullyComplete(date,day))return false;
  const key=date+'-'+day;
  if(logs[key]?.completed)return true;
  logs[key]={...(logs[key]||{}),completed:true,paused:false,completedAt:logs[key]?.completedAt||new Date().toISOString(),source:'all-strength-sequence-complete'};
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  return true;
}
function renderCompactHome(d,w,p,fat,cal,strip){
  const date=todayISO(),tot=intakeTotals(d,date),plan=mealPlan(d);
  const remaining=tot?.remaining;
  const loss=cal?cal.predictedLoss:'—';
  const mealCount=compactMealCount(d,date);
  const sessionComplete=completedOn(date,d),sessionIsPaused=sessionPaused(date+'-'+d);
  document.getElementById('homePage').classList.add('compact-active');
  document.getElementById('homePage').innerHTML=`
    <div class="compact-home">
      ${streakBand(true)}
      <button class="compact-session ${sessionComplete?'completed':''} ${sessionIsPaused?'paused':''}" type="button" onclick="${sessionIsPaused?`reopenSession('${date}-${d}')`:`openDay(${d},'${date}')`}">
        <div><span class="compact-kicker">Week ${w} · Today</span>${sessionComplete?'<span class="session-complete-label">✓ Session complete</span>':sessionIsPaused?'<span class="session-paused-label">Session paused</span>':''}<h1>${p.name}</h1><p>${weeklyTarget(d,w)} · ${p.why}</p></div>
        <div class="compact-session-right">
          ${sessionComplete?'<span class="compact-session-trophy" aria-label="Session completed">'+lucideTrophyMarkup('session-trophy-icon')+'</span>':''}
          <b>${p.time}</b>
          <span class="compact-session-cta">${sessionComplete?'REVIEW →':sessionIsPaused?'RESUME →':'START →'}</span>
        </div>
      </button>
      ${practiceHomeMarkup(true)}

      <div class="compact-week">${strip}</div>

      <div class="compact-metrics">
        <div class="compact-card">
          <span class="compact-label">Remaining today</span>
          <strong>${d===1?'FAST':remaining?remaining.kcal.toLocaleString()+' kcal':'—'}</strong>
          <small>${d===1?'0 kcal Monday':remaining?`P ${remaining.protein} · C ${remaining.carbs} · F ${remaining.fat} g`:'Set nutrition details'}</small>
        </div>
        <div class="compact-card">
          <span class="compact-label">Fat loss</span>
          <strong>${cal?'~'+loss+' kg/wk':'—'}</strong>
          <small>${cal?cal.eatingDay.toLocaleString()+' kcal eating day':fat?fat.low+'–'+fat.high+' kg/wk':'Set bodyweight'}</small>
        </div>
      </div>

      <div class="compact-card compact-meals-card">
        <div class="compact-card-head"><span class="compact-label">Food · ${plan?plan.total.toLocaleString()+' kcal':'—'}</span><b>${mealCount}</b></div>
        ${compactMealChips(d,date)}
      </div>

      <div class="compact-bottom-grid">
        <button class="compact-card compact-action" type="button" onclick="openMobilityToday()">
          <span class="compact-label">Mobility</span><strong>7 moves</strong><small>6–8 min · OPEN →</small>
        </button>
        <div class="compact-card">
          <span class="compact-label">Steps</span><strong>${settings.steps.toLocaleString()}</strong><small>daily baseline</small>
        </div>
      </div>
    </div>`;
}
function renderHome(){updateHomeModeToggle();const d=programDay(),w=weekNo(),p=program[d],diet=dietText(d),fat=fatLossTargets(),cal=calorieTargets();reconcileStrengthSessionCompletion(todayISO(),d);const sessionComplete=completedOn(todayISO(),d),sessionIsPaused=sessionPaused(todayISO()+'-'+d);const start=new Date(settings.startDate+'T00:00:00');const weekStart=new Date(start);weekStart.setDate(start.getDate()+(w-1)*7);let strip='';for(let i=0;i<7;i++){const dt=new Date(weekStart);dt.setDate(weekStart.getDate()+i);const dd=dt.getDay();const ds=iso(dt);reconcileStrengthSessionCompletion(ds,dd);strip+=`<button class="daydot ${dd===d&&ds===todayISO()?'today':''} ${completedOn(ds,dd)?'done':''}" onclick="openDay(${dd},'${ds}')"><b>${short[dd]}</b><span></span></button>`}
 document.getElementById('homePage').classList.remove('compact-active');
 if(settings.homeMode==='compact'){renderCompactHome(d,w,p,fat,cal,strip);return;}
 document.getElementById('homePage').innerHTML=`
  <div class="homegrid"><div>
  ${streakBand(false)}
  <section class="hero ${sessionComplete?'completed':''}">${sessionComplete?'<div class="hero-session-trophy" aria-label="Session completed">'+lucideTrophyMarkup('session-trophy-icon')+'</div>':''}<div class="eyebrow">Week ${w} · Today</div>${sessionComplete?'<div class="session-complete-label hero-complete-label">✓ Session complete</div>':sessionIsPaused?'<div class="session-paused-label hero-paused-label">Session paused</div>':''}<h1>${p.name}</h1><div class="sub">${p.why}</div><div class="hero-meta"><span class="pill">◷ ${p.time}</span><span class="pill">◎ ${settings.steps.toLocaleString()} steps baseline</span></div><button class="cta" onclick="${sessionIsPaused?`reopenSession('${todayISO()}-${d}')`:`openDay(${d},'${todayISO()}')`}"><span>${sessionComplete?'Review completed session':sessionIsPaused?'Resume today’s session':'Start today’s session'}</span><span>→</span></button></section>
  ${practiceHomeMarkup(false)}
  <section class="section"><div class="section-head"><h2>This week</h2><small>Week ${w} of 12</small></div><div class="weekstrip">${strip}</div><div class="progressbar"><i style="width:${Math.round((w-1)/11*100)}%"></i></div></section>
  </div><div>
  <section class="section"><div class="section-head"><h2>Why today</h2></div><div class="card accent"><span class="tag">Training logic</span><h3 style="margin-top:12px">${p.why}</h3><p style="margin-top:8px">Today’s progression: <b class="volt">${weeklyTarget(d,w)}</b></p></div></section>
  <section class="section"><div class="section-head"><h2>Food</h2><small>calories → portions</small></div>
  <div class="diet-grid">
    <div class="card diet-card"><span class="tag">Protein · eating day</span><div class="big">${protein()?`~${protein()} G`:`SET WEIGHT`}</div><p>${proteinSplit()?`Meals ${proteinSplit().breakfast}g / ${proteinSplit().lunch}g / ${proteinSplit().dinner}g + shake ${proteinSplit().shake}g + 2 lattes × ${proteinSplit().latte1}g + 3 fruit · weekly average ~${weeklyProteinAverage()} g/day with Monday fast`:`Add bodyweight to calculate protein.`}</p></div>
    <div class="card diet-card"><span class="tag">Calorie target</span><div class="big ${d===1?`fast`:``}">${d===1?`FAST`:cal?`~${cal.eatingDay}`:`SET DETAILS`}</div><p>${d===1?`0 kcal Monday assumption · this must match how you actually fast.`:cal?`kcal today · maintenance ~${cal.maintenance} · planned loss ~${cal.predictedLoss} kg/week · target ${fat.low}–${fat.high}`:`Add bodyweight; height/age/sex improve the estimate.`}</p></div>
  </div>
  ${mealRows(d,todayISO())}
  </section>
  <section class="section"><div class="section-head"><h2>Daily mobility</h2><small>6–8 min</small></div><button class="card row mobility-home-card" type="button" onclick="openMobilityToday()"><div><h3>7-move reset</h3><p>Neck · thoracic spine · shoulders · hips · lateral movement</p></div><div class="right">↗</div></button></section>
  </div></div>`;
}
let expandedDayCard=null;
function dayOverviewGroup(title,items,day,w,startIndex=1){
  if(!items?.length)return '';
  const rows=items.map((x,i)=>{
    let target=x[1]||'';
    if(day===6&&title==='Workout')target=aerobicTargets[w-1]||target;
    if(title==='Support')target=supportTarget(x,w);
    const num=title==='Workout'?String(startIndex+i).padStart(2,'0'):'';
    return '<div class="day-overview-exercise">'+
      (num?'<span class="day-overview-num">'+num+'</span>':'<span class="day-overview-dot">•</span>')+
      '<div><b>'+x[0]+'</b><small>'+target+'</small></div>'+
    '</div>';
  }).join('');
  return '<div class="day-overview-group"><div class="day-overview-group-title">'+title+'</div>'+rows+'</div>';
}
function toggleDayCard(day){
  expandedDayCard=expandedDayCard===day?null:day;
  renderDays();
  if(expandedDayCard!==null)setTimeout(()=>document.getElementById('day-card-'+day)?.scrollIntoView({behavior:'smooth',block:'nearest'}),20);
}
function dayOverviewMarkup(day,w,p){
  const prep=dayOverviewGroup('Movement prep',p.prep,day,w);
  const tendonAfter=Number.isInteger(p.tendonAfter)?p.tendonAfter:p.work.length;
  const primary=p.tendon?.length?dayOverviewGroup('Primary strength',p.work.slice(0,tendonAfter),day,w,1):dayOverviewGroup('Workout',p.work,day,w,1);
  const tendon=p.tendon?.length?dayOverviewGroup('Tendon capacity · '+(p.tendonFocus||'high force'),p.tendon,day,w):'';
  const finishers=p.tendon?.length?dayOverviewGroup('Finishers / accessories',p.work.slice(tendonAfter),day,w,tendonAfter+1):'';
  const support=dayOverviewGroup('Support',p.support,day,w);
  const aerobicAlternate=day===6?'<div class="day-overview-note"><b>Alternate B:</b> kettlebell + bodyweight · 4:00 work / 3:00 recovery × 4 rounds.</div>':'';
  return '<div class="day-overview">'+prep+primary+tendon+finishers+support+aerobicAlternate+
    '<div class="day-overview-note">Daily mobility reset is available inside the session.</div>'+
    '<button class="day-session-btn '+p.tone+'" type="button" onclick="event.stopPropagation();openDay('+day+')"><span>Go to session</span><span>→</span></button>'+
  '</div>';
}
function renderDays(){
  const d=programDay(),w=weekNo();
  let html=`<div class="page-title"><div class="eyebrow">Week ${w}</div><h1>Your week</h1><p>Tap a day to preview its exercises. Open the full session when you are ready to train.</p></div><div class="section day-list cards">`;
  [1,2,3,4,5,6,0].forEach(day=>{
    const p=program[day],expanded=expandedDayCard===day;
    html+=`<div id="day-card-${day}" class="card day-card ${day===d?'todaycard':''} ${expanded?'expanded':''}" role="button" tabindex="0" aria-expanded="${expanded}" onclick="toggleDayCard(${day})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleDayCard(${day})}">
      <div class="day-card-head">
        <div class="day-card-copy">
          <div class="label">${DAYS[day]} · ${p.time}</div>
          <h3>${p.name}</h3>
          <p>${day===6?weeklyTarget(day,w)+' · A / B available':weeklyTarget(day,w)}</p>
        </div>
        <div class="day-chevron ${p.tone}" aria-hidden="true">⌄</div>
      </div>
      ${expanded?dayOverviewMarkup(day,w,p):''}
    </div>`;
  });
  html+='</div>';
  document.getElementById('daysPage').innerHTML=html;
}
function exId(day,i,date){return `${date}-${day}-${i}`}
function dateForProgramDay(day){const s=new Date(settings.startDate+'T00:00:00');const w=weekNo();const monday=new Date(s);monday.setDate(s.getDate()+(w-1)*7);const offset=day===0?6:day-1;const d=new Date(monday);d.setDate(monday.getDate()+offset);return iso(d)}
function loadGuideMarkup(guide){
  if(!guide)return '';
  const html=guide
    .replace(/START:/g,'<b>Start:</b>')
    .replace(/INCREASE:/g,'<b>Increase:</b>')
    .replace(/BODYWEIGHT:/g,'<b>Bodyweight:</b>')
    .replace(/HOLD or reduce/g,'<b>Hold or reduce</b>')
    .replace(/REDUCE immediately/g,'<b>Reduce immediately</b>')
    .replace(/REDUCE one bell/g,'<b>Reduce one bell</b>');
  return '<div class="tip load-rule"><span class="load-rule-label">Loading</span><p>'+html+'</p></div>';
}
function saveInlineTimer(){motion12SetItem('motion12.inlineTimer',JSON.stringify(inlineTimer))}
function inlineTimerSeconds(){
  return inlineTimer.running?Math.max(0,Math.ceil((inlineTimer.endAt-Date.now())/1000)):Math.max(0,inlineTimer.remaining||0);
}
function inlineTimerPreset(name,day,target,isSupport=false){
  const m=String(target||'').match(/(\d+)\s*sec\s*work\s*\/\s*(\d+)\s*sec/i);
  if(m)return {kind:'workrest',work:Number(m[1]),rest:Number(m[2]),label:'Exercise interval'};
  const iso=String(target||'').match(/^\s*(\d+)\s*×\s*(\d+)\s*sec(?:\s*\/\s*side)?/i);
  if(/isometric/i.test(name)&&iso)return {kind:'workrest',work:Number(iso[2]),rest:25,label:'High-force isometric hold'};
  if(isSupport){
    if(name==='Back extension')return {kind:'rest',rest:60,label:'Support recovery'};
    if(name==='Sliding hamstring curl')return {kind:'rest',rest:45,label:'Support recovery'};
    return {kind:'rest',rest:60,label:'Support recovery'};
  }
  const rec=exerciseRestPreset(name,day,weekNo());
  const sm=String(target||'').match(/^\s*(\d+)\s*×\s*(.+)$/i);
  if([1,3,5].includes(day)&&sm)return {kind:'strengthsets',sets:Number(sm[1]),target:sm[2],rest:rec.seconds||90,label:rec.category+' set flow'};
  if(rec.action==='rest')return {kind:'rest',rest:rec.seconds||90,label:rec.category+' recovery'};
  return {kind:'session',rest:0,label:'Session timer'};
}
function inlineTimerMarkup(id){
  if(inlineTimer.activeId!==id)return '';
  if(inlineTimer.kind==='session'){
    return '<div class="inline-ex-timer" id="inlineExerciseTimer"><div class="inline-timer-main"><span>SESSION TIMER</span><b>Use the full dial above</b></div><div class="inline-timer-actions"><button type="button" class="inline-close" aria-label="Close timer note" onclick="event.stopPropagation();closeInlineExerciseTimer()">×</button></div></div>';
  }
  if(inlineTimer.kind==='strengthsets'){
    const sec=inlineTimerSeconds(),readySet=Math.min(inlineTimer.sets,inlineTimer.setIndex+1);
    const isRest=inlineTimer.phase==='rest',isDone=inlineTimer.phase==='complete';
    const phase=isDone?'ALL SETS DONE':isRest?'REST':'SET '+readySet+' READY';
    const main=isDone?'✓':isRest?timerFormat(sec):(inlineTimer.target||'SET');
    const meta=isDone?inlineTimer.exerciseName:(isRest?'Next · Set '+(inlineTimer.setIndex+1)+' of '+inlineTimer.sets:inlineTimer.exerciseName+' · '+readySet+' of '+inlineTimer.sets);
    const actions=isDone
      ?'<button type="button" class="inline-timer-primary" onclick="event.stopPropagation();inlineTimerReset()">Start over</button>'
      :isRest
        ?'<button type="button" class="inline-timer-primary" onclick="event.stopPropagation();inlineTimerStartPause()">'+(inlineTimer.running?'Pause':'Resume')+'</button><button type="button" onclick="event.stopPropagation();inlineSkipStrengthRest()">Skip rest</button>'
        :'<button type="button" class="inline-timer-primary" onclick="event.stopPropagation();inlineStrengthSetComplete()">Set complete</button>';
    return '<div class="inline-ex-timer" id="inlineExerciseTimer"><div class="inline-timer-main"><span id="inlineTimerPhase">'+phase+'</span><strong id="inlineTimerClock">'+main+'</strong><small id="inlineTimerMeta">'+meta+'</small></div><div class="inline-timer-actions" id="inlineTimerActions">'+actions+'<button type="button" onclick="event.stopPropagation();inlineTimerReset()">Reset</button><button type="button" class="inline-close" aria-label="Close timer" onclick="event.stopPropagation();closeInlineExerciseTimer()">×</button></div></div>';
  }
  const sec=inlineTimerSeconds(),phase=inlineTimer.phase==='work'?'WORK':inlineTimer.phase==='rest'?'REST / TRANSITION':inlineTimer.phase==='complete'?'DONE':'REST';
  const primary=inlineTimer.phase==='complete'?'Again':(inlineTimer.running?'Pause':'Start');
  return '<div class="inline-ex-timer" id="inlineExerciseTimer">'+
    '<div class="inline-timer-main"><span id="inlineTimerPhase">'+phase+'</span><strong id="inlineTimerClock">'+timerFormat(sec)+'</strong><small>'+inlineTimer.exerciseName+'</small></div>'+
    '<div class="inline-timer-actions"><button type="button" class="inline-timer-primary" onclick="event.stopPropagation();inlineTimerStartPause()">'+primary+'</button>'+
    '<button type="button" onclick="event.stopPropagation();inlineTimerReset()">Reset</button>'+
    '<button type="button" class="inline-close" aria-label="Close timer" onclick="event.stopPropagation();closeInlineExerciseTimer()">×</button></div>'+
  '</div>';
}
function activateExerciseTimerFromCard(event,card){
  if(event.target.closest('button,input,a,select,textarea,label'))return;
  const id=card.dataset.timerId,day=Number(card.dataset.timerDay),name=decodeURIComponent(card.dataset.timerName||''),target=decodeURIComponent(card.dataset.timerTarget||''),isSupport=card.dataset.timerSupport==='1';
  if(!id||!name)return;
  if(inlineTimer.activeId===id)return;
  const preset=inlineTimerPreset(name,day,target,isSupport);
  inlineTimer={...defaultInlineTimer,activeId:id,exerciseName:name,kind:preset.kind,work:preset.work||0,rest:preset.rest||0,sets:preset.sets||0,setIndex:0,target:preset.target||'',phase:preset.kind==='strengthsets'?'ready':preset.kind==='workrest'?'work':'rest',duration:preset.kind==='strengthsets'?(preset.rest||0):preset.kind==='workrest'?(preset.work||0):(preset.rest||0),remaining:preset.kind==='strengthsets'?0:preset.kind==='workrest'?(preset.work||0):(preset.rest||0)};
  saveInlineTimer();
  document.querySelectorAll('.exercise.active-timer').forEach(el=>el.classList.remove('active-timer'));
  document.querySelectorAll('.inline-ex-timer').forEach(el=>el.remove());
  card.classList.add('active-timer');
  card.querySelector('.ex-top')?.insertAdjacentHTML('afterend',inlineTimerMarkup(id));
  card.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function inlineTimerStartPause(){
  timerPrimeAudio();
  if(inlineTimer.kind==='session')return;
  if(inlineTimer.kind==='strengthsets'&&!['rest','work'].includes(inlineTimer.phase))return;
  if(inlineTimer.phase==='complete'){
    inlineTimer.phase=inlineTimer.kind==='workrest'?'work':'rest';
    inlineTimer.duration=inlineTimer.kind==='workrest'?inlineTimer.work:inlineTimer.rest;
    inlineTimer.remaining=inlineTimer.duration;
  }
  if(inlineTimer.running){
    inlineTimer.remaining=inlineTimerSeconds();
    inlineTimer.running=false;inlineTimer.endAt=0;
  }else{
    if(inlineTimerSeconds()<=0){
      inlineTimer.duration=inlineTimer.phase==='work'?inlineTimer.work:inlineTimer.rest;
      inlineTimer.remaining=inlineTimer.duration;
    }
    inlineTimer.endAt=Date.now()+inlineTimer.remaining*1000;
    inlineTimer.running=true;
  }
  saveInlineTimer();inlineTimerEnsureTick();updateInlineExerciseTimer();
}
function inlineStrengthSetComplete(){
  timerPrimeAudio();
  if(inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='ready')return;
  inlineTimer.setIndex++;
  inlineTimer.finalRest=inlineTimer.setIndex>=inlineTimer.sets;
  inlineTimer.phase='rest';
  inlineTimer.duration=inlineTimer.rest||90;
  inlineTimer.remaining=inlineTimer.duration;
  inlineTimer.endAt=Date.now()+inlineTimer.duration*1000;
  inlineTimer.running=true;
  saveInlineTimer();inlineTimerEnsureTick();
  const box=document.getElementById('inlineExerciseTimer');if(box)box.outerHTML=inlineTimerMarkup(inlineTimer.activeId);
}
function inlineSkipStrengthRest(){
  if(inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='rest')return;
  const currentId=inlineTimer.activeId,finalRest=!!inlineTimer.finalRest||inlineTimer.setIndex>=inlineTimer.sets;
  inlineTimer.running=false;inlineTimer.remaining=0;inlineTimer.endAt=0;
  inlineTimer.phase=finalRest?'complete':'ready';
  inlineTimer.finalRest=false;
  saveInlineTimer();timerBeep();
  if(finalRest){
    strengthAdvanceAfterFinalRest(currentId,{syncInline:true,syncSmart:true,scroll:true});
    return;
  }
  const box=document.getElementById('inlineExerciseTimer');if(box)box.outerHTML=inlineTimerMarkup(inlineTimer.activeId);
}
function inlineTimerReset(){
  inlineTimer.running=false;inlineTimer.endAt=0;
  inlineTimer.setIndex=0;
  inlineTimer.phase=inlineTimer.kind==='strengthsets'?'ready':inlineTimer.kind==='workrest'?'work':'rest';
  inlineTimer.duration=inlineTimer.kind==='workrest'?inlineTimer.work:inlineTimer.rest;
  inlineTimer.remaining=inlineTimer.kind==='strengthsets'?0:inlineTimer.duration;
  saveInlineTimer();
  if(inlineTimer.kind==='strengthsets'){
    const box=document.getElementById('inlineExerciseTimer');if(box)box.outerHTML=inlineTimerMarkup(inlineTimer.activeId);
  }else updateInlineExerciseTimer();
}
function closeInlineExerciseTimer(){
  inlineTimer={...defaultInlineTimer};
  saveInlineTimer();
  document.querySelectorAll('.exercise.active-timer').forEach(el=>el.classList.remove('active-timer'));
  document.querySelectorAll('.inline-ex-timer').forEach(el=>el.remove());
}
function inlineTimerTick(){
  if(!inlineTimer.running){updateStrengthFlowLive();updateInlineExerciseTimer();return}
  const now=Date.now();
  if(now>=inlineTimer.endAt){
    const previousEnd=inlineTimer.endAt;
    if(inlineTimer.kind==='strengthsets'&&inlineTimer.phase==='work'){
      const activeCard=document.getElementById('ex-'+inlineTimer.activeId);
      const activeName=decodeURIComponent(activeCard?.dataset?.timerName||'');
      if(/isometric/i.test(activeName)){
        const entries=strengthSetLogEntries(inlineTimer.activeId,inlineTimer.sets||1);
        const idx=Math.max(0,Math.min((inlineTimer.sets||1)-1,inlineTimer.setIndex||0));
        entries[idx]=entries[idx]||{};
        if(!entries[idx].reps)entries[idx].reps=inlineTimer.workSeconds||inlineTimer.duration||5;
        logs[inlineTimer.activeId].sets=entries;
        motion12SetItem('motion12.logs',JSON.stringify(logs));
      }
      inlineTimer.running=false;
      inlineTimer.phase='ready';
      inlineTimer.remaining=0;
      inlineTimer.endAt=0;
      timerBeep();
      saveInlineTimer();
      refreshStrengthFlowById(inlineTimer.activeId);
      return;
    }
    if(inlineTimer.kind==='strengthsets'&&inlineTimer.phase==='rest'){
      const currentId=inlineTimer.activeId,finalRest=!!inlineTimer.finalRest||inlineTimer.setIndex>=inlineTimer.sets;
      inlineTimer.running=false;
      inlineTimer.phase=finalRest?'complete':'ready';
      inlineTimer.remaining=0;
      inlineTimer.endAt=0;
      inlineTimer.finalRest=false;
      timerBeep();
      saveInlineTimer();
      if(finalRest){
        strengthAdvanceAfterFinalRest(currentId,{syncInline:true,syncSmart:true,scroll:true});
        return;
      }
      const box=document.getElementById('inlineExerciseTimer');if(box)box.outerHTML=inlineTimerMarkup(inlineTimer.activeId);
      refreshStrengthFlow();
      return;
    }
    if(inlineTimer.kind==='workrest'&&inlineTimer.phase==='work'&&inlineTimer.rest>0){
      inlineTimer.phase='rest';inlineTimer.duration=inlineTimer.rest;inlineTimer.remaining=inlineTimer.rest;inlineTimer.endAt=previousEnd+inlineTimer.rest*1000;timerBeep();
    }else{
      inlineTimer.running=false;inlineTimer.phase='complete';inlineTimer.remaining=0;inlineTimer.endAt=0;timerBeep();
    }
    saveInlineTimer();
  }
  updateStrengthFlowLive();
  updateInlineExerciseTimer();
}
function inlineTimerEnsureTick(){
  if(inlineTimerInt)return;
  inlineTimerInt=setInterval(inlineTimerTick,250);
}
function updateInlineExerciseTimer(){
  const box=document.getElementById('inlineExerciseTimer');
  if(!box||!inlineTimer.activeId)return;
  const sec=inlineTimerSeconds();
  if(inlineTimer.kind==='strengthsets'){
    const phaseEl=document.getElementById('inlineTimerPhase');if(phaseEl)phaseEl.textContent=inlineTimer.phase==='rest'?'REST':inlineTimer.phase==='complete'?'ALL SETS DONE':'SET '+Math.min(inlineTimer.sets,inlineTimer.setIndex+1)+' READY';
    const clock=document.getElementById('inlineTimerClock');if(clock)clock.textContent=inlineTimer.phase==='rest'?timerFormat(sec):inlineTimer.phase==='complete'?'✓':(inlineTimer.target||'SET');
    const primary=box.querySelector('.inline-timer-primary');
    if(primary&&inlineTimer.phase==='rest')primary.textContent=inlineTimer.running?'Pause':'Resume';
    return;
  }
  const phase=inlineTimer.phase==='work'?'WORK':inlineTimer.phase==='rest'?'REST / TRANSITION':inlineTimer.phase==='complete'?'DONE':'REST';
  const phaseEl=document.getElementById('inlineTimerPhase');if(phaseEl)phaseEl.textContent=phase;
  const clock=document.getElementById('inlineTimerClock');if(clock)clock.textContent=timerFormat(sec);
  const primary=box.querySelector('.inline-timer-primary');
  if(primary)primary.textContent=inlineTimer.phase==='complete'?'Again':(inlineTimer.running?'Pause':'Start');
}
function supportTarget(exercise,w){
  if(exercise[0]==='Sliding hamstring curl'){
    const sets=(w<=2||w===8||w===12)?1:2;
    return sets+' × 8–12';
  }
  return exercise[1];
}
function prepBlockMarkup(day,date,p){
  if(!p.prep?.length)return '';
  const cards=p.prep.map((x,i)=>{
    const id=`${date}-${day}-prep-${i}`,state=logs[id]||{};
    return `<div class="exercise prep-exercise ${state.done?'complete':''}" id="ex-${id}">
      <div class="ex-top"><div class="num">P${i+1}</div><div class="ex-name"><h3>${x[0]} ${videoButtons(x[0])}</h3><p>${x[1]}</p></div><button class="check" type="button" onclick="event.stopPropagation();toggleExercise('${id}')"></button></div>
      <div class="tip">${x[2]}</div>
    </div>`;
  }).join('');
  return `<section class="section prep-section"><div class="section-head"><h2>Movement prep</h2><small>light · controlled</small></div>${cards}</section>`;
}
function supportBlockMarkup(day,date,w,p){
  if(!p.support?.length)return '';
  const cards=p.support.map((x,i)=>{
    const id=`${date}-${day}-support-${i}`,state=logs[id]||{},target=supportTarget(x,w);
    const timerName=encodeURIComponent(x[0]),timerTarget=encodeURIComponent(target);
    return `<div class="exercise support-exercise ${state.done?'complete':''} ${inlineTimer.activeId===id?'active-timer':''}" id="ex-${id}" data-timer-id="${id}" data-timer-day="${day}" data-timer-name="${timerName}" data-timer-target="${timerTarget}" data-timer-support="1" onclick="activateExerciseTimerFromCard(event,this)">
      <div class="ex-top"><div class="num">S${i+1}</div><div class="ex-name"><h3>${x[0]} ${videoButtons(x[0])}</h3><p>${target}</p></div><button class="check" onclick="toggleExercise('${id}')"></button></div>
      ${inlineTimerMarkup(id)}
      <div class="inputs"><div class="field"><label>Load / variation</label><input value="${state.load||''}" placeholder="bodyweight / light KB" oninput="saveEx('${id}','load',this.value)"></div><div class="field"><label>Actual</label><input value="${state.reps||''}" placeholder="sets/reps" oninput="saveEx('${id}','reps',this.value)"></div><div class="field"><label>RIR / effort</label><input value="${state.rir||''}" placeholder="3–4 RIR" oninput="saveEx('${id}','rir',this.value)"></div></div>
      <div class="tip">${x[2]}</div><div class="tip progress-rule"><b>Progress:</b> ${x[3]}</div>
    </div>`;
  }).join('');
  return `<section class="section support-section"><div class="section-head"><h2>Support block</h2><small>fill gaps · low fatigue</small></div>${cards}</section>`;
}
function activateTendonStrengthCard(event,card){
  if(event.target.closest('button,input,a,select,textarea,label'))return;
  const id=card.dataset.timerId,name=decodeURIComponent(card.dataset.timerName||''),target=decodeURIComponent(card.dataset.timerTarget||'');
  if(!id||!name||!target)return;
  document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>el.classList.remove('session-current','compact-current'));
  card.classList.add('session-current');
  if(document.getElementById('dayPage')?.classList.contains('compact-active'))card.classList.add('compact-current');
  strengthEnsureTimer(id,name,target);
  smartTimer.exerciseName=name;
  smartTimer.exerciseCategory='Strength';
  timerConfigure('session',true);
  const item=strengthSessionItemById(id);
  if(item)refreshStrengthSessionProgress(item.day,item.date);
  refreshStrengthFlowById(id);
  if(document.getElementById('sessionTimerMount'))renderTimerPage();
  if(document.getElementById('dayPage')?.classList.contains('compact-active'))card.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function tendonBlockMarkup(day,date,p){
  if(!p.tendon?.length)return '';
  const cards=p.tendon.map((x,i)=>{
    const id=`${date}-${day}-tendon-${i}`,state=logs[id]||{},target=x[1]||'';
    const timerName=encodeURIComponent(x[0]),timerTarget=encodeURIComponent(target);
    return `<div class="exercise strength-session-slice tendon-capacity ${state.done?'complete':''}" id="ex-${id}" data-timer-id="${id}" data-timer-day="${day}" data-timer-name="${timerName}" data-timer-target="${timerTarget}" data-timer-support="1" onclick="activateTendonStrengthCard(event,this)">
      <div class="ex-top"><div class="num">T${i+1}</div><div class="ex-name"><h3>${x[0]}</h3><p>${target}</p></div><button class="check" onclick="event.stopPropagation();toggleExercise('${id}')"></button></div>
      ${strengthSetFlowMarkup(id,x[0],target)}
      ${exerciseNoteMarkup(id,state)}
      <div class="tip tendon-coaching">${x[2]}</div><div class="tip progress-rule tendon-progression"><b>Progress:</b> ${x[3]}</div>
    </div>`;
  }).join('');
  return `<section class="section tendon-capacity-section"><div class="section-head"><h2>Tendon capacity</h2><small>${p.tendonFocus||'high force · short holds'}</small></div><div class="tip tendon-capacity-note"><b>Placement:</b> after primary compound strength, before lower-priority accessories. Build force smoothly; do not turn the holds into endurance work.</div>${cards}</section>`;
}

/* Canonical workout-session content order.
   View modes may change presentation only; they must not reorder or remove stages. */
const WORKOUT_SESSION_STAGE_ORDER=Object.freeze([
  'mobility',
  'prep',
  'progress',
  'timer',
  'main',
  'support',
  'complete'
]);
function workoutSessionStageMarkup(stage,content){
  if(!content)return '';
  return `<div class="session-stage session-stage-${stage}" data-session-stage="${stage}">${content}</div>`;
}
function workoutSessionMarkup({mobilityHtml,prepHtml,mainHtml,supportHtml,completeHtml}){
  const stages={
    mobility:mobilityHtml,
    prep:prepHtml,
    progress:'<div class="workout-progress-block" id="sessionProgressMount"></div>',
    timer:'<div class="workout-timer-block" id="sessionTimerMount"></div>',
    main:mainHtml,
    support:supportHtml,
    complete:completeHtml
  };
  return '<div class="workout-session" data-session-order="'+WORKOUT_SESSION_STAGE_ORDER.join(' ')+'">'+
    WORKOUT_SESSION_STAGE_ORDER.map(stage=>workoutSessionStageMarkup(stage,stages[stage])).join('')+
  '</div>';
}

const strengthSetFlowNames=new Set([
  'Goblet squat',
  'Pull-up / assisted pull-up',
  'Kettlebell Romanian deadlift',
  '1-arm kettlebell press',
  'Suitcase carry',
  'Plank shoulder tap',
  'Reverse lunge',
  'Push-up',
  '1-arm kettlebell row',
  'Back extension',
  'Single-leg calf raise',
  'Kettlebell woodchop',
  'Lateral lunge',
  'Ring row',
  'Plank shoulder tap / kettlebell woodchop'
]);
function strengthFlowDayFromId(id){
  const text=String(id);
  let m=text.match(/^\d{4}-\d{2}-\d{2}-(\d+)-\d+$/);
  if(m)return Number(m[1]);
  m=text.match(/^\d{4}-\d{2}-\d{2}-(\d+)-tendon-\d+$/);
  return m?Number(m[1]):programDay();
}
function tendonSessionPosition(id){
  const m=String(id).match(/^(\d{4}-\d{2}-\d{2})-(\d+)-tendon-(\d+)$/);
  if(!m)return null;
  return {date:m[1],day:Number(m[2]),index:Number(m[3])};
}
function strengthSessionSequence(day,date){
  if(![1,3,5].includes(day))return [];
  const p=program[day]||{},work=p.work||[],tendon=p.tendon||[];
  const requested=Number.isInteger(p.tendonAfter)?p.tendonAfter:work.length;
  const tendonAfter=tendon.length?Math.max(0,Math.min(work.length,requested)):work.length;
  const sequence=[];
  const addWork=(sourceIndex)=>{
    const item=work[sourceIndex];
    if(!item)return;
    sequence.push({
      kind:'work',
      sourceIndex,
      id:exId(day,sourceIndex,date),
      name:item[0],
      target:item[1],
      day,date
    });
  };
  for(let i=0;i<tendonAfter;i++)addWork(i);
  tendon.forEach((item,sourceIndex)=>{
    sequence.push({
      kind:'tendon',
      sourceIndex,
      id:date+'-'+day+'-tendon-'+sourceIndex,
      name:item[0],
      target:item[1],
      day,date
    });
  });
  for(let i=tendonAfter;i<work.length;i++)addWork(i);
  return sequence.map((item,index)=>({...item,index,total:sequence.length}));
}
function strengthSessionItemById(id){
  const text=String(id);
  const pos=strengthSessionPosition(text)||tendonSessionPosition(text);
  if(!pos||![1,3,5].includes(pos.day))return null;
  return strengthSessionSequence(pos.day,pos.date).find(item=>item.id===text)||null;
}
function strengthFlowDayLabel(id){
  return DAYS[strengthFlowDayFromId(id)]||'Next session';
}
function strengthTimedWorkConfig(target){
  const text=String(target||'');
  let m=text.match(/×\s*(\d+)\s*sec(\s*\/\s*side)?/i);
  if(m)return {enabled:true,min:Number(m[1]),max:Number(m[1]),perSide:!!m[2]};
  m=text.match(/(\d+)\s*[–-]\s*(\d+)\s*sec(\s*\/\s*side)?/i);
  if(m)return {enabled:true,min:Number(m[1]),max:Number(m[2]),perSide:!!m[3]};
  m=text.match(/(\d+)\s*sec(\s*\/\s*side)?/i);
  if(m)return {enabled:true,min:Number(m[1]),max:Number(m[1]),perSide:!!m[2]};
  return {enabled:false,min:0,max:0,perSide:false};
}
function strengthFlowConfig(name,target){
  const parsed=String(target||'').match(/^\s*(\d+)\s*×\s*(.+)$/i);
  const range=String(target||'').match(/(\d+)\s*[–-]\s*(\d+)/);
  const timedWork=strengthTimedWorkConfig(target);
  const isIsometric=/isometric/i.test(name);
  const base={
    sets:parsed?Number(parsed[1]):3,
    targetText:parsed?parsed[2]:'6–10',
    low:range?Number(range[1]):6,
    top:range?Number(range[2]):10,
    loadPlaceholder:'kg',
    loadInputMode:'decimal',
    repsPlaceholder:range?(range[1]+'–'+range[2]):'reps',
    noun:'load',
    timedWork:timedWork.enabled,
    workSeconds:timedWork.min,
    workMaxSeconds:timedWork.max,
    workPerSide:timedWork.perSide,
    advanceTitle:'Increase load',
    advanceText:'Increase the working load one step and return toward the lower end of the prescribed range.'
  };
  if(isIsometric)return {...base,
    targetText:(timedWork.workSeconds||timedWork.min||5)+' sec'+(timedWork.perSide?' / side':''),
    low:timedWork.min||5,
    top:timedWork.max||timedWork.min||5,
    loadPlaceholder:'BW / kg',
    loadInputMode:'text',
    repsPlaceholder:(timedWork.min||5)+' sec',
    noun:'load',
    timedWork:true,
    workSeconds:timedWork.min||5,
    workMaxSeconds:timedWork.max||timedWork.min||5,
    workPerSide:timedWork.perSide,
    effortLabel:'Effort',
    effortPlaceholder:'8–9',
    effortMax:10,
    advanceTitle:'Increase tendon load',
    advanceText:'Increase external load by the smallest practical step while keeping the same short hold duration and controlled position.'
  };
  if(name==='Goblet squat')return {...base,
    advanceText:'Move to the next available kettlebell and return toward the lower end of the '+base.low+'–'+base.top+' rep range.'
  };
  if(name==='Pull-up / assisted pull-up')return {...base,
    loadPlaceholder:'BW / +kg / assist',loadInputMode:'text',noun:'load / assistance',
    advanceTitle:'Progress the pull-up',
    advanceText:'If weighted, add 1–2 kg. If assisted, reduce assistance one step and return toward the lower end of the rep range.'
  };
  if(name==='Kettlebell Romanian deadlift')return {...base,
    advanceText:'Increase the working load one step and return toward the lower end of the '+base.low+'–'+base.top+' rep range.'
  };
  if(name==='1-arm kettlebell press')return {...base,
    advanceText:'Move to the next kettlebell if available, then return toward the lower end of the rep range per side. Let the weaker arm govern.'
  };
  if(name==='Suitcase carry')return {...base,
    low:45,top:60,repsPlaceholder:'45–60 sec',noun:'load',
    advanceText:'Move to the next kettlebell and reset the carry toward 30–45 seconds per side before building back to 60.'
  };
  if(name==='Plank shoulder tap')return {...base,
    loadPlaceholder:'BW / stance',loadInputMode:'text',noun:'variation',
    advanceTitle:'Progress the variation',
    advanceText:'Keep bodyweight and make the movement harder by narrowing the stance slightly or slowing the tempo while keeping the hips quiet.'
  };
  if(name==='Reverse lunge')return {...base,
    advanceText:'Increase the kettlebell one step and return toward the lower end of the rep range per leg.'
  };
  if(name==='Push-up')return {...base,
    loadPlaceholder:'variation',loadInputMode:'text',noun:'variation',
    advanceTitle:'Progress the push-up variation',
    advanceText:'Move to a harder variation: lower the incline, progress to floor, elevate the feet, or use rings while preserving the same depth and control.'
  };
  if(name==='1-arm kettlebell row')return {...base,
    advanceText:'Move to the next kettlebell and return toward the lower end of the rep range per side.'
  };
  if(name==='Back extension')return {...base,
    loadPlaceholder:'BW / kg',loadInputMode:'text',noun:'load / variation',
    advanceTitle:'Progress the back extension',
    advanceText:'If bodyweight is controlled, add a light kettlebell held at the chest; otherwise increase the existing load only slightly.'
  };
  if(name==='Single-leg calf raise')return {...base,
    loadPlaceholder:'BW / kg',loadInputMode:'text',noun:'load / variation',
    advanceTitle:'Progress the calf raise',
    advanceText:'Add a kettlebell or increase the existing load while keeping the full stretch and top pause.'
  };
  if(name==='Kettlebell woodchop')return {...base,
    advanceText:'Increase the kettlebell slightly while keeping crisp control through the feet, hips and trunk.'
  };
  if(name==='Lateral lunge')return {...base,
    advanceText:'Add or increase the goblet load while maintaining the same depth and frontal-plane control.'
  };
  if(name==='Ring row')return {...base,
    loadPlaceholder:'foot position',loadInputMode:'text',noun:'variation',
    advanceTitle:'Progress the ring row',
    advanceText:'Move the feet 10–15 cm forward or elevate them slightly while preserving rigid-body control.'
  };
  if(name==='Plank shoulder tap / kettlebell woodchop')return {...base,
    loadPlaceholder:'BW / kg',loadInputMode:'text',noun:'variation',
    advanceTitle:'Progress the current variation',
    advanceText:'For shoulder taps, narrow the stance or slow the tempo. For woodchops, increase the kettlebell slightly while keeping crisp control.'
  };
  return base;
}
function strengthSetLogEntries(id,total){
  logs[id]=logs[id]||{};
  const current=Array.isArray(logs[id].sets)?logs[id].sets:[];
  const previous=strengthPreviousCompletedSession(id,total);
  logs[id].sets=Array.from({length:total},(_,i)=>{
    const entry={...current[i]};
    const prior=previous?.sets?.[i];
    if(prior){
      const hasLoad=entry.load!==undefined&&entry.load!==null&&String(entry.load).trim()!=='';
      const hasReps=entry.reps!==undefined&&entry.reps!==null&&String(entry.reps).trim()!=='';
      if(!hasLoad&&prior.load!==undefined&&prior.load!==null&&String(prior.load).trim()!=='')entry.load=prior.load;
      if(!hasReps&&prior.reps!==undefined&&prior.reps!==null&&String(prior.reps).trim()!=='')entry.reps=prior.reps;
    }
    return entry;
  });
  return logs[id].sets;
}
function saveStrengthSetField(id,setIndex,key,value){
  const existing=Array.isArray(logs[id]?.sets)?logs[id].sets.length:0;
  const entries=strengthSetLogEntries(id,Math.max(existing,setIndex+1));
  entries[setIndex]=entries[setIndex]||{};
  entries[setIndex][key]=value;
  logs[id].sets=entries;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const flow=document.getElementById('strength-flow-'+id);
  if(flow)flow.classList.remove('needs-input');
  const msg=document.getElementById('strength-flow-message-'+id);
  if(msg)msg.textContent='';
}
function strengthSetCompletedCount(id,total){
  const entries=strengthSetLogEntries(id,total);
  let count=0;
  for(let i=0;i<total;i++){
    if(entries[i]?.complete)count++;
    else break;
  }
  return count;
}
function strengthFlowState(id,name,target){
  const cfg=strengthFlowConfig(name,target);
  const day=strengthFlowDayFromId(id);
  const rest=exerciseRestPreset(name,day,weekNo()).seconds||90;
  const completed=strengthSetCompletedCount(id,cfg.sets);
  if(inlineTimer.activeId===id&&inlineTimer.kind==='strengthsets'){
    return {...cfg,rest,setIndex:inlineTimer.setIndex,phase:inlineTimer.phase,running:inlineTimer.running,sec:inlineTimerSeconds(),duration:inlineTimer.duration||0,finalRest:!!inlineTimer.finalRest};
  }
  return {...cfg,rest,setIndex:completed,phase:(logs[id]?.done||completed>=cfg.sets)?'complete':'ready',running:false,sec:0,finalRest:false};
}
function strengthEnsureTimer(id,name,target){
  const state=strengthFlowState(id,name,target);
  if(inlineTimer.activeId!==id||inlineTimer.kind!=='strengthsets'){
    inlineTimer={...defaultInlineTimer,
      activeId:id,exerciseName:name,kind:'strengthsets',
      rest:state.rest,sets:state.sets,setIndex:state.setIndex,target:state.targetText,
      phase:state.phase,duration:state.rest,remaining:0,running:false,endAt:0,
      timedWork:!!state.timedWork,workSeconds:state.workSeconds||0,workMaxSeconds:state.workMaxSeconds||0,workPerSide:!!state.workPerSide
    };
    saveInlineTimer();
  }
  if(smartTimer.kind!=='strengthsets'||smartTimer.exerciseName!==name){
    smartTimer.exerciseName=name;
    smartTimer.exerciseCategory='Strength';
    timerConfigure('session',true);
  }
  return inlineTimer;
}
function strengthPreviousCompletedSession(id,total){
  const current=strengthSessionItemById(id);
  if(!current)return null;
  const matches=Object.keys(logs)
    .map(key=>({key,item:strengthSessionItemById(key)}))
    .filter(x=>x.key!==id&&x.item&&x.item.kind===current.kind&&x.item.day===current.day&&x.item.sourceIndex===current.sourceIndex&&x.item.date<current.date)
    .filter(x=>Array.isArray(logs[x.key]?.sets)&&logs[x.key].sets.length>=total&&logs[x.key].sets.slice(0,total).every(s=>s?.complete))
    .sort((a,b)=>b.item.date.localeCompare(a.item.date));
  return matches.length?{id:matches[0].key,sets:logs[matches[0].key].sets.slice(0,total)}:null;
}
function strengthNormalizeLoad(v){return String(v??'').trim().toLowerCase()}
function strengthFormatLoad(v){
  const raw=String(v??'').trim();
  if(!raw)return '—';
  return /^[-+]?\d+(?:\.\d+)?$/.test(raw)?raw+' kg':raw;
}
function strengthQualifiesForProgression(sets,top){
  if(!Array.isArray(sets)||!sets.length)return false;
  const firstLoad=strengthNormalizeLoad(sets[0]?.load);
  if(!firstLoad)return false;
  return sets.every(s=>
    s?.complete&&
    strengthNormalizeLoad(s.load)===firstLoad&&
    Number(s.reps)>=top&&
    Number(s.rir)>=2
  );
}
function strengthCompletionSummary(id,name,target,entries){
  if(!entries?.length||!entries.every(s=>s?.complete))return null;
  const cfg=strengthFlowConfig(name,target);
  const reps=entries.map(s=>Number(s.reps)||0);
  const rirs=entries.map(s=>Number(s.rir)||0);
  const rawLoads=entries.map(s=>String(s.load??'').trim());
  const normalized=rawLoads.map(strengthNormalizeLoad);
  const sameLoad=normalized.length===entries.length&&normalized[0]&&normalized.every(x=>x===normalized[0]);
  const loadText=sameLoad?strengthFormatLoad(rawLoads[0]):rawLoads.map(strengthFormatLoad).join(' / ');
  const qualifies=strengthQualifiesForProgression(entries,cfg.top);
  const previous=strengthPreviousCompletedSession(id,cfg.sets);
  const previousQualifies=previous&&sameLoad&&
    strengthNormalizeLoad(previous.sets[0]?.load)===normalized[0]&&
    strengthQualifiesForProgression(previous.sets,cfg.top);
  const targetPattern=entries.map(()=>cfg.top).join('/');
  const dayLabel=strengthFlowDayLabel(id);
  let title=name==='Suitcase carry'?'Build carry time at this load':'Build reps at this '+cfg.noun;
  let text=name==='Suitcase carry'
    ?'Keep the current load next '+dayLabel+' and build toward 60 seconds per side while keeping posture and grip controlled.'
    :'Keep the current '+cfg.noun+' next '+dayLabel+' and aim to add 1 total rep while keeping about 2 reps in reserve.';
  let tone='hold';
  if(qualifies&&previousQualifies){
    title=cfg.advanceTitle;
    text='You have now hit '+targetPattern+' with at least 2 reps in reserve twice at the same '+cfg.noun+'. '+cfg.advanceText;
    tone='up';
  }else if(qualifies){
    title='Repeat once more';
    text='This is the first '+targetPattern+' session at this '+cfg.noun+' with at least 2 reps in reserve. Repeat it once more before progressing.';
    tone='ready';
  }else if(reps.some(r=>r<cfg.low)||rirs.some(r=>r<1)){
    title='Hold the '+cfg.noun;
    text=name==='Suitcase carry'
      ?'Do not progress yet. Bring both carries back into the 45–60 second range with upright posture and cleaner reserve before increasing load.'
      :'Do not progress yet. Bring every set back into the prescribed range with cleaner reserve before making it harder.';
  }else if(rirs.some(r=>r<2)){
    title='Hold the '+cfg.noun;
    text='At least one set finished below 2 reps in reserve. Keep the '+cfg.noun+' stable and make the same work feel easier next '+dayLabel+'.';
  }else if(!sameLoad){
    title='Standardise the '+cfg.noun;
    text='The '+cfg.noun+' changed across sets. Next Monday use one sustainable working level across all sets before judging progression.';
  }
  return {
    loadText,
    repsText:reps.join(' / '),
    rirText:rirs.join(' / '),
    title,text,tone,
    previous:previous?.id||''
  };
}
function strengthSessionProgressState(day,date){
  const sequence=strengthSessionSequence(day,date);
  const completed=sequence.map(item=>!!logs[item.id]?.done);
  let currentIndex=-1;
  const currentEl=document.querySelector('.exercise.session-current[data-timer-id]');
  if(currentEl?.dataset?.timerId){
    const current=strengthSessionItemById(currentEl.dataset.timerId);
    if(current&&current.day===day&&current.date===date&&!logs[current.id]?.done)currentIndex=current.index;
  }
  if(currentIndex<0)currentIndex=completed.findIndex(done=>!done);
  const completedCount=completed.filter(Boolean).length;
  const remainingCount=Math.max(0,sequence.length-completedCount-(currentIndex>=0?1:0));
  return {sequence,completed,currentIndex,completedCount,remainingCount,total:sequence.length};
}
function strengthSessionProgressMarkup(day,date){
  if(![1,3,5].includes(day))return '';
  const s=strengthSessionProgressState(day,date);
  const segments=s.sequence.map((x,i)=>{
    const state=s.completed[i]?'complete':i===s.currentIndex?'current':'remaining';
    return '<span class="strength-progress-segment '+state+'" title="'+x.name+'" aria-label="'+x.name+' · '+state+'"></span>';
  }).join('');
  const current=s.currentIndex>=0?s.sequence[s.currentIndex]:null;
  const currentName=current?current.name:'Strength sequence complete';
  const currentTarget=current?current.target:'All '+s.total+' sequenced exercises completed';
  return '<div class="strength-session-progress" id="strengthSessionProgress">'+
    '<div class="strength-progress-head"><div><span>Session progress</span><strong>'+currentName+'</strong></div><b>'+s.completedCount+' / '+s.total+'</b></div>'+
    '<div class="strength-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.completedCount+'" aria-label="'+s.completedCount+' of '+s.total+' sequenced exercises complete">'+segments+'</div>'+
    '<div class="strength-progress-foot"><span class="done">'+s.completedCount+' complete</span><span class="current">'+(current?'Current · '+currentTarget:'Complete')+'</span><span class="remain">'+s.remainingCount+' remaining</span></div>'+
  '</div>';
}
function refreshStrengthSessionProgress(day=null,date=null){
  const existing=document.getElementById('strengthSessionProgress');
  if(!existing)return;
  if(day===null||date===null){
    const current=document.querySelector('.exercise.session-current[data-timer-id]');
    if(current?.dataset?.timerId){
      const item=strengthSessionItemById(current.dataset.timerId);
      if(item){day=item.day;date=item.date}
    }
  }
  if(day===null||date===null){
    const any=document.querySelector('.strength-session-slice[data-timer-id]');
    if(any?.dataset?.timerId){
      const item=strengthSessionItemById(any.dataset.timerId);
      if(item){day=item.day;date=item.date}
    }
  }
  if(day===null||date===null)return;
  existing.outerHTML=strengthSessionProgressMarkup(day,date);
}
function strengthSessionPosition(id){
  const m=String(id).match(/^(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)$/);
  if(!m)return null;
  return {date:m[1],day:Number(m[2]),index:Number(m[3])};
}
function strengthNextExercise(id){
  const current=strengthSessionItemById(id);
  if(!current)return null;
  const sequence=strengthSessionSequence(current.day,current.date);
  const candidate=(i)=>{
    const item=sequence[i];
    return !item||logs[item.id]?.done?null:item;
  };
  for(let i=current.index+1;i<sequence.length;i++){
    const next=candidate(i);if(next)return next;
  }
  // If exercises were completed out of order, return to the first unfinished one
  // rather than falsely declaring the strength sequence complete.
  for(let i=0;i<current.index;i++){
    const next=candidate(i);if(next)return next;
  }
  return null;
}
function strengthExerciseIdFromName(name,day=timerContextDay(),date=timerContextDate()){
  const item=strengthSessionSequence(day,date).find(x=>x.name===name);
  return item?.id||null;
}
function refreshStrengthFlowById(id){
  const flow=document.getElementById('strength-flow-'+id);
  if(!flow)return;
  const card=flow.closest('.exercise');
  const name=decodeURIComponent(card?.dataset.timerName||'');
  const target=decodeURIComponent(card?.dataset.timerTarget||'');
  if(!name||!target)return;
  flow.outerHTML=strengthSetFlowMarkup(id,name,target);
}
function currentStrengthExerciseContext(day=timerContextDay(),date=timerContextDate()){
  if(![1,3,5].includes(day))return null;
  const sequence=strengthSessionSequence(day,date);
  const currentEl=document.querySelector('.exercise.session-current[data-timer-id]');
  if(currentEl?.dataset?.timerId){
    const current=strengthSessionItemById(currentEl.dataset.timerId);
    if(current&&current.day===day&&current.date===date&&!logs[current.id]?.done)return current;
  }
  return sequence.find(item=>!logs[item.id]?.done)||null;
}
function syncSmartStrengthToCurrent({force=false}={}){
  const ctx=currentStrengthExerciseContext();
  if(!ctx)return null;
  if(force||smartTimer.kind!=='strengthsets'||smartTimer.exerciseName!==ctx.name){
    smartTimer.exerciseName=ctx.name;
    smartTimer.exerciseCategory='Strength';
    timerConfigure('session',true);
  }
  return ctx;
}
function strengthAdvanceAfterFinalRest(currentId,{syncInline=true,syncSmart=true,scroll=true}={}){
  const current=strengthSessionItemById(currentId);
  if(!current)return null;

  logs[currentId]=logs[currentId]||{};
  logs[currentId].done=true;
  logs[currentId].completedAt=logs[currentId].completedAt||new Date().toISOString();
  motion12SetItem('motion12.logs',JSON.stringify(logs));

  const currentCard=document.getElementById('ex-'+currentId);
  currentCard?.classList.add('complete');
  document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>{
    el.classList.remove('session-current','compact-current');
  });

  const next=strengthNextExercise(currentId);
  if(next){
    const nextCard=document.getElementById('ex-'+next.id);
    nextCard?.classList.add('session-current');
    if(document.getElementById('dayPage')?.classList.contains('compact-active'))nextCard?.classList.add('compact-current');

    if(syncInline){
      inlineTimer={...defaultInlineTimer};
      saveInlineTimer();
      strengthEnsureTimer(next.id,next.name,next.target);
    }

    if(syncSmart){
      smartTimer.exerciseName=next.name;
      smartTimer.exerciseCategory='Strength';
      timerConfigure('session',true);
    }

    refreshStrengthFlowById(currentId);
    refreshStrengthFlowById(next.id);
    refreshStrengthSessionProgress(next.day,next.date);
    if(document.getElementById('sessionTimerMount'))renderTimerPage();

    if(scroll&&nextCard)nextCard.scrollIntoView({behavior:'smooth',block:'nearest'});
    return next;
  }

  refreshStrengthFlowById(currentId);
  refreshStrengthSessionProgress(current.day,current.date);
  reconcileStrengthSessionCompletion(current.date,current.day);
  if(syncInline){
    inlineTimer={...inlineTimer,running:false,remaining:0,endAt:0,phase:'complete',finalRest:false};
    saveInlineTimer();
  }
  if(syncSmart){
    smartTimer.running=false;
    smartTimer.remaining=0;
    smartTimer.endAt=0;
    smartTimer.strengthPhase='complete';
    smartTimer.finalRest=false;
    saveSmartTimer();
  }
  if(document.getElementById('sessionTimerMount'))renderTimerPage();
  return null;
}
function strengthSessionCueMarkup(id){
  const next=strengthNextExercise(id);
  if(next){
    return '<div class="strength-session-cue">'+
      '<div><span>Up next · '+(next.index+1)+' of '+next.total+'</span><strong>'+next.name+'</strong><small>'+next.target+'</small></div>'+
      '<button type="button" onclick="event.stopPropagation();strengthContinueToNext(\''+id+'\',\''+next.id+'\')">Continue <b>→</b></button>'+
    '</div>';
  }
  return '<div class="strength-session-cue final">'+
    '<div><span>Strength sequence complete</span><strong>Finish the session</strong><small>Review anything you need, then mark today complete.</small></div>'+
    '<button type="button" onclick="event.stopPropagation();strengthGoToSessionComplete()">Finish session <b>→</b></button>'+
  '</div>';
}
function strengthContinueToNext(currentId,nextId){
  document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>el.classList.remove('session-current','compact-current'));
  const next=document.getElementById('ex-'+nextId);
  const item=strengthSessionItemById(nextId);
  if(!next||!item)return;
  next.classList.add('session-current');
  if(document.getElementById('dayPage')?.classList.contains('compact-active'))next.classList.add('compact-current');
  refreshStrengthSessionProgress(item.day,item.date);

  inlineTimer={...defaultInlineTimer};
  saveInlineTimer();
  strengthEnsureTimer(nextId,item.name,item.target);
  smartTimer.exerciseName=item.name;
  smartTimer.exerciseCategory='Strength';
  timerConfigure('session',true);
  if(document.getElementById('sessionTimerMount'))renderTimerPage();

  next.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>{
    const flow=next.querySelector('.strength-set-flow');
    const first=flow?.querySelector('.strength-set-row.active input:not(:disabled)');
    if(first){
      try{first.focus({preventScroll:true})}catch(_){first.focus()}
    }
  },420);
}
function strengthGoToSessionComplete(){
  const btn=document.getElementById('completeSessionButton');
  if(!btn)return;
  btn.classList.add('attention');
  btn.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>btn.classList.remove('attention'),1800);
}
function strengthCompletionSummaryMarkup(id,name,target,entries){
  const s=strengthCompletionSummary(id,name,target,entries);
  if(!s)return '';
  return '<div class="strength-completion-summary">'+
    '<div class="strength-summary-title"><span>Session result</span><b>'+entries.length+' sets logged</b></div>'+
    '<div class="strength-summary-metrics">'+
      '<div><span>Load</span><b>'+s.loadText+'</b></div>'+
      '<div><span>Reps</span><b>'+s.repsText+'</b></div>'+
      '<div><span>RIR</span><b>'+s.rirText+'</b></div>'+
    '</div>'+
    '<div class="strength-next '+s.tone+'"><span>Next '+strengthFlowDayLabel(id)+'</span><strong>'+s.title+'</strong><p>'+s.text+'</p></div>'+
  '</div>';
}
function strengthSetFlowMarkup(id,name,target){
  const state=strengthFlowState(id,name,target),entries=strengthSetLogEntries(id,state.sets);
  const isTendon=/isometric/i.test(name);
  const readyIndex=Math.min(state.sets-1,state.setIndex);
  const isRest=state.phase==='rest',isWork=state.phase==='work',isComplete=state.phase==='complete';
  const finalRest=isRest&&(state.finalRest||state.setIndex>=state.sets);
  const nextExercise=finalRest?strengthNextExercise(id):null;
  const statusTitle=isComplete?name.toUpperCase()+' COMPLETE':isWork?'TIMED SET':isRest?(finalRest?'FINAL RECOVERY':'RECOVERY'):'SET '+(readyIndex+1)+' READY';
  const statusMain=isComplete?'✓':(isRest||isWork)?timerFormat(state.sec):state.targetText;
  const statusSub=isComplete?'All '+state.sets+' sets logged':isWork?('Set '+(readyIndex+1)+(state.workPerSide?' · repeat timer for each side':'')):isRest?(finalRest?(nextExercise?'Next · '+nextExercise.name:'Then finish the session'):'Next · Set '+(state.setIndex+1)+' of '+state.sets):'Rest starts automatically after Set complete';
  const completionSummary=isComplete&&!isTendon?strengthCompletionSummaryMarkup(id,name,target,entries):'';
  const sessionCue=isComplete&&!isTendon?strengthSessionCueMarkup(id):'';
  const encName=encodeURIComponent(name),encTarget=encodeURIComponent(target);
  const valueColumnLabel=state.timedWork?'Time':'Reps';
  const effortColumnLabel=isTendon?'Effort':'Reps in reserve';
  const rows=entries.map((set,i)=>{
    const complete=!!set.complete;
    const active=!isComplete&&!isRest&&i===readyIndex;
    const future=!complete&&!active;
    return '<div class="strength-set-row '+(complete?'logged ':'')+(active?'active ':'')+(future?'future':'')+'">'+
      '<div class="strength-set-number"><span>SET</span><b>'+(i+1)+'</b>'+(complete?'<i>✓</i>':'')+'</div>'+
      '<label aria-label="Load"><input type="text" inputmode="'+state.loadInputMode+'" autocomplete="off" value="'+(set.load??'')+'" placeholder="'+state.loadPlaceholder+'" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'load\',this.value)"></label>'+
      '<label aria-label="'+(isTendon?'Time':'Reps')+'"><input inputmode="numeric" type="number" min="1" step="1" value="'+(set.reps??'')+'" placeholder="'+state.repsPlaceholder+'" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'reps\',this.value)"></label>'+
      '<label aria-label="'+effortColumnLabel+'"><input inputmode="numeric" type="number" min="'+(isTendon?'1':'0')+'" max="'+(isTendon?(state.effortMax||10):5)+'" step="1" value="'+(set.rir??'')+'" placeholder="'+(isTendon?(state.effortPlaceholder||'8–9'):'RIR')+'" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'rir\',this.value)"></label>'+
    '</div>';
  }).join('');
  let actions='';
  if(isComplete){
    actions='<button class="strength-flow-primary done" type="button" onclick="event.stopPropagation()">✓ Exercise complete</button>';
  }else if(isWork){
    const canExtend=(state.workMaxSeconds||0)>(state.workSeconds||0)&&(state.duration||0)<(state.workMaxSeconds||0);
    actions='<button class="strength-flow-primary" type="button" onclick="event.stopPropagation();strengthPauseResume(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">'+(state.running?'Pause':'Resume')+'</button>'+
      (canExtend?'<button class="strength-flow-secondary" type="button" onclick="event.stopPropagation();strengthExtendTimedWork(\''+id+'\',15)">+15 sec</button>':'')+
      '<button class="strength-flow-secondary" type="button" onclick="event.stopPropagation();strengthCancelTimedWork(\''+id+'\')">End timer</button>';
  }else if(isRest){
    actions='<button class="strength-flow-primary" type="button" onclick="event.stopPropagation();strengthPauseResume(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">'+(state.running?'Pause rest':'Resume rest')+'</button>'+
      '<button class="strength-flow-secondary" type="button" onclick="event.stopPropagation();strengthSkipRest(\''+id+'\')">Skip rest</button>';
  }else{
    actions=(state.timedWork?'<button class="strength-flow-secondary strength-work-timer" type="button" onclick="event.stopPropagation();strengthStartTimedWork(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">Start '+timerFormat(state.workSeconds||45)+(state.workPerSide?' / side':'')+'</button>':'')+
      '<button class="strength-flow-primary" type="button" onclick="event.stopPropagation();strengthSetComplete(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">Set '+(readyIndex+1)+' complete <span>→ rest '+timerFormat(state.rest)+'</span></button>';
  }
  return '<div class="strength-set-flow '+(isRest?'resting ':'')+(isWork?'working ':'')+(isComplete?'complete ':'')+'" id="strength-flow-'+id+'">'+
    '<div class="strength-flow-status"><div><span>'+statusTitle+'</span><strong id="strength-flow-clock-'+id+'">'+statusMain+'</strong><small>'+statusSub+'</small></div></div>'+
    '<div class="strength-set-columns" aria-hidden="true"><span>Set</span><span>Load</span><span>'+valueColumnLabel+'</span><span>'+effortColumnLabel+'</span></div>'+
    '<div class="strength-set-grid">'+rows+'</div>'+
    completionSummary+
    sessionCue+
    '<div class="strength-flow-message" id="strength-flow-message-'+id+'"></div>'+
    '<div class="strength-flow-actions">'+actions+'</div>'+
  '</div>';
}
function refreshStrengthFlow(){
  if(inlineTimer.kind!=='strengthsets'||!inlineTimer.activeId)return;
  const flow=document.getElementById('strength-flow-'+inlineTimer.activeId);
  if(!flow)return;
  const card=flow.closest('.exercise');
  const name=decodeURIComponent(card?.dataset.timerName||'');
  const target=decodeURIComponent(card?.dataset.timerTarget||'');
  if(!name||!target)return;
  flow.outerHTML=strengthSetFlowMarkup(inlineTimer.activeId,name,target);
}
function updateStrengthFlowLive(){
  if(inlineTimer.kind!=='strengthsets'||!['rest','work'].includes(inlineTimer.phase)||!inlineTimer.activeId)return;
  const clock=document.getElementById('strength-flow-clock-'+inlineTimer.activeId);
  if(clock)clock.textContent=timerFormat(inlineTimerSeconds());
}
function strengthStartTimedWork(id,encodedName,encodedTarget){
  const name=decodeURIComponent(encodedName),target=decodeURIComponent(encodedTarget);
  const timer=strengthEnsureTimer(id,name,target);
  if(timer.phase!=='ready'||!timer.timedWork)return;
  timer.phase='work';
  timer.duration=timer.workSeconds||45;
  timer.remaining=timer.duration;
  timer.endAt=Date.now()+timer.duration*1000;
  timer.running=true;
  saveInlineTimer();
  inlineTimerEnsureTick();
  refreshStrengthFlowById(id);
}
function strengthExtendTimedWork(id,delta=15){
  if(inlineTimer.activeId!==id||inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='work')return;
  const cap=Math.max(inlineTimer.workSeconds||0,inlineTimer.workMaxSeconds||0);
  if(cap<=0)return;
  const current=inlineTimerSeconds();
  const extra=Math.max(0,Math.min(delta,cap-(inlineTimer.duration||0)));
  if(extra<=0)return;
  inlineTimer.duration=(inlineTimer.duration||0)+extra;
  inlineTimer.remaining=current+extra;
  if(inlineTimer.running)inlineTimer.endAt+=extra*1000;
  saveInlineTimer();
  refreshStrengthFlowById(id);
}
function strengthCancelTimedWork(id){
  if(inlineTimer.activeId!==id||inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='work')return;
  inlineTimer.running=false;
  inlineTimer.remaining=0;
  inlineTimer.endAt=0;
  inlineTimer.phase='ready';
  saveInlineTimer();
  refreshStrengthFlowById(id);
}
function strengthSetComplete(id,encodedName,encodedTarget){
  const name=decodeURIComponent(encodedName),target=decodeURIComponent(encodedTarget);
  const timer=strengthEnsureTimer(id,name,target),idx=timer.setIndex;
  if(timer.phase!=='ready'||idx>=timer.sets)return;
  const entries=strengthSetLogEntries(id,timer.sets),set=entries[idx]||{};
  const isTendon=/isometric/i.test(name);
  const validLoad=String(set.load??'').trim()!=='';
  const validReps=Number(set.reps)>0;
  const rirValue=String(set.rir??'').trim();
  const validRir=rirValue!==''&&(isTendon?(Number(rirValue)>=1&&Number(rirValue)<=10):Number(rirValue)>=0);
  if(!validLoad||!validReps||!validRir){
    const flow=document.getElementById('strength-flow-'+id);if(flow)flow.classList.add('needs-input');
    const msg=document.getElementById('strength-flow-message-'+id);
    if(msg)msg.textContent=isTendon?'Enter load, hold time and effort before completing this set.':'Enter load, reps and reps in reserve before completing this set.';
    return;
  }
  logs[id]=logs[id]||{};
  logs[id].exerciseName=name;
  set.complete=true;set.completedAt=new Date().toISOString();
  entries[idx]=set;
  if(idx+1<timer.sets&&!entries[idx+1]?.load)entries[idx+1]={...(entries[idx+1]||{}),load:set.load};
  logs[id].sets=entries;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  inlineStrengthSetComplete();
  refreshStrengthFlow();
}
function strengthPauseResume(id,encodedName,encodedTarget){
  const name=decodeURIComponent(encodedName),target=decodeURIComponent(encodedTarget);
  strengthEnsureTimer(id,name,target);
  inlineTimerStartPause();
  refreshStrengthFlow();
}
function strengthSkipRest(id){
  if(inlineTimer.activeId!==id)return;
  inlineSkipStrengthRest();
  refreshStrengthFlow();
}
function aerobicPowerVariantKey(date=todayISO()){return 'aerobic-power-variant:'+date}
function aerobicPowerVariant(date=todayISO()){
  const value=logs[aerobicPowerVariantKey(date)]?.variant;
  return value==='B'?'B':'A';
}
function aerobicPowerSessionWork(date=todayISO()){
  return aerobicPowerVariant(date)==='B'?aerobicPowerB.work:program[6].work;
}
function aerobicPowerSessionTarget(date=todayISO(),w=weekNo()){
  return aerobicPowerVariant(date)==='B'?aerobicPowerB.target:(aerobicTargets[w-1]||'Aerobic session');
}
const AEROBIC_POWER_B_MOVEMENTS=[
  {name:'2-hand kettlebell swing',duration:60,short:'Swing'},
  {name:'Squat-to-calf-raise',duration:60,short:'Squat + calf raise'},
  {name:'Alternating reverse lunge',duration:60,short:'Reverse lunge'},
  {name:'2-hand kettlebell swing',duration:60,short:'Swing'}
];
function aerobicPowerBBreakdownMarkup(){
  return '<div class="aerobic-b-breakdown" aria-label="Aerobic Power B four-minute work sequence">'+
    '<div class="aerobic-b-breakdown-head"><span>4:00 work block</span><b>Repeat × 4 rounds</b></div>'+
    '<div class="aerobic-b-movements">'+
      AEROBIC_POWER_B_MOVEMENTS.map((m,i)=>
        '<div class="aerobic-b-movement"><span class="aerobic-b-order">'+(i+1)+'</span><div><b>'+m.name+'</b><small>'+(i===3?'Strong finish · stay crisp':'Continuous, repeatable pace')+'</small></div><strong>1:00</strong></div>'
      ).join('')+
    '</div>'+
    '<div class="aerobic-b-recovery"><span>Then</span><b>Active recovery</b><strong>3:00</strong></div>'+
  '</div>';
}
function aerobicPowerBMovementState(remaining=240){
  const sec=Math.max(0,Math.min(240,Math.ceil(Number(remaining)||0)));
  const elapsed=Math.max(0,240-sec);
  const index=Math.min(3,Math.floor(elapsed/60));
  const movement=AEROBIC_POWER_B_MOVEMENTS[index];
  const within=elapsed-(index*60);
  const movementRemaining=Math.max(1,60-within);
  const next=index<3?AEROBIC_POWER_B_MOVEMENTS[index+1]:null;
  return {index,movement,movementRemaining,next};
}
function aerobicPowerVariantMarkup(date,w){
  const variant=aerobicPowerVariant(date),aTarget=aerobicTargets[w-1]||'Aerobic session';
  return '<section class="section aerobic-power-choice"><div class="section-head"><h2>Aerobic Power session</h2><small>same objective · choose one</small></div>'+
    '<div class="aerobic-variant-switch" role="group" aria-label="Choose Aerobic Power session">'+
      '<button type="button" class="aerobic-variant-option '+(variant==='A'?'selected':'')+'" aria-pressed="'+(variant==='A'?'true':'false')+'" onclick="setAerobicPowerVariant(\'A\')"><span>A</span><b>Locomotion</b><small>'+aTarget+'</small></button>'+
      '<button type="button" class="aerobic-variant-option '+(variant==='B'?'selected':'')+'" aria-pressed="'+(variant==='B'?'true':'false')+'" onclick="setAerobicPowerVariant(\'B\')"><span>B</span><b>Kettlebell + bodyweight</b><small>4:00 work / 3:00 recovery × 4</small></button>'+
    '</div><p class="aerobic-variant-note">Both count as the same Saturday Aerobic Power session. Switching variants resets the session timer.</p></section>';
}
function setAerobicPowerVariant(variant){
  if(variant!=='A'&&variant!=='B')return;
  const date=timerContextDate(),key=aerobicPowerVariantKey(date);
  logs[key]={...(logs[key]||{}),variant,updatedAt:new Date().toISOString()};
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  setActiveSessionTimerContext(6,date,timerContextWeek());
  timerConfigure('session',true);
  openDay(6,date);
}
function aerobicPowerExerciseId(date,i,variant=aerobicPowerVariant(date)){
  return variant==='B'?date+'-6-b-'+i:exId(6,i,date);
}
function exerciseCardMarkup(day,date,w,x,i,options={}){
  const id=options.id||exId(day,i,date),state=logs[id]||{};
  let target=options.target||x[1];if(day===6&&!options.target)target=aerobicTargets[w-1];
  const timerName=encodeURIComponent(x[0]),timerTarget=encodeURIComponent(target);
  if([1,3,5].includes(day)&&strengthSetFlowNames.has(x[0])){
    return '<div class="exercise strength-session-slice '+(state.done?'complete':'')+'" id="ex-'+id+'" data-timer-id="'+id+'" data-timer-day="'+day+'" data-timer-name="'+timerName+'" data-timer-target="'+timerTarget+'" data-timer-support="0">'+
      '<div class="ex-top"><div class="num">'+(i+1)+'</div><div class="ex-name"><h3>'+x[0]+' '+videoButtons(x[0])+'</h3><p>'+target+'</p></div><button class="check" onclick="toggleExercise(\''+id+'\')"></button></div>'+
      strengthSetFlowMarkup(id,x[0],target)+
      exerciseNoteMarkup(id,state)+
      '<div class="tip">'+x[2]+'</div><div class="tip progress-rule"><b>Progress:</b> '+x[3]+'</div>'+loadGuideMarkup(x[4])+
    '</div>';
  }
  const aerobicBreakdown=day===6&&x[0]==='Kettlebell + bodyweight 4×4'?aerobicPowerBBreakdownMarkup():'';
  return '<div class="exercise '+(state.done?'complete ':'')+(inlineTimer.activeId===id?'active-timer':'')+'" id="ex-'+id+'" data-timer-id="'+id+'" data-timer-day="'+day+'" data-timer-name="'+timerName+'" data-timer-target="'+timerTarget+'" data-timer-support="0" onclick="activateExerciseTimerFromCard(event,this)">'+
    '<div class="ex-top"><div class="num">'+(i+1)+'</div><div class="ex-name"><h3>'+x[0]+' '+videoButtons(x[0])+'</h3><p>'+target+'</p></div><button class="check" onclick="toggleExercise(\''+id+'\')"></button></div>'+aerobicBreakdown+inlineTimerMarkup(id)+
    '<div class="inputs"><div class="field"><label>Load / pace</label><input value="'+(state.load||'')+'" placeholder="e.g. 20 kg" oninput="saveEx(\''+id+'\',\'load\',this.value)"></div><div class="field"><label>Actual</label><input value="'+(state.reps||'')+'" placeholder="sets/reps" oninput="saveEx(\''+id+'\',\'reps\',this.value)"></div><div class="field"><label>RIR / effort</label><input value="'+(state.rir||'')+'" placeholder="2 RIR" oninput="saveEx(\''+id+'\',\'rir\',this.value)"></div></div>'+
    exerciseNoteMarkup(id,state)+
    '<div class="tip">'+x[2]+'</div><div class="tip progress-rule"><b>Progress:</b> '+x[3]+'</div>'+loadGuideMarkup(x[4])+
  '</div>';
}
function openDay(day,date=null){
 date=date||dateForProgramDay(day);
 const w=weekNo(),p=program[day];
 setActiveSessionTimerContext(day,date,w);
 showPage('dayPage');
 const sessionWork=day===6?aerobicPowerSessionWork(date):p.work;
 const tendonAfter=Number.isInteger(p.tendonAfter)?p.tendonAfter:sessionWork.length;
 const primaryWork=p.tendon?.length?sessionWork.slice(0,tendonAfter):sessionWork;
 const secondaryWork=p.tendon?.length?sessionWork.slice(tendonAfter):[];
 const aerobicVariant=day===6?aerobicPowerVariant(date):'';
 const primaryHtml=primaryWork.map((x,i)=>exerciseCardMarkup(day,date,w,x,i,day===6?{id:aerobicPowerExerciseId(date,i,aerobicVariant),target:aerobicPowerSessionTarget(date,w)}:{})).join('');
 const secondaryHtml=secondaryWork.map((x,i)=>exerciseCardMarkup(day,date,w,x,tendonAfter+i)).join('');
 let mob=mobility.map((m,i)=>`<div class="card row"><div><h3>${m[0]} ${videoButtons(m[0])}</h3><p>${m[1]}</p></div><span class="volt">${String(i+1).padStart(2,'0')}</span></div>`).join('');
 const prepHtml=prepBlockMarkup(day,date,p);
 const tendonHtml=tendonBlockMarkup(day,date,p);
 const supportHtml=supportBlockMarkup(day,date,w,p);
 const variantHtml=day===6?aerobicPowerVariantMarkup(date,w):'';
 const sessionTarget=day===6?aerobicPowerSessionTarget(date,w):weeklyTarget(day,w);
 const key=`${date}-${day}`;
 const mobilityHtml=`<section class="section mobility-warmup-section" id="mobilitySection"><div class="section-head"><h2>Mobility warm-up</h2><small>first · 6–8 min</small></div><div class="cards">${mob}</div></section>`;
 const primarySection=`<section class="section workout-exercises-section"><div class="section-head"><h2>${p.tendon?.length?'Primary strength':'Exercises'}</h2><small>${p.tendon?.length?'highest-priority work first':'log as you go'}</small></div>${primaryHtml||'<div class="card"><h3>Recovery day</h3><p>No formal strength work. Keep normal walking and complete the mobility warm-up above.</p></div>'}</section>`;
 const secondarySection=secondaryHtml?`<section class="section workout-exercises-section workout-secondary-section"><div class="section-head"><h2>Finishers / accessories</h2><small>after tendon capacity</small></div>${secondaryHtml}</section>`:'';
 const mainHtml=primarySection+tendonHtml+secondarySection;
 const completeHtml=sessionEndActionsMarkup(key);
 const sessionHtml=workoutSessionMarkup({mobilityHtml,prepHtml,mainHtml,supportHtml,completeHtml});
 document.getElementById('dayPage').innerHTML=`<div class="day-page-wrap"><div class="sticky-col"><button class="back" onclick="showPage('homePage')">← Home</button><div class="page-title"><div class="eyebrow">${DAYS[day]} · Week ${w}</div><span class="session-mode-badge ${sessionPaused(key)?'paused':''}" aria-live="polite">${sessionPaused(key)?'PAUSED':''}</span><h1>${p.name}${day===6?' · '+aerobicVariant:''}</h1><p>${p.why}</p></div><div class="session-summary"><div class="mini"><b>${p.time.replace(' min','')}</b><span>minutes</span></div><div class="mini"><b>${sessionWork.length+(p.prep?.length||0)+(p.tendon?.length||0)+(p.support?.length||0)}</b><span>moves</span></div><div class="mini"><b>${settings.steps/1000}k</b><span>steps</span></div></div>
 <div class="card accent"><span class="tag">Today’s progression</span><h3 style="margin-top:10px">${sessionTarget}</h3></div></div>
 <div>${variantHtml}${sessionHtml}</div></div>`;
 if([1,3,5].includes(day)){
   const sequence=strengthSessionSequence(day,date);
   const storedSelected=logs[key]?.selectedExerciseId||logs[key]?.resumeExerciseId||'';
   const selected=sequence.find(item=>item.id===storedSelected&&!logs[item.id]?.done)
     ||sequence.find(item=>!logs[item.id]?.done);
   document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>el.classList.remove('session-current','compact-current'));
   if(selected)document.getElementById('ex-'+selected.id)?.classList.add('session-current');
 }
 applySessionCompactMode();
 renderTimerPage();
 window.scrollTo({top:0,behavior:'smooth'});
}
function openMobilityToday(){openDay(programDay(),todayISO());setTimeout(()=>document.getElementById('mobilitySection')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
function circuitExerciseCards(){
  return [...document.querySelectorAll('.workout-exercises-section > .exercise[data-timer-support="0"]')];
}
function circuitWorkPhaseIndex(plan,stationIndex,preferredRound=0){
  if(!plan?.circuit||!Array.isArray(plan.phases)||stationIndex<0)return -1;
  if(preferredRound>0){
    const sameRound=plan.phases.findIndex(phase=>
      phase?.phaseType==='work'&&
      phase.stationIndex===stationIndex&&
      Number(phase.round)===preferredRound
    );
    if(sameRound>=0)return sameRound;
  }
  const currentIndex=Math.max(0,Number(smartTimer.phaseIndex)||0);
  const upcoming=plan.phases.findIndex((phase,index)=>
    index>=currentIndex&&
    phase?.phaseType==='work'&&
    phase.stationIndex===stationIndex
  );
  if(upcoming>=0)return upcoming;
  return plan.phases.findIndex(phase=>
    phase?.phaseType==='work'&&phase.stationIndex===stationIndex
  );
}
function setCircuitActiveExercise(id){
  const day=timerContextDay();
  if(![0,2,4].includes(day))return false;

  const cards=circuitExerciseCards();
  const card=cards.find(x=>x.dataset.timerId===id);
  const stationIndex=cards.indexOf(card);
  if(!card||stationIndex<0||card.dataset.timerSupport==='1')return false;

  timerConfigure('session',false);
  const plan=timerSessionPlan();
  if(!plan?.circuit||!Array.isArray(plan.phases)||!plan.phases.length)return false;

  const currentPhase=plan.phases[Math.max(0,Math.min(plan.phases.length-1,Number(smartTimer.phaseIndex)||0))];
  const preferredRound=Number(currentPhase?.round)||1;
  const phaseIndex=circuitWorkPhaseIndex(plan,stationIndex,preferredRound);
  if(phaseIndex<0)return false;

  const phase=plan.phases[phaseIndex];
  smartTimer.phaseIndex=phaseIndex;
  smartTimer.duration=phase.seconds;
  smartTimer.remaining=phase.seconds;
  smartTimer.running=false;
  smartTimer.endAt=0;
  smartTimer.planSignature=timerPlanSignature(plan);
  smartTimer.exerciseName=card.dataset.timerName?decodeURIComponent(card.dataset.timerName):phase.label;
  smartTimer.exerciseCategory='Circuit station';

  const key=timerContextDate()+'-'+day;
  logs[key]=logs[key]||{};
  logs[key].selectedExerciseId=id;
  logs[key].resumeExerciseId=id;

  motion12SetItem('motion12.logs',JSON.stringify(logs));
  saveSmartTimer();
  renderTimerPage();
  return true;
}
function setCircuitComplete(){
  const day=timerContextDay();
  if(![0,2,4].includes(day))return false;
  timerConfigure('session',false);
  const plan=timerSessionPlan();
  if(!plan?.circuit)return false;

  smartTimer.phaseIndex=plan.phases.length;
  smartTimer.running=false;
  smartTimer.remaining=0;
  smartTimer.duration=0;
  smartTimer.endAt=0;
  smartTimer.exerciseName='';
  smartTimer.exerciseCategory='Circuit complete';
  smartTimer.planSignature=timerPlanSignature(plan);

  const key=timerContextDate()+'-'+day;
  logs[key]=logs[key]||{};
  logs[key].selectedExerciseId='';
  logs[key].resumeExerciseId='';

  motion12SetItem('motion12.logs',JSON.stringify(logs));
  saveSmartTimer();
  renderTimerPage();
  return true;
}
function reconcileCircuitExerciseToggle(id,completed){
  const day=timerContextDay();
  if(![0,2,4].includes(day))return false;
  const cards=circuitExerciseCards();
  const index=cards.findIndex(x=>x.dataset.timerId===id);
  if(index<0)return false;

  if(!completed){
    // Unticking explicitly makes that exercise current again.
    return setCircuitActiveExercise(id);
  }

  const next=
    cards.slice(index+1).find(x=>!logs[x.dataset.timerId]?.done)||
    cards.slice(0,index).find(x=>!logs[x.dataset.timerId]?.done);

  return next?setCircuitActiveExercise(next.dataset.timerId):setCircuitComplete();
}
function toggleExercise(id){
  logs[id]=logs[id]||{};
  logs[id].done=!logs[id].done;
  const completed=!!logs[id].done;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  document.getElementById('ex-'+id)?.classList.toggle('complete',completed);

  if(reconcileCircuitExerciseToggle(id,completed))return;

  const item=strengthSessionItemById(id);
  if(item){
    const firstIncomplete=strengthSessionSequence(item.day,item.date).find(step=>!logs[step.id]?.done);
    document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>el.classList.remove('session-current','compact-current'));
    if(firstIncomplete){
      const card=document.getElementById('ex-'+firstIncomplete.id);
      card?.classList.add('session-current');
      if(document.getElementById('dayPage')?.classList.contains('compact-active'))card?.classList.add('compact-current');
    }
    refreshStrengthSessionProgress(item.day,item.date);
    if(settings.homeMode==='compact')syncCompactSessionFocus(timerViewModel());
    reconcileStrengthSessionCompletion(item.date,item.day);
  }
}
function saveEx(id,k,v){logs[id]=logs[id]||{};logs[id][k]=v;motion12SetItem('motion12.logs',JSON.stringify(logs))}
function escapeExerciseNote(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
function exerciseNoteMarkup(id,state={}){
  const note=String(state.note||'');
  return '<div class="exercise-note-card'+(note.trim()?' has-note':'')+'">'+
    '<div class="exercise-note-head"><span>Notes</span><small>autosaves</small></div>'+
    '<textarea class="exercise-note-input" rows="2" placeholder="e.g. eccentrics only · was too easy · increase load next time" oninput="saveExerciseNote(\''+id+'\',this)">'+escapeExerciseNote(note)+'</textarea>'+
  '</div>';
}
function saveExerciseNote(id,textarea){
  const value=textarea?.value??'';
  logs[id]=logs[id]||{};
  logs[id].note=value;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const card=textarea?.closest('.exercise-note-card');
  if(card)card.classList.toggle('has-note',String(value).trim().length>0);
}
function sessionPaused(key){
  return !!logs[key]?.paused&&!logs[key]?.completed;
}
function pauseSessionTimers(){
  if(smartTimer.running){
    if(smartTimer.kind==='stopwatch'||(smartTimer.kind==='strengthsets'&&smartTimer.strengthPhase==='work')){
      smartTimer.stopwatchElapsed=timerCurrentSeconds();
      smartTimer.stopwatchStartedAt=0;
    }else{
      smartTimer.remaining=timerCurrentSeconds();
    }
    smartTimer.running=false;
    smartTimer.endAt=0;
    saveSmartTimer();
  }
  if(inlineTimer.running){
    inlineTimer.remaining=inlineTimerSeconds();
    inlineTimer.running=false;
    inlineTimer.endAt=0;
    saveInlineTimer();
  }
}
function stoppedTimerSnapshot(timer,isSmart=false){
  const snapshot=JSON.parse(JSON.stringify(timer||{}));
  snapshot.running=false;
  snapshot.endAt=0;
  if(isSmart)snapshot.stopwatchStartedAt=0;
  return snapshot;
}
function exerciseBelongsToSession(id,key){
  if(!id)return false;
  const date=key.slice(0,10),day=Number(key.split('-').pop());
  return String(id).startsWith(date+'-'+day+'-');
}
function currentSessionSelectedExerciseId(key){
  if(exerciseBelongsToSession(inlineTimer.activeId,key))return inlineTimer.activeId;
  const current=document.querySelector('.exercise.session-current[data-timer-id]');
  if(current?.dataset?.timerId&&exerciseBelongsToSession(current.dataset.timerId,key))return current.dataset.timerId;
  const active=document.querySelector('.exercise.active-timer[data-timer-id]');
  if(active?.dataset?.timerId&&exerciseBelongsToSession(active.dataset.timerId,key))return active.dataset.timerId;
  const day=Number(key.split('-').pop()),date=key.slice(0,10);
  if([1,3,5].includes(day)){
    return strengthSessionSequence(day,date).find(item=>!logs[item.id]?.done)?.id||'';
  }
  return [...document.querySelectorAll('.exercise[data-timer-id]')]
    .find(card=>exerciseBelongsToSession(card.dataset.timerId,key)&&!card.classList.contains('complete'))?.dataset?.timerId||'';
}
function currentSessionResumeExerciseId(key){
  return currentSessionSelectedExerciseId(key);
}
function sessionEndActionsMarkup(key){
  const completed=!!logs[key]?.completed,paused=sessionPaused(key);
  const pauseLabel=paused?'Reopen session':'Pause session';
  const pauseAction=paused?'reopenSession':'pauseSession';
  return '<div class="session-end-actions '+(paused?'paused':'')+'">'+
    '<button id="pauseSessionButton" class="session-pause-button '+(paused?'reopen':'')+'" type="button" onclick="'+pauseAction+'(\''+key+'\')">'+pauseLabel+'</button>'+
    '<button id="completeSessionButton" class="complete-session '+(completed?'done':'')+'" type="button" onclick="completeSession(\''+key+'\')">'+(completed?'✓ Session complete':'Complete session')+'</button>'+
  '</div>';
}
function pauseSession(key){
  logs[key]=logs[key]||{};
  if(logs[key].completed)return;
  pauseSessionTimers();
  const selectedExerciseId=currentSessionSelectedExerciseId(key);
  const resumeExerciseId=selectedExerciseId||currentSessionResumeExerciseId(key);
  logs[key]={
    ...logs[key],
    paused:true,
    pausedAt:new Date().toISOString(),
    ...(resumeExerciseId?{resumeExerciseId}:{}),
    ...(selectedExerciseId?{selectedExerciseId}:{}),
    pausedTimers:{
      smartTimer:stoppedTimerSnapshot(smartTimer,true),
      inlineTimer:stoppedTimerSnapshot(inlineTimer,false)
    }
  };
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const actions=document.querySelector('.session-stage-complete .session-end-actions');
  if(actions)actions.outerHTML=sessionEndActionsMarkup(key);
  const badge=document.querySelector('#dayPage .session-mode-badge');
  if(badge){
    badge.textContent=document.getElementById('dayPage')?.classList.contains('compact-active')?'PAUSED · COMPACT':'PAUSED';
    badge.classList.add('paused');
  }
  renderHome();
  renderDays();
}
function restorePausedTimerSnapshots(key){
  const snapshots=logs[key]?.pausedTimers;
  if(!snapshots||typeof snapshots!=='object')return;
  if(snapshots.smartTimer&&typeof snapshots.smartTimer==='object'){
    smartTimer={...defaultSmartTimer,...snapshots.smartTimer,running:false,endAt:0,stopwatchStartedAt:0};
    saveSmartTimer();
  }
  if(snapshots.inlineTimer&&typeof snapshots.inlineTimer==='object'){
    inlineTimer={...defaultInlineTimer,...snapshots.inlineTimer,running:false,endAt:0};
    saveInlineTimer();
  }
}
function reopenSession(key){
  logs[key]=logs[key]||{};
  if(logs[key].completed)return;
  const selectedExerciseId=logs[key].selectedExerciseId||logs[key].resumeExerciseId||'';
  restorePausedTimerSnapshots(key);
  logs[key]={...logs[key],paused:false,resumedAt:new Date().toISOString()};
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  const day=Number(key.split('-').pop()),date=key.slice(0,10);
  openDay(day,date);
  requestAnimationFrame(()=>{
    const target=selectedExerciseId&&document.getElementById('ex-'+selectedExerciseId);
    if(target&&!target.classList.contains('complete')){
      document.querySelectorAll('.exercise.session-current,.exercise.compact-current').forEach(el=>el.classList.remove('session-current','compact-current'));
      target.classList.add('session-current');
      if(document.getElementById('dayPage')?.classList.contains('compact-active'))target.classList.add('compact-current');
      const item=strengthSessionItemById(selectedExerciseId);
      if(item){
        smartTimer.exerciseName=item.name;
        smartTimer.exerciseCategory='Strength';
        saveSmartTimer();
        refreshStrengthSessionProgress(item.day,item.date);
      }
      renderTimerPage();
      target.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  });
}
function completeSession(key){
  logs[key]=logs[key]||{};
  const completing=!logs[key].completed;
  logs[key]={...logs[key],completed:completing,paused:false};
  if(completing)logs[key].completedAt=logs[key].completedAt||new Date().toISOString();
  else delete logs[key].completedAt;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  renderHome();
  renderDays();
  openDay(Number(key.split('-').pop()),key.slice(0,10));
}
function renderProgress(){
  const fields=[['weight','Bodyweight','kg'],['waist','Waist','cm'],['bp','Blood pressure','mmHg'],['rhr','Resting heart rate','bpm'],['walk','2 km walk','min'],['pushups','Strict push-ups','reps']];
  const p=protein(),fat=fatLossTargets(),cal=calorieTargets(),ps=programProgressStats();
  let cards=fields.map(([id,n,u])=>`<div class="card measure"><span class="tag">${u}</span><h3>${n}</h3><input id="measure-${id}" value="${measurements[id]||''}" placeholder="Enter current"></div>`).join('');
  document.getElementById('progressPage').innerHTML=`<div class="page-title"><div class="eyebrow">12-week dashboard</div><h1>Progress</h1><p>Completed sessions, adherence and physical measures in one place.</p></div><section class="section"><div class="card adherence-card"><span class="tag">Program adherence</span><div class="adherence-grid"><div><b>${sessionsLastSevenDays()}</b><span>sessions · last 7 days</span></div><div><b>${ps.weekCompleted}</b><span>sessions · this program week</span></div><div><b>${ps.completed}/${ps.elapsed||0}</b><span>sessions complete / elapsed</span></div><div><b>${ps.adherence}%</b><span>completion to date</span></div></div><div class="adherence-track"><i style="width:${Math.min(100,Math.round(ps.completed/ps.programDays*100))}%"></i></div><small>${ps.completed} of 84 program days explicitly marked Session complete.</small></div></section><section class="section"><div class="card accent"><span class="tag">Nutrition targets</span><div class="target-grid"><div class="target-chip"><b>${p?`${p} g`:'Set weight'}</b><span>protein / eating day</span></div><div class="target-chip"><b>${cal?`${cal.eatingDay} kcal`:'Set details'}</b><span>eating-day target</span></div><div class="target-chip"><b>${cal?`${cal.predictedLoss} kg`:'—'}</b><span>planned loss / week</span></div><div class="target-chip"><b>${cal?`${cal.maintenance} kcal`:'—'}</b><span>estimated maintenance</span></div></div>${cal?`<div class="nutrition-strip">Target range ${fat.low}–${fat.high} kg/week · planned deficit ${cal.actualWeeklyDeficit} kcal/week · weekly intake ${cal.weeklyIntake} kcal. This math assumes Monday is truly 0 kcal.</div>`:''}</div><div class="measure-grid" style="margin-top:10px">${cards}</div><div class="savebar"><button class="complete-session" onclick="saveMeasurements()">Save measures</button></div></section><section class="section"><div class="card accent"><h3>Calorie adjustment rule</h3><p>${fat&&cal?`Use morning weights and compare 7-day averages across two full weeks. Only adjust if adherence was good. If loss is below ~${fat.low} kg/week for both weeks, remove ~100–150 kcal from eating days. If loss is above ~${fat.cap} kg/week, or strength/sleep/energy fall, add ~100–150 kcal. Keep protein steady; adjust rice and fats first.`:'Enter bodyweight to calculate the adjustment range.'}</p></div><div class="card" style="margin-top:10px"><h3>What success looks like</h3><p>Waist ↓ · strength maintained or ↑ · 2 km time ↓ · cardiovascular tolerance ↑ · blood pressure healthy · resting heart rate stable or ↓.</p></div></section>`;
}
function saveMeasurements(){['weight','waist','bp','rhr','walk','pushups'].forEach(id=>measurements[id]=document.getElementById('measure-'+id).value);const w=Number(measurements.weight);if(w>0){settings.bodyweight=w;motion12SetItem('motion12.settings',JSON.stringify(settings))}motion12SetItem('motion12.measurements',JSON.stringify(measurements));
renderHome();renderDays();renderProgress();
if(inlineTimer.activeId)inlineTimerEnsureTick();timerEnsureTick();const b=document.querySelector('#progressPage .complete-session');if(b){b.textContent='✓ Saved';setTimeout(()=>{if(b.isConnected)b.textContent='Save measures'},1200)}}

let activeSessionTimerContext={day:programDay(),date:todayISO(),week:weekNo()};
function setActiveSessionTimerContext(day,date,w){
  activeSessionTimerContext={day:Number(day),date:date||todayISO(),week:Number(w)||weekNo()};
}
function timerContextDay(){return Number.isInteger(activeSessionTimerContext?.day)?activeSessionTimerContext.day:programDay()}
function timerContextDate(){return activeSessionTimerContext?.date||todayISO()}
function timerContextWeek(){return Number(activeSessionTimerContext?.week)||weekNo()}
function toggleSessionTimerDetails(){/* full workout timer is always visible */}
function scrollToSessionRuntime(){/* no jump: timer remains in normal workout flow */}
function circuitTimingFromTarget(target,fallbackWork=30,fallbackRest=30){
  const m=String(target||'').match(/(\d+)\s*sec\s*work\s*\/\s*(\d+)\s*sec\s*(?:recovery|transition)/i);
  return m?{work:Number(m[1]),rest:Number(m[2])}:{work:fallbackWork,rest:fallbackRest};
}
function conditioningCircuitPlan(day,w){
  const rounds=(conditioningRounds[day]||[])[Math.max(0,Math.min(11,w-1))]||1;
  const work=program[day]?.work||[];
  let roundRest=0,title=conditioningTarget(day,w),note='';
  const fallback=day===2?{work:30,rest:30}:day===0?{work:40,rest:20}:{work:20,rest:40};
  const stations=work.map(ex=>{
    const timing=circuitTimingFromTarget(ex?.[1],fallback.work,fallback.rest);
    return {label:ex?.[0]||'Exercise',work:timing.work,rest:timing.rest};
  });
  if(!stations.length)return null;

  if(day===2){
    note='Recovery circuit: stay at RPE 4–5. Every work interval is followed by the recovery programmed on the exercise card.';
  }else if(day===4){
    note='Power circuit: follow the work/recovery timing shown on each exercise card. Keep every rep crisp; quality beats speed.';
  }else if(day===0){
    roundRest=60;
    note='Aerobic-base circuit: RPE 5–6. Keep moving easily and use the full 60-second recovery between rounds.';
  }else return null;

  const phases=[];
  for(let r=1;r<=rounds;r++){
    stations.forEach((st,stationIndex)=>{
      phases.push({
        label:st.label,
        seconds:st.work,
        round:r,
        phaseType:'work',
        stationIndex,
        stationName:st.label
      });
      phases.push({
        label:'RECOVER',
        seconds:st.rest,
        round:r,
        phaseType:'transition',
        stationIndex,
        stationName:st.label,
        nextStationIndex:stationIndex+1<stations.length?stationIndex+1:(r<rounds?0:null)
      });
    });
    if(roundRest&&r<rounds){
      phases.push({
        label:'ROUND REST',
        seconds:roundRest,
        round:r,
        phaseType:'round-rest',
        stationIndex:stations.length-1,
        nextStationIndex:0
      });
    }
  }
  return {kind:'intervals',title,note,rounds,phases,circuit:true,stationCount:stations.length};
}
function strengthExercisePlan(day=timerContextDay(),w=timerContextWeek(),preferredName=''){
  const p=program[day];
  if(!p?.work?.length)return null;
  const exercise=(preferredName&&p.work.find(x=>x[0]===preferredName))||p.work[0];
  if(!exercise)return null;
  const target=day===6?(aerobicTargets[w-1]||exercise[1]):exercise[1];
  const m=String(target||'').match(/^\s*(\d+)\s*×\s*(.+)$/i);
  if(!m)return null;
  const rest=exerciseRestPreset(exercise[0],day,w).seconds||90;
  return {
    kind:'strengthsets',
    exerciseName:exercise[0],
    sets:Number(m[1]),
    target:m[2],
    rest,
    title:exercise[0]+' · '+target,
    note:'Complete the lifting set, tap Set complete, then recovery starts automatically. The next set becomes ready when recovery ends.'
  };
}
function timerSessionPlan(day=timerContextDay(),w=timerContextWeek()){
  if(day===0||day===2||day===4)return conditioningCircuitPlan(day,w);
  if(day===6){
    if(aerobicPowerVariant(timerContextDate())==='B'){
      const rounds=4,phases=[];
      for(let r=1;r<=rounds;r++){
        phases.push({label:'WORK',seconds:240,round:r,cue:'Swing → squat-to-calf-raise → reverse lunge → swing'});
        phases.push({label:'RECOVER',seconds:180,round:r,cue:r===rounds?'Active recovery / cool down':'Easy walk or march'});
      }
      return {kind:'intervals',title:'Aerobic Power B · kettlebell + bodyweight',note:'4:00 work / 3:00 active recovery × 4. Keep the cardiovascular system—not grip or local muscle fatigue—as the limiter.',rounds,phases,aerobicAlternate:true};
    }
    const target=aerobicTargets[w-1]||'Aerobic session';
    const m=target.match(/(\d+)\s*×\s*(\d+)\s*min hard\s*\/\s*(\d+)\s*min easy/i);
    if(m){
      const rounds=Number(m[1]),hard=Number(m[2])*60,easy=Number(m[3])*60,phases=[];
      for(let r=1;r<=rounds;r++){
        phases.push({label:'HARD',seconds:hard,round:r});
        if(r<rounds)phases.push({label:'RECOVER',seconds:easy,round:r});
      }
      return {kind:'intervals',title:target,note:'Run the prescribed work/recovery sequence automatically.',rounds,phases};
    }
    return {kind:'stopwatch',title:target,note:'Today is continuous aerobic work, so elapsed time matters more than fixed intervals.'};
  }
  if(day===1||day===3||day===5)return strengthExercisePlan(day,w,smartTimer.exerciseName)||{kind:'rest',title:'Strength · between working sets',note:'Start with 90 seconds. Take 120 seconds after a demanding compound set if quality needs it.',rest:90};
  return {kind:'stopwatch',title:'Easy movement',note:'No prescribed intervals today. Use elapsed time only if it helps.'};
}
function exerciseRestPreset(name,day=timerContextDay(),w=timerContextWeek()){
  if(day===2)return {category:'Recovery circuit',seconds:30,action:'session',label:'30s / 30s',note:'Use the complete Restore circuit timer.'};
  if(day===4){
    const exercise=program[day]?.work?.find(x=>x[0]===name);
    const timing=circuitTimingFromTarget(exercise?.[1],20,40);
    return {category:'Power circuit',seconds:timing.rest,action:'session',label:timing.work+'s / '+timing.rest+'s',note:'Use the complete Power circuit timer.'};
  }
  if(day===0)return {category:'Aerobic base',seconds:20,action:'session',label:'40s / 20s',note:'Use the complete Aerobic Base circuit timer.'};
  if(/isometric/i.test(name))return {category:'Tendon capacity',seconds:75,action:'rest',label:'1:15',note:'Recover 60–90 seconds between high-force rounds so force quality stays high.'};
  const strength120=new Set(['Goblet squat','Pull-up / assisted pull-up','Ring row','Ring row / pull-up','Reverse lunge','Kettlebell Romanian deadlift']);
  const strength90=new Set(['1-arm kettlebell press','Push-up','1-arm kettlebell row','Lateral lunge']);
  const accessory60=new Set(['Suitcase carry','Plank shoulder tap','Back extension','Jefferson curl','Single-leg calf raise','Kettlebell woodchop','Plank shoulder tap / kettlebell woodchop']);
  if(name==='Aerobic intervals'||name==='Kettlebell + bodyweight 4×4'){
    const plan=timerSessionPlan(day,w);
    if(plan.kind==='intervals'){
      const recover=plan.phases.find(x=>x.label==='RECOVER');
      return {category:'Conditioning',seconds:recover?.seconds||180,action:'session',label:timerFormat(recover?.seconds||180)+' programmed',note:'Use the full programmed recovery so hard intervals stay repeatable.'};
    }
    return {category:'Conditioning',seconds:0,action:'session',label:'Continuous',note:'No fixed rest on today’s continuous aerobic session.'};
  }
  if(strength120.has(name))return {category:'Primary strength',seconds:120,action:'rest',label:'2:00',note:'Longer recovery protects force output and technique on demanding compound work.'};
  if(strength90.has(name))return {category:'Strength',seconds:90,action:'rest',label:'1:30',note:'Enough recovery to keep reps crisp without unnecessarily stretching the session.'};
  if(accessory60.has(name))return {category:'Accessory / core',seconds:60,action:'rest',label:'1:00',note:'Shorter recovery is usually sufficient for accessories, carries and trunk work.'};
  return {category:'Strength',seconds:90,action:'rest',label:'1:30',note:'A balanced default for moderate strength work.'};
}
function timerUseExercisePreset(name){
  timerPrimeAudio();
  const rec=exerciseRestPreset(name);
  if(rec.action==='session'){
    timerConfigure('session',true);
    smartTimer.exerciseName=name;
    smartTimer.exerciseCategory=rec.category;
    saveSmartTimer();
    renderTimerPage();
    return;
  }
  if([1,3,5].includes(timerContextDay())){
    smartTimer.exerciseName=name;
    smartTimer.exerciseCategory=rec.category;
    timerConfigure('session',true);
    renderTimerPage();
    return;
  }
  timerSetRest(rec.seconds,name,rec.category);
}
function exercisePresetMarkup(){
  const p=program[timerContextDay()];
  if(!p?.work?.length)return '';
  const work=timerContextDay()===6?aerobicPowerSessionWork(timerContextDate()):p.work;
  const circuitDay=timerContextDay()===0||timerContextDay()===2||timerContextDay()===4;
  return '<section class="section timer-exercise-section"><div class="section-head"><h2>'+(circuitDay?'Circuit timing':'Exercise recovery')+'</h2><small>'+(circuitDay?'session sequence':'tap to load')+'</small></div><div class="exercise-rest-list">'+
    work.map(x=>{
      const name=x[0],rec=exerciseRestPreset(name),active=smartTimer.exerciseName===name?' active':'';
      const safeName=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return '<button class="exercise-rest-preset'+active+'" type="button" onclick="timerUseExercisePreset(\''+safeName+'\')">'+
        '<span><b>'+name+'</b><small>'+rec.category+'</small></span>'+
        '<strong>'+rec.label+'</strong>'+
      '</button>';
    }).join('')+
  '</div></section>';
}
let timerPhaseTransitionUntil=0;
function saveSmartTimer(){motion12SetItem('motion12.timer',JSON.stringify(smartTimer))}
function timerFormat(sec){
  sec=Math.max(0,Math.floor(sec||0));
  const m=Math.floor(sec/60),s=sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function timerPhaseReadable(label){
  return String(label||'')
    .toLowerCase()
    .replace(/\bkb\b/g,'KB')
    .replace(/\b\w/g,m=>m.toUpperCase());
}
function timerCircuitExerciseIndex(plan,phaseIndex=smartTimer.phaseIndex){
  if(!plan?.circuit||!Array.isArray(plan.phases)||!plan.phases.length)return -1;
  const idx=Math.max(0,Math.min(plan.phases.length-1,Number(phaseIndex)||0));
  const phase=plan.phases[idx];

  if(phase?.phaseType==='work'&&Number.isInteger(phase.stationIndex)){
    return phase.stationIndex;
  }
  if(Number.isInteger(phase?.nextStationIndex)){
    return phase.nextStationIndex;
  }

  for(let i=idx+1;i<plan.phases.length;i++){
    const candidate=plan.phases[i];
    if(candidate?.phaseType==='work'&&Number.isInteger(candidate.stationIndex)){
      return candidate.stationIndex;
    }
  }
  return Number.isInteger(phase?.stationIndex)?phase.stationIndex:-1;
}
function syncCircuitTimerExercise(plan=timerSessionPlan()){
  if(!plan?.circuit)return;
  const exerciseIndex=timerCircuitExerciseIndex(plan,smartTimer.phaseIndex);
  const work=program[timerContextDay()]?.work||[];
  if(exerciseIndex>=0&&work[exerciseIndex]){
    smartTimer.exerciseName=work[exerciseIndex][0];
    smartTimer.exerciseCategory='Circuit station';
  }
}
function timerPlanSignature(plan){
  if(!plan?.circuit)return '';
  return (plan.phases||[]).map(p=>[
    p.phaseType||'',
    Number.isInteger(p.stationIndex)?p.stationIndex:'',
    p.label||'',
    p.seconds||0
  ].join(':')).join('|');
}
function timerConfigure(mode=smartTimer.mode||'session',force=false){
  const dayKey=timerContextDate()+':'+timerContextWeek();
  const plan=timerSessionPlan();
  const planSignature=timerPlanSignature(plan);
  const circuitPlanCurrent=!plan?.circuit||smartTimer.planSignature===planSignature;
  if(!force&&smartTimer.dayKey===dayKey&&smartTimer.mode===mode&&smartTimer.kind&&circuitPlanCurrent)return;
  smartTimer={...defaultSmartTimer,mode,dayKey,planSignature};
  if(mode==='rest'){
    smartTimer.kind='rest'; smartTimer.duration=90; smartTimer.remaining=90;
  }else if(mode==='stopwatch'){
    smartTimer.kind='stopwatch'; smartTimer.remaining=0; smartTimer.duration=0;
  }else{
    smartTimer.kind=plan.kind;
    if(plan.kind==='intervals'){
      smartTimer.phaseIndex=0;
      smartTimer.duration=plan.phases[0].seconds;
      smartTimer.remaining=plan.phases[0].seconds;
      syncCircuitTimerExercise(plan);
    }else if(plan.kind==='strengthsets'){
      smartTimer.kind='strengthsets';
      smartTimer.exerciseName=plan.exerciseName;
      smartTimer.strengthPhase='ready';
      smartTimer.totalSets=plan.sets;
      smartTimer.setIndex=0;
      smartTimer.restSeconds=plan.rest;
      smartTimer.target=plan.target;
      smartTimer.duration=plan.rest;
      smartTimer.remaining=0;
    }else if(plan.kind==='sets'||plan.kind==='rest'){
      smartTimer.duration=plan.rest;
      smartTimer.remaining=plan.rest;
    }else{
      smartTimer.remaining=0; smartTimer.duration=0;
    }
  }
  saveSmartTimer();
}
function timerCurrentSeconds(){
  if(smartTimer.kind==='stopwatch'||(smartTimer.kind==='strengthsets'&&smartTimer.strengthPhase==='work')){
    return (smartTimer.stopwatchElapsed||0)+(smartTimer.running&&smartTimer.stopwatchStartedAt?Math.floor((Date.now()-smartTimer.stopwatchStartedAt)/1000):0);
  }
  return smartTimer.running?Math.max(0,Math.ceil((smartTimer.endAt-Date.now())/1000)):Math.max(0,smartTimer.remaining||0);
}
function timerPrimeAudio(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    window.__motionTimerAudio=window.__motionTimerAudio||new AC();
    if(window.__motionTimerAudio.state==='suspended')window.__motionTimerAudio.resume();
  }catch(e){}
}
function timerBeep(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    window.__motionTimerAudio=window.__motionTimerAudio||new AC();
    const ctx=window.__motionTimerAudio,o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.value=880;g.gain.value=.05;o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+.16);
  }catch(e){}
}
function timerTick(){
  if(!smartTimer.running){
    if(document.getElementById('sessionTimerMount'))updateSmartTimerDisplay();
    return;
  }
  const now=Date.now();
  if(smartTimer.kind==='strengthsets'){
    if(smartTimer.strengthPhase==='rest'&&smartTimer.endAt&&now>=smartTimer.endAt){
      const currentId=strengthExerciseIdFromName(smartTimer.exerciseName);
      const finalRest=!!smartTimer.finalRest||smartTimer.setIndex>=smartTimer.totalSets;
      smartTimer.running=false;
      smartTimer.remaining=0;
      smartTimer.endAt=0;
      smartTimer.stopwatchElapsed=0;
      smartTimer.stopwatchStartedAt=0;
      smartTimer.strengthPhase=finalRest?'complete':'ready';
      smartTimer.finalRest=false;
      saveSmartTimer();
      timerBeep();
      if(finalRest&&currentId){
        strengthAdvanceAfterFinalRest(currentId,{syncInline:inlineTimer.activeId===currentId,syncSmart:true,scroll:true});
      }
    }
  }else if(smartTimer.kind==='intervals'){
    const plan=timerSessionPlan();
    let changed=false;
    while(smartTimer.running&&now>=smartTimer.endAt){
      const previousEnd=smartTimer.endAt;
      smartTimer.phaseIndex++;
      changed=true;
      if(smartTimer.phaseIndex>=plan.phases.length){
        smartTimer.running=false;smartTimer.remaining=0;smartTimer.endAt=0;timerBeep();break;
      }
      const phase=plan.phases[smartTimer.phaseIndex];
      smartTimer.duration=phase.seconds;
      smartTimer.remaining=phase.seconds;
      smartTimer.endAt=previousEnd+phase.seconds*1000;
      syncCircuitTimerExercise(plan);
      timerBeep();
    }
    if(changed){
      timerPhaseTransitionUntil=Date.now()+190;
      saveSmartTimer();
    }
  }else if(smartTimer.kind!=='stopwatch'&&now>=smartTimer.endAt){
    smartTimer.running=false;smartTimer.remaining=0;smartTimer.endAt=0;saveSmartTimer();timerBeep();
  }
  if(document.getElementById('sessionTimerMount'))updateSmartTimerDisplay();
}
function timerEnsureTick(){
  if(timerInt)return;
  timerInt=setInterval(timerTick,250);
}
function timerSetMode(mode){timerConfigure(mode,true);renderTimerPage()}
function timerStartPause(){
  timerPrimeAudio();
  timerConfigure(smartTimer.mode||'session',false);

  if(smartTimer.kind==='strengthsets'){
    if(smartTimer.strengthPhase==='complete')return;

    if(smartTimer.strengthPhase==='ready'){
      smartTimer.strengthPhase='work';
      smartTimer.stopwatchElapsed=0;
      smartTimer.stopwatchStartedAt=Date.now();
      smartTimer.running=true;
      smartTimer.remaining=0;
      smartTimer.endAt=0;
      saveSmartTimer();timerEnsureTick();renderTimerPage();
      return;
    }

    if(smartTimer.strengthPhase==='work'){
      if(smartTimer.running){
        smartTimer.stopwatchElapsed=timerCurrentSeconds();
        smartTimer.running=false;
        smartTimer.stopwatchStartedAt=0;
      }else{
        smartTimer.stopwatchStartedAt=Date.now();
        smartTimer.running=true;
      }
      saveSmartTimer();timerEnsureTick();renderTimerPage();
      return;
    }

    if(smartTimer.strengthPhase==='rest'){
      if(smartTimer.running){
        smartTimer.remaining=timerCurrentSeconds();
        smartTimer.running=false;
        smartTimer.endAt=0;
      }else{
        if(timerCurrentSeconds()<=0)smartTimer.remaining=smartTimer.duration||smartTimer.restSeconds||90;
        smartTimer.endAt=Date.now()+smartTimer.remaining*1000;
        smartTimer.running=true;
      }
      saveSmartTimer();timerEnsureTick();renderTimerPage();
      return;
    }
  }

  if(smartTimer.running){
    if(smartTimer.kind==='stopwatch')smartTimer.stopwatchElapsed=timerCurrentSeconds();
    else smartTimer.remaining=timerCurrentSeconds();
    smartTimer.running=false;smartTimer.endAt=0;smartTimer.stopwatchStartedAt=0;
  }else{
    if(smartTimer.kind==='stopwatch'){
      smartTimer.stopwatchStartedAt=Date.now();smartTimer.running=true;
    }else{
      if(timerCurrentSeconds()<=0){
        if(smartTimer.kind==='intervals'){
          const plan=timerSessionPlan();
          if(smartTimer.phaseIndex>=plan.phases.length)smartTimer.phaseIndex=0;
          smartTimer.duration=plan.phases[smartTimer.phaseIndex].seconds;
          smartTimer.remaining=smartTimer.duration;
          syncCircuitTimerExercise(plan);
        }else smartTimer.remaining=smartTimer.duration||90;
      }
      smartTimer.endAt=Date.now()+smartTimer.remaining*1000;smartTimer.running=true;
    }
  }
  saveSmartTimer();timerEnsureTick();renderTimerPage();
}
function timerStrengthSetComplete(){
  timerPrimeAudio();
  timerConfigure('session',false);
  if(smartTimer.kind!=='strengthsets'||!['ready','work'].includes(smartTimer.strengthPhase))return;
  if(smartTimer.strengthPhase==='work'){
    smartTimer.stopwatchElapsed=timerCurrentSeconds();
    smartTimer.stopwatchStartedAt=0;
  }
  smartTimer.setIndex++;
  smartTimer.finalRest=smartTimer.setIndex>=smartTimer.totalSets;
  smartTimer.strengthPhase='rest';
  smartTimer.duration=smartTimer.restSeconds||90;
  smartTimer.remaining=smartTimer.duration;
  smartTimer.endAt=Date.now()+smartTimer.duration*1000;
  smartTimer.running=true;
  saveSmartTimer();timerEnsureTick();renderTimerPage();
}
function timerSkipStrengthRest(){
  if(smartTimer.kind!=='strengthsets'||smartTimer.strengthPhase!=='rest')return;
  const currentId=strengthExerciseIdFromName(smartTimer.exerciseName);
  const finalRest=!!smartTimer.finalRest||smartTimer.setIndex>=smartTimer.totalSets;
  smartTimer.running=false;
  smartTimer.remaining=0;
  smartTimer.endAt=0;
  smartTimer.strengthPhase=finalRest?'complete':'ready';
  smartTimer.finalRest=false;
  saveSmartTimer();timerBeep();
  if(finalRest&&currentId){
    strengthAdvanceAfterFinalRest(currentId,{syncInline:inlineTimer.activeId===currentId,syncSmart:true,scroll:true});
    return;
  }
  renderTimerPage();
}
function timerReset(){timerConfigure(smartTimer.mode||'session',true);renderTimerPage()}
function timerSetRest(sec,exerciseName='',exerciseCategory=''){
  smartTimer={...defaultSmartTimer,mode:'rest',kind:'rest',duration:sec,remaining:sec,exerciseName,exerciseCategory,dayKey:timerContextDate()+':'+timerContextWeek()};
  saveSmartTimer();renderTimerPage();
}
function timerAdjust(delta){
  if(smartTimer.kind==='stopwatch')return;
  if(smartTimer.running)smartTimer.endAt=Math.max(Date.now(),smartTimer.endAt+delta*1000);
  else smartTimer.remaining=Math.max(0,(smartTimer.remaining||0)+delta);
  smartTimer.duration=Math.max(15,(smartTimer.duration||0)+delta);
  saveSmartTimer();updateSmartTimerDisplay();
}
function timerSkipPhase(){
  if(smartTimer.kind!=='intervals')return;
  const plan=timerSessionPlan();
  smartTimer.phaseIndex++;
  if(smartTimer.phaseIndex>=plan.phases.length){
    smartTimer.running=false;smartTimer.remaining=0;smartTimer.endAt=0;
  }else{
    const phase=plan.phases[smartTimer.phaseIndex];
    smartTimer.duration=phase.seconds;smartTimer.remaining=phase.seconds;
    if(smartTimer.running)smartTimer.endAt=Date.now()+phase.seconds*1000;
    syncCircuitTimerExercise(plan);
  }
  timerPhaseTransitionUntil=Date.now()+190;
  saveSmartTimer();timerBeep();renderTimerPage();
}
function timerCompleteSet(){
  timerPrimeAudio();
  const plan=timerSessionPlan();
  if(smartTimer.kind!=='sets'||smartTimer.running||smartTimer.setIndex>=plan.sets)return;
  smartTimer.setIndex++;
  if(smartTimer.setIndex>=plan.sets){
    smartTimer.running=false;smartTimer.remaining=0;smartTimer.endAt=0;timerBeep();
  }else{
    smartTimer.duration=plan.rest;smartTimer.remaining=plan.rest;
    smartTimer.endAt=Date.now()+plan.rest*1000;smartTimer.running=true;
  }
  saveSmartTimer();renderTimerPage();
}
function timerViewModel(){
  timerConfigure(smartTimer.mode||'session',false);
  const plan=timerSessionPlan(),sec=timerCurrentSeconds(),kind=smartTimer.kind;
  let label='REST',meta=plan.title,progress=0,detail='',nextText='';
  let clockText='',ringDurationOverride=0;
  if(kind==='strengthsets'){
    const currentSet=Math.min(smartTimer.totalSets,smartTimer.setIndex+1);
    if(smartTimer.strengthPhase==='complete'){
      label='COMPLETE';
      meta=smartTimer.exerciseName||plan.exerciseName;
      progress=0;
      clockText='✓';
      detail=smartTimer.totalSets+' sets complete';
      nextText='';
    }else if(smartTimer.strengthPhase==='rest'){
      const finalRest=!!smartTimer.finalRest||smartTimer.setIndex>=smartTimer.totalSets;
      const currentId=strengthExerciseIdFromName(smartTimer.exerciseName);
      const nextExercise=currentId?strengthNextExercise(currentId):null;
      label=finalRest?'FINAL REST':'REST';
      meta='Set '+smartTimer.setIndex+' of '+smartTimer.totalSets+' complete';
      progress=smartTimer.duration?sec/smartTimer.duration:0;
      clockText=timerFormat(sec);
      detail=plan.note;
      nextText=finalRest?(nextExercise?nextExercise.name:'Strength work complete'):'Set '+(smartTimer.setIndex+1)+' · Ready';
    }else if(smartTimer.strengthPhase==='work'){
      label=smartTimer.running?'SET '+currentSet+' ACTIVE':'SET '+currentSet+' PAUSED';
      meta=(smartTimer.target||plan.target||'')+' · '+(smartTimer.exerciseName||plan.exerciseName);
      const ringSecond=sec%60;
      progress=sec>0&&ringSecond===0?1:ringSecond/60;
      clockText=timerFormat(sec);
      detail=plan.note;
      nextText='Set complete → Rest · '+timerFormat(smartTimer.restSeconds||plan.rest||90);
    }else{
      label='SET '+currentSet+' READY';
      meta=smartTimer.exerciseName||plan.exerciseName;
      progress=0;
      clockText=smartTimer.target||plan.target||'';
      detail=plan.note;
      nextText='Rest · '+timerFormat(smartTimer.restSeconds||plan.rest||90);
    }
  }else if(kind==='intervals'){
    const phase=plan.phases[Math.min(smartTimer.phaseIndex,plan.phases.length-1)];
    if(smartTimer.phaseIndex>=plan.phases.length){
      label='COMPLETE';meta=plan.title;progress=0;
      detail=plan.circuit?'All '+plan.rounds+' circuit rounds complete':plan.aerobicAlternate?'All '+plan.rounds+' Aerobic Power B rounds complete':'All '+plan.rounds+' hard intervals complete';
    }else{
      label=phase.label;meta='Round '+phase.round+' of '+plan.rounds;
      progress=smartTimer.duration?sec/smartTimer.duration:0;detail=plan.title;
      const next=plan.phases[smartTimer.phaseIndex+1];
      nextText=next?timerPhaseReadable(next.label)+' · '+(next.seconds>=60?timerFormat(next.seconds):next.seconds+' sec'):'Complete';
      if(plan.aerobicAlternate&&String(phase.label).toUpperCase()==='WORK'){
        const move=aerobicPowerBMovementState(sec);
        label='WORK · '+move.movement.short.toUpperCase();
        meta='Round '+phase.round+' of '+plan.rounds+' · '+move.movement.name;
        clockText=timerFormat(move.movementRemaining);
        progress=move.movementRemaining/60;
        ringDurationOverride=60;
        detail='Minute '+(move.index+1)+' of 4 · '+move.movement.name;
        nextText=move.next?move.next.name+' · 1:00':'Active recovery · 3:00';
      }else if(plan.aerobicAlternate&&String(phase.label).toUpperCase()==='RECOVER'){
        meta='Round '+phase.round+' of '+plan.rounds+' · Active recovery';
        detail=phase.round===plan.rounds?'Cool down while breathing settles':'Easy walk or march';
        nextText=phase.round===plan.rounds?'Complete':'2-hand kettlebell swing · 1:00';
      }
    }
  }else if(kind==='sets'){
    label=smartTimer.setIndex>=plan.sets?'COMPLETE':smartTimer.running?'REST':'SET '+(smartTimer.setIndex+1);
    meta=smartTimer.setIndex>=plan.sets?plan.sets+' sets complete':(smartTimer.setIndex+1)+' of '+plan.sets+' · '+plan.reps+' reps';
    progress=smartTimer.setIndex>=plan.sets?0:(smartTimer.running&&smartTimer.duration?sec/smartTimer.duration:1);
    detail=plan.title;
  }else if(kind==='stopwatch'){
    label='ELAPSED';meta=plan.title;detail=plan.note;progress=0;
  }else{
    label='REST';
    meta=smartTimer.mode==='session'?plan.title:(smartTimer.exerciseName||'Manual rest');
    progress=smartTimer.duration?sec/smartTimer.duration:0;
    detail=smartTimer.mode==='session'?plan.note:(smartTimer.exerciseName?(smartTimer.exerciseCategory+' recovery preset · adjust ±15 sec if needed.'):'Use this for any set that needs a different recovery time.');
  }
  const duration=Math.max(0,Number(smartTimer.duration)||0);
  const ringDuration=ringDurationOverride||((kind==='strengthsets'&&smartTimer.strengthPhase==='work')?60:duration);
  const stepAngle=ringDuration>0?360/ringDuration:360;
  const gapAngle=ringDuration>0?Math.min(1.6,Math.max(.55,stepAngle*.16)):0;
  const fillAngle=Math.max(.1,stepAngle-gapAngle);
  const majorStepAngle=ringDuration>0?stepAngle*5:360;
  const majorGapAngle=ringDuration>0?Math.min(3.2,Math.max(1.5,gapAngle*1.9)):0;
  const normalizedProgress=Math.max(0,Math.min(1,progress));
  const transitioning=Date.now()<timerPhaseTransitionUntil;
  return {
    plan,sec,kind,label,meta,detail,nextText,clockText,
    progress:normalizedProgress,
    ringProgress:transitioning?0:normalizedProgress,
    transitioning,
    duration,ringDuration,stepAngle,gapAngle,fillAngle,majorStepAngle,majorGapAngle
  };
}
function timerPrimaryLabel(vm){
  if(smartTimer.running)return 'Pause';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='ready')return 'Start';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='work')return smartTimer.stopwatchElapsed>0?'Resume':'Start';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='rest')return 'Resume';
  if(vm.kind==='stopwatch')return smartTimer.stopwatchElapsed>0?'Resume':'Start';
  if(vm.kind==='intervals'&&smartTimer.phaseIndex>=vm.plan.phases.length)return 'Start again';
  const sec=timerCurrentSeconds(),duration=Math.max(0,Number(smartTimer.duration)||0);
  if(duration>0&&sec>0&&sec<duration)return 'Resume';
  if(duration>0&&sec<=0)return 'Start again';
  return 'Start';
}
function timerControls(vm){
  const primary='<button type="button" class="timer-primary" onclick="timerStartPause()">'+timerPrimaryLabel(vm)+'</button>';
  const reset='<button type="button" class="timer-reset" onclick="timerReset()">Reset</button>';
  if(vm.kind==='strengthsets'){
    if(smartTimer.strengthPhase==='complete')return '<button type="button" class="timer-primary" onclick="timerReset()">Start again</button>';
    if(smartTimer.strengthPhase==='ready'||smartTimer.strengthPhase==='work'){
      return primary+'<button type="button" class="timer-set-complete" onclick="timerStrengthSetComplete()">Set complete</button>'+reset;
    }
    return primary+'<button type="button" onclick="timerSkipStrengthRest()">Skip rest</button>'+reset;
  }
  if(vm.kind==='intervals')return primary+'<button type="button" onclick="timerSkipPhase()">Skip phase</button>'+reset;
  if(vm.kind==='sets'){
    if(smartTimer.setIndex>=vm.plan.sets)return '<button type="button" class="timer-primary" onclick="timerReset()">Start again</button>';
    if(smartTimer.running)return primary+'<button type="button" onclick="timerAdjust(15)">+15 sec</button>'+reset;
    return '<button type="button" class="timer-primary" onclick="timerCompleteSet()">Set complete → rest</button>'+reset;
  }
  if(vm.kind==='stopwatch')return primary+reset;
  return primary+'<button type="button" onclick="timerAdjust(-15)">−15 sec</button><button type="button" onclick="timerAdjust(15)">+15 sec</button>'+reset;
}
function timerIsRecoveryPhase(label){
  const x=String(label||'').toUpperCase();
  return x==='RECOVER'||x==='ROUND REST';
}
function timerSessionProgressData(vm){
  const day=timerContextDay(),w=timerContextWeek(),p=program[day];
  if(!p)return null;

  if([1,3,5].includes(day)){
    const date=timerContextDate(),sequence=strengthSessionSequence(day,date);
    const completed=sequence.map(item=>!!logs[item.id]?.done);
    let currentIndex=-1;
    if(smartTimer.exerciseName){
      const matched=sequence.findIndex(x=>x.name===smartTimer.exerciseName);
      if(matched>=0&&!completed[matched])currentIndex=matched;
    }
    if(currentIndex<0)currentIndex=completed.findIndex(done=>!done);
    const completedCount=completed.filter(Boolean).length;
    const remainingCount=Math.max(0,sequence.length-completedCount-(currentIndex>=0?1:0));
    return {
      type:'strength',
      total:sequence.length,
      completedCount,
      remainingCount,
      currentIndex,
      segments:sequence.map((x,i)=>({
        name:x.name,
        state:completed[i]?'complete':i===currentIndex?'current':'remaining'
      })),
      eyebrow:'Strength session',
      currentName:currentIndex>=0?sequence[currentIndex].name:'Strength sequence complete',
      currentDetail:currentIndex>=0?sequence[currentIndex].target:'All '+sequence.length+' sequenced exercises complete',
      countText:completedCount+' / '+sequence.length
    };
  }

  const plan=timerSessionPlan(day,w);
  if(plan?.kind==='intervals'&&Array.isArray(plan.phases)){
    const workIndices=[];
    plan.phases.forEach((phase,i)=>{
      if(!timerIsRecoveryPhase(phase.label))workIndices.push(i);
    });
    if(!workIndices.length)return null;

    const phaseIndex=smartTimer.kind==='intervals'?smartTimer.phaseIndex:0;
    const completeSession=phaseIndex>=plan.phases.length;
    const completedCount=completeSession?workIndices.length:workIndices.filter(i=>i<phaseIndex).length;
    let currentOrdinal=-1;
    if(!completeSession){
      const exact=workIndices.indexOf(phaseIndex);
      if(exact>=0)currentOrdinal=exact;
      else currentOrdinal=workIndices.findIndex(i=>i>phaseIndex);
    }
    const currentPhase=!completeSession?plan.phases[Math.min(phaseIndex,plan.phases.length-1)]:null;
    const nextWork=currentOrdinal>=0?plan.phases[workIndices[currentOrdinal]]:null;
    const remainingCount=Math.max(0,workIndices.length-completedCount-(currentOrdinal>=0?1:0));
    const segments=workIndices.map((idx,ordinal)=>({
      name:plan.phases[idx].label,
      state:idx<phaseIndex?'complete':ordinal===currentOrdinal?'current':'remaining'
    }));

    let currentName='Session complete',currentDetail='All '+workIndices.length+' work stations complete';
    if(currentPhase){
      if(plan.aerobicAlternate&&String(currentPhase.label).toUpperCase()==='WORK'){
        const move=aerobicPowerBMovementState(vm?.sec??240);
        currentName=move.movement.name;
        currentDetail='Minute '+(move.index+1)+' of 4 · 1:00';
      }else if(plan.aerobicAlternate&&timerIsRecoveryPhase(currentPhase.label)){
        currentName='Active recovery';
        currentDetail='3:00 · '+(currentPhase.round===plan.rounds?'cool down':'easy walk or march');
      }else if(timerIsRecoveryPhase(currentPhase.label)){
        currentName=timerPhaseReadable(currentPhase.label);
        currentDetail=currentPhase.cue||(nextWork?'Next · '+timerPhaseReadable(nextWork.label):'Final recovery');
      }else{
        currentName=timerPhaseReadable(currentPhase.label);
        currentDetail=currentPhase.cue||'Current station';
      }
    }
    return {
      type:plan.circuit?'circuit':'intervals',
      total:workIndices.length,
      completedCount,
      remainingCount,
      currentIndex:currentOrdinal,
      exerciseIndex:plan.circuit?timerCircuitExerciseIndex(plan,phaseIndex):currentOrdinal,
      segments,
      eyebrow:plan.circuit?'Circuit progress':'Interval progress',
      currentName,
      currentDetail,
      countText:completedCount+' / '+workIndices.length
    };
  }

  if(plan?.kind==='stopwatch'){
    return {
      type:'continuous',
      total:1,completedCount:0,remainingCount:0,currentIndex:0,
      segments:[{name:plan.title,state:'current'}],
      eyebrow:'Session progress',
      currentName:plan.title,
      currentDetail:'Continuous session',
      countText:'In progress'
    };
  }
  return null;
}
function timerSessionProgressMarkup(vm){
  const s=timerSessionProgressData(vm);
  if(!s)return '';
  const segments=s.segments.map(x=>
    '<span class="timer-progress-segment '+x.state+'" title="'+x.name+'" aria-label="'+x.name+' · '+x.state+'"></span>'
  ).join('');
  const footer=s.type==='continuous'
    ?'<span class="current">Continuous session</span>'
    :'<span class="done">'+s.completedCount+' complete</span><span class="current">'+s.currentDetail+'</span><span class="remain">'+s.remainingCount+' remaining</span>';
  return '<div class="timer-session-progress" id="timerSessionProgress">'+
    '<div class="timer-progress-head"><div><span>'+s.eyebrow+'</span><strong>'+s.currentName+'</strong></div><b>'+s.countText+'</b></div>'+
    '<div class="timer-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.completedCount+'" aria-label="'+s.completedCount+' of '+s.total+' session steps complete">'+segments+'</div>'+
    '<div class="timer-progress-foot '+(s.type==='continuous'?'continuous':'')+'">'+footer+'</div>'+
  '</div>';
}
function updateTimerSessionProgress(vm){
  const mount=document.getElementById('sessionProgressMount');
  if(!mount)return;
  const day=timerContextDay(),date=timerContextDate();
  const html=[1,3,5].includes(day)
    ?strengthSessionProgressMarkup(day,date)
    :timerSessionProgressMarkup(vm);
  if(html)mount.innerHTML=html;
}
function timerTopRightMeta(vm){
  return vm.kind==='intervals'?'':vm.meta;
}
function timerRingSegmentCount(vm){
  const duration=Math.max(1,Math.round(Number(vm?.ringDuration??vm?.duration)||1));
  return Math.min(180,duration);
}
function timerRingActiveCount(vm,count=timerRingSegmentCount(vm)){
  if(vm?.transitioning)return 0;
  return Math.max(0,Math.min(count,Math.ceil((Number(vm?.ringProgress)||0)*count-1e-7)));
}
function timerRingPoint(cx,cy,r,deg){
  const rad=deg*Math.PI/180;
  return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];
}
function timerRingSegmentPath(index,count){
  const cx=50,cy=50,r=47.5;
  const step=360/count;
  const gap=Math.min(step*.24,Math.max(.8,step*.12));
  const start=-90+index*step+gap/2;
  const end=-90+(index+1)*step-gap/2;
  const a=timerRingPoint(cx,cy,r,start);
  const b=timerRingPoint(cx,cy,r,end);
  return 'M '+a[0].toFixed(3)+' '+a[1].toFixed(3)+' A '+r+' '+r+' 0 0 1 '+b[0].toFixed(3)+' '+b[1].toFixed(3);
}
function timerRingSvgMarkup(vm){
  const count=timerRingSegmentCount(vm);
  const active=timerRingActiveCount(vm,count);
  const paths=Array.from({length:count},(_,i)=>
    '<path class="timer-ring-segment '+(i<active?'remaining':'elapsed')+'" data-ring-index="'+i+'" d="'+timerRingSegmentPath(i,count)+'"></path>'
  ).join('');
  return '<svg class="timer-ring-svg" id="timerRingSvg" data-segment-count="'+count+'" data-active-count="'+active+'" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+paths+'</svg>';
}
function updateTimerRingSegments(vm){
  const svg=document.getElementById('timerRingSvg');
  if(!svg)return;
  const count=timerRingSegmentCount(vm);
  const active=timerRingActiveCount(vm,count);
  if(Number(svg.dataset.segmentCount)!==count){
    svg.outerHTML=timerRingSvgMarkup(vm);
    return;
  }
  if(Number(svg.dataset.activeCount)===active)return;
  svg.dataset.activeCount=String(active);
  svg.querySelectorAll('.timer-ring-segment').forEach((segment,i)=>{
    segment.classList.toggle('remaining',i<active);
    segment.classList.toggle('elapsed',i>=active);
  });
}
function syncCompactSessionFocus(vm){
  const page=document.getElementById('dayPage');
  if(!page)return;
  const compact=page.classList.contains('compact-active');
  const day=timerContextDay(),date=timerContextDate();

  let cards=[];
  if([1,3,5].includes(day)){
    cards=strengthSessionSequence(day,date)
      .map(item=>document.getElementById('ex-'+item.id))
      .filter(Boolean);
  }else{
    cards=[...page.querySelectorAll('.workout-exercises-section > .exercise[data-timer-support="0"]')];
  }
  cards.forEach(card=>{
    card.classList.remove('compact-current');
    if(![1,3,5].includes(day))card.classList.remove('session-current');
  });
  if(!cards.length)return;

  const progress=timerSessionProgressData(vm||timerViewModel());
  let index=progress?.exerciseIndex??progress?.currentIndex??-1;
  if(index<0){
    index=cards.findIndex(card=>!card.classList.contains('complete'));
    if(index<0)index=cards.length-1;
  }
  if(progress&&progress.type==='intervals'&&!progress.exerciseIndex)index=index%cards.length;
  index=Math.max(0,Math.min(cards.length-1,index));

  if([1,3,5].includes(day)){
    cards.forEach(card=>card.classList.remove('session-current'));
  }
  const current=cards[index];
  if(current){
    current.classList.add('session-current');
    if(compact)current.classList.add('compact-current');
  }
}
function renderTimerPage(){
  const progressMount=document.getElementById('sessionProgressMount');
  const timerMount=document.getElementById('sessionTimerMount');
  if(!progressMount||!timerMount)return;
  if([1,3,5].includes(timerContextDay()))syncSmartStrengthToCurrent();
  timerConfigure(smartTimer.mode||'session',false);
  const vm=timerViewModel(),day=timerContextDay(),date=timerContextDate();
  const presets=vm.kind==='rest'
    ?'<div class="timer-presets"><button onclick="timerSetRest(60)">1:00</button><button onclick="timerSetRest(90)">1:30</button><button onclick="timerSetRest(120)">2:00</button></div>'
    :'';
  const progress=[1,3,5].includes(day)
    ?strengthSessionProgressMarkup(day,date)
    :timerSessionProgressMarkup(vm);

  progressMount.innerHTML=progress;
  timerMount.innerHTML=
    '<section class="smart-timer-card session-smart-timer workout-primary-timer">'+
      '<div class="timer-context"><span>'+vm.label+'</span><b id="timerTopRightMeta">'+timerTopRightMeta(vm)+'</b></div>'+
      '<div class="timer-ring" id="timerRing">'+timerRingSvgMarkup(vm)+'<div><span id="timerPhase" class="'+(String(vm.label).length>26?'long':'')+'">'+vm.label+'</span><strong id="smartClock">'+(vm.clockText||timerFormat(vm.sec))+'</strong><small id="timerMeta">'+vm.meta+'</small><div class="timer-next" id="timerNext">'+(vm.nextText?'<span class="timer-next-label">Next</span><span class="timer-next-stage">'+vm.nextText+'</span>':'')+'</div></div></div>'+
      '<div class="mobile-smart-timer-controls smart-timer-controls" id="mobileSmartTimerControls" aria-label="Timer controls">'+timerControls(vm)+'</div>'+
      '<div class="workout-timer-footer" id="workoutTimerFooter"><div class="smart-timer-controls" id="smartTimerControls" aria-label="Timer controls">'+timerControls(vm)+'</div>'+presets+'</div>'+
    '</section>';
  syncCompactSessionFocus(vm);
  timerEnsureTick();
}
function updateSmartTimerDisplay(){
  const clock=document.getElementById('smartClock');
  if(!clock)return;
  const vm=timerViewModel();
  clock.textContent=vm.clockText||timerFormat(vm.sec);
  const phase=document.getElementById('timerPhase');
  if(phase){
    phase.textContent=vm.label;
    phase.classList.toggle('long',String(vm.label).length>26);
  }
  const meta=document.getElementById('timerMeta');if(meta)meta.textContent=vm.meta;
  const topRightMeta=document.getElementById('timerTopRightMeta');if(topRightMeta)topRightMeta.textContent=timerTopRightMeta(vm);
  const next=document.getElementById('timerNext');
  if(next)next.innerHTML=vm.nextText?'<span class="timer-next-label">Next</span><span class="timer-next-stage">'+vm.nextText+'</span>':'';
  updateTimerRingSegments(vm);
  const controls=document.getElementById('smartTimerControls');if(controls)controls.innerHTML=timerControls(vm);
  const mobileControls=document.getElementById('mobileSmartTimerControls');if(mobileControls)mobileControls.innerHTML=timerControls(vm);
  updateTimerSessionProgress(vm);
  syncCompactSessionFocus(vm);
  if([1,3,5].includes(timerContextDay()))refreshStrengthSessionProgress(timerContextDay(),timerContextDate());
}
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  if(id==='homePage')renderHome();
  if(id==='daysPage')renderDays();
  if(id==='progressPage')renderProgress();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('todayDate').textContent=formatDate();
document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.getElementById('homeModeToggle').onclick=toggleHomeMode;
updateHomeModeToggle();
const APP_PALETTE_LABELS=Object.freeze({
  ember:'Ember',
  ocean:'Ocean',
  forest:'Forest',
  violet:'Violet',
  gold:'Gold',
  rose:'Rose'
});
function setAppPalettePicker(value,preview=true){
  const palette=normalizeAppPalette(value);
  const input=document.getElementById('appPaletteInput');
  if(input)input.value=palette;
  document.querySelectorAll('.palette-swatch[data-palette]').forEach(button=>{
    const selected=button.dataset.palette===palette;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-checked',selected?'true':'false');
    button.tabIndex=selected?0:-1;
  });
  const label=document.getElementById('appPaletteName');
  if(label)label.textContent=APP_PALETTE_LABELS[palette]||'Ember';
  if(preview)applyAppPalette(palette);
}
function initAppPalettePicker(){
  document.querySelectorAll('.palette-swatch[data-palette]').forEach(button=>{
    button.onclick=()=>setAppPalettePicker(button.dataset.palette,true);
  });
  setAppPalettePicker(settings.appPalette||'ember',true);
}
const MOTION12_BUILD_META='motion12-build';
function shortInstallationId(value){
  const s=String(value||'');
  return s?s.slice(0,8)+'…'+s.slice(-4):'—';
}
function setDiagnosticValue(id,value,state){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=value==null||value===''?'—':String(value);
  el.classList.remove('ok','warn');
  if(state)el.classList.add(state);
}
async function updateAppDiagnostics(){
  if(!window.Motion12Persistence)return;
  const status=window.Motion12Persistence.status();
  const build=document.querySelector('meta[name="'+MOTION12_BUILD_META+'"]')?.content||'unknown';
  setDiagnosticValue('diagBuild',build,'ok');
  setDiagnosticValue('diagSchema','v'+(status.schemaVersion??'?'),'ok');
  setDiagnosticValue('diagDatabase',(status.databaseName||'motion12')+' · v'+(status.databaseVersion??'?'),status.valid?'ok':'warn');
  setDiagnosticValue('diagInstall',shortInstallationId(status.installationId),'ok');
  setDiagnosticValue('diagSaved',status.updatedAt?new Date(status.updatedAt).toLocaleString():'No save yet',status.lastError?'warn':'ok');

  let worker='Unavailable',workerState='warn';
  if('serviceWorker' in navigator){
    try{
      const reg=await navigator.serviceWorker.getRegistration('./');
      if(reg?.active){worker='Active';workerState='ok'}
      else if(reg?.waiting){worker='Waiting';workerState='warn'}
      else if(reg?.installing){worker='Installing';workerState='warn'}
      else{worker='Registered';workerState='ok'}
    }catch(_){worker='Unavailable'}
  }
  setDiagnosticValue('diagWorker',worker,workerState);

  let persistenceLabel='Browser managed',persistenceState='';
  if(navigator.storage&&typeof navigator.storage.persisted==='function'){
    try{
      const persisted=await navigator.storage.persisted();
      persistenceLabel=persisted?'Granted':'Browser managed';
      persistenceState=persisted?'ok':'';
    }catch(_){}
  }
  setDiagnosticValue('diagPersistent',persistenceLabel,persistenceState);
  setDiagnosticValue('diagShadow',status.shadowAvailable?'Ready':'Unavailable',status.shadowAvailable?'ok':'warn');
}
function updateDataStoreStatus(){
  const el=document.getElementById('dataStoreStatus');
  if(!el||!window.Motion12Persistence)return;
  const s=window.Motion12Persistence.status();
  el.className='data-store-status '+(s.valid?(s.readOnly?'readonly':'ok'):'error');
  el.textContent=s.valid
    ?(s.readOnly
      ?'READ ONLY · '+(s.recoverySource||'recovery data')+' · schema v'+s.schemaVersion+' · '+s.sessions+' sessions'
      :'IndexedDB · schema v'+s.schemaVersion+' · '+s.sessions+' sessions · validated · localStorage is migration input only')
    :'IndexedDB data needs attention · '+(s.issues?.filter(x=>x.severity==='error').length||0)+' validation errors';
}
document.getElementById('exportDataBtn').onclick=async()=>{
  try{
    await window.Motion12Persistence.downloadBackup();
    updateDataStoreStatus();
  }catch(e){
    const el=document.getElementById('dataStoreStatus');
    if(el){el.className='data-store-status error';el.textContent='Backup failed: '+String(e.message||e)}
  }
};
const settingsImportFile=document.getElementById('settingsImportFile');
document.getElementById('importDataBtn').onclick=()=>{
  settingsImportFile.value='';
  settingsImportFile.click();
};
settingsImportFile.onchange=async()=>{
  const file=settingsImportFile.files&&settingsImportFile.files[0];
  if(!file)return;
  const el=document.getElementById('dataStoreStatus');
  if(el){el.className='data-store-status';el.textContent='Validating backup…'}
  try{
    const json=await file.text();
    const result=await window.Motion12Persistence.recoverFromBackup(json);
    if(!result.valid){
      const errors=(result.issues||[]).filter(x=>x.severity==='error').slice(0,3).map(x=>x.message).join(' · ');
      throw new Error(errors||'Backup validation failed');
    }
    if(window.motion12ReloadStateFromPersistence)window.motion12ReloadStateFromPersistence();
    updateDataStoreStatus();
    updateAppDiagnostics();
    if(el){
      el.className='data-store-status '+(result.readOnly?'readonly':'ok');
      el.textContent=result.readOnly
        ?'Backup validated and opened read-only because IndexedDB is unavailable.'
        :'Backup imported successfully · IndexedDB and recovery shadow updated.';
    }
  }catch(e){
    if(el){el.className='data-store-status error';el.textContent='Import failed: '+String(e.message||e)}
  }finally{
    settingsImportFile.value='';
  }
};
document.getElementById('settingsBtn').onclick=()=>{
  document.getElementById('startDateInput').value=settings.startDate;
  document.getElementById('bodyweightInput').value=settings.bodyweight;
  document.getElementById('pullupMaxInput').value=settings.pullupMax||'';
  document.getElementById('heightInput').value=settings.height||'';
  document.getElementById('ageInput').value=settings.age||'';
  document.getElementById('sexInput').value=settings.sex||'';
  document.getElementById('stepsInput').value=settings.steps;
  document.getElementById('maintenanceInput').value=settings.maintenanceOverride||'';
  setAppPalettePicker(settings.appPalette||'ember',true);
  const p=settings.portions||defaultPortions;
  document.getElementById('yogurtInput').value=p.yogurt;
  document.getElementById('berriesInput').value=p.berries;
  document.getElementById('nutsInput').value=p.nuts;
  document.getElementById('seedsInput').value=p.seeds;
  document.getElementById('latteMilkInput').value=p.latteMilk;
  document.getElementById('lunchProteinInput').value=settings.lunchProtein||'chicken';
  document.getElementById('dinnerProteinInput').value=settings.dinnerProtein||'chicken';
  document.getElementById('lunchRiceInput').value=p.lunchRice;
  document.getElementById('dinnerRiceInput').value=p.dinnerRice;
  document.getElementById('legumesInput').value=p.legumes;
  document.getElementById('vegInput').value=p.veg;
  document.getElementById('oilInput').value=p.oil;
  document.getElementById('powderInput').value=p.powder;
  document.getElementById('shakeMilkInput').value=p.shakeMilk;
  updateDataStoreStatus();
  updateAppDiagnostics();
  document.getElementById('settingsOverlay').classList.add('show');
};
document.getElementById('cancelSettings').onclick=()=>{
  applyAppPalette(settings.appPalette||'ember');
  setAppPalettePicker(settings.appPalette||'ember',false);
  document.getElementById('settingsOverlay').classList.remove('show');
};
document.getElementById('saveSettings').onclick=()=>{
  const old=settings.portions||defaultPortions;
  const portionValue=(id,fallback)=>{const raw=document.getElementById(id).value;return raw===''?fallback:Math.max(0,Number(raw)||0)};
  settings={...settings,
    startDate:document.getElementById('startDateInput').value||settings.startDate,
    bodyweight:Number(document.getElementById('bodyweightInput').value)||settings.bodyweight,
    pullupMax:Math.min(30,Math.max(0,Math.round(Number(document.getElementById('pullupMaxInput').value)||0))),
    height:Number(document.getElementById('heightInput').value)||0,
    age:Number(document.getElementById('ageInput').value)||0,
    sex:document.getElementById('sexInput').value||'',
    steps:Number(document.getElementById('stepsInput').value)||settings.steps,
    maintenanceOverride:Number(document.getElementById('maintenanceInput').value)||0,
    appPalette:normalizeAppPalette(document.getElementById('appPaletteInput')?.value||settings.appPalette||'ember'),
    lunchProtein:document.getElementById('lunchProteinInput').value||'chicken',
    dinnerProtein:document.getElementById('dinnerProteinInput').value||'chicken',
    portions:{
      yogurt:portionValue('yogurtInput',old.yogurt),
      berries:portionValue('berriesInput',old.berries),
      nuts:portionValue('nutsInput',old.nuts),
      seeds:portionValue('seedsInput',old.seeds),
      latteMilk:portionValue('latteMilkInput',old.latteMilk),
      lunchRice:portionValue('lunchRiceInput',old.lunchRice),
      dinnerRice:portionValue('dinnerRiceInput',old.dinnerRice),
      legumes:portionValue('legumesInput',old.legumes),
      veg:portionValue('vegInput',old.veg),
      oil:portionValue('oilInput',old.oil),
      powder:portionValue('powderInput',old.powder),
      shakeMilk:portionValue('shakeMilkInput',old.shakeMilk)
    }
  };
  if(settings.bodyweight>0){measurements.weight=String(settings.bodyweight);motion12SetItem('motion12.measurements',JSON.stringify(measurements))}
  motion12SetItem('motion12.settings',JSON.stringify(settings));
  applyAppPalette(settings.appPalette);
  setAppPalettePicker(settings.appPalette,false);
  document.getElementById('settingsOverlay').classList.remove('show');
  renderHome();renderDays();renderProgress();
  updateAppDiagnostics();
};
initAppPalettePicker();
renderHome();renderDays();renderProgress();
if(inlineTimer.activeId)inlineTimerEnsureTick();
timerEnsureTick();
