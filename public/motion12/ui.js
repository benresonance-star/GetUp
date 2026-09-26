function videoButtons(name){return videosFor(name).map(v=>`<a class="video-link" href="${v.url}" target="_blank" rel="noopener noreferrer">▶ ${v.label}</a>`).join('')}
function mealKey(date,index){return 'meal:'+date+':'+index}
function intakeTotals(day,date){
  const plan=mealPlan(day);
  if(!plan||!plan.meals.length)return null;
  const consumed=plan.meals.reduce((acc,m,i)=>{
    if(logs[mealKey(date,i)]?.done){
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
function mealRows(day,date=todayISO()){
  const plan=mealPlan(day);
  if(!plan)return '<div class="card"><p>Add bodyweight to create the meal plan.</p></div>';
  if(!plan.meals.length)return '<div class="card fast-card"><h3>Fast after training</h3><p>'+plan.note+'</p></div>';
  return '<div class="intake-strip" data-intake-date="'+date+'">'+intakeStripInner(day,date)+(plan.gap?'<div class="plan-gap '+(plan.gap<0?'over':'')+'">Plan '+plan.total+' kcal · target '+plan.target+' kcal · '+(plan.gap>0?plan.gap+' kcal unallocated':Math.abs(plan.gap)+' kcal over target')+'</div>':'')+'</div><div class="meal-list">'+plan.meals.map((m,i)=>{
    const key=mealKey(date,i),done=!!logs[key]?.done;
    return '<button class="meal-row meal-toggle '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+key+'\')"><span class="meal-check" aria-hidden="true">'+(done?'✓':'')+'</span><div class="meal-copy"><span class="meal-name">'+m.name+'</span><p>'+m.portion+'</p><div class="meal-macros"><span><b>P</b> '+m.protein+'g</span><span><b>C</b> '+m.carbs+'g</span><span><b>F</b> '+m.fat+'g</span></div></div><div class="meal-kcal"><b>'+m.kcal+'</b><span>kcal</span></div></button>';
  }).join('')+'<div class="macro-total"><b>Daily macros</b><span>P '+plan.macroTotals.protein+'g</span><span>C '+plan.macroTotals.carbs+'g</span><span>F '+plan.macroTotals.fat+'g</span></div><div class="meal-note">'+plan.note+' Use labels or a food scale once to calibrate your usual portions.</div></div>';
}
function toggleMeal(key){
  logs[key]=logs[key]||{};
  logs[key].done=!logs[key].done;
  localStorage.setItem('motion12.logs',JSON.stringify(logs));
  const parts=key.split(':');
  const date=parts[1];
  const day=new Date(date+'T00:00:00').getDay();
  document.querySelectorAll('[data-meal-key="'+key+'"]').forEach(el=>{
    el.classList.toggle('done',logs[key].done);
    const check=el.querySelector('.meal-check');
    if(check)check.textContent=logs[key].done?'✓':'';
  });
  updateIntakeStrips(day,date);
  if(settings.homeMode==='compact' && document.getElementById('homePage')?.classList.contains('active'))renderHome();
}
function compactMealChips(day,date){
  const plan=mealPlan(day);
  if(!plan)return '<div class="compact-empty">Set bodyweight to build meals</div>';
  if(!plan.meals.length)return '<div class="compact-fast">FAST DAY · water / plain coffee / tea</div>';
  return '<div class="compact-meal-grid">'+plan.meals.map((m,i)=>{
    const key=mealKey(date,i),done=!!logs[key]?.done;
    const label=m.name.replace('Protein shake','Shake');
    return '<button class="compact-meal '+(done?'done':'')+'" type="button" data-meal-key="'+key+'" onclick="toggleMeal(\''+key+'\')"><span class="meal-check">'+(done?'✓':'')+'</span><span>'+label+'</span></button>';
  }).join('')+'</div>';
}
function compactMealCount(day,date){
  const plan=mealPlan(day);
  if(!plan||!plan.meals.length)return '';
  const done=plan.meals.reduce((n,m,i)=>n+(logs[mealKey(date,i)]?.done?1:0),0);
  return done+' / '+plan.meals.length+' ✓';
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
        <div class="compact-card-head"><span class="compact-label">Meals</span><b>${mealCount}</b></div>
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
function renderHome(){const d=programDay(),w=weekNo(),p=program[d],diet=dietText(d),fat=fatLossTargets(),cal=calorieTargets();const start=new Date(settings.startDate+'T00:00:00');const weekStart=new Date(start);weekStart.setDate(start.getDate()+(w-1)*7);let strip='';for(let i=0;i<7;i++){const dt=new Date(weekStart);dt.setDate(weekStart.getDate()+i);const dd=dt.getDay();const ds=iso(dt);strip+=`<button class="daydot ${dd===d&&ds===todayISO()?'today':''} ${completedOn(ds,dd)?'done':''}" onclick="openDay(${dd},'${ds}')"><b>${short[dd]}</b><span></span></button>`}
 document.getElementById('homePage').classList.remove('compact-active');
 if(settings.homeMode==='compact'){renderCompactHome(d,w,p,fat,cal,strip);return;}
 document.getElementById('homePage').innerHTML=`
  <div class="homegrid"><div>
  <section class="hero"><div class="eyebrow">Week ${w} · Today</div><h1>${p.name}</h1><div class="sub">${p.why}</div><div class="hero-meta"><span class="pill">◷ ${p.time}</span><span class="pill">◎ ${settings.steps.toLocaleString()} steps baseline</span></div><button class="cta" onclick="openDay(${d},'${todayISO()}')"><span>${completedOn(todayISO(),d)?'Review completed session':'Start today’s session'}</span><span>→</span></button></section>
  <section class="section"><div class="section-head"><h2>This week</h2><small>Week ${w} of 12</small></div><div class="weekstrip">${strip}</div><div class="progressbar"><i style="width:${Math.round((w-1)/11*100)}%"></i></div></section>
  </div><div>
  <section class="section"><div class="section-head"><h2>Why today</h2></div><div class="card accent"><span class="tag">Training logic</span><h3 style="margin-top:12px">${p.why}</h3><p style="margin-top:8px">Today’s progression: <b class="volt">${weeklyTarget(d,w)}</b></p></div></section>
  <section class="section"><div class="section-head"><h2>Food</h2><small>calories → portions</small></div>
  <div class="diet-grid">
    <div class="card diet-card"><span class="tag">Protein · eating day</span><div class="big">${protein()?`~${protein()} G`:`SET WEIGHT`}</div><p>${proteinSplit()?`Meals ${proteinSplit().breakfast}g / ${proteinSplit().lunch}g / ${proteinSplit().dinner}g + shake ${proteinSplit().shake}g + 2 lattes × ${proteinSplit().latte1}g · weekly average ~${weeklyProteinAverage()} g/day with Monday fast`:`Add bodyweight to calculate protein.`}</p></div>
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
function openDay(day,date=null){date=date||dateForProgramDay(day);const w=weekNo(),p=program[day];showPage('dayPage');let exHtml='';p.work.forEach((x,i)=>{const id=exId(day,i,date);const state=logs[id]||{};let target=x[1];if(day===4)target=swingTargets[w-1];if(day===6)target=aerobicTargets[w-1];exHtml+=`<div class="exercise ${state.done?'complete':''}" id="ex-${id}"><div class="ex-top"><div class="num">${i+1}</div><div class="ex-name"><h3>${x[0]} ${videoButtons(x[0])}</h3><p>${target}</p></div><button class="check" onclick="toggleExercise('${id}')"></button></div>
      <div class="inputs"><div class="field"><label>Load / pace</label><input value="${state.load||''}" placeholder="e.g. 20 kg" oninput="saveEx('${id}','load',this.value)"></div><div class="field"><label>Actual</label><input value="${state.reps||''}" placeholder="sets/reps" oninput="saveEx('${id}','reps',this.value)"></div><div class="field"><label>RIR / effort</label><input value="${state.rir||''}" placeholder="2 RIR" oninput="saveEx('${id}','rir',this.value)"></div></div>
      <div class="tip">${x[2]}</div><div class="tip progress-rule"><b>Progress:</b> ${x[3]}</div></div>`});
 let mob=mobility.map((m,i)=>`<div class="card row"><div><h3>${m[0]} ${videoButtons(m[0])}</h3><p>${m[1]}</p></div><span class="volt">${String(i+1).padStart(2,'0')}</span></div>`).join('');
 const diet=dietText(day), key=`${date}-${day}`;
 document.getElementById('dayPage').innerHTML=`<div class="day-page-wrap"><div class="sticky-col"><button class="back" onclick="showPage('homePage')">← Home</button><div class="page-title"><div class="eyebrow">${DAYS[day]} · Week ${w}</div><h1>${p.name}</h1><p>${p.why}</p></div><div class="session-summary"><div class="mini"><b>${p.time.replace(' min','')}</b><span>minutes</span></div><div class="mini"><b>${p.work.length}</b><span>moves</span></div><div class="mini"><b>${settings.steps/1000}k</b><span>steps</span></div></div>
 <div class="timer"><div class="eyebrow">Session / rest timer</div><div class="clock" id="clock">00:00</div><div class="timer-actions"><button class="primary" onclick="toggleTimer()" id="timerToggle">Start</button><button onclick="setTimer(60)">1:00</button><button onclick="setTimer(90)">1:30</button><button onclick="resetTimer()">Reset</button></div></div>
 <div class="card accent"><span class="tag">Today’s progression</span><h3 style="margin-top:10px">${weeklyTarget(day,w)}</h3></div><div class="card" style="margin-top:10px"><span class="tag">Food</span><h3 style="margin-top:10px" class="${day===1?'fast':''}">${diet[0]}</h3><p>${diet[1]}. ${diet[2]}</p><div class="nutrition-strip">${nutritionSummary(day)}</div></div><div style="margin-top:10px">${mealRows(day,date)}</div></div>
 <div><section class="section"><div class="section-head"><h2>Workout</h2><small>log as you go</small></div>${exHtml||'<div class="card"><h3>Recovery day</h3><p>No formal strength work. Keep normal walking and complete the mobility reset below.</p></div>'}</section>
 <section class="section" id="mobilitySection"><div class="section-head"><h2>Mobility reset</h2><small>daily</small></div><div class="cards">${mob}</div></section><button class="complete-session ${logs[key]?.completed?'done':''}" onclick="completeSession('${key}')">${logs[key]?.completed?'✓ Session complete':'Complete session'}</button></div></div>`;
 updateClock(); window.scrollTo({top:0,behavior:'smooth'});
}
function openMobilityToday(){openDay(programDay(),todayISO());setTimeout(()=>document.getElementById('mobilitySection')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
function toggleExercise(id){logs[id]=logs[id]||{};logs[id].done=!logs[id].done;localStorage.setItem('motion12.logs',JSON.stringify(logs));document.getElementById('ex-'+id)?.classList.toggle('complete',logs[id].done)}
function saveEx(id,k,v){logs[id]=logs[id]||{};logs[id][k]=v;localStorage.setItem('motion12.logs',JSON.stringify(logs))}
function completeSession(key){logs[key]=logs[key]||{};logs[key].completed=!logs[key].completed;localStorage.setItem('motion12.logs',JSON.stringify(logs));renderHome();renderDays();openDay(Number(key.split('-').pop()),key.slice(0,10))}
function renderProgress(){
  const fields=[['weight','Bodyweight','kg'],['waist','Waist','cm'],['bp','Blood pressure','mmHg'],['rhr','Resting heart rate','bpm'],['walk','2 km walk','min'],['pushups','Strict push-ups','reps']];
  const p=protein(),fat=fatLossTargets(),cal=calorieTargets();
  let cards=fields.map(([id,n,u])=>`<div class="card measure"><span class="tag">${u}</span><h3>${n}</h3><input id="measure-${id}" value="${measurements[id]||''}" placeholder="Enter current"></div>`).join('');
  document.getElementById('progressPage').innerHTML=`<div class="page-title"><div class="eyebrow">Functional age dashboard</div><h1>Progress</h1><p>Track six useful measures. Calories are an estimate; the weight trend tells us whether the estimate is right.</p></div><section class="section"><div class="card accent"><span class="tag">Nutrition targets</span><div class="target-grid"><div class="target-chip"><b>${p?`${p} g`:'Set weight'}</b><span>protein / eating day</span></div><div class="target-chip"><b>${cal?`${cal.eatingDay} kcal`:'Set details'}</b><span>eating-day target</span></div><div class="target-chip"><b>${cal?`${cal.predictedLoss} kg`:'—'}</b><span>planned loss / week</span></div><div class="target-chip"><b>${cal?`${cal.maintenance} kcal`:'—'}</b><span>estimated maintenance</span></div></div>${cal?`<div class="nutrition-strip">Target range ${fat.low}–${fat.high} kg/week · planned deficit ${cal.actualWeeklyDeficit} kcal/week · weekly intake ${cal.weeklyIntake} kcal. This math assumes Monday is truly 0 kcal.</div>`:''}</div><div class="measure-grid" style="margin-top:10px">${cards}</div><div class="savebar"><button class="complete-session" onclick="saveMeasurements()">Save measures</button></div></section><section class="section"><div class="card accent"><h3>Calorie adjustment rule</h3><p>${fat&&cal?`Use morning weights and compare 7-day averages across two full weeks. Only adjust if adherence was good. If loss is below ~${fat.low} kg/week for both weeks, remove ~100–150 kcal from eating days. If loss is above ~${fat.cap} kg/week, or strength/sleep/energy fall, add ~100–150 kcal. Keep protein steady; adjust rice and fats first.`:'Enter bodyweight to calculate the adjustment range.'}</p></div><div class="card" style="margin-top:10px"><h3>What success looks like</h3><p>Waist ↓ · strength maintained or ↑ · 2 km time ↓ · cardiovascular tolerance ↑ · blood pressure healthy · resting heart rate stable or ↓.</p></div></section>`;
}
function saveMeasurements(){['weight','waist','bp','rhr','walk','pushups'].forEach(id=>measurements[id]=document.getElementById('measure-'+id).value);const w=Number(measurements.weight);if(w>0){settings.bodyweight=w;localStorage.setItem('motion12.settings',JSON.stringify(settings))}localStorage.setItem('motion12.measurements',JSON.stringify(measurements));renderHome();renderDays();renderProgress();const b=document.querySelector('#progressPage .complete-session');if(b){b.textContent='✓ Saved';setTimeout(()=>{if(b.isConnected)b.textContent='Save measures'},1200)}}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='homePage')renderHome();if(id==='daysPage')renderDays();if(id==='progressPage')renderProgress();window.scrollTo({top:0,behavior:'smooth'})}
function updateClock(){const el=document.getElementById('clock');if(el){const m=Math.floor(timerSeconds/60),s=timerSeconds%60;el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}}
function toggleTimer(){timerRunning=!timerRunning;const b=document.getElementById('timerToggle');if(b)b.textContent=timerRunning?'Pause':'Start';clearInterval(timerInt);if(timerRunning)timerInt=setInterval(()=>{timerSeconds++;updateClock()},1000)}
function setTimer(sec){clearInterval(timerInt);timerSeconds=sec;timerRunning=true;updateClock();const b=document.getElementById('timerToggle');if(b)b.textContent='Pause';timerInt=setInterval(()=>{timerSeconds--;updateClock();if(timerSeconds<=0){clearInterval(timerInt);timerRunning=false;if(navigator.vibrate)navigator.vibrate([180,100,180]);const b=document.getElementById('timerToggle');if(b)b.textContent='Start'}},1000)}
function resetTimer(){clearInterval(timerInt);timerSeconds=0;timerRunning=false;updateClock();const b=document.getElementById('timerToggle');if(b)b.textContent='Start'}
document.getElementById('todayDate').textContent=formatDate();
document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.getElementById('quickTimer').onclick=()=>{openDay(programDay());setTimer(60)};
document.getElementById('settingsBtn').onclick=()=>{
  document.getElementById('startDateInput').value=settings.startDate;
  document.getElementById('bodyweightInput').value=settings.bodyweight;
  document.getElementById('heightInput').value=settings.height||'';
  document.getElementById('ageInput').value=settings.age||'';
  document.getElementById('sexInput').value=settings.sex||'';
  document.getElementById('stepsInput').value=settings.steps;
  document.getElementById('maintenanceInput').value=settings.maintenanceOverride||'';
  document.getElementById('homeModeInput').value=settings.homeMode||'full';
  const p=settings.portions||defaultPortions;
  document.getElementById('yogurtInput').value=p.yogurt;
  document.getElementById('berriesInput').value=p.berries;
  document.getElementById('nutsInput').value=p.nuts;
  document.getElementById('latteMilkInput').value=p.latteMilk;
  document.getElementById('meatInput').value=p.meat;
  document.getElementById('lunchRiceInput').value=p.lunchRice;
  document.getElementById('dinnerRiceInput').value=p.dinnerRice;
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
    homeMode:document.getElementById('homeModeInput').value||'full',
    portions:{
      yogurt:portionValue('yogurtInput',old.yogurt),
      berries:portionValue('berriesInput',old.berries),
      nuts:portionValue('nutsInput',old.nuts),
      latteMilk:portionValue('latteMilkInput',old.latteMilk),
      meat:portionValue('meatInput',old.meat),
      lunchRice:portionValue('lunchRiceInput',old.lunchRice),
      dinnerRice:portionValue('dinnerRiceInput',old.dinnerRice),
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
