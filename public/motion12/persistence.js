(function(global){
  'use strict';

  const SCHEMA_VERSION=1;
  const PROGRAM_VERSION='2026.09.27';
  const DB_NAME='motion12';
  const DB_VERSION=1;
  const STORE='records';
  const DATA_RECORD='data-v1';
  const APP_RECORD='app-state-v1';
  const MIGRATION_RECORD='migration-v1';

  const STABLE_ID=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const DAY_TYPES={
    0:'aerobic-base',1:'strength-a',2:'restore-circuit',3:'strength-b',
    4:'power-circuit',5:'strength-c',6:'aerobic-power'
  };
  const DAY_BY_TYPE=Object.fromEntries(Object.entries(DAY_TYPES).map(([day,type])=>[type,Number(day)]));

  // Frozen legacy map. Never update these indices to match a future program order.
  const LEGACY_PROGRAM_2026_09_27={
    0:{work:[
      ['aerobic-base.squat-to-calf-raise','squat-to-calf-raise','Squat-to-calf-raise','40 sec work / 20 sec transition'],
      ['aerobic-base.push-up','push-up','Push-up','40 sec work / 20 sec transition'],
      ['aerobic-base.alternating-reverse-lunge','alternating-reverse-lunge','Alternating reverse lunge','40 sec work / 20 sec transition'],
      ['aerobic-base.suitcase-march-carry','suitcase-march-carry','Suitcase march / carry','40 sec work / 20 sec transition']
    ],support:[
      ['aerobic-base.back-extension','back-extension','Back extension','2 × 12–15 · 45–60 sec rest'],
      ['aerobic-base.sliding-hamstring-curl','sliding-hamstring-curl','Sliding hamstring curl','1–2 × 8–12']
    ]},
    1:{prep:[
      ['strength-a.kettlebell-halo','kettlebell-halo','Kettlebell halo','1–2 × 5 / direction']
    ],work:[
      ['strength-a.goblet-squat','goblet-squat','Goblet squat','3 × 6–10'],
      ['strength-a.pull-up','pull-up','Pull-up / assisted pull-up','3 × 5–8'],
      ['strength-a.kettlebell-romanian-deadlift','kettlebell-romanian-deadlift','Kettlebell Romanian deadlift','3 × 8–12'],
      ['strength-a.one-arm-kettlebell-press','one-arm-kettlebell-press','1-arm kettlebell press','3 × 6–10 / side'],
      ['strength-a.suitcase-carry','suitcase-carry','Suitcase carry','2 × 45–60 sec / side'],
      ['strength-a.plank-shoulder-tap','plank-shoulder-tap','Plank shoulder tap','2 × 6–10 / side']
    ]},
    2:{work:[
      ['restore-circuit.kettlebell-deadlift','kettlebell-deadlift','Kettlebell deadlift','30 sec work / 30 sec recovery'],
      ['restore-circuit.ring-row','ring-row','Ring row','30 sec work / 30 sec recovery'],
      ['restore-circuit.alternating-reverse-lunge','alternating-reverse-lunge','Alternating reverse lunge','30 sec work / 30 sec recovery'],
      ['restore-circuit.suitcase-march-carry','suitcase-march-carry','Suitcase march / carry','30 sec work / 30 sec recovery']
    ]},
    3:{prep:[
      ['strength-b.kettlebell-halo','kettlebell-halo','Kettlebell halo','1–2 × 5 / direction']
    ],work:[
      ['strength-b.reverse-lunge','reverse-lunge','Reverse lunge','3 × 6–10 / leg'],
      ['strength-b.push-up','push-up','Push-up','3 × 8–15'],
      ['strength-b.one-arm-kettlebell-row','one-arm-kettlebell-row','1-arm kettlebell row','3 × 8–12 / side'],
      ['strength-b.back-extension','back-extension','Back extension','2 × 10–15'],
      ['strength-b.single-leg-calf-raise','single-leg-calf-raise','Single-leg calf raise','2 × 10–15 / side'],
      ['strength-b.kettlebell-woodchop','kettlebell-woodchop','Kettlebell woodchop','2 × 6–10 / side']
    ]},
    4:{work:[
      ['power-circuit.two-hand-kettlebell-swing','two-hand-kettlebell-swing','2-hand kettlebell swing','20 sec work / 40 sec recovery'],
      ['power-circuit.push-up','push-up','Push-up','20 sec work / 40 sec recovery'],
      ['power-circuit.kettlebell-complex','kettlebell-squat-jerk-strict-press','Kettlebell squat → jerk → strict press','40 sec work / 60 sec recovery']
    ],support:[
      ['power-circuit.band-pull-apart','band-pull-apart','Band pull-apart','1 × 12–20'],
      ['power-circuit.wall-slide','wall-slide','Wall slide','1 × 8']
    ]},
    5:{prep:[
      ['strength-c.kettlebell-halo','kettlebell-halo','Kettlebell halo','1–2 × 5 / direction']
    ],work:[
      ['strength-c.lateral-lunge','lateral-lunge','Lateral lunge','3 × 6–8 / side'],
      ['strength-c.goblet-squat','goblet-squat','Goblet squat','2 × 8–12'],
      ['strength-c.ring-row','ring-row','Ring row','3 × 8–12'],
      ['strength-c.push-up','push-up','Push-up','2 × 8–15'],
      ['strength-c.kettlebell-romanian-deadlift','kettlebell-romanian-deadlift','Kettlebell Romanian deadlift','2 × 8–12'],
      ['strength-c.suitcase-carry','suitcase-carry','Suitcase carry','2 × 45 sec / side'],
      ['strength-c.trunk-alternating','__alternating_trunk__','Plank shoulder tap / kettlebell woodchop','2 × 8–10 / side']
    ]},
    6:{work:[
      ['aerobic-power.aerobic-intervals','aerobic-intervals','Aerobic intervals','See weekly target']
    ]}
  };

  const CATALOG={
    'goblet-squat':['Goblet squat','strength','load-reps','bilateral'],
    'pull-up':['Pull-up / assisted pull-up','strength','bodyweight-reps','bilateral'],
    'kettlebell-romanian-deadlift':['Kettlebell Romanian deadlift','strength','load-reps','bilateral'],
    'one-arm-kettlebell-press':['1-arm kettlebell press','strength','load-reps','left-right'],
    'suitcase-carry':['Suitcase carry','carry','load-time','left-right'],
    'plank-shoulder-tap':['Plank shoulder tap','core','bodyweight-reps','alternating'],
    'kettlebell-halo':['Kettlebell halo','mobility','load-reps','left-right'],
    'kettlebell-deadlift':['Kettlebell deadlift','conditioning','load-reps','bilateral'],
    'ring-row':['Ring row','strength','bodyweight-reps','bilateral'],
    'alternating-reverse-lunge':['Alternating reverse lunge','conditioning','bodyweight-reps','alternating'],
    'suitcase-march-carry':['Suitcase march / carry','carry','load-time','left-right'],
    'reverse-lunge':['Reverse lunge','strength','load-reps','left-right'],
    'push-up':['Push-up','strength','bodyweight-reps','bilateral'],
    'one-arm-kettlebell-row':['1-arm kettlebell row','strength','load-reps','left-right'],
    'back-extension':['Back extension','strength','bodyweight-reps','bilateral'],
    'single-leg-calf-raise':['Single-leg calf raise','strength','bodyweight-reps','left-right'],
    'kettlebell-woodchop':['Kettlebell woodchop','core','load-reps','left-right'],
    'two-hand-kettlebell-swing':['2-hand kettlebell swing','power','load-reps','bilateral'],
    'kettlebell-squat-jerk-strict-press':['Kettlebell squat → jerk → strict press','power','load-reps','left-right'],
    'band-pull-apart':['Band pull-apart','mobility','bodyweight-reps','bilateral'],
    'wall-slide':['Wall slide','mobility','bodyweight-reps','bilateral'],
    'lateral-lunge':['Lateral lunge','strength','load-reps','left-right'],
    'aerobic-intervals':['Aerobic intervals','aerobic','interval','none'],
    'squat-to-calf-raise':['Squat-to-calf-raise','conditioning','bodyweight-reps','bilateral'],
    'sliding-hamstring-curl':['Sliding hamstring curl','strength','bodyweight-reps','bilateral']
  };

  let db=null;
  let currentData=null;
  let currentAppState=null;
  let currentView=null;
  let writeChain=Promise.resolve();
  let lastError=null;
  let readOnlyMode=false;
  let recoverySource='';

  function clone(v){
    if(v===undefined)return undefined;
    if(global.structuredClone)try{return global.structuredClone(v)}catch(_){}
    return JSON.parse(JSON.stringify(v));
  }
  function safeParse(raw,fallback){
    try{return raw==null?fallback:JSON.parse(raw)}catch(_){return fallback}
  }
  function nowIso(){return new Date().toISOString()}
  function dateIsoTime(date){return date+'T00:00:00.000Z'}
  function numeric(v){
    if(v===null||v===undefined||v==='')return undefined;
    const n=Number(v);return Number.isFinite(n)?n:undefined;
  }
  function isFiniteNumber(v){return typeof v==='number'&&Number.isFinite(v)}
  function stableUuid(seed){
    function h(str,offset){
      let x=2166136261^offset;
      for(let i=0;i<str.length;i++){x^=str.charCodeAt(i);x=Math.imul(x,16777619)}
      return (x>>>0).toString(16).padStart(8,'0');
    }
    const hex=(h(seed,0)+h(seed,1)+h(seed,2)+h(seed,3)).slice(0,32).split('');
    hex[12]='4';hex[16]=['8','9','a','b'][parseInt(hex[16],16)%4];
    const s=hex.join('');
    return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20,32);
  }
  function randomUuid(){
    if(global.crypto&&typeof global.crypto.randomUUID==='function')return global.crypto.randomUUID();
    return stableUuid('install:'+Date.now()+':'+Math.random());
  }
  function weekForDate(date,startDate){
    if(!startDate)return 1;
    const s=new Date(startDate+'T00:00:00Z'),d=new Date(date+'T00:00:00Z');
    if(Number.isNaN(s.getTime())||Number.isNaN(d.getTime()))return 1;
    return Math.max(1,Math.min(12,Math.floor((d-s)/604800000)+1));
  }
  function actualExerciseId(slot,week){
    return slot[1]==='__alternating_trunk__'?(week%2===0?'kettlebell-woodchop':'plank-shoulder-tap'):slot[1];
  }
  function restSecondsFor(exerciseId){
    if(['goblet-squat','pull-up','ring-row','reverse-lunge','kettlebell-romanian-deadlift'].includes(exerciseId))return 120;
    if(['one-arm-kettlebell-press','push-up','one-arm-kettlebell-row','lateral-lunge'].includes(exerciseId))return 90;
    if(['suitcase-carry','plank-shoulder-tap','back-extension','single-leg-calf-raise','kettlebell-woodchop'].includes(exerciseId))return 60;
    return undefined;
  }
  function prescription(raw,exerciseId){
    const out={rawText:String(raw||'')};
    const set=String(raw||'').match(/^\s*(\d+)\s*×/);if(set)out.sets=Number(set[1]);
    const durationRange=String(raw||'').match(/(\d+)\s*[–-]\s*(\d+)\s*sec/i);
    if(durationRange)out.durationRangeSeconds={min:Number(durationRange[1]),max:Number(durationRange[2])};
    else{
      const repRange=String(raw||'').match(/(\d+)\s*[–-]\s*(\d+)/);
      if(repRange)out.repRange={min:Number(repRange[1]),max:Number(repRange[2])};
    }
    const fixed=String(raw||'').match(/(?:^|\D)(\d+)\s*sec(?:\D|$)/i);
    if(fixed&&!out.durationRangeSeconds)out.fixedDurationSeconds=Number(fixed[1]);
    const rest=restSecondsFor(exerciseId);if(rest!==undefined)out.restSeconds=rest;
    if(['strength','carry','core'].includes((CATALOG[exerciseId]||[])[1]))out.targetRir={min:2};
    return out;
  }
  function normalizeLoad(raw,exerciseId){
    if(raw===undefined||raw===null||String(raw).trim()==='')return undefined;
    const s=String(raw).trim(),n=Number(s.replace(/\s*kg\s*$/i,''));
    if(Number.isFinite(n)&&n>=0)return {type:'external',valueKg:n,display:s};
    if(/^(bw|bodyweight)$/i.test(s))return {type:'bodyweight',display:s};
    if(/assist|band/i.test(s))return {type:'assisted',method:s,display:s};
    return {type:'variation',variation:s,display:s};
  }
  function loadToLegacy(load){
    if(!load)return '';
    if(load.display)return String(load.display);
    if(load.type==='external'&&load.valueKg!==undefined)return String(load.valueKg);
    if(load.type==='bodyweight')return load.variation||'BW';
    if(load.type==='assisted')return load.method||String(load.assistanceKg||'assisted');
    if(load.type==='variation')return load.variation||'';
    return '';
  }
  function setFromLegacy(sourceKey,exerciseId,set,i){
    const def=CATALOG[exerciseId]||[];
    const status=set&&set.complete?'completed':set&&set.skipped?'skipped':'planned';
    const out={id:stableUuid(sourceKey+':set:'+i),setNumber:i+1,status,legacy:{sourceKey,raw:set&&typeof set==='object'?{...set}:{value:set}}};
    const load=normalizeLoad(set&&set.load,exerciseId);if(load)out.load=load;
    const value=numeric(set&&set.reps);
    if(value!==undefined){
      if(def[2]==='load-time'||def[2]==='bodyweight-time')out.durationSeconds=value;
      else out.reps=Math.max(0,Math.round(value));
    }
    const rir=numeric(set&&set.rir);if(rir!==undefined)out.rir=Math.max(0,Math.min(10,Math.round(rir)));
    if(set&&set.completedAt)out.completedAt=String(set.completedAt);
    return out;
  }
  function slotFor(day,kind,index,week){
    const group=LEGACY_PROGRAM_2026_09_27[day]&&LEGACY_PROGRAM_2026_09_27[day][kind];
    if(!group||!group[index])return null;
    const base=group[index];
    return {slotId:base[0],exerciseId:actualExerciseId(base,week),name:base[2],target:base[3],order:index,kind};
  }
  function parseExerciseKey(key,startDate){
    let m=key.match(/^(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)$/);
    if(m){
      const date=m[1],day=Number(m[2]),index=Number(m[3]),week=weekForDate(date,startDate),slot=slotFor(day,'work',index,week);
      return slot?{date,day,index,week,...slot}:null;
    }
    m=key.match(/^(\d{4}-\d{2}-\d{2})-(\d+)-(prep|support)-(\d+)$/);
    if(m){
      const date=m[1],day=Number(m[2]),kind=m[3],index=Number(m[4]),week=weekForDate(date,startDate),slot=slotFor(day,kind,index,week);
      return slot?{date,day,index,week,...slot}:null;
    }
    return null;
  }
  function parseSessionKey(key){
    const m=key.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
    return m?{date:m[1],day:Number(m[2])}:null;
  }
  function migratedSettings(raw){
    return {
      programStartDate:raw&&raw.startDate||undefined,
      bodyweightKg:numeric(raw&&raw.bodyweight),
      dailyStepTarget:numeric(raw&&raw.steps),
      compactMode:!!(raw&&raw.homeMode==='compact'),
      units:{mass:'kg',distance:'metric'},
      timer:{soundEnabled:true,vibrationEnabled:false}
    };
  }
  function canonicalSettingsToCompat(canonical,extras){
    return {
      ...(extras||{}),
      ...(canonical.programStartDate!==undefined?{startDate:canonical.programStartDate}:{}),
      ...(canonical.bodyweightKg!==undefined?{bodyweight:canonical.bodyweightKg}:{}),
      ...(canonical.dailyStepTarget!==undefined?{steps:canonical.dailyStepTarget}:{}),
      homeMode:canonical.compactMode?'compact':'full'
    };
  }
  function measurementRecord(raw,stamp,seed){
    if(!raw||typeof raw!=='object')return null;
    const bp=String(raw.bp||'').match(/(\d+)\s*\/\s*(\d+)/);
    const m={id:stableUuid(seed),recordedAt:stamp};
    const weight=numeric(raw.weight);if(weight!==undefined)m.bodyweightKg=weight;
    const waist=numeric(raw.waist);if(waist!==undefined)m.waistCm=waist;
    if(bp)m.bloodPressure={systolic:Number(bp[1]),diastolic:Number(bp[2])};
    const rhr=numeric(raw.rhr);if(rhr!==undefined)m.restingHeartRateBpm=rhr;
    const walk=numeric(raw.walk);if(walk!==undefined)m.walk2kmSeconds=Math.round(walk*60);
    const pushups=numeric(raw.pushups);if(pushups!==undefined)m.strictPushups=Math.round(pushups);
    return Object.keys(m).length>2?m:null;
  }
  function measurementSignature(m){
    if(!m)return '';
    return JSON.stringify({
      bodyweightKg:m.bodyweightKg,waistCm:m.waistCm,bloodPressure:m.bloodPressure,
      restingHeartRateBpm:m.restingHeartRateBpm,walk2kmSeconds:m.walk2kmSeconds,strictPushups:m.strictPushups
    });
  }
  function legacyExerciseRecord(key,parsed,entry,sessionCompleted){
    const exerciseId=parsed.exerciseId;
    const sets=Array.isArray(entry&&entry.sets)?entry.sets.map((s,i)=>setFromLegacy(key,exerciseId,s,i)):[];
    const hasWork=sets.some(s=>s.status==='completed')||!!(entry&&(entry.load||entry.reps||entry.rir));
    let status=entry&&entry.done?'completed':hasWork?'in-progress':'not-started';
    if(sessionCompleted&&status==='not-started')status='skipped';
    const result={
      id:stableUuid('exercise:'+key),slotId:parsed.slotId,exerciseId,
      exerciseNameSnapshot:parsed.name,order:parsed.order,
      prescriptionSnapshot:prescription(parsed.target,exerciseId),status,sets,
      legacy:{sourceKey:key,raw:entry&&typeof entry==='object'?{...entry}:{value:entry}}
    };
    if(!sets.length&&entry&&(entry.load||entry.reps||entry.rir)){
      result.legacy.raw={...result.legacy.raw,unparsedAggregate:{load:entry.load,reps:entry.reps,rir:entry.rir}};
    }
    const times=sets.map(s=>s.completedAt).filter(Boolean).sort();
    if(times.length)result.completedAt=times[times.length-1];
    return result;
  }
  function sessionShell(date,day,startDate,existing){
    const id=stableUuid('session:'+date+':'+day),week=weekForDate(date,startDate),stamp=dateIsoTime(date);
    const old=existing&&existing[id];
    return {
      id,programId:'motion12',programVersion:PROGRAM_VERSION,scheduledDate:date,
      dayType:DAY_TYPES[day]||'aerobic-base',weekNumber:week,status:'planned',exercises:[],
      createdAt:old&&old.createdAt||stamp,updatedAt:old&&old.updatedAt||stamp,
      ...(old&&old.subjective?{subjective:clone(old.subjective)}:{}),
      legacy:{sourceKey:date+'-'+day,raw:{}}
    };
  }
  function buildSessionsFromLogs(logsRaw,settingsRaw,existingSessions){
    const startDate=settingsRaw&&settingsRaw.startDate||undefined;
    const sessionsByKey={},sessionCompletion={};
    Object.keys(logsRaw||{}).forEach(key=>{
      const sk=parseSessionKey(key);
      if(sk&&logsRaw[key]&&typeof logsRaw[key]==='object'&&Object.prototype.hasOwnProperty.call(logsRaw[key],'completed')){
        sessionCompletion[sk.date+':'+sk.day]=!!logsRaw[key].completed;
      }
    });
    Object.keys(logsRaw||{}).forEach(key=>{
      const parsed=parseExerciseKey(key,startDate);if(!parsed)return;
      const groupKey=parsed.date+':'+parsed.day;
      const session=sessionsByKey[groupKey]||(sessionsByKey[groupKey]=sessionShell(parsed.date,parsed.day,startDate,existingSessions));
      session.exercises.push(legacyExerciseRecord(key,parsed,logsRaw[key],!!sessionCompletion[groupKey]));
    });
    Object.keys(sessionCompletion).forEach(groupKey=>{
      if(!sessionsByKey[groupKey]){
        const parts=groupKey.split(':');
        sessionsByKey[groupKey]=sessionShell(parts[0],Number(parts[1]),startDate,existingSessions);
      }
    });
    Object.keys(sessionsByKey).forEach(groupKey=>{
      const s=sessionsByKey[groupKey],done=!!sessionCompletion[groupKey],day=Number(groupKey.split(':')[1]),week=weekForDate(s.scheduledDate,startDate);
      const prescribed=LEGACY_PROGRAM_2026_09_27[day]?.work||[];
      prescribed.forEach((_,index)=>{
        const parsedSlot=slotFor(day,'work',index,week);
        if(!parsedSlot||s.exercises.some(x=>x.slotId===parsedSlot.slotId))return;
        const sourceKey=s.scheduledDate+'-'+day+'-'+index;
        s.exercises.push(legacyExerciseRecord(sourceKey,{date:s.scheduledDate,day,index,week,...parsedSlot},logsRaw[sourceKey]||{},done));
      });
      s.exercises.sort((a,b)=>{
        const ak=String(a.legacy?.sourceKey||'').includes('-prep-')?-2:String(a.legacy?.sourceKey||'').includes('-support-')?2:0;
        const bk=String(b.legacy?.sourceKey||'').includes('-prep-')?-2:String(b.legacy?.sourceKey||'').includes('-support-')?2:0;
        return ak-bk||a.order-b.order;
      });
      const anyStarted=s.exercises.some(x=>x.status==='in-progress'||x.status==='completed');
      s.status=done?'completed':anyStarted?'in-progress':'planned';
      if(done)s.completedAt=s.completedAt||s.scheduledDate+'T23:59:59.000Z';
      else delete s.completedAt;
      s.updatedAt=nowIso();
    });
    return Object.fromEntries(Object.values(sessionsByKey).map(s=>[s.id,s]));
  }
  function miscLogsFromLegacy(logs,settingsRaw){
    const out={};
    Object.entries(logs||{}).forEach(([key,value])=>{
      if(parseExerciseKey(key,settingsRaw&&settingsRaw.startDate)||parseSessionKey(key))return;
      out[key]=clone(value);
    });
    return out;
  }
  function legacySetFromCanonical(set){
    const v={};
    const load=loadToLegacy(set.load);if(load!=='')v.load=load;
    if(set.reps!==undefined)v.reps=String(set.reps);
    else if(set.durationSeconds!==undefined)v.reps=String(set.durationSeconds);
    if(set.rir!==undefined)v.rir=String(set.rir);
    if(set.status==='completed')v.complete=true;
    if(set.status==='skipped')v.skipped=true;
    if(set.completedAt)v.completedAt=set.completedAt;
    return v;
  }
  function exerciseSourceKey(session,e){
    const raw=e&&e.legacy&&e.legacy.sourceKey;
    if(raw)return raw;
    const day=DAY_BY_TYPE[session.dayType];
    if(day===undefined)return '';
    for(const kind of ['work','prep','support']){
      const group=LEGACY_PROGRAM_2026_09_27[day]?.[kind]||[];
      const idx=group.findIndex(x=>x[0]===e.slotId);
      if(idx>=0)return session.scheduledDate+'-'+day+(kind==='work'?'-'+idx:'-'+kind+'-'+idx);
    }
    return '';
  }
  function projectLogs(data,appState){
    const out=clone(appState.miscLogs||{});
    Object.values(data.sessions||{}).forEach(session=>{
      const day=DAY_BY_TYPE[session.dayType];
      if(day===undefined)return;
      out[session.scheduledDate+'-'+day]={completed:session.status==='completed'};
      (session.exercises||[]).forEach(e=>{
        const key=exerciseSourceKey(session,e);if(!key)return;
        const raw=e.legacy&&e.legacy.raw&&typeof e.legacy.raw==='object'?clone(e.legacy.raw):{};
        const entry={...raw,done:e.status==='completed',sets:(e.sets||[]).map(legacySetFromCanonical)};
        if(e.status==='skipped'&&!entry.done)entry.done=false;
        out[key]=entry;
      });
    });
    return out;
  }
  function projectView(){
    const settings=canonicalSettingsToCompat(currentData.settings||{},currentAppState.compatSettings||{});
    currentView={
      settings,
      logs:projectLogs(currentData,currentAppState),
      measurements:clone(currentAppState.measurementsCurrent||{}),
      smartTimer:clone(currentAppState.smartTimer||null),
      inlineTimer:clone(currentAppState.inlineTimer||null)
    };
    return currentView;
  }
  function issue(path,code,message,severity='error'){return {path,code,message,severity}}
  function validate(data){
    const issues=[];
    if(!data||typeof data!=='object')return {valid:false,issues:[issue('$','root.type','Root must be an object')]};
    if(data.schemaVersion!==1)issues.push(issue('schemaVersion','schema.version','schemaVersion must equal 1'));
    if(!data.meta||typeof data.meta!=='object')issues.push(issue('meta','meta.required','meta is required'));
    if(!data.settings||typeof data.settings!=='object')issues.push(issue('settings','settings.required','settings is required'));
    if(!data.sessions||typeof data.sessions!=='object'||Array.isArray(data.sessions))issues.push(issue('sessions','sessions.type','sessions must be an object'));
    if(!Array.isArray(data.measurements))issues.push(issue('measurements','measurements.type','measurements must be an array'));
    if(!Array.isArray(data.migrationHistory))issues.push(issue('migrationHistory','migrationHistory.type','migrationHistory must be an array'));
    const seenSession=new Set(),seenExercise=new Set(),seenSet=new Set();
    Object.entries(data.sessions||{}).forEach(([key,s])=>{
      const p='sessions.'+key;
      if(!s||typeof s!=='object'){issues.push(issue(p,'session.type','Session must be an object'));return}
      if(!UUID.test(String(s.id||'')))issues.push(issue(p+'.id','id.uuid','Session id must be a UUID'));
      if(seenSession.has(s.id))issues.push(issue(p+'.id','id.duplicate','Duplicate session id'));else seenSession.add(s.id);
      if(s.programId!=='motion12')issues.push(issue(p+'.programId','program.id','programId must be motion12'));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s.scheduledDate||'')))issues.push(issue(p+'.scheduledDate','date.iso','scheduledDate must be YYYY-MM-DD'));
      if(!Number.isInteger(s.weekNumber)||s.weekNumber<1)issues.push(issue(p+'.weekNumber','week.invalid','weekNumber must be positive'));
      if(!Array.isArray(s.exercises))issues.push(issue(p+'.exercises','exercise.array','exercises must be an array'));
      (s.exercises||[]).forEach((e,ei)=>{
        const ep=p+'.exercises['+ei+']';
        if(!UUID.test(String(e.id||'')))issues.push(issue(ep+'.id','id.uuid','Exercise record id must be a UUID'));
        if(seenExercise.has(e.id))issues.push(issue(ep+'.id','id.duplicate','Duplicate exercise record id'));else seenExercise.add(e.id);
        if(!STABLE_ID.test(String(e.exerciseId||'')))issues.push(issue(ep+'.exerciseId','exercise.id','Invalid stable exerciseId'));
        if(!STABLE_ID.test(String(e.slotId||'')))issues.push(issue(ep+'.slotId','slot.id','Invalid stable slotId'));
        if(!CATALOG[e.exerciseId])issues.push(issue(ep+'.exerciseId','exercise.unknown','Exercise id is not in v1 catalogue','warning'));
        if(typeof e.exerciseNameSnapshot!=='string'||!e.exerciseNameSnapshot.trim())issues.push(issue(ep+'.exerciseNameSnapshot','snapshot.name','Exercise name snapshot required'));
        if(!e.prescriptionSnapshot||typeof e.prescriptionSnapshot.rawText!=='string')issues.push(issue(ep+'.prescriptionSnapshot','snapshot.prescription','Prescription snapshot required'));
        if(!Number.isInteger(e.order)||e.order<0)issues.push(issue(ep+'.order','order.invalid','order must be non-negative'));
        (e.sets||[]).forEach((set,si)=>{
          const sp=ep+'.sets['+si+']';
          if(!UUID.test(String(set.id||'')))issues.push(issue(sp+'.id','id.uuid','Set id must be a UUID'));
          if(seenSet.has(set.id))issues.push(issue(sp+'.id','id.duplicate','Duplicate set id'));else seenSet.add(set.id);
          if(!Number.isInteger(set.setNumber)||set.setNumber<1)issues.push(issue(sp+'.setNumber','set.number','setNumber must be >= 1'));
          if(set.reps!==undefined&&(!Number.isInteger(set.reps)||set.reps<0))issues.push(issue(sp+'.reps','set.reps','reps must be non-negative integer'));
          if(set.durationSeconds!==undefined&&(!isFiniteNumber(set.durationSeconds)||set.durationSeconds<0))issues.push(issue(sp+'.durationSeconds','set.duration','durationSeconds must be non-negative'));
          if(set.rir!==undefined&&(!Number.isInteger(set.rir)||set.rir<0||set.rir>10))issues.push(issue(sp+'.rir','set.rir','RIR must be 0..10'));
          if(set.status==='completed'&&set.reps===undefined&&set.durationSeconds===undefined&&set.distanceMeters===undefined&&!set.load)issues.push(issue(sp,'set.empty','Completed set has no performance value'));
        });
      });
    });
    return {valid:!issues.some(x=>x.severity==='error'),value:data,issues};
  }

  class IndexedDBMotion12Repository{
    constructor(){this.db=null}
    open(){
      if(this.db)return Promise.resolve(this.db);
      return new Promise((resolve,reject)=>{
        let settled=false;
        const finish=(fn,value)=>{
          if(settled)return;
          settled=true;
          clearTimeout(timeout);
          fn(value);
        };
        const timeout=setTimeout(()=>{
          finish(reject,new Error('MOTION12 IndexedDB did not respond within 5 seconds'));
        },5000);
        let req;
        try{
          if(!global.indexedDB)throw new Error('IndexedDB is not available in this browser context');
          req=global.indexedDB.open(DB_NAME,DB_VERSION);
        }catch(err){
          finish(reject,err);
          return;
        }
        req.onupgradeneeded=()=>{
          const d=req.result;
          if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'});
        };
        req.onsuccess=()=>{
          if(settled){
            try{req.result?.close?.()}catch(_){}
            return;
          }
          this.db=req.result;
          finish(resolve,this.db);
        };
        req.onerror=()=>finish(reject,req.error||new Error('Unable to open MOTION12 IndexedDB'));
        req.onblocked=()=>finish(reject,new Error('MOTION12 IndexedDB is blocked by another tab or browser context'));
      });
    }
    resetConnection(){
      try{this.db?.close?.()}catch(_){}
      this.db=null;
    }
    async get(key){
      const d=await this.open();
      return new Promise((resolve,reject)=>{
        const req=d.transaction(STORE,'readonly').objectStore(STORE).get(key);
        req.onsuccess=()=>resolve(req.result?req.result.value:null);
        req.onerror=()=>reject(req.error);
      });
    }
    async putMany(records){
      const d=await this.open();
      return new Promise((resolve,reject)=>{
        const tx=d.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
        records.forEach(([key,value])=>store.put({key,value:clone(value)}));
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));
        tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'));
      });
    }
    async load(){return this.get(DATA_RECORD)}
    async save(data){
      const checked=validate(data);
      if(!checked.valid)throw new Error('MOTION12 v1 validation failed: '+checked.issues.filter(x=>x.severity==='error').slice(0,5).map(x=>x.path+' '+x.message).join('; '));
      await this.putMany([[DATA_RECORD,data]]);
      return data;
    }
    async loadAppState(){return this.get(APP_RECORD)}
    async saveState(data,appState){
      const checked=validate(data);
      if(!checked.valid)throw new Error('MOTION12 v1 validation failed: '+checked.issues.filter(x=>x.severity==='error').slice(0,5).map(x=>x.path+' '+x.message).join('; '));
      await this.putMany([[DATA_RECORD,data],[APP_RECORD,appState]]);
    }
    async getSession(id){
      const data=await this.load();return data&&data.sessions&&data.sessions[id]||null;
    }
    async getSessionForDate(date,dayType){
      const data=await this.load();
      return Object.values(data?.sessions||{}).find(s=>s.scheduledDate===date&&s.dayType===dayType)||null;
    }
    async putSession(session){
      const data=await this.load();if(!data)throw new Error('MOTION12 data store is not initialized');
      data.sessions[session.id]=clone(session);data.meta.updatedAt=nowIso();return this.save(data);
    }
    async appendMeasurement(measurement){
      const data=await this.load();if(!data)throw new Error('MOTION12 data store is not initialized');
      data.measurements.push(clone(measurement));data.meta.updatedAt=nowIso();return this.save(data);
    }
    async exportBackup(){
      const data=await this.load(),appState=await this.loadAppState();
      if(!data)throw new Error('MOTION12 data store is empty');
      const checked=validate(data);if(!checked.valid)throw new Error('Cannot export invalid MOTION12 data');
      return JSON.stringify({format:'motion12-backup',backupVersion:1,exportedAt:nowIso(),data,appState:appState||{}},null,2);
    }
    async importBackup(json){
      const parsed=safeParse(json,null);
      if(!parsed)return {valid:false,issues:[issue('$','import.json','Backup is not valid JSON')]};
      const data=parsed.format==='motion12-backup'?parsed.data:parsed;
      const appState=parsed.format==='motion12-backup'?(parsed.appState||{}):{};
      const checked=validate(data);if(!checked.valid)return checked;
      await this.saveState(data,{...defaultAppState(),...appState});
      return checked;
    }
  }

  const repository=new IndexedDBMotion12Repository();

  function defaultAppState(){
    return {version:1,compatSettings:{},miscLogs:{},measurementsCurrent:{},smartTimer:null,inlineTimer:null};
  }
  function readLegacyLocalStorage(){
    // localStorage is migration input only. No code in this repository writes or removes these keys.
    const get=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
    return {
      settings:safeParse(get('motion12.settings'),{}),
      logs:safeParse(get('motion12.logs'),{}),
      measurements:safeParse(get('motion12.measurements'),{}),
      smartTimer:safeParse(get('motion12.timer'),null),
      inlineTimer:safeParse(get('motion12.inlineTimer'),null),
      previousV1:safeParse(get('motion12.data.v1'),null)
    };
  }
  function initialDataFromLegacy(input){
    const stamp=nowIso(),previousValid=input.previousV1&&validate(input.previousV1).valid?input.previousV1:null;
    const sessions=buildSessionsFromLogs(input.logs,input.settings,previousValid&&previousValid.sessions||{});
    const existingMeasurement=measurementRecord(input.measurements,stamp,'legacy:measurements:current');
    const history=previousValid&&Array.isArray(previousValid.migrationHistory)?clone(previousValid.migrationHistory):[];
    if(!history.some(x=>x&&x.source==='legacy-localstorage'&&x.toSchemaVersion===1)){
      history.push({
        id:stableUuid('migration:localstorage-to-indexeddb:v1'),fromSchemaVersion:0,toSchemaVersion:1,
        startedAt:stamp,completedAt:stamp,source:'legacy-localstorage',
        recordsRead:Object.keys(input.logs||{}).length,recordsWritten:Object.keys(sessions).length,
        warnings:[]
      });
    }
    return {
      schemaVersion:1,
      meta:{
        installationId:previousValid?.meta?.installationId||randomUuid(),
        createdAt:previousValid?.meta?.createdAt||stamp,
        updatedAt:stamp,lastMigrationAt:stamp
      },
      profile:previousValid?.profile||{},
      settings:migratedSettings(input.settings),
      sessions,
      measurements:existingMeasurement?[existingMeasurement]:(previousValid?.measurements||[]),
      migrationHistory:history
    };
  }
  function appStateFromLegacy(input){
    return {
      ...defaultAppState(),
      compatSettings:clone(input.settings||{}),
      miscLogs:miscLogsFromLegacy(input.logs,input.settings),
      measurementsCurrent:clone(input.measurements||{}),
      smartTimer:clone(input.smartTimer),
      inlineTimer:clone(input.inlineTimer)
    };
  }
  function emitPersistenceFailure(err,phase='write'){
    lastError=err instanceof Error?err:new Error(String(err));
    try{
      if(typeof global.dispatchEvent==='function'&&typeof global.CustomEvent==='function'){
        global.dispatchEvent(new global.CustomEvent('motion12:persistence-failure',{detail:{phase,error:lastError}}));
      }
    }catch(_){}
  }
  function queuePersist(){
    if(readOnlyMode)return Promise.resolve();
    const data=clone(currentData),app=clone(currentAppState);
    writeChain=writeChain
      .catch(()=>{})
      .then(()=>repository.saveState(data,app))
      .then(()=>{lastError=null})
      .catch(err=>{
        console.error('MOTION12 IndexedDB write failed',err);
        emitPersistenceFailure(err,'write');
      });
    return writeChain;
  }
  function appendMeasurementFromCompat(raw){
    const m=measurementRecord(raw,nowIso(),'measurement:'+nowIso()+':'+JSON.stringify(raw||{}));
    if(!m)return;
    const prev=currentData.measurements[currentData.measurements.length-1];
    if(prev&&measurementSignature(prev)===measurementSignature(m))return;
    currentData.measurements.push(m);
  }
  function applyCompatWrite(key,value){
    if(readOnlyMode){
      const err=new Error('MOTION12 is open in read-only mode. Changes are not being saved.');
      err.name='Motion12ReadOnlyError';
      try{
        if(typeof global.dispatchEvent==='function'&&typeof global.CustomEvent==='function'){
          global.dispatchEvent(new global.CustomEvent('motion12:readonly-write-blocked',{detail:{key,error:err}}));
        }
      }catch(_){}
      return false;
    }
    const parsed=safeParse(value,null);
    if(key==='motion12.settings'){
      const settingsRaw=parsed&&typeof parsed==='object'?parsed:{};
      currentAppState.compatSettings=clone(settingsRaw);
      currentData.settings=migratedSettings(settingsRaw);
    }else if(key==='motion12.logs'){
      const logsRaw=parsed&&typeof parsed==='object'?parsed:{};
      currentAppState.miscLogs=miscLogsFromLegacy(logsRaw,currentAppState.compatSettings);
      currentData.sessions=buildSessionsFromLogs(logsRaw,currentAppState.compatSettings,currentData.sessions||{});
    }else if(key==='motion12.measurements'){
      const raw=parsed&&typeof parsed==='object'?parsed:{};
      currentAppState.measurementsCurrent=clone(raw);
      appendMeasurementFromCompat(raw);
    }else if(key==='motion12.timer'){
      currentAppState.smartTimer=clone(parsed);
    }else if(key==='motion12.inlineTimer'){
      currentAppState.inlineTimer=clone(parsed);
    }else{
      throw new Error('Unsupported MOTION12 compatibility write: '+key);
    }
    currentData.meta.updatedAt=nowIso();
    projectView();
    queuePersist();
    return true;
  }
  async function bootstrap(){
    readOnlyMode=false;
    recoverySource='';
    lastError=null;
    repository.resetConnection();
    await repository.open();
    let data=await repository.load(),app=await repository.loadAppState();
    if(!data){
      const input=readLegacyLocalStorage();
      data=initialDataFromLegacy(input);
      app=appStateFromLegacy(input);
      const checked=validate(data);
      if(!checked.valid)throw new Error('MOTION12 migration validation failed: '+checked.issues.filter(x=>x.severity==='error').map(x=>x.path+' '+x.message).join('; '));
      await repository.saveState(data,app);
      await repository.putMany([[MIGRATION_RECORD,{source:'localStorage',completedAt:nowIso(),readOnlySource:true}]]);
    }else{
      const checked=validate(data);
      if(!checked.valid)throw new Error('MOTION12 IndexedDB data failed validation: '+checked.issues.filter(x=>x.severity==='error').map(x=>x.path+' '+x.message).join('; '));
      app={...defaultAppState(),...(app||{})};
    }
    currentData=data;
    currentAppState=app;
    projectView();
    return {valid:true,value:clone(currentData),issues:[],readOnly:false,source:'IndexedDB'};
  }
  async function readIndexedDbCandidate(){
    try{
      repository.resetConnection();
      await repository.open();
      const data=await repository.load();
      if(!data)return null;
      const checked=validate(data);
      if(!checked.valid)return null;
      const app={...defaultAppState(),...(await repository.loadAppState()||{})};
      return {data,app,source:'IndexedDB'};
    }catch(_){
      return null;
    }
  }
  function legacyReadOnlyCandidate(){
    const input=readLegacyLocalStorage();
    const data=initialDataFromLegacy(input);
    const checked=validate(data);
    if(!checked.valid){
      throw new Error('Legacy recovery data failed validation: '+checked.issues.filter(x=>x.severity==='error').map(x=>x.path+' '+x.message).join('; '));
    }
    return {data,app:appStateFromLegacy(input),source:'localStorage migration snapshot'};
  }
  async function enterReadOnly(){
    let candidate=null;
    if(currentData&&validate(currentData).valid){
      candidate={
        data:clone(currentData),
        app:{...defaultAppState(),...(clone(currentAppState)||{})},
        source:recoverySource||'in-memory recovery state'
      };
    }
    // Critical recovery invariant: read-only must never depend on IndexedDB.
    // If no valid in-memory state exists, recover directly from the untouched
    // localStorage migration source.
    if(!candidate)candidate=legacyReadOnlyCandidate();
    currentData=candidate.data;
    currentAppState=candidate.app;
    readOnlyMode=true;
    recoverySource=candidate.source;
    lastError=null;
    projectView();
    return {valid:true,value:clone(currentData),issues:[],readOnly:true,source:recoverySource};
  }
  async function retryPersistence(){
    if(!currentData)return bootstrap();
    const checked=validate(currentData);
    if(!checked.valid)throw new Error('Cannot retry persistence with invalid in-memory data');
    repository.resetConnection();
    await repository.open();
    await repository.saveState(currentData,currentAppState||defaultAppState());
    readOnlyMode=false;
    recoverySource='';
    lastError=null;
    return {valid:true,value:clone(currentData),issues:[],readOnly:false,source:'IndexedDB'};
  }
  async function retryBootstrap(){
    return currentData?retryPersistence():bootstrap();
  }
  function parseBackupEnvelope(json){
    const parsed=safeParse(json,null);
    if(!parsed)return {valid:false,issues:[issue('$','import.json','Backup is not valid JSON')]};
    const data=parsed.format==='motion12-backup'?parsed.data:parsed;
    const appState=parsed.format==='motion12-backup'?(parsed.appState||{}):{};
    const checked=validate(data);
    if(!checked.valid)return checked;
    return {valid:true,value:data,appState:{...defaultAppState(),...appState},issues:[]};
  }
  async function recoverFromBackup(json){
    const parsed=parseBackupEnvelope(json);
    if(!parsed.valid)return parsed;
    currentData=clone(parsed.value);
    currentAppState=clone(parsed.appState);
    projectView();
    try{
      repository.resetConnection();
      await repository.open();
      await repository.saveState(currentData,currentAppState);
      readOnlyMode=false;
      recoverySource='';
      lastError=null;
      return {valid:true,value:clone(currentData),issues:[],persisted:true,readOnly:false,source:'IndexedDB'};
    }catch(err){
      readOnlyMode=true;
      recoverySource='imported backup';
      emitPersistenceFailure(err,'backup-import');
      return {
        valid:true,value:clone(currentData),issues:[],
        persisted:false,readOnly:true,source:recoverySource,
        error:String(err&&err.message||err)
      };
    }
  }
  function view(){
    if(!currentView)throw new Error('MOTION12 persistence has not finished bootstrapping');
    return clone(currentView);
  }
  function status(){
    if(!currentData){
      return {
        valid:false,schemaVersion:null,sessions:0,measurements:0,
        storage:'IndexedDB',readOnly:false,recoverySource:null,pendingWrites:lastError?1:0,
        lastError:lastError?String(lastError.message||lastError):null,
        issues:[issue('$','data.not-ready','Repository not initialized')]
      };
    }
    const checked=validate(currentData);
    return {
      valid:checked.valid,
      schemaVersion:currentData.schemaVersion,
      databaseName:DB_NAME,
      databaseVersion:DB_VERSION,
      installationId:currentData.meta&&currentData.meta.installationId||null,
      updatedAt:currentData.meta&&currentData.meta.updatedAt||null,
      programVersion:PROGRAM_VERSION,
      sessions:Object.keys(currentData.sessions||{}).length,
      measurements:(currentData.measurements||[]).length,
      storage:readOnlyMode?'Read-only memory':'IndexedDB',
      readOnly:readOnlyMode,
      recoverySource:recoverySource||null,
      legacySource:'localStorage read-only migration input',
      pendingWrites:lastError?1:0,
      lastError:lastError?String(lastError.message||lastError):null,
      issues:checked.issues
    };
  }
  async function flush(){
    await writeChain;
    if(lastError)throw lastError;
  }
  async function exportBackup(){
    if(!currentData)throw new Error('MOTION12 data store is not initialized');
    const checked=validate(currentData);
    if(!checked.valid)throw new Error('Cannot export invalid MOTION12 data');
    if(!readOnlyMode&&!lastError)await flush();
    return JSON.stringify({
      format:'motion12-backup',
      backupVersion:1,
      exportedAt:nowIso(),
      data:clone(currentData),
      appState:clone(currentAppState||defaultAppState())
    },null,2);
  }
  async function downloadBackup(){
    const text=await exportBackup();
    const blob=new Blob([text],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;
    a.download='motion12-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  async function importBackup(json){
    return recoverFromBackup(json);
  }

  const api={
    SCHEMA_VERSION,PROGRAM_VERSION,DB_NAME,DB_VERSION,
    repository,
    catalogue:Object.freeze(Object.fromEntries(Object.entries(CATALOG).map(([id,v])=>[id,Object.freeze({id,name:v[0],category:v[1],measurementType:v[2],laterality:v[3]})]))),
    legacyProgram:Object.freeze(LEGACY_PROGRAM_2026_09_27),
    bootstrap,retryBootstrap,retryPersistence,enterReadOnly,recoverFromBackup,
    view,status,validate,flush,exportBackup,downloadBackup,importBackup,
    isReadOnly:()=>readOnlyMode,
    stableUuid
  };
  global.IndexedDBMotion12Repository=IndexedDBMotion12Repository;
  global.Motion12Persistence=api;
  global.motion12SetItem=applyCompatWrite;
})(window);
