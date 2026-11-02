/* MOTION12 — side-effect-free application rules extracted from ui.js.
   All inputs are explicit. No DOM, globals, persistence or timer mutation. */
(function () {
  'use strict';

  const legacyMealIndices = Object.freeze({ breakfast:0, latte1:1, lunch:2, latte2:3, dinner:4, shake:5 });
  const mealKey = (date,id) => 'meal:'+date+':'+id;
  function mealDone(logs,date,meal) {
    const key=mealKey(date,meal.id);
    if(Object.prototype.hasOwnProperty.call(logs,key))return !!logs[key].done;
    const legacy=legacyMealIndices[meal.id];
    return legacy===undefined?false:!!logs['meal:'+date+':'+legacy]?.done;
  }
  function intakeTotals(plan,logs,date) {
    if(!plan||!plan.meals.length)return null;
    const consumed=plan.meals.reduce((acc,m)=>{
      if(mealDone(logs,date,m)){
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
  function compactMealCount(plan,logs,date) {
    if(!plan||!plan.meals.length)return '';
    const done=plan.meals.reduce((n,m)=>n+(mealDone(logs,date,m)?1:0),0);
    return done+' / '+plan.meals.length+' ✓';
  }

  function practicePrescription(day,pullupMax) {
    const max=Math.max(0,Math.round(Number(pullupMax)||0));
    const targetSets=3;
    if(day===1)return {enabled:false,reason:'strength-day',max,targetSets,reps:0,assisted:false,label:'No micro-sets'};
    if(max<=0)return {enabled:false,reason:'needs-max',max:0,targetSets,reps:0,assisted:false,label:'Set clean pull-up max'};
    const assisted=max<5;
    const reps=assisted?1:max===5?1:max===6?2:max<=8?3:max<=10?4:5;
    return {enabled:true,reason:'',max,targetSets,reps,assisted,label:assisted?'1 assisted rep':reps+' clean rep'+(reps===1?'':'s')};
  }

  function strengthTimedWorkConfig(target) {
    const text=String(target||'');
    let m=text.match(/×\s*(\d+)\s*sec(\s*\/\s*side)?/i);
    if(m)return {enabled:true,min:Number(m[1]),max:Number(m[1]),perSide:!!m[2]};
    m=text.match(/(\d+)\s*[–-]\s*(\d+)\s*sec(\s*\/\s*side)?/i);
    if(m)return {enabled:true,min:Number(m[1]),max:Number(m[2]),perSide:!!m[3]};
    m=text.match(/(\d+)\s*sec(\s*\/\s*side)?/i);
    if(m)return {enabled:true,min:Number(m[1]),max:Number(m[1]),perSide:!!m[2]};
    return {enabled:false,min:0,max:0,perSide:false};
  }

  function strengthFlowConfig(name,target) {
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

  const strengthNormalizeLoad = v => String(v??'').trim().toLowerCase();
  function strengthFormatLoad(v) {
    const raw=String(v??'').trim();
    if(!raw)return '—';
    return /^[-+]?\d+(?:\.\d+)?$/.test(raw)?raw+' kg':raw;
  }
  function strengthQualifiesForProgression(sets,top) {
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
  function strengthCompletionSummary({name,entries,cfg,previous,dayLabel}) {
    if(!entries?.length||!entries.every(s=>s?.complete))return null;
    const reps=entries.map(s=>Number(s.reps)||0);
    const rirs=entries.map(s=>Number(s.rir)||0);
    const rawLoads=entries.map(s=>String(s.load??'').trim());
    const normalized=rawLoads.map(strengthNormalizeLoad);
    const sameLoad=normalized.length===entries.length&&normalized[0]&&normalized.every(x=>x===normalized[0]);
    const loadText=sameLoad?strengthFormatLoad(rawLoads[0]):rawLoads.map(strengthFormatLoad).join(' / ');
    const qualifies=strengthQualifiesForProgression(entries,cfg.top);
    const previousQualifies=previous&&sameLoad&&
      strengthNormalizeLoad(previous.sets[0]?.load)===normalized[0]&&
      strengthQualifiesForProgression(previous.sets,cfg.top);
    const targetPattern=entries.map(()=>cfg.top).join('/');
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
    return {loadText,repsText:reps.join(' / '),rirText:rirs.join(' / '),title,text,tone,previous:previous?.id||''};
  }

  window.Motion12UiDomain=Object.freeze({
    mealKey,mealDone,intakeTotals,compactMealCount,practicePrescription,
    strengthTimedWorkConfig,strengthFlowConfig,strengthNormalizeLoad,
    strengthFormatLoad,strengthQualifiesForProgression,strengthCompletionSummary
  });
})();
