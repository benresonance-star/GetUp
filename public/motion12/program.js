const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const short=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const program={
  1:{name:'Strength A',why:'Your highest-quality strength session before the fast begins.',time:'30 min',tone:'volt',diet:'Fast starts after training',prep:[
    ['Kettlebell halo','1–2 × 5 / direction','Use a light bell. Keep ribs stacked and move slowly around the head without forcing range.']
  ],work:[
    ['Goblet squat','3 × 6–10','Choose load for ~3 reps in reserve.','10/10/10 with ≥2 RIR twice → next kettlebell.'],
    ['Pull-up / assisted pull-up','3 × 5–8','Start from a controlled hang; drive elbows down and keep ribs quiet. Use assistance if needed to keep every rep clean.','3 × 8 twice with ≥2 RIR → add 1–2 kg. If assisted, reduce assistance one step and return to 5–6 clean reps.'],
    ['Kettlebell Romanian deadlift','3 × 8–12','Hips back; feel hamstrings and glutes, not lumbar strain.','12/12/12 with ≥2 RIR twice → increase load.'],
    ['1-arm kettlebell press','3 × 6–10 / side','No side lean or leg drive. Let weaker arm govern.','10/10/10 both arms twice → next bell or heavy-set migration.'],
    ['Suitcase carry','2 × 45–60 sec / side','Walk tall; no leaning toward or away from bell.','2 × 60 sec twice → next bell, reset to 30–45 sec.'],
    ['Plank shoulder tap','2 × 6–10 / side','Feet wide enough to keep hips quiet; tap slowly without rotating.','2 × 10/side twice with minimal hip movement → narrow stance slightly or slow the tempo.']
  ]},
  2:{name:'Restore Circuit',why:'Finish the fast with easy continuous movement: enough cardiovascular work to restore, never enough to create fatigue.',time:'8–12 min',tone:'cyan',diet:'Break fast after session',work:[
    ['Kettlebell deadlift','30 sec work / 30 sec recovery','Use a light bell. Smooth repetitions; stop well before fatigue.','RPE 4–5. Do not progress load unless the whole circuit stays easy.','START: use ~50% of your Monday kettlebell Romanian deadlift working load, rounded DOWN to an available bell. If you have no reference yet, start at 12 kg. INCREASE: only after 2 Tuesday sessions where every interval stays RPE ≤4, breathing is controlled and there is no next-day posterior-chain fatigue; move to the next smallest bell (+2–4 kg). Keep this exercise at or below ~60% of Monday RDL load. REDUCE one bell if RPE exceeds 5 or form slows.'],
    ['Ring row','30 sec work / 30 sec recovery','Easy pull; shoulders away from ears.','Keep several repetitions in reserve.','BODYWEIGHT: no added load. Adjust foot position only enough to keep the full circuit at RPE 4–5.'],
    ['Alternating reverse lunge','30 sec work / 30 sec recovery','Bodyweight; use a long comfortable stride and control the bottom position while alternating legs.','Smooth range only; no grinding.','BODYWEIGHT: do not add kettlebell load on Tuesday. Progress only by smoother range and control.'],
    ['Suitcase march / carry','30 sec work / 30 sec recovery','Light-to-moderate bell; tall posture and relaxed breathing.','Grip should never limit the circuit.','START: use ~50–60% of Monday suitcase-carry load, rounded DOWN. If you have no reference yet, start at 12 kg. INCREASE: after 2 Tuesday sessions with upright posture, no grip limitation and RPE ≤4, move to the next smallest bell. HOLD or reduce if grip, trunk bracing or breathing becomes the limiter.']
  ]},
  3:{name:'Strength B',why:'Unilateral strength, pushing, pulling, posterior chain and controlled rotation.',time:'28 min',tone:'pink',diet:'High-protein eating day',prep:[
    ['Kettlebell halo','1–2 × 5 / direction','Use a light bell. Keep ribs stacked and move slowly around the head without forcing range.']
  ],work:[
    ['Reverse lunge','3 × 6–10 / leg','Equal stride and depth. Weaker leg governs.','3 × 10 both legs twice → increase kettlebell.'],
    ['Push-up','3 × 8–15','Choose variation that leaves ~3 reps in reserve.','3 × 15 twice → lower incline / floor / feet elevated / rings.'],
    ['1-arm kettlebell row','3 × 8–12 / side','Minimal torso rotation; pull with upper back.','3 × 12 twice → next kettlebell.'],
    ['Back extension','2 × 10–15','Finish straight, not hyperextended.','2 × 15 twice → hold light kettlebell at chest.'],
    ['Single-leg calf raise','2 × 10–15 / side','Full stretch; pause at top.','2 × 15 twice → add kettlebell.'],
    ['Kettlebell woodchop','2 × 6–10 / side','Use a light bell. Move from outside one hip toward the opposite shoulder while pivoting through feet and hips.','2 × 10/side twice with crisp control → increase the bell slightly.']
  ]},
  4:{name:'Power Circuit',why:'Integrated kettlebell power plus crisp swings and pushing: coordinate squat, leg drive and overhead strength without turning the session into a grind.',time:'16–24 min',tone:'orange',diet:'High-protein eating day',work:[
    ['2-hand kettlebell swing','20 sec work / 40 sec recovery','Aim for about 8–10 crisp swings, then stop even if time remains.','Power quality wins. If snap slows, reduce load or reps.','START: choose the heaviest bell you can swing for 10 technically crisp reps at RPE ≤6 with obvious speed left. If you do not yet have a calibrated swing load, start at 12 kg if learning the movement or 16 kg if your swing technique is already reliable. INCREASE: after 2 consecutive Thursday sessions completing every prescribed round with 8–10 crisp swings, no visible speed loss, final-session RPE ≤7 and no next-day low-back soreness, move to the next bell (+2–4 kg). If the jump is 4 kg, use 6–8 swings per work interval for the first 1–2 sessions. REDUCE immediately if snap, hinge position or breathing deteriorates.'],
    ['Push-up','20 sec work / 40 sec recovery','Use a variation that stays fast and technically clean.','Stop before reps grind.','BODYWEIGHT: do not add external load. Progress the variation only when all rounds remain fast at RPE ≤7.'],
    ['Kettlebell squat → jerk → strict press','40 sec work / 60 sec recovery','Use one light kettlebell. Work one side, then the other: front-rack squat → drive into a crisp jerk → lower to rack → strict press. Move deliberately; do not race the sequence.','Begin with 1–2 clean complexes per side. Build to 2–3 per side without slowing or grinding, then increase the kettlebell one small step. The strict press governs the load.','START: choose a bell you could strict press for about 8–10 clean reps when fresh, but keep several reps in reserve here. INCREASE: only after 2 Thursday sessions where every complex stays crisp, both sides match, the strict press never grinds and final-session RPE stays ≤7. Move up one small bell (+2–4 kg) and return to 1–2 complexes per side. REDUCE immediately if the jerk becomes a press-out, the torso leans, or overhead control deteriorates.']
  ],support:[
    ['Band pull-apart','1 × 12–20','Smooth scapular movement; shoulders stay down and ribs quiet.','Quality only. Stop well before fatigue; do not turn this into extra pulling volume.'],
    ['Wall slide','1 × 8','Move slowly through the largest pain-free overhead range you can control.','Add range and control before adding repetitions.']
  ]},
  5:{name:'Strength C',why:'Frontal-plane strength plus another balanced full-body exposure.',time:'30 min',tone:'volt',diet:'High-protein eating day',prep:[
    ['Kettlebell halo','1–2 × 5 / direction','Use a light bell. Keep ribs stacked and move slowly around the head without forcing range.']
  ],work:[
    ['Lateral lunge','3 × 6–8 / side','Sit into the working hip; control frontal plane.','3 × 8 twice at same depth → add/increase goblet load.'],
    ['Goblet squat','2 × 8–12','Full comfortable range.','12/12 twice with ≥2 RIR → next kettlebell.'],
    ['Ring row','3 × 8–12','Rigid body; pull chest toward the same point and finish with controlled scapular retraction.','3 × 12 twice with ≥2 RIR → move feet 10–15 cm forward or elevate feet slightly.'],
    ['Push-up','2 × 8–15','Same variation and depth each rep.','2 × 15 twice → harder variation.'],
    ['Kettlebell Romanian deadlift','2 × 8–12','Controlled lowering; strong hip extension.','12/12 twice → increase load.'],
    ['Suitcase carry','2 × 45 sec / side','Tall and quiet trunk.','60 sec twice → next bell.'],
    ['Plank shoulder tap / kettlebell woodchop','2 × 8–10 / side','Odd weeks shoulder taps; even weeks light kettlebell woodchops.','Progress stance/tempo on taps; progress load cautiously on woodchops.']
  ]},
  6:{name:'Aerobic Power',why:'Raise maximal oxygen uptake without grip or kettlebell technique being the limiter.',time:'30–40 min',tone:'cyan',diet:'High-protein eating day',work:[
    ['Aerobic intervals','See weekly target','Uphill walk, jog, bike or stairs. Keep output repeatable.','Increase pace only if all intervals complete, <5% fade, ≤8.5/10 finish and recovery is adequate.']
  ]},
  0:{name:'Aerobic Base Circuit',why:'Build an easy aerobic base with continuous bodyweight and light kettlebell work while staying fresh for Monday.',time:'14–24 min',tone:'cyan',diet:'Normal eating day',work:[
    ['Squat-to-calf-raise','40 sec work / 20 sec transition','Use your deepest comfortable heels-down squat, then rise into a controlled calf raise.','RPE 5–6; maintain steady breathing.','BODYWEIGHT: no external load. The goal is continuous aerobic work, not leg loading.'],
    ['Push-up','40 sec work / 20 sec transition','Use floor or incline so repetitions remain smooth for the full interval.','Leave plenty in reserve.','BODYWEIGHT: choose floor or incline so you can move continuously for 40 seconds without grinding. Do not add weight.'],
    ['Alternating reverse lunge','40 sec work / 20 sec transition','Use a long comfortable stride so the rear hip reaches extension; alternate sides at an even rhythm.','Avoid fatigue that would affect Monday.','BODYWEIGHT: no kettlebell on Sunday. Keep enough reserve that Monday Strength A is unaffected.'],
    ['Suitcase march / carry','40 sec work / 20 sec transition','Use a comfortable bell; march or walk continuously.','Grip and trunk should remain relaxed enough to continue.','START: use ~40–50% of Friday suitcase-carry load, rounded DOWN. If you have no reference yet, start at 8–12 kg. INCREASE: after 2 Sunday sessions where all rounds stay RPE ≤5, breathing remains steady and grip never limits you, move to the next smallest bell. Never increase if the overall Sunday circuit rises above RPE 6; reduce one bell if Monday strength feels impaired.']
  ],support:[
    ['Back extension','2 × 12–15 · 45–60 sec rest','Move slowly through a comfortable range and finish neutral rather than hyperextending. Keep 3–4 reps in reserve.','Start bodyweight. When you complete 15 + 15 with perfect control on 2 Sundays and Monday Strength A is unaffected, hold a light kettlebell at the chest. Keep this at RPE 5–6.'],
    ['Sliding hamstring curl','1–2 × 8–12','Use socks, towel or sliders. Keep hips gently elevated and control the heel slide out and back.','Weeks 1–2: 1 set. Weeks 3–7 and 9–11: 2 sets. Weeks 8 and 12: 1 set. Progress range and control before adding load.']
  ]}
};
const mobility=[
 ['Chin tuck','5 × 5 sec'],['Open-book rotation','5 / side'],['Band pull-apart','15'],['Wall slide','8'],['90/90 hip rotation','6 / side'],['Figure-four glute stretch','30 sec / side'],['Bodyweight lateral lunge','5 / side']
];
const conditioningRounds={
  2:[2,2,3,3,3,3,3,2,3,3,3,2],
  4:[4,4,5,5,6,6,6,4,6,6,6,4],
  0:[3,3,3,3,4,4,4,2,4,4,4,2]
};
function conditioningTarget(day,w){
  const rounds=(conditioningRounds[day]||[])[Math.max(0,Math.min(11,w-1))];
  if(day===2)return rounds+' rounds · 30 sec work / 30 sec recovery · RPE 4–5';
  if(day===4)return rounds+' rounds · complex 40/60 · swings + push-ups 20/40 · RPE 6–7';
  if(day===0)return rounds+' rounds · 40 sec work / 20 sec transition + 60 sec between rounds · RPE 5–6';
  return '';
}
const aerobicTargets=['40 min brisk / hills','40 min brisk / hills','40 min brisk / hills','40 min brisk / hills','3 × 3 min hard / 3 min easy','4 × 3 min hard / 3 min easy','4 × 4 min hard / 3 min easy','30–40 min easy','4 × 4 min hard / 3 min easy','4 × 4 min hard / 3 min easy','4 × 4 min hard / 3 min easy','2 km walk test'];

const videoLinks={
  'Goblet squat':[{label:'Form',url:'https://www.youtube.com/watch?v=nfX7IFK9UNI'}],
  'Ring row / pull-up':[
    {label:'Ring row',url:'https://www.youtube.com/watch?v=xhlReCpAE9k'},
    {label:'Pull-up',url:'https://www.youtube.com/watch?v=eGo4IYlbE5g'}
  ],
  'Pull-up / assisted pull-up':[{label:'Form',url:'https://www.youtube.com/watch?v=eGo4IYlbE5g'}],
  'Ring row':[{label:'Form',url:'https://www.youtube.com/watch?v=xhlReCpAE9k'}],
  'Kettlebell Romanian deadlift':[{label:'Form',url:'https://www.youtube.com/watch?v=Uc5rP5xs7qQ'}],
  '1-arm kettlebell press':[{label:'Form',url:'https://www.youtube.com/watch?v=X-uFqWtjpGI'}],
  'Suitcase carry':[{label:'Form',url:'https://www.youtube.com/watch?v=BaRMAhD7SP4'}],
  'Plank shoulder tap':[{label:'Form',url:'https://www.youtube.com/watch?v=C6At19Q9i2Q'}],
  'Kettlebell deadlift':[{label:'Form',url:'https://www.youtube.com/watch?v=LDfnyt0Rmaw'}],
  'Alternating reverse lunge':[{label:'Form',url:'https://www.youtube.com/watch?v=xrPteyQLGAo'}],
  'Suitcase march / carry':[{label:'Form',url:'https://www.youtube.com/watch?v=BaRMAhD7SP4'}],
  'Bodyweight squat':[{label:'Form',url:'https://www.youtube.com/watch?v=nfX7IFK9UNI'}],
  'Squat-to-calf-raise':[{label:'Squat form',url:'https://www.youtube.com/watch?v=nfX7IFK9UNI'}],
  'Band pull-apart':[{label:'Form',url:'https://www.youtube.com/watch?v=JObYtU7Y7ag'}],
  'Single-leg calf raise':[{label:'Form',url:'https://www.youtube.com/watch?v=nSeQdvzehcU'}],
  'Reverse lunge':[{label:'Form',url:'https://www.youtube.com/watch?v=xrPteyQLGAo'}],
  'Push-up':[{label:'Form',url:'https://www.youtube.com/watch?v=WDIpL0pjun0'}],
  '1-arm kettlebell row':[{label:'Form',url:'https://www.youtube.com/watch?v=IyQAMOV0WAc'}],
  'Back extension':[{label:'Form',url:'https://www.youtube.com/watch?v=H8Swl1N-uis'}],
  'Sliding hamstring curl':[],
  'Kettlebell woodchop':[{label:'Form',url:'https://www.youtube.com/watch?v=WaBz7DIcI5w'}],
  '2-hand kettlebell swing':[{label:'Form',url:'https://www.youtube.com/watch?v=1cVT3ee9mgU'}],
  'Lateral lunge':[{label:'Form',url:'https://www.youtube.com/watch?v=YCdVdzN0L_w'}],
  'Plank shoulder tap / kettlebell woodchop':[
    {label:'Shoulder tap',url:'https://www.youtube.com/watch?v=C6At19Q9i2Q'},
    {label:'Woodchop',url:'https://www.youtube.com/watch?v=WaBz7DIcI5w'}
  ],
  'Aerobic intervals':[{label:'4×4',url:'https://www.youtube.com/watch?v=o3SjPbS9ovA'}],
  'Chin tuck':[{label:'Form',url:'https://www.youtube.com/watch?v=u8C5LgpK3r4'}],
  'Open-book rotation':[{label:'Form',url:'https://www.youtube.com/watch?v=OW6YHlxY6JI'}],
  'Wall slide':[{label:'Form',url:'https://www.youtube.com/watch?v=Eaj_NG5_hIo'}],
  '90/90 hip rotation':[{label:'Form',url:'https://www.youtube.com/watch?v=t4Zz6-aG8Iw'}],
  'Figure-four glute stretch':[{label:'Form',url:'https://www.youtube.com/watch?v=-g0nuyTHMrI'}],
  'Bodyweight lateral lunge':[{label:'Form',url:'https://www.youtube.com/watch?v=YCdVdzN0L_w'}]
};
function videosFor(name){return videoLinks[name]||[]}
