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
      rhr: target('rhr', 30, 120),
      dailySteps: target('dailySteps', 8000, 30000, 13000)
    };
  }

  /* Stable initial Hume baseline. Projected body-fat at the target weight assumes
     fat-free mass is retained; never mistake this estimate for a measured result. */
  function bodyCompositionGoal(settings) {
    const stored = Number(settings?.fitnessGoals?.weightKg);
    const weightKg = Number.isFinite(stored) && stored >= 75 && stored <= 130 ? stored : 82;
    const baselineFatFreeKg = 90.6 * (1 - 23.4 / 100);
    const fatPct = (1 - baselineFatFreeKg / weightKg) * 100;
    return {
      weightKg,
      fatPct: Math.round(fatPct * 10) / 10,
      basis: 'Hume baseline: 90.6 kg at 23.4% fat; assumes fat-free mass remains unchanged'
    };
  }

  /* Predict a calendar date from the saved/current weight and calorie-plan rate.
     Dates use local noon so DST boundaries do not shift the displayed day. */
  function achievementEstimate(currentWeight, goalWeight, weeklyLoss, todayISO) {
    const current = Number(currentWeight);
    const target = Number(goalWeight);
    const rate = Number(weeklyLoss);
    if (!(Number.isFinite(current) && current > 0 && current <= 500 &&
          Number.isFinite(target) && target > 0)) {
      return {status:'missing-weight', label:'Log current weight', weeks:null, weeklyLoss:null};
    }
    if (current <= target) {
      return {status:'achieved', label:'Goal reached', weeks:0, weeklyLoss:Number.isFinite(rate)?rate:null};
    }
    if (!(Number.isFinite(rate) && rate > 0)) {
      return {status:'missing-rate', label:'Rate unavailable', weeks:null, weeklyLoss:null};
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(todayISO))
      ? new Date(String(todayISO) + 'T12:00:00') : new Date(NaN);
    if (!Number.isFinite(date.getTime())) {
      return {status:'missing-date', label:'Date unavailable', weeks:null, weeklyLoss:rate};
    }
    const weeks = (current - target) / rate;
    const days = Math.ceil(weeks * 7);
    if (!(Number.isFinite(days) && days > 0 && days <= 3650)) {
      return {status:'too-distant', label:'Beyond 10 years', weeks:null, weeklyLoss:rate};
    }
    date.setDate(date.getDate() + days);
    return {
      status:'estimated',
      label:date.toLocaleDateString('en-AU', {day:'numeric', month:'short', year:'numeric'}),
      iso:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),
      weeks:Math.round(weeks * 10) / 10,
      days,
      weeklyLoss:rate
    };
  }

  /* Daily walking is manually logged; an unlogged count stays unknown. */
  function walkingSummary(settings, logs, date) {
    const goal = fitnessGoalTargets(settings).dailySteps;
    const raw = logs?.['walk.steps:' + date];
    const actual = Number.isInteger(raw?.count) && raw.count >= 0 && raw.count <= 100000 ? raw.count : null;
    const baseline = Math.max(10000, Number(settings?.steps) || 0);
    return {
      target: goal,
      actual,
      baseline,
      additional: Math.max(0, goal - baseline),
      percent: actual === null ? 0 : Math.max(0, Math.min(100, Math.round(actual / goal * 100)))
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
    fitnessGoalTargets, bodyCompositionGoal, achievementEstimate, walkingSummary, goalsSummary, nutritionSummary
  });
})();
