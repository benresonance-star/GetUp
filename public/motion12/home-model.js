/* MOTION12 Home domain model. No DOM or storage side-effects.
   A view can supply existing app state and receive display-ready values. */
(function () {
  'use strict';

  const calSessions = Object.freeze([
    { name: 'Recovery & Mobility', time: '10–20 min', why: 'Recover and move easily.' },
    { name: 'A · Pull & Foundation', time: '30–40 min', why: 'Pull, push, legs and trunk.' },
    { name: 'Easy Recovery', time: '10–25 min', why: 'Low-fatigue movement.' },
    { name: 'B · Push & Dip', time: '30–40 min', why: 'Dips, pulling and squats.' },
    { name: 'Aerobic Base', time: '30–40 min', why: 'Conversational aerobic work.' },
    { name: 'C · Full-Body Capacity', time: '30–40 min', why: 'Full-body strength and carry.' },
    { name: 'Aerobic Power', time: '30–40 min', why: 'Four controlled hard intervals.' }
  ].map(session => Object.freeze(session)));

  const recoveryCues = Object.freeze([
    'Keep this circuit easy; arrive fresh for Monday.',
    'Prioritise fluids and an easy evening after training.',
    'Restore at RPE 4–5; avoid adding fatigue.',
    'Let the shoulders and posterior chain recover.',
    'Keep every power rep crisp; quality before volume.',
    'Allow the tendons to settle after strength work.',
    'Use the full recovery between aerobic intervals.'
  ]);

  const flowCues = Object.freeze([
    'Move easily; arrive fresh for Monday.',
    'Strong movement, quiet neck and shoulders.',
    'Move steadily without rushing.',
    'Smooth control before adding effort.',
    'Explosive hips, relaxed jaw and neck.',
    'Full range and a steady breath.',
    'Strong intervals; recover deliberately.'
  ]);

  function bodyCompHistory(logs) {
    const entries = logs?.['bodycomp.history'];
    return Array.isArray(entries) ? entries.filter(entry => entry && Number(entry.weight) > 0) : [];
  }

  function currentBodyComp(history, settings, measurements) {
    const latest = history.length ? history[history.length - 1] : null;
    return {
      weight: Number(latest?.weight) || Number(settings?.bodyweight) || null,
      bodyFat: latest ? (Number(latest.bodyFat) || null) : (Number(measurements?.bodyFat) || null),
      waist: latest ? (Number(latest.waist) || null) : (Number(measurements?.waist) || null)
    };
  }

  function fitnessGoalTargets(settings) {
    const saved = settings?.fitnessGoals && typeof settings.fitnessGoals === 'object' ? settings.fitnessGoals : {};
    const target = (key, min, max, fallback = null) => {
      const value = Number(saved[key]);
      return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    };
    return {
      weeklySessions: target('weeklySessions', 1, 7, 7),
      pushups: target('pushups', 1, 200),
      walk: target('walk', 5, 60),
      rhr: target('rhr', 30, 120)
    };
  }

  function goalsSummary(calories, fatLoss, progress) {
    return {
      completedRatio: Math.min(100, Math.round(progress.completed / Math.max(1, progress.programDays) * 100)),
      loss: calories ? '~' + Number(calories.predictedLoss).toFixed(2) + ' kg' : '—',
      lossDetail: fatLoss ? 'target ' + fatLoss.low + '–' + fatLoss.high + ' kg/wk' : 'Set weight for a target'
    };
  }

  function nutritionSummary(fastDay, intake) {
    const consumed = intake?.consumed.kcal || 0;
    const target = intake?.total.kcal || 0;
    return {
      kcalLeft: fastDay ? 'FAST' : intake ? intake.remaining.kcal.toLocaleString() : '—',
      kcalUnit: fastDay ? '0 kcal planned' : intake ? 'kcal left today' : 'Set weight in Settings',
      consumed,
      target,
      caloriesProgress: target ? Math.min(100, Math.round(consumed / target * 100)) : 0,
      macros: fastDay ? { protein: 0, carbs: 0, fat: 0 } : (intake?.remaining || null)
    };
  }

  window.Motion12HomeModel = Object.freeze({
    calSessions, recoveryCues, flowCues, bodyCompHistory, currentBodyComp,
    fitnessGoalTargets, goalsSummary, nutritionSummary
  });
})();
