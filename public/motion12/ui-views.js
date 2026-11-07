/* MOTION12 — side-effect-free Days and Progress markup.
   Reads explicit view data; only ui.js handles navigation and DOM updates. */
(function () {
  'use strict';

  function dayOverviewGroup(title,items,day,w,startIndex,{aerobicTargets,supportTarget}) {
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

  function dayOverviewMarkup(day,w,p,params) {
    const group=(title,items,startIndex=1)=>dayOverviewGroup(title,items,day,w,startIndex,params);
    const prep=group('Movement prep',p.prep);
    const tendonAfter=Number.isInteger(p.tendonAfter)?p.tendonAfter:p.work.length;
    const primary=p.tendon?.length?group('Primary strength',p.work.slice(0,tendonAfter)):group('Workout',p.work);
    const tendon=p.tendon?.length?group('Tendon capacity · '+(p.tendonFocus||'high force'),p.tendon):'';
    const finishers=p.tendon?.length?group('Finishers / accessories',p.work.slice(tendonAfter),tendonAfter+1):'';
    const support=group('Support',p.support);
    const aerobicAlternate=day===6?'<div class="day-overview-note"><b>Alternate B:</b> kettlebell + bodyweight · 4:00 work / 3:00 recovery × 4 rounds.</div>':'';
    return '<div class="day-overview">'+prep+primary+tendon+finishers+support+aerobicAlternate+
      '<div class="day-overview-note">Daily mobility reset is available inside the session.</div>'+
      '<button class="day-session-btn '+p.tone+'" type="button" onclick="event.stopPropagation();openDay('+day+')"><span>Go to session</span><span>→</span></button>'+
    '</div>';
  }

  function daysPage({todayDay,week,program,days,expandedDay,aerobicTargets,weeklyTarget,supportTarget}) {
    const params={aerobicTargets,supportTarget};
    // Short, presentation-only summaries: the prescribed workouts stay in program.js.
    const focus={1:'Squat · pull · press',2:'Recovery · easy movement',3:'Unilateral · posterior chain',4:'Kettlebell · power',5:'Full body · lateral strength',6:'4 × 4 min intervals',0:'Easy aerobic · mobility'};
    const effort={1:'Hard',2:'Easy',3:'Hard',4:'Hard',5:'Moderate',6:'Hard',0:'Easy'};
    let html=`<div class="week-page-heading"><div><div class="eyebrow">Week ${week} · 12-week plan</div><h1>Your week</h1></div><span class="week-page-hint">Tap a day for exercises</span></div>
      <div class="week-table day-list" aria-label="Weekly training schedule">
        <div class="week-table-head" aria-hidden="true"><span>Day</span><span>Emphasis</span><span>Intensity</span></div>`;
    [1,2,3,4,5,6,0].forEach(day=>{
      const p=program[day],expanded=expandedDay===day,level=effort[day];
      html+=`<div id="day-card-${day}" class="week-row ${day===todayDay?'week-today':''} ${expanded?'week-expanded':''}">
        <button type="button" class="week-row-trigger" aria-expanded="${expanded}" aria-controls="day-details-${day}" aria-label="${days[day]}, ${p.name}, ${level}. ${expanded?'Hide':'Preview'} exercises" onclick="toggleDayCard(${day})">
          <span class="week-day">${days[day]}${day===todayDay?'<span class="week-today-dot" aria-label="Today"></span>':''}</span>
          <span class="week-emphasis"><b>${p.name}</b><small>${focus[day]}</small></span>
          <span class="week-level-wrap"><span class="week-level level-${level.toLowerCase()}">${level}</span><span class="week-expand-icon" aria-hidden="true">⌄</span></span>
        </button>
        <div class="week-row-detail" id="day-details-${day}" ${expanded?'':'hidden'}>
          ${expanded?`<p class="week-detail-meta">${p.time} · ${day===6?weeklyTarget(day,week)+' · A / B available':weeklyTarget(day,week)}</p>${dayOverviewMarkup(day,week,p,params)}`:''}
        </div>
      </div>`;
    });
    return html+'</div>';
  }

  function progressPage({protein,fatLoss,calories,progressStats,last7,measurements}) {
    const fields=[['weight','Bodyweight','kg'],['waist','Waist','cm'],['bp','Blood pressure','mmHg'],['rhr','Resting heart rate','bpm'],['walk','2 km walk','min'],['pushups','Strict push-ups','reps']];
    const p=protein,fat=fatLoss,cal=calories,ps=progressStats;
    const cards=fields.map(([id,n,u])=>`<div class="card measure"><span class="tag">${u}</span><h3>${n}</h3><input id="measure-${id}" value="${measurements[id]||''}" placeholder="Enter current"></div>`).join('');
    return `<div class="page-title"><div class="eyebrow">12-week dashboard</div><h1>Progress</h1><p>Completed sessions, adherence and physical measures in one place.</p></div><section class="section"><div class="card adherence-card"><span class="tag">Program adherence</span><div class="adherence-grid"><div><b>${last7}</b><span>sessions · last 7 days</span></div><div><b>${ps.weekCompleted}</b><span>sessions · this program week</span></div><div><b>${ps.completed}/${ps.elapsed||0}</b><span>sessions complete / elapsed</span></div><div><b>${ps.adherence}%</b><span>completion to date</span></div></div><div class="adherence-track"><i style="width:${Math.min(100,Math.round(ps.completed/ps.programDays*100))}%"></i></div><small>${ps.completed} of 84 program days explicitly marked Session complete.</small></div></section><section class="section"><div class="card accent"><span class="tag">Nutrition targets</span><div class="target-grid"><div class="target-chip"><b>${p?`${p} g`:'Set weight'}</b><span>protein / eating day</span></div><div class="target-chip"><b>${cal?`${cal.eatingDay} kcal`:'Set details'}</b><span>eating-day target</span></div><div class="target-chip"><b>${cal?`${cal.predictedLoss} kg`:'—'}</b><span>planned loss / week</span></div><div class="target-chip"><b>${cal?`${cal.maintenance} kcal`:'—'}</b><span>estimated maintenance</span></div></div>${cal?`<div class="nutrition-strip">Target range ${fat.low}–${fat.high} kg/week · planned deficit ${cal.actualWeeklyDeficit} kcal/week · weekly intake ${cal.weeklyIntake} kcal. This math assumes Monday is truly 0 kcal.</div>`:''}</div><div class="measure-grid" style="margin-top:10px">${cards}</div><div class="savebar"><button class="complete-session" onclick="saveMeasurements()">Save measures</button></div></section><section class="section"><div class="card accent"><h3>Calorie adjustment rule</h3><p>${fat&&cal?`Use morning weights and compare 7-day averages across two full weeks. Only adjust if adherence was good. If loss is below ~${fat.low} kg/week for both weeks, remove ~100–150 kcal from eating days. If loss is above ~${fat.cap} kg/week, or strength/sleep/energy fall, add ~100–150 kcal. Keep protein steady; adjust rice and fats first.`:'Enter bodyweight to calculate the adjustment range.'}</p></div><div class="card" style="margin-top:10px"><h3>What success looks like</h3><p>Waist ↓ · strength maintained or ↑ · 2 km time ↓ · cardiovascular tolerance ↑ · blood pressure healthy · resting heart rate stable or ↓.</p></div></section>`;
  }

  window.Motion12UiViews=Object.freeze({dayOverviewGroup,dayOverviewMarkup,daysPage,progressPage});
})();
