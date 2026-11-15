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
  const compact=settings.homeMode==='compact';
  page.classList.toggle('compact-active',compact);
  page.dataset.sessionMode=compact?'compact':'full';
  const badge=page.querySelector('.session-mode-badge');
  if(badge)badge.textContent=compact?'COMPACT SESSION':'';
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
  const plan=mealPlan(day);
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
  ).join('')+'</ul>';
}
function mealRows(day,date=todayISO()){
  const plan=mealPlan(day);
  if(!plan)return '<div class="card"><p>Add bodyweight to create the meal plan.</p></div>';
  if(!plan.meals.length)return '<div class="card fast-card"><h3>Fast after training</h3><p>'+plan.note+'</p></div>';
  return '<div class="intake-strip" data-intake-date="'+date+'">'+intakeStripInner(day,date)+(plan.gap?'<div class="plan-gap '+(plan.gap<0?'over':'')+'">Plan '+plan.total+' kcal · target '+plan.target+' kcal · '+(plan.gap>0?plan.gap+' kcal unallocated':Math.abs(plan.gap)+' kcal over target')+'</div>':'')+'</div><div class="meal-list">'+plan.meals.map(m=>{
    const key=mealKey(date,m.id),done=mealDone(date,m);
    return '<button class="meal-row meal-toggle '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+date+'\',\''+m.id+'\')"><span class="meal-check" aria-hidden="true">'+(done?'✓':'')+'</span><div class="meal-copy"><span class="meal-name">'+m.name+'</span>'+mealItemsMarkup(m)+'<div class="meal-macros"><span><b>P</b> '+m.protein+'g</span><span><b>C</b> '+m.carbs+'g</span><span><b>F</b> '+m.fat+'g</span></div></div><div class="meal-kcal"><b>'+m.kcal+'</b><span>kcal</span></div></button>';
  }).join('')+'<div class="macro-total"><b>Daily macros</b><span>P '+plan.macroTotals.protein+'g</span><span>C '+plan.macroTotals.carbs+'g</span><span>F '+plan.macroTotals.fat+'g</span></div><div class="meal-note">'+plan.note+' Use labels or a food scale once to calibrate your usual portions.</div></div>';
}
function toggleMeal(date,id){
  const plan=mealPlan(new Date(date+'T00:00:00').getDay());
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
  const plan=mealPlan(day);
  if(!plan)return '<div class="compact-empty">Set bodyweight to build meals</div>';
  if(!plan.meals.length)return '<div class="compact-fast">FAST DAY · water / plain coffee / tea</div>';
  return '<div class="compact-meal-grid">'+plan.meals.map(m=>{
    const key=mealKey(date,m.id),done=mealDone(date,m);
    const label=m.name.replace('Protein shake','Shake');
    return '<button class="compact-meal '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+date+'\',\''+m.id+'\')"><span class="meal-check">'+(done?'✓':'')+'</span><span class="compact-meal-name">'+label+'</span><span class="compact-meal-kcal">'+m.kcal+'</span></button>';
  }).join('')+'</div>';
}
function compactMealCount(day,date){
  const plan=mealPlan(day);
  if(!plan||!plan.meals.length)return '';
  const done=plan.meals.reduce((n,m)=>n+(mealDone(date,m)?1:0),0);
  return done+' / '+plan.meals.length+' ✓';
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
function streakBand(compact=false){
  const s=programProgressStats(),q=dailyMotivationQuote();
  const week=s.weekElapsed?(s.weekCompleted+'/'+s.weekElapsed):'—';
  const program=s.completed+'/'+s.programDays;
  return '<div class="streak-band '+(compact?'compact-streak':'')+'">'+
    '<div class="streak-quote"><span class="streak-quote-text">“'+q.text+'”</span><span class="streak-quote-by">— '+q.by+'</span></div>'+
    '<div class="streak-main"><span>Current streak</span><b>'+s.currentStreak+' day'+(s.currentStreak===1?'':'s')+'</b></div>'+
    '<div class="streak-stat"><span>This week</span><b>'+week+'</b></div>'+
    '<div class="streak-stat"><span>Program</span><b>'+program+'</b></div>'+
  '</div>';
}
function renderCompactHome(d,w,p,fat,cal,strip){
  const date=todayISO(),tot=intakeTotals(d,date),plan=mealPlan(d);
  const remaining=tot?.remaining;
  const loss=cal?cal.predictedLoss:'—';
  const mealCount=compactMealCount(d,date);
  document.getElementById('homePage').classList.add('compact-active');
  document.getElementById('homePage').innerHTML=`
    <div class="compact-home">
      <button class="compact-session" type="button" onclick="openDay(${d},'${date}')">
        <div><span class="compact-kicker">Week ${w} · Today</span><h1>${p.name}</h1><p>${weeklyTarget(d,w)} · ${p.why}</p></div>
        <div class="compact-session-right"><b>${p.time}</b><span>START →</span></div>
      </button>

      <div class="compact-week">${strip}</div>
      ${streakBand(true)}

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
function renderHome(){updateHomeModeToggle();const d=programDay(),w=weekNo(),p=program[d],diet=dietText(d),fat=fatLossTargets(),cal=calorieTargets();const start=new Date(settings.startDate+'T00:00:00');const weekStart=new Date(start);weekStart.setDate(start.getDate()+(w-1)*7);let strip='';for(let i=0;i<7;i++){const dt=new Date(weekStart);dt.setDate(weekStart.getDate()+i);const dd=dt.getDay();const ds=iso(dt);strip+=`<button class="daydot ${dd===d&&ds===todayISO()?'today':''} ${completedOn(ds,dd)?'done':''}" onclick="openDay(${dd},'${ds}')"><b>${short[dd]}</b><span></span></button>`}
 document.getElementById('homePage').classList.remove('compact-active');
 if(settings.homeMode==='compact'){renderCompactHome(d,w,p,fat,cal,strip);return;}
 document.getElementById('homePage').innerHTML=`
  <div class="homegrid"><div>
  <section class="hero"><div class="eyebrow">Week ${w} · Today</div><h1>${p.name}</h1><div class="sub">${p.why}</div><div class="hero-meta"><span class="pill">◷ ${p.time}</span><span class="pill">◎ ${settings.steps.toLocaleString()} steps baseline</span></div><button class="cta" onclick="openDay(${d},'${todayISO()}')"><span>${completedOn(todayISO(),d)?'Review completed session':'Start today’s session'}</span><span>→</span></button></section>
  <section class="section"><div class="section-head"><h2>This week</h2><small>Week ${w} of 12</small></div><div class="weekstrip">${strip}</div><div class="progressbar"><i style="width:${Math.round((w-1)/11*100)}%"></i></div>${streakBand(false)}</section>
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
  const work=dayOverviewGroup('Workout',p.work,day,w,1);
  const support=dayOverviewGroup('Support',p.support,day,w);
  return '<div class="day-overview">'+prep+work+support+
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
          <p>${weeklyTarget(day,w)}</p>
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
  if(inlineTimer.kind==='strengthsets'&&inlineTimer.phase!=='rest')return;
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
  if(inlineTimer.setIndex>=inlineTimer.sets){
    inlineTimer.running=false;
    inlineTimer.remaining=0;
    inlineTimer.endAt=0;
    inlineTimer.phase='complete';
    timerBeep();
  }else{
    inlineTimer.phase='rest';
    inlineTimer.duration=inlineTimer.rest||90;
    inlineTimer.remaining=inlineTimer.duration;
    inlineTimer.endAt=Date.now()+inlineTimer.duration*1000;
    inlineTimer.running=true;
  }
  saveInlineTimer();inlineTimerEnsureTick();
  const box=document.getElementById('inlineExerciseTimer');if(box)box.outerHTML=inlineTimerMarkup(inlineTimer.activeId);
}
function inlineSkipStrengthRest(){
  if(inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='rest')return;
  inlineTimer.running=false;inlineTimer.remaining=0;inlineTimer.endAt=0;inlineTimer.phase='ready';
  saveInlineTimer();timerBeep();
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
    if(inlineTimer.kind==='strengthsets'&&inlineTimer.phase==='rest'){
      inlineTimer.running=false;inlineTimer.phase=inlineTimer.setIndex>=inlineTimer.sets?'complete':'ready';inlineTimer.remaining=0;inlineTimer.endAt=0;timerBeep();
      saveInlineTimer();
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
  const m=String(id).match(/^\d{4}-\d{2}-\d{2}-(\d+)-\d+$/);
  return m?Number(m[1]):programDay();
}
function strengthFlowDayLabel(id){
  return DAYS[strengthFlowDayFromId(id)]||'Next session';
}
function strengthFlowConfig(name,target){
  const parsed=String(target||'').match(/^\s*(\d+)\s*×\s*(.+)$/i);
  const range=String(target||'').match(/(\d+)\s*[–-]\s*(\d+)/);
  const base={
    sets:parsed?Number(parsed[1]):3,
    targetText:parsed?parsed[2]:'6–10',
    low:range?Number(range[1]):6,
    top:range?Number(range[2]):10,
    loadPlaceholder:'kg',
    loadInputMode:'decimal',
    repsPlaceholder:range?(range[1]+'–'+range[2]):'reps',
    noun:'load',
    advanceTitle:'Increase load',
    advanceText:'Increase the working load one step and return toward the lower end of the prescribed range.'
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
  logs[id].sets=Array.from({length:total},(_,i)=>({...current[i]}));
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
    return {...cfg,rest,setIndex:inlineTimer.setIndex,phase:inlineTimer.phase,running:inlineTimer.running,sec:inlineTimerSeconds()};
  }
  return {...cfg,rest,setIndex:completed,phase:completed>=cfg.sets?'complete':'ready',running:false,sec:0};
}
function strengthEnsureTimer(id,name,target){
  const state=strengthFlowState(id,name,target);
  if(inlineTimer.activeId!==id||inlineTimer.kind!=='strengthsets'){
    inlineTimer={...defaultInlineTimer,
      activeId:id,exerciseName:name,kind:'strengthsets',
      rest:state.rest,sets:state.sets,setIndex:state.setIndex,target:state.targetText,
      phase:state.phase,duration:state.rest,remaining:0,running:false,endAt:0
    };
    saveInlineTimer();
  }
  return inlineTimer;
}
function strengthPreviousCompletedSession(id,total){
  const match=String(id).match(/^(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)$/);
  if(!match)return null;
  const suffix='-'+match[2]+'-'+match[3];
  const matches=Object.keys(logs)
    .filter(k=>k!==id&&k.endsWith(suffix))
    .filter(k=>Array.isArray(logs[k]?.sets)&&logs[k].sets.length>=total&&logs[k].sets.slice(0,total).every(s=>s?.complete))
    .sort((a,b)=>b.localeCompare(a));
  return matches.length?{id:matches[0],sets:logs[matches[0]].sets.slice(0,total)}:null;
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
  const work=program[day]?.work||[];
  const completed=work.map((_,i)=>!!logs[exId(day,i,date)]?.done);
  let currentIndex=-1;
  const currentEl=document.querySelector('.exercise.session-current');
  if(currentEl?.dataset?.timerId){
    const pos=strengthSessionPosition(currentEl.dataset.timerId);
    if(pos&&pos.day===day&&pos.date===date&&!completed[pos.index])currentIndex=pos.index;
  }
  if(currentIndex<0)currentIndex=completed.findIndex(done=>!done);
  const completedCount=completed.filter(Boolean).length;
  const remainingCount=Math.max(0,work.length-completedCount-(currentIndex>=0?1:0));
  return {work,completed,currentIndex,completedCount,remainingCount,total:work.length};
}
function strengthSessionProgressMarkup(day,date){
  if(![1,3,5].includes(day))return '';
  const s=strengthSessionProgressState(day,date);
  const segments=s.work.map((x,i)=>{
    const state=s.completed[i]?'complete':i===s.currentIndex?'current':'remaining';
    return '<span class="strength-progress-segment '+state+'" title="'+x[0]+'" aria-label="'+x[0]+' · '+state+'"></span>';
  }).join('');
  const currentName=s.currentIndex>=0?s.work[s.currentIndex][0]:'Strength work complete';
  const currentTarget=s.currentIndex>=0?s.work[s.currentIndex][1]:'All '+s.total+' exercises completed';
  return '<div class="strength-session-progress" id="strengthSessionProgress">'+
    '<div class="strength-progress-head"><div><span>Session progress</span><strong>'+currentName+'</strong></div><b>'+s.completedCount+' / '+s.total+'</b></div>'+
    '<div class="strength-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.completedCount+'" aria-label="'+s.completedCount+' of '+s.total+' strength exercises complete">'+segments+'</div>'+
    '<div class="strength-progress-foot"><span class="done">'+s.completedCount+' complete</span><span class="current">'+(s.currentIndex>=0?'Current · '+currentTarget:'Complete')+'</span><span class="remain">'+s.remainingCount+' remaining</span></div>'+
  '</div>';
}
function refreshStrengthSessionProgress(day=null,date=null){
  const existing=document.getElementById('strengthSessionProgress');
  if(!existing)return;
  if(day===null||date===null){
    const current=document.querySelector('.exercise.session-current');
    if(current?.dataset?.timerId){
      const pos=strengthSessionPosition(current.dataset.timerId);
      if(pos){day=pos.day;date=pos.date}
    }
  }
  if(day===null||date===null){
    const any=document.querySelector('.strength-session-slice[data-timer-id]');
    if(any?.dataset?.timerId){
      const pos=strengthSessionPosition(any.dataset.timerId);
      if(pos){day=pos.day;date=pos.date}
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
  const pos=strengthSessionPosition(id);
  if(!pos||![1,3,5].includes(pos.day))return null;
  const work=program[pos.day]?.work||[];
  const candidate=(i)=>{
    const nextId=exId(pos.day,i,pos.date);
    return logs[nextId]?.done?null:{id:nextId,index:i,name:work[i][0],target:work[i][1],day:pos.day,date:pos.date,total:work.length};
  };
  for(let i=pos.index+1;i<work.length;i++){
    const next=candidate(i);if(next)return next;
  }
  // If exercises were completed out of order, return to the first unfinished one
  // rather than falsely declaring the strength session complete.
  for(let i=0;i<pos.index;i++){
    const next=candidate(i);if(next)return next;
  }
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
    '<div><span>Strength work complete</span><strong>Finish the session</strong><small>Review anything you need, then mark today complete.</small></div>'+
    '<button type="button" onclick="event.stopPropagation();strengthGoToSessionComplete()">Finish session <b>→</b></button>'+
  '</div>';
}
function strengthContinueToNext(currentId,nextId){
  document.querySelectorAll('.exercise.session-current').forEach(el=>el.classList.remove('session-current'));
  const next=document.getElementById('ex-'+nextId);
  if(!next)return;
  next.classList.add('session-current');
  const pos=strengthSessionPosition(nextId);
  if(pos)refreshStrengthSessionProgress(pos.day,pos.date);
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
  const readyIndex=Math.min(state.sets-1,state.setIndex);
  const isRest=state.phase==='rest',isComplete=state.phase==='complete';
  const statusTitle=isComplete?name.toUpperCase()+' COMPLETE':isRest?'RECOVERY':'SET '+(readyIndex+1)+' READY';
  const statusMain=isComplete?'✓':isRest?timerFormat(state.sec):state.targetText;
  const statusSub=isComplete?'All '+state.sets+' sets logged':isRest?'Next · Set '+(state.setIndex+1)+' of '+state.sets:'Rest starts automatically after Set complete';
  const completionSummary=isComplete?strengthCompletionSummaryMarkup(id,name,target,entries):'';
  const sessionCue=isComplete?strengthSessionCueMarkup(id):'';
  const encName=encodeURIComponent(name),encTarget=encodeURIComponent(target);
  const rows=entries.map((set,i)=>{
    const complete=!!set.complete;
    const active=!isComplete&&!isRest&&i===readyIndex;
    const future=!complete&&!active;
    return '<div class="strength-set-row '+(complete?'logged ':'')+(active?'active ':'')+(future?'future':'')+'">'+
      '<div class="strength-set-number"><span>SET</span><b>'+(i+1)+'</b>'+(complete?'<i>✓</i>':'')+'</div>'+
      '<label><span>Load</span><input type="text" inputmode="'+state.loadInputMode+'" autocomplete="off" value="'+(set.load??'')+'" placeholder="'+state.loadPlaceholder+'" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'load\',this.value)"></label>'+
      '<label><span>Reps</span><input inputmode="numeric" type="number" min="1" step="1" value="'+(set.reps??'')+'" placeholder="'+state.repsPlaceholder+'" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'reps\',this.value)"></label>'+
      '<label><span>Reps in reserve</span><input inputmode="numeric" type="number" min="0" max="5" step="1" value="'+(set.rir??'')+'" placeholder="RIR" '+(future?'disabled ':'')+'oninput="saveStrengthSetField(\''+id+'\','+i+',\'rir\',this.value)"></label>'+
    '</div>';
  }).join('');
  let actions='';
  if(isComplete){
    actions='<button class="strength-flow-primary done" type="button" onclick="event.stopPropagation()">✓ Exercise complete</button>';
  }else if(isRest){
    actions='<button class="strength-flow-primary" type="button" onclick="event.stopPropagation();strengthPauseResume(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">'+(state.running?'Pause rest':'Resume rest')+'</button>'+
      '<button class="strength-flow-secondary" type="button" onclick="event.stopPropagation();strengthSkipRest(\''+id+'\')">Skip rest</button>';
  }else{
    actions='<button class="strength-flow-primary" type="button" onclick="event.stopPropagation();strengthSetComplete(\''+id+'\',\''+encName+'\',\''+encTarget+'\')">Set '+(readyIndex+1)+' complete <span>→ rest '+timerFormat(state.rest)+'</span></button>';
  }
  return '<div class="strength-set-flow '+(isRest?'resting ':'')+(isComplete?'complete ':'')+'" id="strength-flow-'+id+'">'+
    '<div class="strength-flow-status"><div><span>'+statusTitle+'</span><strong id="strength-flow-clock-'+id+'">'+statusMain+'</strong><small>'+statusSub+'</small></div></div>'+
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
  if(inlineTimer.kind!=='strengthsets'||inlineTimer.phase!=='rest'||!inlineTimer.activeId)return;
  const clock=document.getElementById('strength-flow-clock-'+inlineTimer.activeId);
  if(clock)clock.textContent=timerFormat(inlineTimerSeconds());
}
function strengthSetComplete(id,encodedName,encodedTarget){
  const name=decodeURIComponent(encodedName),target=decodeURIComponent(encodedTarget);
  const timer=strengthEnsureTimer(id,name,target),idx=timer.setIndex;
  if(timer.phase!=='ready'||idx>=timer.sets)return;
  const entries=strengthSetLogEntries(id,timer.sets),set=entries[idx]||{};
  const validLoad=String(set.load??'').trim()!=='';
  const validReps=Number(set.reps)>0;
  const rirValue=String(set.rir??'').trim(),validRir=rirValue!==''&&Number(rirValue)>=0;
  if(!validLoad||!validReps||!validRir){
    const flow=document.getElementById('strength-flow-'+id);if(flow)flow.classList.add('needs-input');
    const msg=document.getElementById('strength-flow-message-'+id);
    if(msg)msg.textContent='Enter load, reps and reps in reserve before completing this set.';
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
  if(inlineTimer.phase==='complete'){
    logs[id].done=true;
    motion12SetItem('motion12.logs',JSON.stringify(logs));
    document.getElementById('ex-'+id)?.classList.add('complete');
    const next=strengthNextExercise(id);
    document.querySelectorAll('.exercise.session-current').forEach(el=>el.classList.remove('session-current'));
    if(next)document.getElementById('ex-'+next.id)?.classList.add('session-current');
    const pos=strengthSessionPosition(id);
    if(pos)refreshStrengthSessionProgress(pos.day,pos.date);
  }
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
function exerciseCardMarkup(day,date,w,x,i){
  const id=exId(day,i,date),state=logs[id]||{};
  let target=x[1];if(day===6)target=aerobicTargets[w-1];
  const timerName=encodeURIComponent(x[0]),timerTarget=encodeURIComponent(target);
  if([1,3,5].includes(day)&&strengthSetFlowNames.has(x[0])){
    return '<div class="exercise strength-session-slice '+(state.done?'complete':'')+'" id="ex-'+id+'" data-timer-id="'+id+'" data-timer-day="'+day+'" data-timer-name="'+timerName+'" data-timer-target="'+timerTarget+'" data-timer-support="0">'+
      '<div class="ex-top"><div class="num">'+(i+1)+'</div><div class="ex-name"><h3>'+x[0]+' '+videoButtons(x[0])+'</h3><p>'+target+'</p></div><button class="check" onclick="toggleExercise(\''+id+'\')"></button></div>'+
      strengthSetFlowMarkup(id,x[0],target)+
      '<div class="tip">'+x[2]+'</div><div class="tip progress-rule"><b>Progress:</b> '+x[3]+'</div>'+loadGuideMarkup(x[4])+
    '</div>';
  }
  return '<div class="exercise '+(state.done?'complete ':'')+(inlineTimer.activeId===id?'active-timer':'')+'" id="ex-'+id+'" data-timer-id="'+id+'" data-timer-day="'+day+'" data-timer-name="'+timerName+'" data-timer-target="'+timerTarget+'" data-timer-support="0" onclick="activateExerciseTimerFromCard(event,this)">'+
    '<div class="ex-top"><div class="num">'+(i+1)+'</div><div class="ex-name"><h3>'+x[0]+' '+videoButtons(x[0])+'</h3><p>'+target+'</p></div><button class="check" onclick="toggleExercise(\''+id+'\')"></button></div>'+inlineTimerMarkup(id)+
    '<div class="inputs"><div class="field"><label>Load / pace</label><input value="'+(state.load||'')+'" placeholder="e.g. 20 kg" oninput="saveEx(\''+id+'\',\'load\',this.value)"></div><div class="field"><label>Actual</label><input value="'+(state.reps||'')+'" placeholder="sets/reps" oninput="saveEx(\''+id+'\',\'reps\',this.value)"></div><div class="field"><label>RIR / effort</label><input value="'+(state.rir||'')+'" placeholder="2 RIR" oninput="saveEx(\''+id+'\',\'rir\',this.value)"></div></div>'+
    '<div class="tip">'+x[2]+'</div><div class="tip progress-rule"><b>Progress:</b> '+x[3]+'</div>'+loadGuideMarkup(x[4])+
  '</div>';
}
function openDay(day,date=null){
 date=date||dateForProgramDay(day);
 const w=weekNo(),p=program[day];
 setActiveSessionTimerContext(day,date,w);
 showPage('dayPage');
 let exHtml='';p.work.forEach((x,i)=>{exHtml+=exerciseCardMarkup(day,date,w,x,i)});
 let mob=mobility.map((m,i)=>`<div class="card row"><div><h3>${m[0]} ${videoButtons(m[0])}</h3><p>${m[1]}</p></div><span class="volt">${String(i+1).padStart(2,'0')}</span></div>`).join('');
 const prepHtml=prepBlockMarkup(day,date,p);
 const supportHtml=supportBlockMarkup(day,date,w,p);
 const key=`${date}-${day}`;
 document.getElementById('dayPage').innerHTML=`<div class="day-page-wrap"><div class="sticky-col"><button class="back" onclick="showPage('homePage')">← Home</button><div class="page-title"><div class="eyebrow">${DAYS[day]} · Week ${w}</div><span class="session-mode-badge" aria-live="polite"></span><h1>${p.name}</h1><p>${p.why}</p></div><div class="session-summary"><div class="mini"><b>${p.time.replace(' min','')}</b><span>minutes</span></div><div class="mini"><b>${p.work.length+(p.prep?.length||0)+(p.support?.length||0)}</b><span>moves</span></div><div class="mini"><b>${settings.steps/1000}k</b><span>steps</span></div></div>
 <div class="card accent"><span class="tag">Today’s progression</span><h3 style="margin-top:10px">${weeklyTarget(day,w)}</h3></div></div>
 <div>${prepHtml}<div class="workout-progress-block" id="sessionProgressMount"></div><div class="workout-timer-block" id="sessionTimerMount"></div><section class="section workout-exercises-section"><div class="section-head"><h2>Exercises</h2><small>log as you go</small></div>${exHtml||'<div class="card"><h3>Recovery day</h3><p>No formal strength work. Keep normal walking and complete the mobility reset below.</p></div>'}</section>
 ${supportHtml}
 <section class="section" id="mobilitySection"><div class="section-head"><h2>Mobility reset</h2><small>daily</small></div><div class="cards">${mob}</div></section><button id="completeSessionButton" class="complete-session ${logs[key]?.completed?'done':''}" onclick="completeSession('${key}')">${logs[key]?.completed?'✓ Session complete':'Complete session'}</button></div></div>`;
 if([1,3,5].includes(day)){
   const firstIncomplete=p.work.findIndex((_,i)=>!logs[exId(day,i,date)]?.done);
   document.querySelectorAll('.exercise.session-current').forEach(el=>el.classList.remove('session-current'));
   if(firstIncomplete>=0)document.getElementById('ex-'+exId(day,firstIncomplete,date))?.classList.add('session-current');
 }
 applySessionCompactMode();
 renderTimerPage();
 window.scrollTo({top:0,behavior:'smooth'});
}
function openMobilityToday(){openDay(programDay(),todayISO());setTimeout(()=>document.getElementById('mobilitySection')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
function toggleExercise(id){
  logs[id]=logs[id]||{};
  logs[id].done=!logs[id].done;
  motion12SetItem('motion12.logs',JSON.stringify(logs));
  document.getElementById('ex-'+id)?.classList.toggle('complete',logs[id].done);
  const pos=strengthSessionPosition(id);
  if(pos&&[1,3,5].includes(pos.day)){
    const work=program[pos.day]?.work||[];
    const firstIncomplete=work.findIndex((_,i)=>!logs[exId(pos.day,i,pos.date)]?.done);
    document.querySelectorAll('.exercise.session-current').forEach(el=>el.classList.remove('session-current'));
    if(firstIncomplete>=0)document.getElementById('ex-'+exId(pos.day,firstIncomplete,pos.date))?.classList.add('session-current');
    refreshStrengthSessionProgress(pos.day,pos.date);
    if(settings.homeMode==='compact')syncCompactSessionFocus(timerViewModel());
  }
}
function saveEx(id,k,v){logs[id]=logs[id]||{};logs[id][k]=v;motion12SetItem('motion12.logs',JSON.stringify(logs))}
function completeSession(key){logs[key]=logs[key]||{};logs[key].completed=!logs[key].completed;motion12SetItem('motion12.logs',JSON.stringify(logs));renderHome();renderDays();openDay(Number(key.split('-').pop()),key.slice(0,10))}
function renderProgress(){
  const fields=[['weight','Bodyweight','kg'],['waist','Waist','cm'],['bp','Blood pressure','mmHg'],['rhr','Resting heart rate','bpm'],['walk','2 km walk','min'],['pushups','Strict push-ups','reps']];
  const p=protein(),fat=fatLossTargets(),cal=calorieTargets(),ps=programProgressStats();
  let cards=fields.map(([id,n,u])=>`<div class="card measure"><span class="tag">${u}</span><h3>${n}</h3><input id="measure-${id}" value="${measurements[id]||''}" placeholder="Enter current"></div>`).join('');
  document.getElementById('progressPage').innerHTML=`<div class="page-title"><div class="eyebrow">12-week dashboard</div><h1>Progress</h1><p>Completed days, adherence and physical measures in one place.</p></div><section class="section"><div class="card adherence-card"><span class="tag">Program adherence</span><div class="adherence-grid"><div><b>${ps.currentStreak}</b><span>current streak</span></div><div><b>${ps.bestStreak}</b><span>best streak</span></div><div><b>${ps.completed}/${ps.elapsed||0}</b><span>days complete / elapsed</span></div><div><b>${ps.adherence}%</b><span>completion to date</span></div></div><div class="adherence-track"><i style="width:${Math.min(100,Math.round(ps.completed/ps.programDays*100))}%"></i></div><small>${ps.completed} of 84 program days explicitly marked Session complete.</small></div></section><section class="section"><div class="card accent"><span class="tag">Nutrition targets</span><div class="target-grid"><div class="target-chip"><b>${p?`${p} g`:'Set weight'}</b><span>protein / eating day</span></div><div class="target-chip"><b>${cal?`${cal.eatingDay} kcal`:'Set details'}</b><span>eating-day target</span></div><div class="target-chip"><b>${cal?`${cal.predictedLoss} kg`:'—'}</b><span>planned loss / week</span></div><div class="target-chip"><b>${cal?`${cal.maintenance} kcal`:'—'}</b><span>estimated maintenance</span></div></div>${cal?`<div class="nutrition-strip">Target range ${fat.low}–${fat.high} kg/week · planned deficit ${cal.actualWeeklyDeficit} kcal/week · weekly intake ${cal.weeklyIntake} kcal. This math assumes Monday is truly 0 kcal.</div>`:''}</div><div class="measure-grid" style="margin-top:10px">${cards}</div><div class="savebar"><button class="complete-session" onclick="saveMeasurements()">Save measures</button></div></section><section class="section"><div class="card accent"><h3>Calorie adjustment rule</h3><p>${fat&&cal?`Use morning weights and compare 7-day averages across two full weeks. Only adjust if adherence was good. If loss is below ~${fat.low} kg/week for both weeks, remove ~100–150 kcal from eating days. If loss is above ~${fat.cap} kg/week, or strength/sleep/energy fall, add ~100–150 kcal. Keep protein steady; adjust rice and fats first.`:'Enter bodyweight to calculate the adjustment range.'}</p></div><div class="card" style="margin-top:10px"><h3>What success looks like</h3><p>Waist ↓ · strength maintained or ↑ · 2 km time ↓ · cardiovascular tolerance ↑ · blood pressure healthy · resting heart rate stable or ↓.</p></div></section>`;
}
function saveMeasurements(){['weight','waist','bp','rhr','walk','pushups'].forEach(id=>measurements[id]=document.getElementById('measure-'+id).value);const w=Number(measurements.weight);if(w>0){settings.bodyweight=w;motion12SetItem('motion12.settings',JSON.stringify(settings))}motion12SetItem('motion12.measurements',JSON.stringify(measurements));renderHome();renderDays();renderProgress();
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
function conditioningCircuitPlan(day,w){
  const rounds=(conditioningRounds[day]||[])[Math.max(0,Math.min(11,w-1))]||1;
  let stations=[],roundRest=0,title='',note='';
  if(day===2){
    stations=[
      {label:'Kettlebell deadlift',work:30,rest:30},
      {label:'Ring row',work:30,rest:30},
      {label:'Alternating reverse lunge',work:30,rest:30},
      {label:'Suitcase march / carry',work:30,rest:30}
    ];
    title=conditioningTarget(day,w);
    note='Recovery circuit: stay at RPE 4–5. Every work interval is followed by 30 seconds easy recovery.';
  }else if(day===4){
    stations=[
      {label:'Kettlebell squat → jerk → strict press',work:40,rest:60},
      {label:'2-hand kettlebell swing',work:20,rest:40},
      {label:'Push-up',work:20,rest:40}
    ];
    title=conditioningTarget(day,w);
    note='Power circuit: use the full 40/60 window for the kettlebell complex, then keep swings and push-ups crisp at 20/40. Quality beats speed.';
  }else if(day===0){
    stations=[
      {label:'Squat-to-calf-raise',work:40,rest:20},
      {label:'Push-up',work:40,rest:20},
      {label:'Alternating reverse lunge',work:40,rest:20},
      {label:'Suitcase march / carry',work:40,rest:20}
    ];
    roundRest=60;
    title=conditioningTarget(day,w);
    note='Aerobic-base circuit: RPE 5–6. Keep moving easily and use the full 60-second recovery between rounds.';
  }else return null;

  const phases=[];
  for(let r=1;r<=rounds;r++){
    stations.forEach(st=>{
      phases.push({label:st.label,seconds:st.work,round:r});
      phases.push({label:'RECOVER',seconds:st.rest,round:r});
    });
    if(roundRest&&r<rounds)phases.push({label:'ROUND REST',seconds:roundRest,round:r});
  }
  return {kind:'intervals',title,note,rounds,phases,circuit:true};
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
    const complex=name==='Kettlebell squat → jerk → strict press';
    return {category:'Power circuit',seconds:complex?60:40,action:'session',label:complex?'40s / 60s':'20s / 40s',note:'Use the complete Power circuit timer.'};
  }
  if(day===0)return {category:'Aerobic base',seconds:20,action:'session',label:'40s / 20s',note:'Use the complete Aerobic Base circuit timer.'};
  const strength120=new Set(['Goblet squat','Pull-up / assisted pull-up','Ring row','Ring row / pull-up','Reverse lunge','Kettlebell Romanian deadlift']);
  const strength90=new Set(['1-arm kettlebell press','Push-up','1-arm kettlebell row','Lateral lunge']);
  const accessory60=new Set(['Suitcase carry','Plank shoulder tap','Back extension','Single-leg calf raise','Kettlebell woodchop','Plank shoulder tap / kettlebell woodchop']);
  if(name==='Aerobic intervals'){
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
  const circuitDay=timerContextDay()===0||timerContextDay()===2||timerContextDay()===4;
  return '<section class="section timer-exercise-section"><div class="section-head"><h2>'+(circuitDay?'Circuit timing':'Exercise recovery')+'</h2><small>'+(circuitDay?'session sequence':'tap to load')+'</small></div><div class="exercise-rest-list">'+
    p.work.map(x=>{
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
function timerConfigure(mode=smartTimer.mode||'session',force=false){
  const dayKey=timerContextDate()+':'+timerContextWeek();
  if(!force&&smartTimer.dayKey===dayKey&&smartTimer.mode===mode&&smartTimer.kind)return;
  const plan=timerSessionPlan();
  smartTimer={...defaultSmartTimer,mode,dayKey};
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
  if(smartTimer.kind==='stopwatch'){
    return smartTimer.stopwatchElapsed+(smartTimer.running?Math.floor((Date.now()-smartTimer.stopwatchStartedAt)/1000):0);
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
    if(now>=smartTimer.endAt){
      smartTimer.running=false;
      smartTimer.remaining=0;
      smartTimer.endAt=0;
      smartTimer.strengthPhase=smartTimer.setIndex>=smartTimer.totalSets?'complete':'ready';
      saveSmartTimer();
      timerBeep();
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
  if(smartTimer.kind==='strengthsets'&&smartTimer.strengthPhase!=='rest')return;
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
  if(smartTimer.kind!=='strengthsets'||smartTimer.strengthPhase!=='ready')return;
  smartTimer.setIndex++;
  if(smartTimer.setIndex>=smartTimer.totalSets){
    smartTimer.running=false;
    smartTimer.remaining=0;
    smartTimer.endAt=0;
    smartTimer.strengthPhase='complete';
    timerBeep();
  }else{
    smartTimer.strengthPhase='rest';
    smartTimer.duration=smartTimer.restSeconds||90;
    smartTimer.remaining=smartTimer.duration;
    smartTimer.endAt=Date.now()+smartTimer.duration*1000;
    smartTimer.running=true;
  }
  saveSmartTimer();timerEnsureTick();renderTimerPage();
}
function timerSkipStrengthRest(){
  if(smartTimer.kind!=='strengthsets'||smartTimer.strengthPhase!=='rest')return;
  smartTimer.running=false;
  smartTimer.remaining=0;
  smartTimer.endAt=0;
  smartTimer.strengthPhase=smartTimer.setIndex>=smartTimer.totalSets?'complete':'ready';
  saveSmartTimer();timerBeep();renderTimerPage();
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
  let clockText='';
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
      label='REST';
      meta='Set '+smartTimer.setIndex+' of '+smartTimer.totalSets+' complete';
      progress=smartTimer.duration?sec/smartTimer.duration:0;
      clockText=timerFormat(sec);
      detail=plan.note;
      nextText='Set '+(smartTimer.setIndex+1)+' · Ready';
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
      detail=plan.circuit?'All '+plan.rounds+' circuit rounds complete':'All '+plan.rounds+' hard intervals complete';
    }else{
      label=phase.label;meta='Round '+phase.round+' of '+plan.rounds;
      progress=smartTimer.duration?sec/smartTimer.duration:0;detail=plan.title;
      const next=plan.phases[smartTimer.phaseIndex+1];
      nextText=next?timerPhaseReadable(next.label)+' · '+next.seconds+' sec':'Complete';
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
  const stepAngle=duration>0?360/duration:360;
  const gapAngle=duration>0?Math.min(1.6,Math.max(.55,stepAngle*.16)):0;
  const fillAngle=Math.max(.1,stepAngle-gapAngle);
  const majorStepAngle=duration>0?stepAngle*5:360;
  const majorGapAngle=duration>0?Math.min(3.2,Math.max(1.5,gapAngle*1.9)):0;
  const normalizedProgress=Math.max(0,Math.min(1,progress));
  const transitioning=Date.now()<timerPhaseTransitionUntil;
  return {
    plan,sec,kind,label,meta,detail,nextText,clockText,
    progress:normalizedProgress,
    ringProgress:transitioning?0:normalizedProgress,
    transitioning,
    duration,stepAngle,gapAngle,fillAngle,majorStepAngle,majorGapAngle
  };
}
function timerPrimaryLabel(vm){
  if(smartTimer.running)return 'Pause';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='rest')return 'Resume';
  if(vm.kind==='stopwatch')return smartTimer.stopwatchElapsed>0?'Resume':'Start';
  if(vm.kind==='intervals'&&smartTimer.phaseIndex>=vm.plan.phases.length)return 'Start again';
  const sec=timerCurrentSeconds(),duration=Math.max(0,Number(smartTimer.duration)||0);
  if(duration>0&&sec>0&&sec<duration)return 'Resume';
  if(duration>0&&sec<=0)return 'Start again';
  return 'Start';
}
function timerControls(vm){
  const primary='<button class="timer-primary" onclick="timerStartPause()">'+timerPrimaryLabel(vm)+'</button>';
  if(vm.kind==='strengthsets'){
    if(smartTimer.strengthPhase==='complete')return '<button class="timer-primary" onclick="timerReset()">Start again</button>';
    if(smartTimer.strengthPhase==='ready')return '<button class="timer-primary" onclick="timerStrengthSetComplete()">Set complete</button><button onclick="timerReset()">Reset</button>';
    return primary+'<button onclick="timerSkipStrengthRest()">Skip rest</button><button onclick="timerReset()">Reset</button>';
  }
  if(vm.kind==='intervals')return primary+'<button onclick="timerSkipPhase()">Skip phase</button><button onclick="timerReset()">Reset</button>';
  if(vm.kind==='sets'){
    if(smartTimer.setIndex>=vm.plan.sets)return '<button class="timer-primary" onclick="timerReset()">Start again</button>';
    if(smartTimer.running)return primary+'<button onclick="timerAdjust(15)">+15 sec</button><button onclick="timerReset()">Reset</button>';
    return '<button class="timer-primary" onclick="timerCompleteSet()">Set complete → rest</button><button onclick="timerReset()">Reset</button>';
  }
  if(vm.kind==='stopwatch')return primary+'<button onclick="timerReset()">Reset</button>';
  return primary+'<button onclick="timerAdjust(-15)">−15 sec</button><button onclick="timerAdjust(15)">+15 sec</button><button onclick="timerReset()">Reset</button>';
}
function timerIsRecoveryPhase(label){
  const x=String(label||'').toUpperCase();
  return x==='RECOVER'||x==='ROUND REST';
}
function timerSessionProgressData(vm){
  const day=timerContextDay(),w=timerContextWeek(),p=program[day];
  if(!p)return null;

  if([1,3,5].includes(day)){
    const date=timerContextDate(),work=p.work||[];
    const completed=work.map((_,i)=>!!logs[exId(day,i,date)]?.done);
    let currentIndex=-1;
    if(smartTimer.exerciseName){
      const matched=work.findIndex(x=>x[0]===smartTimer.exerciseName);
      if(matched>=0&&!completed[matched])currentIndex=matched;
    }
    if(currentIndex<0)currentIndex=completed.findIndex(done=>!done);
    const completedCount=completed.filter(Boolean).length;
    const remainingCount=Math.max(0,work.length-completedCount-(currentIndex>=0?1:0));
    return {
      type:'strength',
      total:work.length,
      completedCount,
      remainingCount,
      currentIndex,
      segments:work.map((x,i)=>({
        name:x[0],
        state:completed[i]?'complete':i===currentIndex?'current':'remaining'
      })),
      eyebrow:'Strength session',
      currentName:currentIndex>=0?work[currentIndex][0]:'Strength work complete',
      currentDetail:currentIndex>=0?work[currentIndex][1]:'All '+work.length+' exercises complete',
      countText:completedCount+' / '+work.length
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
      if(timerIsRecoveryPhase(currentPhase.label)){
        currentName=timerPhaseReadable(currentPhase.label);
        currentDetail=nextWork?'Next · '+timerPhaseReadable(nextWork.label):'Final recovery';
      }else{
        currentName=timerPhaseReadable(currentPhase.label);
        currentDetail='Current station';
      }
    }
    return {
      type:plan.circuit?'circuit':'intervals',
      total:workIndices.length,
      completedCount,
      remainingCount,
      currentIndex:currentOrdinal,
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
function syncCompactSessionFocus(vm){
  const page=document.getElementById('dayPage');
  if(!page?.classList.contains('compact-active'))return;
  const cards=[...page.querySelectorAll('.workout-exercises-section > .exercise[data-timer-support="0"]')];
  cards.forEach(card=>card.classList.remove('compact-current'));
  if(!cards.length)return;
  const progress=timerSessionProgressData(vm||timerViewModel());
  let index=progress?.currentIndex??-1;
  if(index<0){
    index=cards.findIndex(card=>!card.classList.contains('complete'));
    if(index<0)index=cards.length-1;
  }
  if(progress&&(progress.type==='circuit'||progress.type==='intervals'))index=index%cards.length;
  cards[Math.max(0,Math.min(cards.length-1,index))]?.classList.add('compact-current');
}
function renderTimerPage(){
  const progressMount=document.getElementById('sessionProgressMount');
  const timerMount=document.getElementById('sessionTimerMount');
  if(!progressMount||!timerMount)return;
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
      '<div class="timer-ring" id="timerRing" style="--timer-progress:'+(vm.ringProgress*360)+'deg;--timer-step-angle:'+vm.stepAngle+'deg;--timer-gap-angle:'+vm.gapAngle+'deg;--timer-fill-angle:'+vm.fillAngle+'deg;--timer-major-step-angle:'+vm.majorStepAngle+'deg;--timer-major-gap-angle:'+vm.majorGapAngle+'deg"><div><span id="timerPhase" class="'+(String(vm.label).length>26?'long':'')+'">'+vm.label+'</span><strong id="smartClock">'+(vm.clockText||timerFormat(vm.sec))+'</strong><small id="timerMeta">'+vm.meta+'</small><div class="timer-next" id="timerNext">'+(vm.nextText?'<span class="timer-next-label">Next</span><span class="timer-next-stage">'+vm.nextText+'</span>':'')+'</div></div></div>'+
      '<div class="smart-timer-controls" id="smartTimerControls">'+timerControls(vm)+'</div>'+
      presets+
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
  const ring=document.getElementById('timerRing');
  if(ring){
    ring.style.setProperty('--timer-progress',(vm.ringProgress*360)+'deg');
    ring.style.setProperty('--timer-step-angle',vm.stepAngle+'deg');
    ring.style.setProperty('--timer-gap-angle',vm.gapAngle+'deg');
    ring.style.setProperty('--timer-fill-angle',vm.fillAngle+'deg');
    ring.style.setProperty('--timer-major-step-angle',vm.majorStepAngle+'deg');
    ring.style.setProperty('--timer-major-gap-angle',vm.majorGapAngle+'deg');
  }
  const controls=document.getElementById('smartTimerControls');if(controls)controls.innerHTML=timerControls(vm);
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
document.getElementById('settingsBtn').onclick=()=>{
  document.getElementById('startDateInput').value=settings.startDate;
  document.getElementById('bodyweightInput').value=settings.bodyweight;
  document.getElementById('heightInput').value=settings.height||'';
  document.getElementById('ageInput').value=settings.age||'';
  document.getElementById('sexInput').value=settings.sex||'';
  document.getElementById('stepsInput').value=settings.steps;
  document.getElementById('maintenanceInput').value=settings.maintenanceOverride||'';
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
  document.getElementById('settingsOverlay').classList.add('show');
};
document.getElementById('cancelSettings').onclick=()=>document.getElementById('settingsOverlay').classList.remove('show');
document.getElementById('saveSettings').onclick=()=>{
  const old=settings.portions||defaultPortions;
  const portionValue=(id,fallback)=>{const raw=document.getElementById(id).value;return raw===''?fallback:Math.max(0,Number(raw)||0)};
  settings={...settings,
    startDate:document.getElementById('startDateInput').value||settings.startDate,
    bodyweight:Number(document.getElementById('bodyweightInput').value)||settings.bodyweight,
    height:Number(document.getElementById('heightInput').value)||0,
    age:Number(document.getElementById('ageInput').value)||0,
    sex:document.getElementById('sexInput').value||'',
    steps:Number(document.getElementById('stepsInput').value)||settings.steps,
    maintenanceOverride:Number(document.getElementById('maintenanceInput').value)||0,
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
  document.getElementById('settingsOverlay').classList.remove('show');
  renderHome();renderDays();renderProgress();
};
renderHome();renderDays();renderProgress();
if(inlineTimer.activeId)inlineTimerEnsureTick();
timerEnsureTick();
