/* MOTION12 Calisthenics mode · BuiltSimple-inspired adaptation.
   Separate namespaced records preserve the existing Standard program and timer data. */
(function(){
'use strict';
const VIDEO='https://youtu.be/lwR5_J1QFRE';
const NS='cal:';
const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TYPES=[
 {name:'Recovery & Mobility',time:'10–20 min',desc:'Recover, walk easily and maintain comfortable mobility.',kind:'recover',work:[]},
 {name:'A · Pull & Foundation',time:'30–40 min',desc:'Pull, push, unilateral legs, trunk and loaded carry.',kind:'strength',work:[
  ['pull','Pull-up / assisted pull-up','4 × 3–6','Full controlled range. Use ring or foot assistance when required.',90],
  ['push','Push-up','3 × 8–15','Strict plank body line; select an incline if necessary.',75],
  ['squat','Split squat','3 × 8–12 / leg','Control the lowering phase; bodyweight first.',75],
  ['core','Plank / hollow hold','3 × 20–40 sec','Breathe and brace without straining.',60],
  ['carry','Suitcase carry','2 × 40 sec / side','Kettlebell at side; keep torso upright.',60]]},
 {name:'Easy Recovery',time:'10–25 min',desc:'Mobility, walking and low-fatigue movement.',kind:'recover',work:[]},
 {name:'B · Push & Dip',time:'30–40 min',desc:'Dip strength, pulling, squats and controlled trunk flexion.',kind:'strength',work:[
  ['dip','Dip / assisted dip','4 × 4–8','Start with assisted or partial-range dips if required; never force shoulders.',90],
  ['pull','Pull-up / ring row','3 × 5–10','Choose a version that stays technically clean.',90],
  ['squat','Bodyweight squat','3 × 12–20','Smooth depth and controlled knee alignment.',75],
  ['push','Push-up','2 × 8–15','Leave two or three repetitions in reserve.',75],
  ['core','Hanging knee raise','3 × 6–12','Avoid swinging; use bent-knee floor variation if needed.',60]]},
 {name:'Aerobic Base',time:'30–40 min',desc:'Easy steady breathing; conversational pace, no hard intervals.',kind:'aerobic',work:[
  ['aerobic','Easy aerobic movement','1 × 30–40 min','Walk, jog or low-impact movement at conversational effort.',0]]},
 {name:'C · Full-Body Capacity',time:'30–40 min',desc:'Legs, pushing, pulling, carry and controlled burpees.',kind:'strength',work:[
  ['squat','Split squat / squat progression','4 × 8–12 / leg','Work toward a harder variation only with clean form.',90],
  ['push','Push-up','3 × 8–15','Stop before reps grind.',75],
  ['pull','Pull-up / assisted pull-up','3 × 3–8','Repeat clean technique from Monday.',90],
  ['carry','Suitcase carry','3 × 45–60 sec / side','Increase duration before increasing load.',60],
  ['burpee','Burpee','1 × 5 min','Use a consistent low-impact variation and controlled pace.',0]]},
 {name:'Aerobic Power',time:'30–40 min',desc:'Four work/recovery rounds with smooth cardiovascular intensity.',kind:'aerobic',work:[
  ['aerobic','4 × 4 aerobic intervals','4 × 4 min hard / 3 min easy','Use running or a controlled kettlebell-and-bodyweight alternate; keep output repeatable.',0]]}
];
const GOALS=[
 ['push','Push-ups','reps',20,'Wall / incline / floor / feet elevated'],
 ['pull','Pull-ups','reps',8,'Assisted / strict / weighted'],
 ['dip','Dips','reps',10,'Assisted / strict / weighted'],
 ['squat','Squats','reps',25,'Supported / bodyweight / split / loaded'],
 ['core','Core hold','seconds',60,'Plank / hollow / hanging raise'],
 ['carry','Suitcase carry','seconds',60,'Light / moderate / heavy'],
 ['burpee','Burpees in 5 min','reps',40,'Step-back / standard']
];
const STANDARD={renderHome:renderHome,renderDays:renderDays,renderProgress:renderProgress,openDay:openDay};
let timerTick=null,activeSession=null;

function clean(v){return String(v===undefined||v===null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function isCal(){return settings.trainingSystem==='calisthenics';}
function writable(){return !window.Motion12Persistence.isReadOnly();}
function persist(){if(!writable())return false;return motion12SetItem('motion12.logs',JSON.stringify(logs));}
function key(date,day){return NS+date+':'+day;}
function exkey(date,day,id){return key(date,day)+':'+id;}
function dateISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function weeklyDate(day){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)+((day+6)%7));return dateISO(d);}
function weekNum(){const start=new Date((settings.calStartDate||todayISO())+'T12:00:00');const now=new Date();return Math.max(1,Math.min(12,Math.floor((now-start)/604800000)+1));}
function phaseNote(){const w=weekNum();return w<=2?'Foundation · lighter volume, practise clean technique':w<=4?'Build · accumulate quality repetitions':w<=8?'Capacity · retest and progress cautiously':w<12?'Mastery · harder variations when ready':'Review · retest seven movement goals';}
function record(date,day){return logs[key(date,day)]||{};}
function goals(){return logs[NS+'goals']||{};}
function goal(id){const g=GOALS.find(x=>x[0]===id);return {...{baseline:0,target:g?g[3]:0,best:0,variation:''},...(goals()[id]||{})};}
function saveGoal(id,field,value){if(!writable())return;const data=goals();const old=goal(id);data[id]={...old,[field]:field==='variation'?String(value):Math.min(9999,Math.max(0,Number(value)||0))};logs[NS+'goals']=data;persist();renderProgress();if(activeSession&&isCal())renderSession(activeSession.day,activeSession.date);}
function prescription(x){const m=String(x[2]).match(/^(\d+)\s*×/);let count=m?Number(m[1]):1;if(weekNum()<=2&&count>2)count=Math.max(2,Math.ceil(count*0.6));return count;}
function sessionExercises(day){return TYPES[day].work;}
function previousSet(id,date,index){const prefix=NS;return Object.keys(logs).filter(k=>k.startsWith(prefix)&&k.endsWith(':'+id)&&k.indexOf(':goals')<0&&k.split(':')[1]<date).sort().reverse().map(k=>(logs[k]&&logs[k].sets||[])[index]).find(x=>x&&x.done)||null;}
function saveSession(date,day,patch){if(!writable())return;const k=key(date,day);logs[k]={...record(date,day),...patch};persist();}
function escapeJs(v){return String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function weekList(){return [1,2,3,4,5,6,0];}
function videoLink(){return '<a class="cal-video" href="'+VIDEO+'" target="_blank" rel="noopener noreferrer"><span class="cal-video-icon">▶</span><span><b>BuiltSimple · Original video</b><small>If I Started Calisthenics Again, This Is What I’d Do</small></span><span aria-hidden="true">↗</span></a>';}
function renderHeader(){
 const sel=document.getElementById('calModeSelect');if(sel)sel.value=isCal()?'calisthenics':'standard';
 const a=document.getElementById('calVideoTop');if(a){a.hidden=!isCal();a.innerHTML=isCal()?videoLink():'';}
}
function setMode(mode){
 if(!['standard','calisthenics'].includes(mode))return;
 if(!writable()){renderHeader();return;}
 if(mode===settings.trainingSystem){renderHeader();return;}
 if(isCal()&&activeSession){const r=record(activeSession.date,activeSession.day),t=r.timer||{};if(t.running)saveSession(activeSession.date,activeSession.day,{timer:{running:false,remaining:timerSeconds(activeSession.date,activeSession.day),endAt:0}});const it=r.interval||{};if(it.running)saveSession(activeSession.date,activeSession.day,{interval:{...it,running:false,remaining:intervalSeconds(it),endAt:0}});}
 if(!isCal()&&typeof pauseSessionTimers==='function'&&((typeof smartTimer!=='undefined'&&smartTimer.running)||(typeof inlineTimer!=='undefined'&&inlineTimer.running)))pauseSessionTimers();
 stopTick();
 settings.trainingSystem=mode;
 if(mode==='calisthenics'&&!settings.calStartDate)settings.calStartDate=getMondayISO(new Date());
 motion12SetItem('motion12.settings',JSON.stringify(settings));
 activeSession=null;
 renderHeader();
 showPage('homePage');
 renderHome();renderDays();renderProgress();
}
function headerHtml(){
 let select=document.getElementById('calModeSelect');
 if(!select){
   const el=document.createElement('div');el.className='cal-global-header';
   el.innerHTML='<label for="calModeSelect">TRAINING SYSTEM</label><select id="calModeSelect" aria-label="Training system"><option value="standard">Standard</option><option value="calisthenics">Calisthenics</option></select><span id="calVideoTop" hidden></span>';
   const hdr=document.querySelector('header.top');if(hdr)hdr.insertAdjacentElement('afterend',el);
   select=document.getElementById('calModeSelect');
 }
 if(!select)throw new Error('Training system selector missing');
 select.disabled=false;
 const status=document.getElementById('calModeStatus');if(status)status.hidden=true;
 select.addEventListener('change',function(e){setMode(e.target.value);});
 renderHeader();
}
function dayLine(day,date,expanded){
 const p=TYPES[day],r=record(date,day),done=!!r.completed;
 return '<div class="card cal-day-item '+(done?'cal-done':'')+'">'+
  '<div class="cal-day-row"><span class="cal-day-index">'+WEEKDAYS[day].slice(0,3).toUpperCase()+'</span><div class="cal-grow"><b>'+clean(p.name)+'</b><small>'+clean(p.desc)+'</small></div><span class="cal-day-status">'+(done?'✓':'')+'</span></div>'+
  (expanded?'<p>'+clean(p.time)+' · '+clean(p.work.map(x=>x[1]).join(' · ')||'Recovery and mobility')+'</p>':'')+
  '<button class="cal-small-button" type="button" onclick="Motion12Cal.open('+day+',\''+date+'\')">'+(done?'Review session':'Open session')+' →</button></div>';
}
function renderCalHome(){
 activeSession=null;stopTick();
 const day=new Date().getDay(),date=todayISO(),r=record(date,day),type=TYPES[day],complete=!!r.completed;
 const mount=document.getElementById('homePage');mount.classList.remove('compact-active');
 mount.innerHTML='<div class="cal-container">'+
  '<div class="page-title"><div class="eyebrow">CALISTHENICS · WEEK '+weekNum()+'</div><h1>Master the basics.</h1><p>'+clean(phaseNote())+'</p></div>'+
  '<section class="hero '+(complete?'completed':'')+'"><div class="eyebrow">TODAY · '+WEEKDAYS[day]+'</div><h1>'+clean(type.name)+'</h1><div class="sub">'+clean(type.desc)+'</div>'+
  '<div class="hero-meta"><span class="pill">'+clean(type.time)+'</span><span class="pill">Seven movement goals</span></div>'+
  '<button class="cta" type="button" onclick="Motion12Cal.open('+day+',\''+date+'\')"><span>'+(complete?'Review completed session':r.paused?'Resume session':'Start today’s session')+'</span><span>→</span></button></section>'+
  '<section class="section"><div class="section-head"><h2>Your week</h2><small>Tap any session</small></div><div class="cards">'+weekList().map(d=>dayLine(d,weeklyDate(d),false)).join('')+'</div></section>'+
  '<section class="section"><div class="card"><h3>Simple, measurable progression</h3><p>Train the same seven movement patterns. Record clean repetitions and advance only when technique and recovery are consistent.</p><button class="cal-small-button" onclick="showPage(\'progressPage\')">View seven goals →</button></div></section>'+
  '<section class="section"><div class="card"><h3>Nutrition remains shared</h3><p>Your existing MOTION12 nutrition, measurements and settings stay available when changing training systems.</p></div></section>'+
 '</div>';
}
function renderCalDays(){
 const mount=document.getElementById('daysPage');
 mount.innerHTML='<div class="cal-container"><div class="page-title"><div class="eyebrow">WEEK '+weekNum()+'</div><h1>Calisthenics schedule</h1><p>'+clean(phaseNote())+'</p></div><div class="section cards">'+weekList().map(d=>dayLine(d,weeklyDate(d),true)).join('')+'</div></div>';
}
function renderCalProgress(){
 const mount=document.getElementById('progressPage');
 const sessions=Object.keys(logs).filter(x=>/^cal:\d{4}-\d{2}-\d{2}:\d$/.test(x)&&logs[x]?.completed).length;
 const cells=GOALS.map(g=>{
   const v=goal(g[0]);return '<div class="card cal-goal"><h3>'+clean(g[1])+'</h3><p>'+clean(g[4])+'</p><div class="cal-goal-grid">'+
      '<label>Baseline ('+clean(g[2])+')<input type="number" min="0" max="9999" inputmode="numeric" value="'+v.baseline+'" onchange="Motion12Cal.goal(\''+g[0]+'\',\'baseline\',this.value)"></label>'+
      '<label>Personal target<input type="number" min="0" max="9999" inputmode="numeric" value="'+v.target+'" onchange="Motion12Cal.goal(\''+g[0]+'\',\'target\',this.value)"></label>'+
      '<label>Personal best<input type="number" min="0" max="9999" inputmode="numeric" value="'+v.best+'" onchange="Motion12Cal.goal(\''+g[0]+'\',\'best\',this.value)"></label></div>'+
      '<label>Variation<input type="text" value="'+clean(v.variation)+'" placeholder="e.g. assisted or strict" onchange="Motion12Cal.goal(\''+g[0]+'\',\'variation\',this.value)"></label></div>';
 }).join('');
 mount.innerHTML='<div class="cal-container"><div class="page-title"><div class="eyebrow">CALISTHENICS · WEEK '+weekNum()+'</div><h1>Seven performance goals</h1><p>Record the variation consistently. Test again approximately every four weeks, with a final review in week 12.</p></div><div class="card accent"><h3>'+sessions+' completed calisthenics sessions</h3><p>Standard MOTION12 session history is retained independently.</p></div><div class="section cards">'+cells+'</div></div>';
}
function setState(k,patch){if(!writable())return;logs[k]={...(logs[k]||{}),...patch};persist();}
function saveSet(date,day,id,index,field,value){
 if(!writable())return;
 const k=exkey(date,day,id),data=logs[k]||{},sets=(data.sets||[]).slice(),item={...(sets[index]||{})};
 item[field]=field==='reps'||field==='rir'?Math.max(0,Number(value)||0):String(value);
 sets[index]=item;setState(k,{sets});
}
function stepSet(date,day,id,index){
 if(!writable())return;
 const k=exkey(date,day,id),data=logs[k]||{},sets=(data.sets||[]).slice();
 const curr={...(sets[index]||{})},nextDone=!curr.done;
 if(nextDone&&!curr.reps){const def=previousSet(id,date,index);curr.reps=def?.reps||0;}
 curr.done=nextDone;sets[index]=curr;setState(k,{sets});
 const exs=sessionExercises(day),all=exs.find(x=>x[0]===id);
 const required=all?prescription(all):sets.length;
 if(nextDone){
  const session=record(date,day),ix=exs.findIndex(x=>x[0]===id);
  if(Array.from({length:required},(_,i)=>!!sets[i]?.done).every(Boolean)){
    saveSession(date,day,{activeIndex:Math.min(exs.length-1,ix+1)});
    if(day!==6)resetRest(date,day);
  }else{
    saveSession(date,day,{activeIndex:ix});
    const rest=all?all[4]:0;if(rest>0)startRest(date,day,rest);
  }
 }else{
  const ix=exs.findIndex(x=>x[0]===id);saveSession(date,day,{activeIndex:ix});if(day!==6)resetRest(date,day);
 }
 renderSession(day,date);
}
function startRest(date,day,seconds){
 if(!writable())return;
 const old=record(date,day);
 saveSession(date,day,{timer:{running:true,remaining:seconds,endAt:Date.now()+seconds*1000}});
 startTick(date,day);
}
function resetRest(date,day){if(!writable())return;saveSession(date,day,{timer:{running:false,remaining:0,endAt:0}});stopTick();}
function pauseRest(date,day){
 const t=record(date,day).timer||{};
 if(!writable())return;
 if(t.running){saveSession(date,day,{timer:{running:false,remaining:Math.max(0,Math.ceil((t.endAt-Date.now())/1000)),endAt:0}});}
 else if(t.remaining>0)saveSession(date,day,{timer:{running:true,remaining:t.remaining,endAt:Date.now()+t.remaining*1000}});
 renderSession(day,date);
}
function timerSeconds(date,day){const t=record(date,day).timer||{};return t.running?Math.max(0,Math.ceil((t.endAt-Date.now())/1000)):Math.max(0,t.remaining||0);}
function clock(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
function stopTick(){if(timerTick){clearInterval(timerTick);timerTick=null;}}
function intervalSegments(){return [240,180,240,180,240,180,240];}
function intervalSeconds(t){return t.running?Math.max(0,Math.ceil((Number(t.endAt)-Date.now())/1000)):Math.max(0,Number(t.remaining)||0);}
function updateInterval(date,day){
 const r=record(date,day),t=r.interval||{};if(!t.running)return;
 const segments=intervalSegments();let index=Math.min(segments.length-1,Math.max(0,Number(t.index)||0));let end=Number(t.endAt)||Date.now();
 while(index<segments.length-1&&Date.now()>=end){index++;end+=segments[index]*1000;}
 if(Date.now()>=end&&index===segments.length-1){
  saveSession(date,day,{interval:{index:segments.length,running:false,remaining:0,endAt:0}});stopTick();return;
 }
 if(index!==t.index||end!==t.endAt)saveSession(date,day,{interval:{index,running:true,remaining:segments[index],endAt:end}});
}
function toggleInterval(date,day){
 if(!writable())return;
 const t=record(date,day).interval||{index:0,remaining:240,running:false,endAt:0};
 if(Number(t.index)>=7){saveSession(date,day,{interval:{index:0,remaining:240,running:true,endAt:Date.now()+240000}});}
 else if(t.running){saveSession(date,day,{interval:{...t,running:false,remaining:intervalSeconds(t),endAt:0}});}
 else{const seconds=Number(t.remaining)||intervalSegments()[Number(t.index)||0];saveSession(date,day,{interval:{...t,running:true,remaining:seconds,endAt:Date.now()+seconds*1000}});}
 renderSession(day,date);
}
function resetInterval(date,day){if(!writable())return;saveSession(date,day,{interval:{index:0,running:false,remaining:240,endAt:0}});stopTick();renderSession(day,date);}
function intervalMarkup(date,day){
 const r=record(date,day),t=r.interval||{index:0,remaining:240,running:false},index=Number(t.index)||0,finished=index>=7;
 const phase=finished?'FINISHED':index%2===0?'WORK · ROUND '+(Math.floor(index/2)+1)+'/4':'RECOVER · ROUND '+(Math.floor(index/2)+1)+'/3';
 const sec=finished?0:intervalSeconds(t);
 return '<div class="card cal-session-timer"><span class="tag">AEROBIC POWER · 4 × 4 MIN / 3 MIN RECOVERY</span><h2 id="calPowerClock">'+clock(sec)+'</h2><p id="calPowerStatus">'+phase+'</p><div class="cal-actions"><button onclick="Motion12Cal.interval(\''+date+'\','+day+')">'+(finished?'Start again':t.running?'Pause':'Start / resume')+'</button><button onclick="Motion12Cal.resetInterval(\''+date+'\','+day+')">Reset intervals</button></div></div>';
}
function tick(date,day){
 if(!isCal()||!activeSession||activeSession.date!==date||activeSession.day!==day){stopTick();return;}
 if(day===6){updateInterval(date,day);const state=record(date,day).interval||{},i=Number(state.index)||0;const el=document.getElementById('calPowerClock'),status=document.getElementById('calPowerStatus');if(el)el.textContent=clock(i>=7?0:intervalSeconds(state));if(status)status.textContent=i>=7?'FINISHED · COOL DOWN':i%2===0?'WORK · ROUND '+(Math.floor(i/2)+1)+'/4':'RECOVER · ROUND '+(Math.floor(i/2)+1)+'/3';return;}
 const sec=timerSeconds(date,day),el=document.getElementById('calRestClock');
 if(el)el.textContent=clock(sec);
 const t=record(date,day).timer||{};
 if(t.running&&sec===0){resetRest(date,day);const status=document.getElementById('calRestStatus');if(status)status.textContent='Rest finished · next set ready';}
}
function startTick(date,day){stopTick();timerTick=setInterval(function(){tick(date,day);},350);}
function setPaused(date,day){
 const r=record(date,day);if(!writable())return;
 if(!r.paused){
  const t=r.timer||{};if(t.running)saveSession(date,day,{timer:{running:false,remaining:timerSeconds(date,day),endAt:0}});
  const it=r.interval||{};if(it.running)saveSession(date,day,{interval:{...it,running:false,remaining:intervalSeconds(it),endAt:0}});
  saveSession(date,day,{paused:true,pausedAt:new Date().toISOString()});
  stopTick();
 }else saveSession(date,day,{paused:false,resumedAt:new Date().toISOString()});
 renderSession(day,date);
}
function complete(date,day){
 if(!writable())return;
 const done=!!record(date,day).completed;
 saveSession(date,day,{completed:!done,completedAt:!done?new Date().toISOString():null,paused:false});
 if(day===6){saveSession(date,day,{interval:{index:0,running:false,remaining:240,endAt:0}});stopTick();}else resetRest(date,day);renderSession(day,date);renderDays();renderProgress();
}
function selector(ex,date,day,i){
 const id=ex[0],n=prescription(ex),d=logs[exkey(date,day,id)]||{},sets=d.sets||[];
 const g=goal(id),prior=previousSet(id,date,0);
 return '<div class="card cal-exercise '+(Number(record(date,day).activeIndex||0)===i?'cal-current':'')+'" id="calExercise'+i+'"><div class="cal-exercise-top"><span class="cal-day-index">'+String(i+1).padStart(2,'0')+'</span><div class="cal-grow"><h3>'+clean(ex[1])+'</h3><p>'+clean(ex[2])+' · '+clean(ex[3])+'</p></div></div>'+
  (weekNum()<=2&&n<Number(String(ex[2]).match(/^\d+/)?.[0]||n)?'<p class="cal-progress-hint">Foundation phase: '+n+' working sets; build towards '+clean(ex[2])+'.</p>':'')+
  (g.baseline>0?'<p class="cal-progress-hint">Baseline '+g.baseline+' · personal target '+g.target+' · '+clean(g.variation||'Choose suitable variation')+'</p>':'<p class="cal-progress-hint">Set a baseline in Progress to personalise targets.</p>')+
  (prior?'<p class="cal-last">Previous matching set: '+clean(prior.reps||'—')+' reps'+(prior.load?' · '+clean(prior.load)+' kg':'')+'</p>':'')+
  '<div class="cal-sets">'+Array.from({length:n},(_,j)=>{
    const v=sets[j]||{},done=!!v.done;
    return '<div class="cal-set '+(done?'cal-set-done':'')+'"><span>Set '+(j+1)+'</span>'+
    '<label>Reps / sec<input inputmode="numeric" type="number" min="0" value="'+clean(v.reps??'')+'" placeholder="'+clean(prior?.reps||'—')+'" onchange="Motion12Cal.saveSet(\''+date+'\','+day+',\''+id+'\','+j+',\'reps\',this.value)"></label>'+
    '<label>Load kg<input inputmode="decimal" type="text" value="'+clean(v.load||'')+'" placeholder="'+clean(prior?.load||'—')+'" onchange="Motion12Cal.saveSet(\''+date+'\','+day+',\''+id+'\','+j+',\'load\',this.value)"></label>'+
    '<label>RIR<input inputmode="numeric" type="number" min="0" max="10" value="'+clean(v.rir??'')+'" placeholder="2–3" onchange="Motion12Cal.saveSet(\''+date+'\','+day+',\''+id+'\','+j+',\'rir\',this.value)"></label>'+
    '<button type="button" class="cal-tick" aria-label="'+(done?'Unmark':'Mark')+' set '+(j+1)+'" onclick="Motion12Cal.finishSet(\''+date+'\','+day+',\''+id+'\','+j+')">'+(done?'✓':'○')+'</button></div>';
   }).join('')+'</div>'+
   '<label class="cal-notes">Notes<textarea rows="2" placeholder="Variation, quality, next-time guidance" onchange="Motion12Cal.note(\''+date+'\','+day+',\''+id+'\',this.value)">'+clean(d.note||'')+'</textarea></label></div>';
}
function saveNote(date,day,id,value){setState(exkey(date,day,id),{note:String(value)});}
function sessionControls(date,day){
 if(day===6)return intervalMarkup(date,day)+endButtons(date,day);
 const s=timerSeconds(date,day),t=record(date,day).timer||{},r=record(date,day),resting=!!t.running||s>0;
 return '<div class="card cal-session-timer"><span class="tag">SESSION REST TIMER</span><h2 id="calRestClock">'+clock(s)+'</h2><p id="calRestStatus">'+(resting?(t.running?'Rest counting down':'Rest paused'):'Ready for the next set')+'</p><div class="cal-actions"><button onclick="Motion12Cal.rest(\''+date+'\','+day+',90)">Start 90s rest</button><button onclick="Motion12Cal.pauseRest(\''+date+'\','+day+')">'+(t.running?'Pause rest':'Resume rest')+'</button><button onclick="Motion12Cal.resetRest(\''+date+'\','+day+')">Reset rest</button></div></div>'+
 endButtons(date,day);
}
function endButtons(date,day){const r=record(date,day);return '<div class="cal-end-actions"><button type="button" onclick="Motion12Cal.pause(\''+date+'\','+day+')">'+(r.paused?'Reopen session':'Pause session')+'</button>'+
 '<button class="cal-finish" type="button" onclick="Motion12Cal.complete(\''+date+'\','+day+')">'+(r.completed?'✓ Session complete · undo':'Complete session')+'</button></div>';}
function renderSession(day,date){
 const mount=document.getElementById('dayPage'),p=TYPES[day],r=record(date,day);
 const mobilityHTML='<div class="card cal-mobility"><h3>Daily mobility first</h3><p>'+clean(mobility.map(m=>m[0]+' '+m[1]).join(' · '))+'</p></div>';
 const summary=p.kind==='recover'?'<div class="card"><h3>Recovery guidance</h3><p>Move easily for 10–25 minutes. Avoid grinding or chasing fatigue, particularly if sore after strength work.</p></div>':'';
 const support=p.kind==='strength'?'<details class="card cal-support"><summary>Optional tendon and posterior-chain support</summary><p>After the primary work: comfortable split-squat and calf isometrics, back extensions, or a light Jefferson curl. Keep quality high and avoid adding all accessories every time.</p></details>':'';
 const all=p.work.map((x,i)=>selector(x,date,day,i)).join('');
 activeSession={day,date};stopTick();
 mount.innerHTML='<div class="cal-container"><button type="button" class="back" onclick="showPage(\'homePage\')">← Home</button>'+
  '<div class="page-title"><div class="eyebrow">CALISTHENICS · '+WEEKDAYS[day]+' · WEEK '+weekNum()+'</div><h1>'+clean(p.name)+'</h1><p>'+clean(p.desc)+'</p><div class="hero-meta"><span class="pill">'+clean(p.time)+'</span>'+(r.paused?'<span class="pill">Session paused</span>':'')+'</div></div>'+
  '<section class="section"><div class="section-head"><h2>Movement preparation</h2><small>5–8 minutes</small></div>'+mobilityHTML+'</section>'+
  '<section class="section"><div class="section-head"><h2>'+((p.kind==='strength')?'Strength & capacity':'Session')+'</h2><small>Log each set</small></div><div class="cards">'+(all||summary)+'</div></section>'+support+sessionControls(date,day)+'</div>';
 if(r.timer?.running||r.interval?.running)startTick(date,day);
}
function openCal(day,date){
 const d=Math.max(0,Math.min(6,Number(day)||0)),dayDate=/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date:weeklyDate(d);
 showPage('dayPage');renderSession(d,dayDate);
 window.scrollTo({top:0,behavior:'smooth'});
}
function applyModeRendering(){
 renderHome=function(){renderHeader();return isCal()?renderCalHome():STANDARD.renderHome();};
 renderDays=function(){renderHeader();return isCal()?renderCalDays():STANDARD.renderDays();};
 renderProgress=function(){renderHeader();return isCal()?renderCalProgress():STANDARD.renderProgress();};
 openDay=function(day,date){return isCal()?openCal(day,date):STANDARD.openDay(day,date);};
}
function addStyles(){
 const style=document.createElement('style');style.id='calisthenics-styles';
 style.textContent=[
 '.cal-global-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 18px 10px;background:var(--bg,#111);border-bottom:1px solid rgba(140,150,165,.14)}',
 '.cal-global-header>label{font-size:10px;letter-spacing:.08em;color:var(--muted,#a1a1aa);font-weight:850}',
 '.cal-global-header select{border:1px solid rgba(150,150,150,.3);border-radius:10px;background:var(--surface,#232323);color:var(--ink,#fff);padding:8px 12px;min-height:42px;font-size:13px;font-weight:800}',
 '#calVideoTop:not([hidden]){display:block;flex:1 1 100%}',
 '.cal-video{display:flex;align-items:center;gap:12px;min-height:53px;padding:10px 13px;border:1px solid rgba(255,90,70,.28);border-radius:12px;background:rgba(255,75,55,.065);color:var(--ink,#fff);text-decoration:none}',
 '.cal-video-icon{color:#ff5a48;font-size:16px}.cal-video span:nth-child(2){display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}',
 '.cal-video b{font-size:12px}.cal-video small{font-size:11px;color:var(--muted,#999);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '.cal-container{max-width:980px;margin:0 auto;padding:12px 2px 35px}',
 '.cal-day-item{display:flex;flex-direction:column;gap:10px}',
 '.cal-day-row{display:flex;align-items:center;gap:12px}.cal-day-index{min-width:42px;padding:9px 5px;text-align:center;border-radius:8px;background:rgba(150,150,150,.12);font-size:11px;font-weight:850}',
 '.cal-grow{flex:1;min-width:0}.cal-grow>b,.cal-grow>h3{display:block;font-size:15px;margin:0 0 4px}.cal-grow small,.cal-grow p{display:block;color:var(--muted,#999);font-size:12px;line-height:1.45;margin:0}',
 '.cal-day-status{font-weight:bold;color:var(--volt,#ff5a48)}.cal-small-button{align-self:flex-start;border:1px solid rgba(150,150,150,.3);background:transparent;color:var(--ink,#fff);border-radius:9px;padding:10px 13px;font-size:12px;font-weight:750;cursor:pointer}',
 '.cal-goal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:13px 0}',
 '.cal-goal label,.cal-set label,.cal-notes{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:750;color:var(--muted,#aaa)}',
 '.cal-goal input,.cal-set input,.cal-notes textarea{width:100%;min-width:0;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid rgba(150,150,150,.3);background:var(--surface,#202020);color:var(--ink,#fff);font-size:14px}',
 '.cal-exercise{margin-bottom:12px}.cal-current{border-color:rgba(var(--accent-rgb,255,77,46),.55)!important}.cal-exercise-top{display:flex;gap:10px;align-items:flex-start}.cal-exercise-top h3{margin:0 0 6px}',
 '.cal-progress-hint,.cal-last{font-size:12px;color:var(--muted,#aaa);line-height:1.5;margin:12px 0 5px}',
 '.cal-sets{display:flex;flex-direction:column;gap:7px;margin:12px 0}.cal-set{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(0,.9fr) minmax(0,.65fr) 36px;gap:7px;align-items:end;padding:8px;border:1px solid rgba(150,150,150,.15);border-radius:10px}',
 '.cal-set>span{align-self:center;font-size:11px;font-weight:850}.cal-set-done{border-color:rgba(25,180,145,.45);background:rgba(25,180,145,.07)}',
 '.cal-set input{padding:9px 6px}.cal-tick{min-height:35px;border:1px solid rgba(150,150,150,.4);border-radius:8px;background:transparent;color:var(--ink,#fff);cursor:pointer;font-size:19px}.cal-set-done .cal-tick{color:#25bd96}',
 '.cal-notes{margin-top:12px}.cal-session-timer{margin-top:16px}.cal-session-timer h2{font-size:38px;font-variant-numeric:tabular-nums;margin:8px 0}',
 '.cal-session-timer p{color:var(--muted,#aaa)}.cal-actions,.cal-end-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
 '.cal-actions button,.cal-end-actions button{padding:12px 14px;border-radius:10px;border:1px solid rgba(150,150,150,.3);background:transparent;color:var(--ink,#fff);font-weight:800;cursor:pointer}',
 '.cal-end-actions .cal-finish{background:var(--volt,#ff4d2e);color:#0b0b0d;border:0}.cal-support{margin:10px 0}.cal-support summary{cursor:pointer;font-weight:800}',
 '@media(max-width:540px){.cal-global-header{padding:8px 12px}.cal-set{grid-template-columns:32px minmax(0,1fr) minmax(0,.9fr) minmax(0,.65fr) 34px;gap:4px;padding:6px}.cal-set input{font-size:13px;padding:8px 4px}.cal-set label{font-size:10px}.cal-goal-grid{gap:6px}.cal-container{padding-top:5px}}'
 ].join('\n');document.head.appendChild(style);
}
window.Motion12Cal={
 switch:setMode,open:openCal,goal:saveGoal,saveSet:saveSet,finishSet:stepSet,note:saveNote,
 rest:startRest,pauseRest:pauseRest,resetRest:resetRest,interval:toggleInterval,resetInterval:resetInterval,pause:setPaused,complete:complete
};
addStyles();headerHtml();applyModeRendering();
if(isCal()){renderHome();renderDays();renderProgress();}
})();