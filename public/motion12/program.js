const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const short=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const program={
  1:{name:'Strength A',why:'Your highest-quality strength session before the fast begins.',time:'30 min',tone:'volt',diet:'Fast starts after training',work:[
    ['Goblet squat','3 × 6–10','Choose load for ~3 reps in reserve.','10/10/10 with ≥2 RIR twice → next kettlebell.'],
    ['Ring row / pull-up','3 × 6–10','Rigid body; chest reaches the same point each rep.','3 × 10 twice → move feet 10–15 cm forward. Pull-up: 3 × 6 twice → add 2–4 kg.'],
    ['Kettlebell Romanian deadlift','3 × 8–12','Hips back; feel hamstrings and glutes, not lumbar strain.','12/12/12 with ≥2 RIR twice → increase load.'],
    ['1-arm kettlebell press','3 × 6–10 / side','No side lean or leg drive. Let weaker arm govern.','10/10/10 both arms twice → next bell or heavy-set migration.'],
    ['Suitcase carry','2 × 45–60 sec / side','Walk tall; no leaning toward or away from bell.','2 × 60 sec twice → next bell, reset to 30–45 sec.'],
    ['Pallof press','2 × 8–12 / side','Keep ribs and pelvis square.','2 × 12 twice → stronger band or step 10–15 cm farther.']
  ]},
  2:{name:'Restore',why:'You are finishing the fast. Move, loosen up and recover instead of chasing fatigue.',time:'12–15 min',tone:'cyan',diet:'Break fast after session',work:[
    ['Kettlebell deadlift','2 × 10','Easy technique practice.','Keep ~4–5 repetitions in reserve.'],
    ['Goblet squat','2 × 5','Smooth full comfortable range.','No progression today.'],
    ['Ring row','2 × 8','Easy pull; shoulders away from ears.','No progression today.'],
    ['Band face pull','2 × 15','Pull toward eye level.','Quality only.'],
    ['Single-leg calf raise','2 × 12 / side','Pause 1–2 sec at the top.','No progression today.'],
    ['Suitcase carry','2 × 30 sec / side','Tall posture, easy effort.','No progression today.']
  ]},
  3:{name:'Strength B',why:'Unilateral strength, pushing, pulling, posterior chain and controlled rotation.',time:'28 min',tone:'pink',diet:'High-protein eating day',work:[
    ['Reverse lunge','3 × 6–10 / leg','Equal stride and depth. Weaker leg governs.','3 × 10 both legs twice → increase kettlebell.'],
    ['Push-up','3 × 8–15','Choose variation that leaves ~3 reps in reserve.','3 × 15 twice → lower incline / floor / feet elevated / rings.'],
    ['1-arm kettlebell row','3 × 8–12 / side','Minimal torso rotation; pull with upper back.','3 × 12 twice → next kettlebell.'],
    ['Back extension','2 × 10–15','Finish straight, not hyperextended.','2 × 15 twice → hold light kettlebell at chest.'],
    ['Single-leg calf raise','2 × 10–15 / side','Full stretch; pause at top.','2 × 15 twice → add kettlebell.'],
    ['Band chop','2 × 8–12 / side','Rotate through feet, hips and thoracic spine.','2 × 12 twice → stronger band or step farther.']
  ]},
  4:{name:'Swing Power',why:'Explosive hip power plus compact cardiovascular conditioning.',time:'12–18 min',tone:'orange',diet:'High-protein eating day',work:[
    ['2-hand kettlebell swing','See weekly target','Every rep should snap. Stop before technique slows.','Complete 10 × 10 twice at ≤7–8/10 effort → next bell, reset to 6–8 × 8.']
  ]},
  5:{name:'Strength C',why:'Frontal-plane strength plus another balanced full-body exposure.',time:'30 min',tone:'volt',diet:'High-protein eating day',work:[
    ['Lateral lunge','3 × 6–8 / side','Sit into the working hip; control frontal plane.','3 × 8 twice at same depth → add/increase goblet load.'],
    ['Goblet squat','2 × 8–12','Full comfortable range.','12/12 twice with ≥2 RIR → next kettlebell.'],
    ['Ring row / pull-up','3 × 6–10','Strong scapular control.','Use Monday progression rule.'],
    ['Push-up','2 × 8–15','Same variation and depth each rep.','2 × 15 twice → harder variation.'],
    ['Kettlebell Romanian deadlift','2 × 8–12','Controlled lowering; strong hip extension.','12/12 twice → increase load.'],
    ['Suitcase carry','2 × 45 sec / side','Tall and quiet trunk.','60 sec twice → next bell.'],
    ['Pallof press / band chop','2 × 10 / side','Odd weeks Pallof; even weeks chop.','Progress band only when movement is crisp.']
  ]},
  6:{name:'Aerobic Power',why:'Raise maximal oxygen uptake without grip or kettlebell technique being the limiter.',time:'30–40 min',tone:'cyan',diet:'High-protein eating day',work:[
    ['Aerobic intervals','See weekly target','Uphill walk, jog, bike or stairs. Keep output repeatable.','Increase pace only if all intervals complete, <5% fade, ≤8.5/10 finish and recovery is adequate.']
  ]},
  0:{name:'Reset',why:'Absorb the week. Mobility and normal walking only.',time:'8 min',tone:'cyan',diet:'Normal eating day',work:[]}
};
const mobility=[
 ['Chin tuck','5 × 5 sec'],['Open-book rotation','5 / side'],['Band face pull','15'],['Wall slide','8'],['90/90 hip rotation','6 / side'],['Figure-four glute stretch','30 sec / side'],['Lateral step + cross-body reach','5 / side']
];
const swingTargets=['6 × 8 = 48','7 × 8 = 56','8 × 8 = 64','10 × 8 = 80','8 × 10 = 80','9 × 10 = 90','10 × 10 = 100','6 × 8 = 48 deload','10 × 10 = 100','11 × 10 = 110','12 × 10 = 120','8 × 8 = 64 consolidate'];
const aerobicTargets=['40 min brisk / hills','40 min brisk / hills','40 min brisk / hills','40 min brisk / hills','3 × 3 min hard / 3 min easy','4 × 3 min hard / 3 min easy','4 × 4 min hard / 3 min easy','30–40 min easy','4 × 4 min hard / 3 min easy','4 × 4 min hard / 3 min easy','4 × 4 min hard / 3 min easy','2 km walk test'];

const ytSearch=(q)=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q+' short proper form');
const videoLinks={
  'Goblet squat':'https://www.youtube.com/watch?v=MWHIs0zxkCU',
  'Ring row / pull-up':ytSearch('ring row pull up technique'),
  'Ring row':ytSearch('ring row technique'),
  'Kettlebell Romanian deadlift':ytSearch('kettlebell Romanian deadlift'),
  '1-arm kettlebell press':'https://www.youtube.com/watch?v=1r7_B5NT6Eo',
  'Suitcase carry':'https://www.youtube.com/watch?v=Q1GjhRDAil0',
  'Pallof press':'https://www.youtube.com/watch?v=axgv7H_VQOo',
  'Kettlebell deadlift':ytSearch('kettlebell deadlift'),
  'Band face pull':ytSearch('band face pull'),
  'Single-leg calf raise':ytSearch('single leg calf raise'),
  'Reverse lunge':ytSearch('kettlebell reverse lunge'),
  'Push-up':'https://www.youtube.com/watch?v=WDIpL0pjun0',
  '1-arm kettlebell row':ytSearch('one arm kettlebell row'),
  'Back extension':'https://www.youtube.com/watch?v=dF_V3358Dkc',
  'Band chop':ytSearch('resistance band wood chop'),
  '2-hand kettlebell swing':ytSearch('StrongFirst two hand kettlebell swing'),
  'Lateral lunge':ytSearch('kettlebell lateral lunge'),
  'Pallof press / band chop':ytSearch('Pallof press band chop'),
  'Aerobic intervals':ytSearch('4x4 VO2 max interval protocol'),
  'Chin tuck':ytSearch('chin tuck neck exercise'),
  'Open-book rotation':ytSearch('open book thoracic rotation'),
  'Wall slide':ytSearch('wall slide shoulder mobility'),
  '90/90 hip rotation':ytSearch('90 90 hip rotation'),
  'Figure-four glute stretch':ytSearch('figure four glute stretch'),
  'Lateral step + cross-body reach':ytSearch('lateral step cross body reach mobility')
};
function videoFor(name){return videoLinks[name]||ytSearch(name)}
