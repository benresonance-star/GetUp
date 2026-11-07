/* MOTION12 — stateless Home mode switch and minimal presentation.
   The existing Home controller owns live data, actions, and persistence. */
(function () {
  'use strict';

  function escapeText(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function viewSwitch(mode) {
    const minimal = mode !== 'detailed';
    return `<div class="motion-home-layout-bar" role="group" aria-label="Home view">
      <span class="motion-home-layout-label">HOME VIEW</span>
      <div class="motion-home-layout-choice">
        <button type="button" class="${minimal?'selected':''}" aria-pressed="${minimal}" onclick="setMotionHomeView('minimal')">Minimal</button>
        <button type="button" class="${minimal?'':'selected'}" aria-pressed="${!minimal}" onclick="setMotionHomeView('detailed')">Detailed</button>
      </div>
    </div>`;
  }

  function renderMinimalHome({week,calMode,canSwitchSystem,session,sessionAction,sessionLabel,
    sessionDescription,complete,last7,fitness,loss,kcalLeft,kcalUnit,macros,fastDay,
    mealCount,mealChips,recoveryAction,recoveryCue}) {
    const systemSelect = canSwitchSystem ? `<select class="motion-minimal-system" aria-label="Training system"
      onchange="Motion12Cal.switch(this.value)">
      <option value="standard" ${calMode?'':'selected'}>STANDARD</option>
      <option value="calisthenics" ${calMode?'selected':''}>CALISTHENICS</option>
    </select>` : '<span class="motion-minimal-system-label">TODAY</span>';
    const nutritionValue = fastDay ? 'Water fast' : escapeText(kcalLeft);
    const nutritionLabel = fastDay ? 'Monday · recovery nutrition tomorrow' : escapeText(kcalUnit);
    const protein = macros ? `${escapeText(macros.protein)} g` : '—';

    return `<div class="motion-minimal-home" aria-label="Minimal Home dashboard">
      <section class="motion-minimal-panel motion-minimal-training" aria-labelledby="minimalTrainingTitle">
        <div class="motion-minimal-heading"><span>TODAY'S TRAINING</span>${systemSelect}</div>
        <h1 id="minimalTrainingTitle">${escapeText(session.name)}</h1>
        <p class="motion-minimal-session-meta">${complete?'✓ Completed · ':''}${escapeText(session.time)} · ${escapeText(sessionDescription)}</p>
        <div class="motion-minimal-train-actions">
          <button type="button" class="motion-minimal-primary" onclick="${sessionAction}">${escapeText(sessionLabel)} <span aria-hidden="true">↗</span></button>
          <button type="button" class="motion-minimal-secondary" onclick="Motion12Flow.startToday()">FLOW</button>
          <button type="button" class="motion-minimal-secondary" onclick="Motion12Flow.previewTomorrow()">PREVIEW</button>
        </div>
      </section>

      <section class="motion-minimal-panel motion-minimal-goals" aria-labelledby="minimalGoalsTitle">
        <div class="motion-minimal-heading"><span id="minimalGoalsTitle">GOALS</span><span>WEEK ${escapeText(week)} / 12</span></div>
        <div class="motion-minimal-stats">
          <div class="motion-minimal-stat"><strong>${escapeText(last7)}<em> / ${escapeText(fitness.weeklySessions)}</em></strong><small>sessions · last 7 days</small></div>
          <div class="motion-minimal-stat"><strong>${escapeText(loss)}</strong><small>planned loss / week</small></div>
          <button type="button" class="motion-minimal-text-action" onclick="showPage('progressPage')" aria-label="Open goals and progress">↗</button>
        </div>
      </section>

      <section class="motion-minimal-panel motion-minimal-nutrition" aria-labelledby="minimalNutritionTitle">
        <div class="motion-minimal-heading"><span id="minimalNutritionTitle">CALORIES &amp; PROTEIN</span><span>${fastDay?'FAST DAY':'REMAINING TODAY'}</span></div>
        <div class="motion-minimal-stats">
          <div class="motion-minimal-stat"><strong>${nutritionValue}</strong><small>${nutritionLabel}</small></div>
          <div class="motion-minimal-stat"><strong>${fastDay?'—':protein}</strong><small>protein remaining</small></div>
          <span class="motion-minimal-nutrition-marker" aria-hidden="true">●</span>
        </div>
        <details class="motion-minimal-food-details" id="motionMinimalFoodDetails">
          <summary>${fastDay?'FAST DAY · NO MEALS TO LOG':'LOG MEALS · '+escapeText(mealCount)} <span aria-hidden="true">⌄</span></summary>
          <div class="motion-minimal-meal-content">${mealChips}</div>
        </details>
      </section>

      <section class="motion-minimal-panel motion-minimal-recovery" aria-labelledby="minimalRecoveryTitle">
        <div class="motion-minimal-heading"><span id="minimalRecoveryTitle">REST &amp; RECOVERY</span><span>DAILY RESET</span></div>
        <div class="motion-minimal-recovery-body">
          <div><strong>8<em> h</em></strong><small>sleep aim</small></div>
          <div><strong>7<em> moves</em></strong><small>mobility · 6–8 min</small></div>
          <button type="button" onclick="${recoveryAction}">OPEN ↗</button>
        </div>
        <p class="motion-minimal-recovery-note">${escapeText(recoveryCue)}</p>
      </section>
    </div>`;
  }

  window.Motion12MinimalHomeView = Object.freeze({viewSwitch,renderMinimalHome});
})();
