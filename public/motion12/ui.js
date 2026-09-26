function updateHomeModeToggle(){
  const b=document.getElementById('homeModeToggle');
  if(!b)return;
  const compact=settings.homeMode==='compact';
  b.setAttribute('aria-checked',compact?'true':'false');
  b.classList.toggle('active',compact);
}
function toggleHomeMode(){
  settings.homeMode=settings.homeMode==='compact'?'full':'compact';
  localStorage.setItem('motion12.settings',JSON.stringify(settings));
  updateHomeModeToggle();
  if(document.getElementById('homePage')?.classList.contains('active'))renderHome();
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
  localStorage.setItem('motion12.logs',JSON.stringify(logs));
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
function renderDays(){const d=programDay(),w=weekNo();let html=`<div class="page-title"><div class="eyebrow">Week ${w}</div><h1>Your week</h1><p>Same structure every week. Only load, leverage and aerobic output progress.</p></div><div class="section day-list cards">`;
 [1,2,3,4,5,6,0].forEach(day=>{const p=program[day];html+=`<div class="card row ${day===d?'todaycard':''}" onclick="openDay(${day})"><div><div class="label">${DAYS[day]} · ${p.time}</div><h3>${p.name}</h3><p>${weeklyTarget(day,w)}</p></div><div class="right ${p.tone}">→</div></div>`});html+='</div>';document.getElementById('daysPage').innerHTML=html;
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
function saveInlineTimer(){localStorage.setItem('motion12.inlineTimer',JSON.stringify(inlineTimer))}
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
  if(rec.action==='rest')return {kind:'rest',rest:rec.seconds||90,label:rec.category+' recovery'};
  return {kind:'session',rest:0,label:'Session timer'};
}
function inlineTimerMarkup(id){
  if(inlineTimer.activeId!==id)return '';
  if(inlineTimer.kind==='session'){
    return '<div class="inline-ex-timer" id="inlineExerciseTimer"><div class="inline-timer-main"><span>SESSION TIMER</span><b>Use full sequence</b></div><div class="inline-timer-actions"><button type="button" onclick="event.stopPropagation();showPage(\'timerPage\')">Open timer</button><button type="button" class="inline-close" onclick="event.stopPropagation();closeInlineExerciseTimer()">×</button></div></div>';
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
  inlineTimer={...defaultInlineTimer,activeId:id,exerciseName:name,kind:preset.kind,work:preset.work||0,rest:preset.rest||0,phase:preset.kind==='workrest'?'work':'rest',duration:preset.kind==='workrest'?(preset.work||0):(preset.rest||0),remaining:preset.kind==='workrest'?(preset.work||0):(preset.rest||0)};
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
function inlineTimerReset(){
  inlineTimer.running=false;inlineTimer.endAt=0;
  inlineTimer.phase=inlineTimer.kind==='workrest'?'work':'rest';
  inlineTimer.duration=inlineTimer.kind==='workrest'?inlineTimer.work:inlineTimer.rest;
  inlineTimer.remaining=inlineTimer.duration;
  saveInlineTimer();updateInlineExerciseTimer();
}
function closeInlineExerciseTimer(){
  inlineTimer={...defaultInlineTimer};
  saveInlineTimer();
  document.querySelectorAll('.exercise.active-timer').forEach(el=>el.classList.remove('active-timer'));
  document.querySelectorAll('.inline-ex-timer').forEach(el=>el.remove());
}
function inlineTimerTick(){
  if(!inlineTimer.running){updateInlineExerciseTimer();return}
  const now=Date.now();
  if(now>=inlineTimer.endAt){
    const previousEnd=inlineTimer.endAt;
    if(inlineTimer.kind==='workrest'&&inlineTimer.phase==='work'&&inlineTimer.rest>0){
      inlineTimer.phase='rest';inlineTimer.duration=inlineTimer.rest;inlineTimer.remaining=inlineTimer.rest;inlineTimer.endAt=previousEnd+inlineTimer.rest*1000;timerBeep();
    }else{
      inlineTimer.running=false;inlineTimer.phase='complete';inlineTimer.remaining=0;inlineTimer.endAt=0;timerBeep();
    }
    saveInlineTimer();
  }
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
function openDay(day,date=null){date=date||dateForProgramDay(day);const w=weekNo(),p=program[day];showPage('dayPage');let exHtml='';p.work.forEach((x,i)=>{const id=exId(day,i,date);const state=logs[id]||{};let target=x[1];if(day===6)target=aerobicTargets[w-1];const timerName=encodeURIComponent(x[0]),timerTarget=encodeURIComponent(target);exHtml+=`<div class="exercise ${state.done?'complete':''} ${inlineTimer.activeId===id?'active-timer':''}" id="ex-${id}" data-timer-id="${id}" data-timer-day="${day}" data-timer-name="${timerName}" data-timer-target="${timerTarget}" data-timer-support="0" onclick="activateExerciseTimerFromCard(event,this)"><div class="ex-top"><div class="num">${i+1}</div><div class="ex-name"><h3>${x[0]} ${videoButtons(x[0])}</h3><p>${target}</p></div><button class="check" onclick="toggleExercise('${id}')"></button></div>${inlineTimerMarkup(id)}
      <div class="inputs"><div class="field"><label>Load / pace</label><input value="${state.load||''}" placeholder="e.g. 20 kg" oninput="saveEx('${id}','load',this.value)"></div><div class="field"><label>Actual</label><input value="${state.reps||''}" placeholder="sets/reps" oninput="saveEx('${id}','reps',this.value)"></div><div class="field"><label>RIR / effort</label><input value="${state.rir||''}" placeholder="2 RIR" oninput="saveEx('${id}','rir',this.value)"></div></div>
      <div class="tip">${x[2]}</div><div class="tip progress-rule"><b>Progress:</b> ${x[3]}</div>${loadGuideMarkup(x[4])}</div>`});
 let mob=mobility.map((m,i)=>`<div class="card row"><div><h3>${m[0]} ${videoButtons(m[0])}</h3><p>${m[1]}</p></div><span class="volt">${String(i+1).padStart(2,'0')}</span></div>`).join('');
 const prepHtml=prepBlockMarkup(day,date,p);
 const supportHtml=supportBlockMarkup(day,date,w,p);
 const key=`${date}-${day}`;
 document.getElementById('dayPage').innerHTML=`<div class="day-page-wrap"><div class="sticky-col"><button class="back" onclick="showPage('homePage')">← Home</button><div class="page-title"><div class="eyebrow">${DAYS[day]} · Week ${w}</div><h1>${p.name}</h1><p>${p.why}</p></div><div class="session-summary"><div class="mini"><b>${p.time.replace(' min','')}</b><span>minutes</span></div><div class="mini"><b>${p.work.length+(p.prep?.length||0)+(p.support?.length||0)}</b><span>moves</span></div><div class="mini"><b>${settings.steps/1000}k</b><span>steps</span></div></div>
 <button class="session-timer-link" type="button" onclick="showPage('timerPage')"><div><span class="tag">Smart timer</span><h3>Use today’s prescribed timing</h3><p>Rest, sets or aerobic intervals are configured automatically.</p></div><span class="session-timer-arrow">→</span></button>
 <div class="card accent"><span class="tag">Today’s progression</span><h3 style="margin-top:10px">${weeklyTarget(day,w)}</h3></div></div>
 <div>${prepHtml}<section class="section"><div class="section-head"><h2>Workout</h2><small>log as you go</small></div>${exHtml||'<div class="card"><h3>Recovery day</h3><p>No formal strength work. Keep normal walking and complete the mobility reset below.</p></div>'}</section>
 ${supportHtml}
 <section class="section" id="mobilitySection"><div class="section-head"><h2>Mobility reset</h2><small>daily</small></div><div class="cards">${mob}</div></section><button class="complete-session ${logs[key]?.completed?'done':''}" onclick="completeSession('${key}')">${logs[key]?.completed?'✓ Session complete':'Complete session'}</button></div></div>`;
 window.scrollTo({top:0,behavior:'smooth'});
}
function openMobilityToday(){openDay(programDay(),todayISO());setTimeout(()=>document.getElementById('mobilitySection')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
function toggleExercise(id){logs[id]=logs[id]||{};logs[id].done=!logs[id].done;localStorage.setItem('motion12.logs',JSON.stringify(logs));document.getElementById('ex-'+id)?.classList.toggle('complete',logs[id].done)}
function saveEx(id,k,v){logs[id]=logs[id]||{};logs[id][k]=v;localStorage.setItem('motion12.logs',JSON.stringify(logs))}
function completeSession(key){logs[key]=logs[key]||{};logs[key].completed=!logs[key].completed;localStorage.setItem('motion12.logs',JSON.stringify(logs));renderHome();renderDays();openDay(Number(key.split('-').pop()),key.slice(0,10))}
function renderProgress(){
  const fields=[['weight','Bodyweight','kg'],['waist','Waist','cm'],['bp','Blood pressure','mmHg'],['rhr','Resting heart rate','bpm'],['walk','2 km walk','min'],['pushups','Strict push-ups','reps']];
  const p=protein(),fat=fatLossTargets(),cal=calorieTargets(),ps=programProgressStats();
  let cards=fields.map(([id,n,u])=>`<div class="card measure"><span class="tag">${u}</span><h3>${n}</h3><input id="measure-${id}" value="${measurements[id]||''}" placeholder="Enter current"></div>`).join('');
  document.getElementById('progressPage').innerHTML=`<div class="page-title"><div class="eyebrow">12-week dashboard</div><h1>Progress</h1><p>Completed days, adherence and physical measures in one place.</p></div><section class="section"><div class="card adherence-card"><span class="tag">Program adherence</span><div class="adherence-grid"><div><b>${ps.currentStreak}</b><span>current streak</span></div><div><b>${ps.bestStreak}</b><span>best streak</span></div><div><b>${ps.completed}/${ps.elapsed||0}</b><span>days complete / elapsed</span></div><div><b>${ps.adherence}%</b><span>completion to date</span></div></div><div class="adherence-track"><i style="width:${Math.min(100,Math.round(ps.completed/ps.programDays*100))}%"></i></div><small>${ps.completed} of 84 program days explicitly marked Session complete.</small></div></section><section class="section"><div class="card accent"><span class="tag">Nutrition targets</span><div class="target-grid"><div class="target-chip"><b>${p?`${p} g`:'Set weight'}</b><span>protein / eating day</span></div><div class="target-chip"><b>${cal?`${cal.eatingDay} kcal`:'Set details'}</b><span>eating-day target</span></div><div class="target-chip"><b>${cal?`${cal.predictedLoss} kg`:'—'}</b><span>planned loss / week</span></div><div class="target-chip"><b>${cal?`${cal.maintenance} kcal`:'—'}</b><span>estimated maintenance</span></div></div>${cal?`<div class="nutrition-strip">Target range ${fat.low}–${fat.high} kg/week · planned deficit ${cal.actualWeeklyDeficit} kcal/week · weekly intake ${cal.weeklyIntake} kcal. This math assumes Monday is truly 0 kcal.</div>`:''}</div><div class="measure-grid" style="margin-top:10px">${cards}</div><div class="savebar"><button class="complete-session" onclick="saveMeasurements()">Save measures</button></div></section><section class="section"><div class="card accent"><h3>Calorie adjustment rule</h3><p>${fat&&cal?`Use morning weights and compare 7-day averages across two full weeks. Only adjust if adherence was good. If loss is below ~${fat.low} kg/week for both weeks, remove ~100–150 kcal from eating days. If loss is above ~${fat.cap} kg/week, or strength/sleep/energy fall, add ~100–150 kcal. Keep protein steady; adjust rice and fats first.`:'Enter bodyweight to calculate the adjustment range.'}</p></div><div class="card" style="margin-top:10px"><h3>What success looks like</h3><p>Waist ↓ · strength maintained or ↑ · 2 km time ↓ · cardiovascular tolerance ↑ · blood pressure healthy · resting heart rate stable or ↓.</p></div></section>`;
}
function saveMeasurements(){['weight','waist','bp','rhr','walk','pushups'].forEach(id=>measurements[id]=document.getElementById('measure-'+id).value);const w=Number(measurements.weight);if(w>0){settings.bodyweight=w;localStorage.setItem('motion12.settings',JSON.stringify(settings))}localStorage.setItem('motion12.measurements',JSON.stringify(measurements));renderHome();renderDays();renderProgress();
if(inlineTimer.activeId)inlineTimerEnsureTick();timerEnsureTick();const b=document.querySelector('#progressPage .complete-session');if(b){b.textContent='✓ Saved';setTimeout(()=>{if(b.isConnected)b.textContent='Save measures'},1200)}}

function conditioningCircuitPlan(day,w){
  const rounds=(conditioningRounds[day]||[])[Math.max(0,Math.min(11,w-1))]||1;
  let stations=[],roundRest=0,title='',note='';
  if(day===2){
    stations=[
      {label:'KB DEADLIFT',work:30,rest:30},
      {label:'RING ROW',work:30,rest:30},
      {label:'REV LUNGE',work:30,rest:30},
      {label:'SUITCASE',work:30,rest:30}
    ];
    title=conditioningTarget(day,w);
    note='Recovery circuit: stay at RPE 4–5. Every work interval is followed by 30 seconds easy recovery.';
  }else if(day===4){
    stations=[
      {label:'KB COMPLEX',work:40,rest:60},
      {label:'SWINGS',work:20,rest:40},
      {label:'PUSH-UPS',work:20,rest:40}
    ];
    title=conditioningTarget(day,w);
    note='Power circuit: use the full 40/60 window for the kettlebell complex, then keep swings and push-ups crisp at 20/40. Quality beats speed.';
  }else if(day===0){
    stations=[
      {label:'SQUAT + CALF',work:40,rest:20},
      {label:'PUSH-UPS',work:40,rest:20},
      {label:'REV LUNGE',work:40,rest:20},
      {label:'SUITCASE',work:40,rest:20}
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
function timerSessionPlan(day=programDay(),w=weekNo()){
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
  if(day===1||day===3||day===5)return {kind:'rest',title:'Strength · between working sets',note:'Start with 90 seconds. Take 120 seconds after a demanding compound set if quality needs it.',rest:90};
  return {kind:'stopwatch',title:'Easy movement',note:'No prescribed intervals today. Use elapsed time only if it helps.'};
}
function exerciseRestPreset(name,day=programDay(),w=weekNo()){
  if(day===2)return {category:'Recovery circuit',seconds:30,action:'session',label:'30s / 30s',note:'Use the complete Restore circuit timer.'};
  if(day===4){
    const complex=name==='Kettlebell squat → jerk → strict press';
    return {category:'Power circuit',seconds:complex?60:40,action:'session',label:complex?'40s / 60s':'20s / 40s',note:'Use the complete Power circuit timer.'};
  }
  if(day===0)return {category:'Aerobic base',seconds:20,action:'session',label:'40s / 20s',note:'Use the complete Aerobic Base circuit timer.'};
  const strength120=new Set(['Goblet squat','Pull-up / assisted pull-up','Ring row','Ring row / pull-up','Reverse lunge','Kettlebell Romanian deadlift']);
  const strength90=new Set(['1-arm kettlebell press','Push-up','1-arm kettlebell row','Lateral lunge']);
  const accessory60=new Set(['Suitcase carry','Plank shoulder tap','Back extension','Kettlebell woodchop','Plank shoulder tap / kettlebell woodchop']);
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
  timerSetRest(rec.seconds,name,rec.category);
}
function exercisePresetMarkup(){
  const p=program[programDay()];
  if(!p?.work?.length)return '';
  const circuitDay=programDay()===0||programDay()===2||programDay()===4;
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
function saveSmartTimer(){localStorage.setItem('motion12.timer',JSON.stringify(smartTimer))}
function timerFormat(sec){
  sec=Math.max(0,Math.floor(sec||0));
  const m=Math.floor(sec/60),s=sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function timerConfigure(mode=smartTimer.mode||'session',force=false){
  const dayKey=todayISO()+':'+weekNo();
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
    if(document.getElementById('timerPage')?.classList.contains('active'))updateSmartTimerDisplay();
    return;
  }
  const now=Date.now();
  if(smartTimer.kind==='intervals'){
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
    if(changed)saveSmartTimer();
  }else if(smartTimer.kind!=='stopwatch'&&now>=smartTimer.endAt){
    smartTimer.running=false;smartTimer.remaining=0;smartTimer.endAt=0;saveSmartTimer();timerBeep();
  }
  if(document.getElementById('timerPage')?.classList.contains('active'))updateSmartTimerDisplay();
}
function timerEnsureTick(){
  if(timerInt)return;
  timerInt=setInterval(timerTick,250);
}
function timerSetMode(mode){timerConfigure(mode,true);renderTimerPage()}
function timerStartPause(){
  timerPrimeAudio();
  timerConfigure(smartTimer.mode||'session',false);
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
function timerReset(){timerConfigure(smartTimer.mode||'session',true);renderTimerPage()}
function timerSetRest(sec,exerciseName='',exerciseCategory=''){
  smartTimer={...defaultSmartTimer,mode:'rest',kind:'rest',duration:sec,remaining:sec,exerciseName,exerciseCategory,dayKey:todayISO()+':'+weekNo()};
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
  let label='REST',meta=plan.title,progress=0,detail='';
  if(kind==='intervals'){
    const phase=plan.phases[Math.min(smartTimer.phaseIndex,plan.phases.length-1)];
    if(smartTimer.phaseIndex>=plan.phases.length){label='COMPLETE';meta=plan.title;progress=0;detail=plan.circuit?'All '+plan.rounds+' circuit rounds complete':'All '+plan.rounds+' hard intervals complete';}
    else{label=phase.label;meta='Round '+phase.round+' of '+plan.rounds;progress=smartTimer.duration?sec/smartTimer.duration:0;detail=plan.title;}
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
  return {plan,sec,kind,label,meta,detail,progress:Math.max(0,Math.min(1,progress))};
}
function timerControls(vm){
  const primary='<button class="timer-primary" onclick="timerStartPause()">'+(smartTimer.running?'Pause':'Start')+'</button>';
  if(vm.kind==='intervals')return primary+'<button onclick="timerSkipPhase()">Skip phase</button><button onclick="timerReset()">Reset</button>';
  if(vm.kind==='sets'){
    if(smartTimer.setIndex>=vm.plan.sets)return '<button class="timer-primary" onclick="timerReset()">Start again</button>';
    if(smartTimer.running)return primary+'<button onclick="timerAdjust(15)">+15 sec</button><button onclick="timerReset()">Reset</button>';
    return '<button class="timer-primary" onclick="timerCompleteSet()">Set complete → rest</button><button onclick="timerReset()">Reset</button>';
  }
  if(vm.kind==='stopwatch')return primary+'<button onclick="timerReset()">Reset</button>';
  return primary+'<button onclick="timerAdjust(-15)">−15 sec</button><button onclick="timerAdjust(15)">+15 sec</button><button onclick="timerReset()">Reset</button>';
}
function renderTimerPage(){
  timerConfigure(smartTimer.mode||'session',false);
  const vm=timerViewModel(),p=program[programDay()];
  const presets=vm.kind==='rest'?'<div class="timer-presets"><button onclick="timerSetRest(60)">1:00</button><button onclick="timerSetRest(90)">1:30</button><button onclick="timerSetRest(120)">2:00</button></div>':'';
  document.getElementById('timerPage').innerHTML=
    '<div class="page-title timer-title"><div class="eyebrow">Today · '+p.name+'</div><h1>Timer</h1><p>'+vm.plan.title+'</p></div>'+
    '<div class="timer-mode-tabs">'+
      '<button class="'+(smartTimer.mode==='session'?'active':'')+'" onclick="timerSetMode(\'session\')">Session</button>'+
      '<button class="'+(smartTimer.mode==='rest'?'active':'')+'" onclick="timerSetMode(\'rest\')">Rest</button>'+
      '<button class="'+(smartTimer.mode==='stopwatch'?'active':'')+'" onclick="timerSetMode(\'stopwatch\')">Stopwatch</button>'+
    '</div>'+
    '<section class="smart-timer-card">'+
      '<div class="timer-context"><span>'+vm.label+'</span><b>'+vm.meta+'</b></div>'+
      '<div class="timer-ring" id="timerRing" style="--timer-progress:'+(vm.progress*360)+'deg"><div><span id="timerPhase">'+vm.label+'</span><strong id="smartClock">'+timerFormat(vm.sec)+'</strong><small id="timerMeta">'+vm.meta+'</small></div></div>'+
      '<div class="smart-timer-controls" id="smartTimerControls">'+timerControls(vm)+'</div>'+
      presets+
    '</section>'+
    exercisePresetMarkup()+
    '<section class="section"><div class="card timer-guidance"><span class="tag">Why this timer</span><h3>'+vm.plan.title+'</h3><p>'+vm.detail+'</p></div></section>';
  timerEnsureTick();
}
function updateSmartTimerDisplay(){
  const clock=document.getElementById('smartClock');
  if(!clock)return;
  const vm=timerViewModel();
  clock.textContent=timerFormat(vm.sec);
  const phase=document.getElementById('timerPhase');if(phase)phase.textContent=vm.label;
  const meta=document.getElementById('timerMeta');if(meta)meta.textContent=vm.meta;
  const ring=document.getElementById('timerRing');if(ring)ring.style.setProperty('--timer-progress',(vm.progress*360)+'deg');
  const controls=document.getElementById('smartTimerControls');if(controls)controls.innerHTML=timerControls(vm);
}
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  if(id==='homePage')renderHome();
  if(id==='daysPage')renderDays();
  if(id==='progressPage')renderProgress();
  if(id==='timerPage')renderTimerPage();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('todayDate').textContent=formatDate();
document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.getElementById('homeModeToggle').onclick=toggleHomeMode;
updateHomeModeToggle();
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
  if(settings.bodyweight>0){measurements.weight=String(settings.bodyweight);localStorage.setItem('motion12.measurements',JSON.stringify(measurements))}
  localStorage.setItem('motion12.settings',JSON.stringify(settings));
  document.getElementById('settingsOverlay').classList.remove('show');
  renderHome();renderDays();renderProgress();
};
renderHome();renderDays();renderProgress();
