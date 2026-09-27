(function(global){
  'use strict';

  const SCHEMA_VERSION=1;
  const PROGRAM_VERSION='2026.09.27';
  const DATA_KEY='motion12.data.v1';
  const BACKUP_PREFIX='motion12.backup.pre-v1.';
  const LEGACY_KEYS=['motion12.settings','motion12.logs','motion12.measurements'];
  const STABLE_ID=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const DAY_TYPES={
    0:'aerobic-base',1:'strength-a',2:'restore-circuit',3:'strength-b',
    4:'power-circuit',5:'strength-c',6:'aerobic-power'
  };

  // Frozen map for the legacy index-based program that existed when v1 was introduced.
  // Never rewrite this map to match a future program order.
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

  function safeParse(raw,fallback){
    try{return raw==null?fallback:JSON.parse(raw)}catch(_){return fallback}
  }
  function nowIso(){return new Date().toISOString()}
  function dateIsoTime(date){return date+'T00:00:00.000Z'}
  function isFiniteNumber(v){return typeof v==='number'&&Number.isFinite(v)}
  function numeric(v){
    if(v===null||v===undefined||v==='')return undefined;
    const n=Number(v); return Number.isFinite(n)?n:undefined;
  }
  function stableUuid(seed){
    function h(str,offset){
      let x=2166136261^offset;
      for(let i=0;i<str.length;i++){x^=str.charCodeAt(i);x=Math.imul(x,16777619)}
      return (x>>>0).toString(16).padStart(8,'0');
    }
    const hex=(h(seed,0)+h(seed,1)+h(seed,2)+h(seed,3)).slice(0,32).split('');
    hex[12]='4';
    hex[16]=(['8','9','a','b'][parseInt(hex[16],16)%4]);
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
    const set=String(raw||'').match(/^\s*(\d+)\s*×/);
    if(set)out.sets=Number(set[1]);
    const durationRange=String(raw||'').match(/(\d+)\s*[–-]\s*(\d+)\s*sec/i);
    if(durationRange)out.durationRangeSeconds={min:Number(durationRange[1]),max:Number(durationRange[2])};
    else{
      const repRange=String(raw||'').match(/(\d+)\s*[–-]\s*(\d+)/);
      if(repRange)out.repRange={min:Number(repRange[1]),max:Number(repRange[2])};
    }
    const fixed=String(raw||'').match(/(?:^|\D)(\d+)\s*sec(?:\D|$)/i);
    if(fixed&&!out.durationRangeSeconds)out.fixedDurationSeconds=Number(fixed[1]);
    const rest=restSecondsFor(exerciseId);
    if(rest!==undefined)out.restSeconds=rest;
    if(['strength','carry','core'].includes((CATALOG[exerciseId]||[])[1]))out.targetRir={min:2};
    return out;
  }
  function normalizeLoad(raw,exerciseId){
    if(raw===undefined||raw===null||String(raw).trim()==='')return undefined;
    const s=String(raw).trim(),lower=s.toLowerCase();
    const n=Number(s.replace(/\s*kg\s*$/i,''));
    if(Number.isFinite(n)&&n>=0)return {type:'external',valueKg:n,display:s};
    if(/^(bw|bodyweight)$/i.test(s))return {type:'bodyweight',display:s};
    if(/assist|band/i.test(lower))return {type:'assisted',method:s,display:s};
    if(exerciseId==='push-up'||exerciseId==='ring-row'||exerciseId==='plank-shoulder-tap')return {type:'variation',variation:s,display:s};
    return {type:'variation',variation:s,display:s};
  }
  function setFromLegacy(sourceKey,exerciseId,set,i){
    const def=CATALOG[exerciseId]||[];
    const status=set&&set.complete?'completed':set&&set.skipped?'skipped':'planned';
    const out={
      id:stableUuid(sourceKey+':set:'+i),
      setNumber:i+1,
      status,
      legacy:{sourceKey,raw:set&&typeof set==='object'?{...set}:{value:set}}
    };
    const load=normalizeLoad(set&&set.load,exerciseId); if(load)out.load=load;
    const value=numeric(set&&set.reps);
    if(value!==undefined){
      if(def[2]==='load-time'||def[2]==='bodyweight-time')out.durationSeconds=value;
      else out.reps=Math.max(0,Math.round(value));
    }
    const rir=numeric(set&&set.rir); if(rir!==undefined)out.rir=Math.max(0,Math.min(10,Math.round(rir)));
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
  function buildLegacySnapshot(){
    const out={capturedAt:nowIso(),keys:{}};
    ['motion12.settings','motion12.logs','motion12.measurements','motion12.timer','motion12.inlineTimer'].forEach(k=>{
      const raw=localStorage.getItem(k); if(raw!==null)out.keys[k]=raw;
    });
    return out;
  }
  function backupLegacyOnce(){
    if(localStorage.getItem('motion12.backup.pre-v1.created'))return null;
    const stamp=nowIso().replace(/[:.]/g,'-');
    const key=BACKUP_PREFIX+stamp;
    localStorage.setItem(key,JSON.stringify(buildLegacySnapshot()));
    localStorage.setItem('motion12.backup.pre-v1.created',key);
    return key;
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
  function measurementFromLegacy(raw,stamp){
    if(!raw||typeof raw!=='object'||!Object.keys(raw).length)return [];
    const bp=String(raw.bp||'').match(/(\d+)\s*\/\s*(\d+)/);
    const m={
      id:stableUuid('legacy:measurements:current'),
      recordedAt:stamp
    };
    const weight=numeric(raw.weight);if(weight!==undefined)m.bodyweightKg=weight;
    const waist=numeric(raw.waist);if(waist!==undefined)m.waistCm=waist;
    if(bp)m.bloodPressure={systolic:Number(bp[1]),diastolic:Number(bp[2])};
    const rhr=numeric(raw.rhr);if(rhr!==undefined)m.restingHeartRateBpm=rhr;
    const walk=numeric(raw.walk);if(walk!==undefined)m.walk2kmSeconds=Math.round(walk*60);
    const pushups=numeric(raw.pushups);if(pushups!==undefined)m.strictPushups=Math.round(pushups);
    return Object.keys(m).length>2?[m]:[];
  }
  function legacyExerciseRecord(key,parsed,entry,sessionCompleted){
    const exerciseId=parsed.exerciseId;
    const sets=Array.isArray(entry&&entry.sets)?entry.sets.map((s,i)=>setFromLegacy(key,exerciseId,s,i)):[];
    const hasWork=sets.some(s=>s.status==='completed')||!!(entry&&(entry.load||entry.reps||entry.rir));
    let status=entry&&entry.done?'completed':hasWork?'in-progress':'not-started';
    if(sessionCompleted&&status==='not-started')status='skipped';
    const result={
      id:stableUuid('legacy:exercise:'+key),
      slotId:parsed.slotId,
      exerciseId,
      exerciseNameSnapshot:parsed.name,
      order:parsed.order,
      prescriptionSnapshot:prescription(parsed.target,exerciseId),
      status,
      sets,
      legacy:{sourceKey:key,raw:entry&&typeof entry==='object'?{...entry}:{value:entry}}
    };
    if(!sets.length&&entry&&(entry.load||entry.reps||entry.rir)){
      result.legacy.raw={...result.legacy.raw,unparsedAggregate:{load:entry.load,reps:entry.reps,rir:entry.rir}};
    }
    const times=sets.map(s=>s.completedAt).filter(Boolean).sort();
    if(times.length)result.completedAt=times[times.length-1];
    return result;
  }
  function sessionShell(date,day,startDate){
    const week=weekForDate(date,startDate),stamp=dateIsoTime(date);
    return {
      id:stableUuid('legacy:session:'+date+':'+day),
      programId:'motion12',
      programVersion:PROGRAM_VERSION,
      scheduledDate:date,
      dayType:DAY_TYPES[day]||'aerobic-base',
      weekNumber:week,
      status:'planned',
      exercises:[],
      createdAt:stamp,
      updatedAt:stamp,
      legacy:{sourceKey:date+'-'+day,raw:{}}
    };
  }
  function migrateLegacy(existing){
    const settingsRaw=safeParse(localStorage.getItem('motion12.settings'),{});
    const logsRaw=safeParse(localStorage.getItem('motion12.logs'),{});
    const measurementsRaw=safeParse(localStorage.getItem('motion12.measurements'),{});
    const startDate=settingsRaw.startDate||undefined;
    const sessionsByKey={};
    const sessionCompletion={};
    let recordsRead=0,warnings=[];

    Object.keys(logsRaw||{}).forEach(key=>{
      const sk=parseSessionKey(key);
      if(sk&&logsRaw[key]&&typeof logsRaw[key]==='object'&&Object.prototype.hasOwnProperty.call(logsRaw[key],'completed')){
        sessionCompletion[sk.date+':'+sk.day]=!!logsRaw[key].completed;
      }
    });

    Object.keys(logsRaw||{}).forEach(key=>{
      const parsed=parseExerciseKey(key,startDate);
      if(!parsed)return;
      recordsRead++;
      const groupKey=parsed.date+':'+parsed.day;
      const session=sessionsByKey[groupKey]||(sessionsByKey[groupKey]=sessionShell(parsed.date,parsed.day,startDate));
      session.exercises.push(legacyExerciseRecord(key,parsed,logsRaw[key],!!sessionCompletion[groupKey]));
    });

    Object.keys(sessionCompletion).forEach(groupKey=>{
      if(!sessionsByKey[groupKey]){
        const parts=groupKey.split(':');
        sessionsByKey[groupKey]=sessionShell(parts[0],Number(parts[1]),startDate);
      }
    });

    Object.keys(sessionsByKey).forEach(groupKey=>{
      const s=sessionsByKey[groupKey],done=!!sessionCompletion[groupKey];
      const day=Number(groupKey.split(':')[1]),week=weekForDate(s.scheduledDate,startDate);
      const work=LEGACY_PROGRAM_2026_09_27[day]?.work||[];
      work.forEach((_,index)=>{
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
      if(done)s.completedAt=s.scheduledDate+'T23:59:59.000Z';
      s.updatedAt=s.completedAt||s.createdAt;
    });

    const stamp=existing&&existing.meta&&existing.meta.lastMigrationAt||nowIso();
    const installationId=existing&&existing.meta&&existing.meta.installationId||randomUuid();
    const oldHistory=existing&&Array.isArray(existing.migrationHistory)?existing.migrationHistory:[];
    const firstMigration=!oldHistory.some(x=>x&&x.toSchemaVersion===1&&x.source==='legacy-localstorage');
    const migrationRecord=firstMigration?[{
      id:stableUuid('migration:legacy:v1'),
      fromSchemaVersion:0,
      toSchemaVersion:1,
      startedAt:stamp,
      completedAt:stamp,
      source:'legacy-localstorage',
      recordsRead,
      recordsWritten:Object.keys(sessionsByKey).length,
      warnings
    }]:[];

    return {
      schemaVersion:1,
      meta:{
        installationId,
        createdAt:existing&&existing.meta&&existing.meta.createdAt||stamp,
        updatedAt:nowIso(),
        lastMigrationAt:firstMigration?stamp:(existing&&existing.meta&&existing.meta.lastMigrationAt||stamp)
      },
      profile:existing&&existing.profile||{},
      settings:migratedSettings(settingsRaw),
      sessions:Object.fromEntries(Object.values(sessionsByKey).map(s=>[s.id,s])),
      measurements:measurementFromLegacy(measurementsRaw,stamp),
      migrationHistory:oldHistory.concat(migrationRecord)
    };
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
      if(seenSession.has(s.id))issues.push(issue(p+'.id','id.duplicate','Duplicate session id')); else seenSession.add(s.id);
      if(s.programId!=='motion12')issues.push(issue(p+'.programId','program.id','programId must be motion12'));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s.scheduledDate||'')))issues.push(issue(p+'.scheduledDate','date.iso','scheduledDate must be YYYY-MM-DD'));
      if(!Number.isInteger(s.weekNumber)||s.weekNumber<1)issues.push(issue(p+'.weekNumber','week.invalid','weekNumber must be a positive integer'));
      if(!Array.isArray(s.exercises))issues.push(issue(p+'.exercises','exercise.array','exercises must be an array'));
      (s.exercises||[]).forEach((e,ei)=>{
        const ep=p+'.exercises['+ei+']';
        if(!UUID.test(String(e.id||'')))issues.push(issue(ep+'.id','id.uuid','Exercise record id must be a UUID'));
        if(seenExercise.has(e.id))issues.push(issue(ep+'.id','id.duplicate','Duplicate exercise record id')); else seenExercise.add(e.id);
        if(!STABLE_ID.test(String(e.exerciseId||'')))issues.push(issue(ep+'.exerciseId','exercise.id','Invalid stable exerciseId'));
        if(!STABLE_ID.test(String(e.slotId||'')))issues.push(issue(ep+'.slotId','slot.id','Invalid stable slotId'));
        if(!CATALOG[e.exerciseId])issues.push(issue(ep+'.exerciseId','exercise.unknown','Exercise id is not in v1 catalogue','warning'));
        if(typeof e.exerciseNameSnapshot!=='string'||!e.exerciseNameSnapshot.trim())issues.push(issue(ep+'.exerciseNameSnapshot','snapshot.name','Exercise name snapshot required'));
        if(!e.prescriptionSnapshot||typeof e.prescriptionSnapshot.rawText!=='string')issues.push(issue(ep+'.prescriptionSnapshot','snapshot.prescription','Prescription snapshot required'));
        if(!Number.isInteger(e.order)||e.order<0)issues.push(issue(ep+'.order','order.invalid','order must be a non-negative integer'));
        (e.sets||[]).forEach((set,si)=>{
          const sp=ep+'.sets['+si+']';
          if(!UUID.test(String(set.id||'')))issues.push(issue(sp+'.id','id.uuid','Set id must be a UUID'));
          if(seenSet.has(set.id))issues.push(issue(sp+'.id','id.duplicate','Duplicate set id')); else seenSet.add(set.id);
          if(!Number.isInteger(set.setNumber)||set.setNumber<1)issues.push(issue(sp+'.setNumber','set.number','setNumber must be >= 1'));
          if(set.reps!==undefined&&(!Number.isInteger(set.reps)||set.reps<0))issues.push(issue(sp+'.reps','set.reps','reps must be a non-negative integer'));
          if(set.durationSeconds!==undefined&&(!isFiniteNumber(set.durationSeconds)||set.durationSeconds<0))issues.push(issue(sp+'.durationSeconds','set.duration','durationSeconds must be non-negative'));
          if(set.distanceMeters!==undefined&&(!isFiniteNumber(set.distanceMeters)||set.distanceMeters<0))issues.push(issue(sp+'.distanceMeters','set.distance','distanceMeters must be non-negative'));
          if(set.rir!==undefined&&(!Number.isInteger(set.rir)||set.rir<0||set.rir>10))issues.push(issue(sp+'.rir','set.rir','RIR must be an integer from 0 to 10'));
          if(set.status==='completed'&&set.reps===undefined&&set.durationSeconds===undefined&&set.distanceMeters===undefined&&!set.load){
            issues.push(issue(sp,'set.empty','Completed set has no performance value'));
          }
          if(set.load&&set.load.type==='external'&&(!isFiniteNumber(set.load.valueKg)||set.load.valueKg<0))issues.push(issue(sp+'.load.valueKg','load.invalid','External load must be non-negative'));
          if(set.load&&set.load.type==='variation'&&(!set.load.variation||!String(set.load.variation).trim()))issues.push(issue(sp+'.load.variation','load.variation','Variation text required'));
        });
      });
    });
    return {valid:!issues.some(x=>x.severity==='error'),value:data,issues};
  }
  function load(){
    const raw=localStorage.getItem(DATA_KEY);
    if(!raw)return null;
    const parsed=safeParse(raw,null);
    if(!parsed)return null;
    return parsed;
  }
  function save(data){
    const checked=validate(data);
    if(!checked.valid)throw new Error('MOTION12 v1 validation failed: '+checked.issues.filter(x=>x.severity==='error').map(x=>x.path+' '+x.message).slice(0,5).join('; '));
    localStorage.setItem(DATA_KEY,JSON.stringify(data));
    return data;
  }
  function syncFromLegacy(){
    const existing=load();
    const migrated=migrateLegacy(existing);
    const checked=validate(migrated);
    if(!checked.valid){
      localStorage.setItem('motion12.data.v1.lastError',JSON.stringify({at:nowIso(),issues:checked.issues}));
      return checked;
    }
    localStorage.setItem(DATA_KEY,JSON.stringify(migrated));
    localStorage.removeItem('motion12.data.v1.lastError');
    return checked;
  }
  function bootstrap(){
    backupLegacyOnce();
    const existing=load();
    if(existing){
      const checked=validate(existing);
      if(!checked.valid){
        localStorage.setItem('motion12.data.v1.lastError',JSON.stringify({at:nowIso(),issues:checked.issues}));
        return checked;
      }
    }
    return syncFromLegacy();
  }
  let syncTimer=0;
  function legacySetItem(key,value){
    localStorage.setItem(key,value);
    if(LEGACY_KEYS.includes(key)){
      clearTimeout(syncTimer);
      syncTimer=setTimeout(()=>{try{syncFromLegacy()}catch(e){localStorage.setItem('motion12.data.v1.lastError',JSON.stringify({at:nowIso(),message:String(e)}))}},0);
    }
  }
  function exportBackup(){
    const data=load()||migrateLegacy(null);
    const checked=validate(data);
    if(!checked.valid)throw new Error('Cannot export invalid MOTION12 v1 data');
    return JSON.stringify(data,null,2);
  }
  function downloadBackup(){
    const blob=new Blob([exportBackup()],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='motion12-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function importBackup(json){
    const parsed=safeParse(json,null);
    if(!parsed)return {valid:false,issues:[issue('$','import.json','Backup is not valid JSON')]};
    const checked=validate(parsed);
    if(!checked.valid)return checked;
    const previous=localStorage.getItem(DATA_KEY);
    if(previous)localStorage.setItem('motion12.backup.pre-import.'+nowIso().replace(/[:.]/g,'-'),previous);
    localStorage.setItem(DATA_KEY,JSON.stringify(parsed));
    return checked;
  }
  function status(){
    const data=load(),checked=data?validate(data):{valid:false,issues:[issue('$','data.missing','No v1 store found')]};
    return {
      schemaVersion:data&&data.schemaVersion,
      valid:checked.valid,
      sessions:data?Object.keys(data.sessions||{}).length:0,
      measurements:data&&Array.isArray(data.measurements)?data.measurements.length:0,
      backupKey:localStorage.getItem('motion12.backup.pre-v1.created'),
      issues:checked.issues
    };
  }

  const api={
    SCHEMA_VERSION,PROGRAM_VERSION,DATA_KEY,
    catalogue:Object.freeze(Object.fromEntries(Object.entries(CATALOG).map(([id,v])=>[id,Object.freeze({id,name:v[0],category:v[1],measurementType:v[2],laterality:v[3]})]))),
    legacyProgram:Object.freeze(LEGACY_PROGRAM_2026_09_27),
    bootstrap,syncFromLegacy,validate,load,save,legacySetItem,
    exportBackup,downloadBackup,importBackup,status,
    stableUuid
  };

  global.Motion12Persistence=api;
  global.motion12SetItem=legacySetItem;
})(window);
