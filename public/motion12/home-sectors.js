/* MOTION12 — four-sector Home. Presentation-only; all data stays in existing stores. */
(function () {
  const CAL_SESSIONS = [
    { name: 'Recovery & Mobility', time: '10–20 min', why: 'Recover and move easily.' },
    { name: 'A · Pull & Foundation', time: '30–40 min', why: 'Pull, push, legs and trunk.' },
    { name: 'Easy Recovery', time: '10–25 min', why: 'Low-fatigue movement.' },
    { name: 'B · Push & Dip', time: '30–40 min', why: 'Dips, pulling and squats.' },
    { name: 'Aerobic Base', time: '30–40 min', why: 'Conversational aerobic work.' },
    { name: 'C · Full-Body Capacity', time: '30–40 min', why: 'Full-body strength and carry.' },
    { name: 'Aerobic Power', time: '30–40 min', why: 'Four controlled hard intervals.' }
  ];
  const originalToggleMeal = window.toggleMeal;
  window.toggleMeal = function (date, id) {
    originalToggleMeal(date, id);
    // The older full Home only refreshed intake strips. Keep the new sector
    // summary and macros in sync with the meal checkboxes.
    if (settings.homeMode !== 'compact' && document.getElementById('homePage')?.classList.contains('active')) {
      window.renderHome();
    }
  };

  window.renderHome = function renderSectorHome() {
    updateHomeModeToggle();
    const day = programDay();
    const calMode = settings.trainingSystem === 'calisthenics';
    const calStart = new Date((settings.calStartDate || todayISO()) + 'T12:00:00');
    const week = calMode ? Math.max(1, Math.min(12, Math.floor((new Date() - calStart) / 604800000) + 1)) : weekNo();
    const date = todayISO();
    const session = calMode ? CAL_SESSIONS[day] : program[day];
    const calories = calorieTargets();
    const fatLoss = fatLossTargets();
    const plan = mealPlan(day, date);
    const intake = intakeTotals(day, date);
    const fastDay = day === 1;
    if (!calMode) reconcileStrengthSessionCompletion(date, day);
    const calLog = logs['cal:' + date + ':' + day] || {};
    const complete = calMode ? !!calLog.completed : completedOn(date, day);
    const paused = calMode ? !!calLog.paused : sessionPaused(date + '-' + day);
    const progress = calMode ? {
      completed: Object.keys(logs).filter(k => /^cal:\d{4}-\d{2}-\d{2}:\d$/.test(k) && logs[k]?.completed).length,
      programDays: 84
    } : programProgressStats();
    const last7 = calMode ? Array.from({length:7}, (_,i) => {
      const dt = new Date(date + 'T12:00:00'); dt.setDate(dt.getDate()-i);
      return !!logs['cal:' + iso(dt) + ':' + dt.getDay()]?.completed;
    }).filter(Boolean).length : sessionsLastSevenDays();
    const main = document.getElementById('homePage');
    if (!main) return;

    const detailsOpen = {
      food: !!main.querySelector('#motionFoodDetails[open]'),
      training: !!main.querySelector('#motionTrainingDetails[open]')
    };
    const kcalLeft = fastDay ? 'FAST' : intake ? intake.remaining.kcal.toLocaleString() : '—';
    const kcalUnit = fastDay ? '0 kcal planned' : intake ? 'kcal left today' : 'Set weight in Settings';
    const consumed = intake?.consumed.kcal || 0;
    const target = intake?.total.kcal || 0;
    const caloriesProgress = target ? Math.min(100, Math.round(consumed / target * 100)) : 0;
    const macros = fastDay ? { protein: 0, carbs: 0, fat: 0 } : (intake?.remaining || null);
    const mealCount = compactMealCount(day, date);
    const completedRatio = Math.min(100, Math.round(progress.completed / Math.max(1, progress.programDays) * 100));
    const loss = calories ? '~' + Number(calories.predictedLoss).toFixed(2) + ' kg' : '—';
    const lossDetail = fatLoss ? 'target ' + fatLoss.low + '–' + fatLoss.high + ' kg/wk' : 'Set weight for a target';
    const recoveryCue = {
      0: 'Keep this circuit easy; arrive fresh for Monday.',
      1: 'Prioritise fluids and an easy evening after training.',
      2: 'Restore at RPE 4–5; avoid adding fatigue.',
      3: 'Let the shoulders and posterior chain recover.',
      4: 'Keep every power rep crisp; quality before volume.',
      5: 'Allow the tendons to settle after strength work.',
      6: 'Use the full recovery between aerobic intervals.'
    }[day];
    const sessionAction = !calMode && paused ? `reopenSession('${date}-${day}')` : `openDay(${day},'${date}')`;
    const sessionLabel = complete ? 'REVIEW' : paused ? 'RESUME' : 'START';
    const weekStart = new Date((calMode ? settings.calStartDate : settings.startDate) + 'T00:00:00');
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    let weekStrip = '';
    for (let i = 0; i < 7; i++) {
      const dt = new Date(weekStart);
      dt.setDate(weekStart.getDate() + i);
      const ds = iso(dt);
      const dd = dt.getDay();
      const done = calMode ? !!logs['cal:' + ds + ':' + dd]?.completed : completedOn(ds, dd);
      weekStrip += `<button class="daydot ${ds === date ? 'today' : ''} ${done ? 'done' : ''}" type="button" aria-label="Open ${DAYS[dd]} training" onclick="openDay(${dd},'${ds}')"><b>${short[dd]}</b><span></span></button>`;
    }
    const trainingDetail = calMode
      ? '<a class="motion-cal-video-link" target="_blank" rel="noopener noreferrer" href="https://youtu.be/lwR5_J1QFRE">BuiltSimple training video ↗</a>'
      : practiceHomeMarkup(true);
    const sunday = new Date(date + 'T12:00:00');
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const recoveryAction = calMode ? `openDay(0,'${iso(sunday)}')` : 'openMobilityToday()';

    main.classList.add('compact-active', 'sector-active');
    main.innerHTML = `
      <div class="motion-sector-stack" aria-label="Today's four priorities">
        <section class="motion-sector motion-goals" aria-labelledby="motionGoalsTitle">
          <div class="motion-sector-title"><span class="motion-sector-number">01</span><h2 id="motionGoalsTitle">Goals</h2><span class="motion-sector-side">WEEK ${week} / 12</span></div>
          <div class="motion-goal-row">
            <div class="motion-key-figure"><strong>${loss}</strong><small>planned loss / week</small></div>
            <div class="motion-key-figure"><strong>${last7}<em> sessions</em></strong><small>in the last 7 days</small></div>
          </div>
          <div class="motion-progress-line" aria-label="${completedRatio}% of program sessions complete"><span style="width:${completedRatio}%"></span></div>
          <div class="motion-sector-foot"><span>${progress.completed} / ${progress.programDays} sessions complete · ${lossDetail}</span><button type="button" onclick="showPage('progressPage')">DETAILS ↗</button></div>
        </section>

        <section class="motion-sector motion-nutrition" aria-labelledby="motionNutritionTitle">
          <div class="motion-sector-title"><span class="motion-sector-number">02</span><h2 id="motionNutritionTitle">Calories &amp; macros</h2><span class="motion-sector-side">${fastDay ? 'FAST DAY' : 'TODAY'}</span></div>
          <div class="motion-calorie-row"><div class="motion-calorie-total"><strong>${kcalLeft}</strong><span>${kcalUnit}</span></div>
            <div class="motion-macro-grid" aria-label="Remaining macros">
              <div><b>${macros ? macros.protein : '—'}<small>${macros ? 'g' : ''}</small></b><span>PROTEIN</span></div>
              <div><b>${macros ? macros.carbs : '—'}<small>${macros ? 'g' : ''}</small></b><span>CARBS</span></div>
              <div><b>${macros ? macros.fat : '—'}<small>${macros ? 'g' : ''}</small></b><span>FAT</span></div>
            </div>
          </div>
          ${!fastDay && intake ? `<div class="motion-calorie-track" aria-label="${consumed} of ${target} calories logged"><span style="width:${caloriesProgress}%"></span></div>` : ''}
          <details id="motionFoodDetails" class="motion-sector-details"><summary>${fastDay ? 'MONDAY WATER FAST · NO MEALS TO LOG' : plan ? 'LOG MEALS · ' + mealCount : 'SET BODYWEIGHT TO PLAN MEALS'}<span>⌄</span></summary><div class="motion-sector-expand">${compactMealChips(day, date)}</div></details>
        </section>

        <section class="motion-sector motion-training" aria-labelledby="motionTrainingTitle">
          <div class="motion-sector-title"><span class="motion-sector-number">03</span><h2 id="motionTrainingTitle">Training</h2>${window.Motion12Cal ? `<select class="motion-system-select" aria-label="Training system" onchange="Motion12Cal.switch(this.value)"><option value="standard" ${calMode ? '' : 'selected'}>STANDARD</option><option value="calisthenics" ${calMode ? 'selected' : ''}>CALISTHENICS</option></select>` : `<span class="motion-sector-side">TODAY</span>`}</div>
          <div class="motion-training-row"><div><strong>${session.name}</strong><span>${complete ? '✓ Complete · ' : paused ? 'Paused · ' : ''}${session.time} · ${calMode ? session.why : weeklyTarget(day, week)}</span></div><button type="button" class="motion-training-launch" onclick="${sessionAction}">${sessionLabel} <span>↗</span></button></div>
          <details id="motionTrainingDetails" class="motion-sector-details"><summary>${calMode ? 'WEEK PLAN &amp; VIDEO' : 'WEEK PLAN &amp; PULL-UP PRACTICE'}<span>⌄</span></summary><div class="motion-sector-expand"><div class="compact-week">${weekStrip}</div>${trainingDetail}</div></details>
        </section>

        <section class="motion-sector motion-recovery" aria-labelledby="motionRecoveryTitle">
          <div class="motion-sector-title"><span class="motion-sector-number">04</span><h2 id="motionRecoveryTitle">Rest &amp; recovery</h2><span class="motion-sector-side">RESET</span></div>
          <div class="motion-recovery-row">
            <div><strong>8<em> h</em></strong><small>sleep aim · not tracked</small></div>
            <div><strong>7<em> moves</em></strong><small>mobility · 6–8 min</small></div>
            <button type="button" onclick="${recoveryAction}" aria-label="Open recovery and mobility">OPEN <span>↗</span></button>
          </div>
          <p class="motion-recovery-cue">${recoveryCue}</p>
        </section>
      </div>`;
    if (detailsOpen.food) main.querySelector('#motionFoodDetails').open = true;
    if (detailsOpen.training) main.querySelector('#motionTrainingDetails').open = true;
  };

  window.renderHome();
})();
