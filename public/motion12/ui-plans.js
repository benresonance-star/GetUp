/* MOTION12 — session prescriptions and timer plans.
   These functions describe schedules only; running/saving a timer stays in ui.js. */
(function () {
  'use strict';

  function circuitTimingFromTarget(target,fallbackWork=30,fallbackRest=30) {
    const m=String(target||'').match(/(\d+)\s*sec\s*work\s*\/\s*(\d+)\s*sec\s*(?:recovery|transition)/i);
    return m?{work:Number(m[1]),rest:Number(m[2])}:{work:fallbackWork,rest:fallbackRest};
  }
  function conditioningCircuitPlan(day,w,ctx) {
    const rounds=(ctx.conditioningRounds[day]||[])[Math.max(0,Math.min(11,w-1))]||1;
    const work=ctx.program[day]?.work||[];
    let roundRest=0,title=ctx.conditioningTarget(day,w),note='';
    const fallback=day===2?{work:30,rest:30}:day===0?{work:40,rest:20}:{work:20,rest:40};
    const stations=work.map(ex=>{
      const timing=circuitTimingFromTarget(ex?.[1],fallback.work,fallback.rest);
      return {label:ex?.[0]||'Exercise',work:timing.work,rest:timing.rest};
    });
    if(!stations.length)return null;
    if(day===2){
      note='Recovery circuit: stay at RPE 4–5. Every work interval is followed by the recovery programmed on the exercise card.';
    }else if(day===4){
      note='Power circuit: follow the work/recovery timing shown on each exercise card. Keep every rep crisp; quality beats speed.';
    }else if(day===0){
      roundRest=60;
      note='Aerobic-base circuit: RPE 5–6. Keep moving easily and use the full 60-second recovery between rounds.';
    }else return null;
    const phases=[];
    for(let r=1;r<=rounds;r++){
      stations.forEach((st,stationIndex)=>{
        phases.push({label:st.label,seconds:st.work,round:r,phaseType:'work',stationIndex,stationName:st.label});
        phases.push({label:'RECOVER',seconds:st.rest,round:r,phaseType:'transition',
          stationIndex,stationName:st.label,
          nextStationIndex:stationIndex+1<stations.length?stationIndex+1:(r<rounds?0:null)});
      });
      if(roundRest&&r<rounds){
        phases.push({label:'ROUND REST',seconds:roundRest,round:r,phaseType:'round-rest',
          stationIndex:stations.length-1,nextStationIndex:0});
      }
    }
    return {kind:'intervals',title,note,rounds,phases,circuit:true,stationCount:stations.length};
  }
  function strengthExercisePlan(day,w,preferredName,ctx) {
    const p=ctx.program[day];
    if(!p?.work?.length)return null;
    const exercise=(preferredName&&p.work.find(x=>x[0]===preferredName))||p.work[0];
    if(!exercise)return null;
    const target=day===6?(ctx.aerobicTargets[w-1]||exercise[1]):exercise[1];
    const m=String(target||'').match(/^\s*(\d+)\s*×\s*(.+)$/i);
    if(!m)return null;
    const rest=exerciseRestPreset(exercise[0],day,w,ctx).seconds||90;
    return {
      kind:'strengthsets',exerciseName:exercise[0],sets:Number(m[1]),target:m[2],rest,
      title:exercise[0]+' · '+target,
      note:'Complete the lifting set, tap Set complete, then recovery starts automatically. The next set becomes ready when recovery ends.'
    };
  }
  function timerSessionPlan(day,w,exerciseName,ctx) {
    if(day===0||day===2||day===4)return conditioningCircuitPlan(day,w,ctx);
    if(day===6){
      if(ctx.aerobicPowerVariant(ctx.timerContextDate())==='B'){
        const rounds=4,phases=[];
        for(let r=1;r<=rounds;r++){
          phases.push({label:'WORK',seconds:240,round:r,cue:'Swing → squat-to-calf-raise → reverse lunge → swing'});
          phases.push({label:'RECOVER',seconds:180,round:r,cue:r===rounds?'Active recovery / cool down':'Easy walk or march'});
        }
        return {kind:'intervals',title:'Aerobic Power B · kettlebell + bodyweight',note:'4:00 work / 3:00 active recovery × 4. Keep the cardiovascular system—not grip or local muscle fatigue—as the limiter.',rounds,phases,aerobicAlternate:true};
      }
      const target=ctx.aerobicTargets[w-1]||'Aerobic session';
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
    if(day===1||day===3||day===5)return strengthExercisePlan(day,w,exerciseName,ctx)||{kind:'rest',title:'Strength · between working sets',note:'Start with 90 seconds. Take 120 seconds after a demanding compound set if quality needs it.',rest:90};
    return {kind:'stopwatch',title:'Easy movement',note:'No prescribed intervals today. Use elapsed time only if it helps.'};
  }
  function exerciseRestPreset(name,day,w,ctx) {
    if(day===2)return {category:'Recovery circuit',seconds:30,action:'session',label:'30s / 30s',note:'Use the complete Restore circuit timer.'};
    if(day===4){
      const exercise=ctx.program[day]?.work?.find(x=>x[0]===name);
      const timing=circuitTimingFromTarget(exercise?.[1],20,40);
      return {category:'Power circuit',seconds:timing.rest,action:'session',label:timing.work+'s / '+timing.rest+'s',note:'Use the complete Power circuit timer.'};
    }
    if(day===0)return {category:'Aerobic base',seconds:20,action:'session',label:'40s / 20s',note:'Use the complete Aerobic Base circuit timer.'};
    if(/isometric/i.test(name))return {category:'Tendon capacity',seconds:75,action:'rest',label:'1:15',note:'Recover 60–90 seconds between high-force rounds so force quality stays high.'};
    const strength120=new Set(['Goblet squat','Pull-up / assisted pull-up','Ring row','Ring row / pull-up','Reverse lunge','Kettlebell Romanian deadlift']);
    const strength90=new Set(['1-arm kettlebell press','Push-up','1-arm kettlebell row','Lateral lunge']);
    const accessory60=new Set(['Suitcase carry','Plank shoulder tap','Back extension','Jefferson curl','Single-leg calf raise','Kettlebell woodchop','Plank shoulder tap / kettlebell woodchop']);
    if(name==='Aerobic intervals'||name==='Kettlebell + bodyweight 4×4'){
      const plan=timerSessionPlan(day,w,'',ctx);
      if(plan.kind==='intervals'){
        const recover=plan.phases.find(x=>x.label==='RECOVER');
        return {category:'Conditioning',seconds:recover?.seconds||180,action:'session',label:ctx.timerFormat(recover?.seconds||180)+' programmed',note:'Use the full programmed recovery so hard intervals stay repeatable.'};
      }
      return {category:'Conditioning',seconds:0,action:'session',label:'Continuous',note:'No fixed rest on today’s continuous aerobic session.'};
    }
    if(strength120.has(name))return {category:'Primary strength',seconds:120,action:'rest',label:'2:00',note:'Longer recovery protects force output and technique on demanding compound work.'};
    if(strength90.has(name))return {category:'Strength',seconds:90,action:'rest',label:'1:30',note:'Enough recovery to keep reps crisp without unnecessarily stretching the session.'};
    if(accessory60.has(name))return {category:'Accessory / core',seconds:60,action:'rest',label:'1:00',note:'Shorter recovery is usually sufficient for accessories, carries and trunk work.'};
    return {category:'Strength',seconds:90,action:'rest',label:'1:30',note:'A balanced default for moderate strength work.'};
  }

  window.Motion12UiPlans=Object.freeze({
    circuitTimingFromTarget,conditioningCircuitPlan,strengthExercisePlan,timerSessionPlan,exerciseRestPreset
  });
})();
