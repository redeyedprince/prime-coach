export interface CoachArticle {
  id:
    | 'tendon'
    | 'cardio'
    | 'recovery'
    | 'kegel'
    | 'effort'
    | 'household'
    | 'mobility'
    | 'balance_power'
    | 'zone2_vo2'
    | 'breath_sleep_fuel';
  title: string;
  tag: string;
  readTime: string;
  headline: string;
  bullets: string[];
  researchNote: string;
}

export const COACH_ARTICLES: CoachArticle[] = [
  {
    id: 'tendon',
    title: 'Why Tendon Strength Matters (Tendon Armor)',
    tag: 'Joint Safety',
    readTime: '30s read',
    headline: 'Muscles grow 2–3× faster than tendons — protecting your joints keeps you training pain-free.',
    bullets: [
      'Your muscles get noticeably stronger in 4–6 weeks, while tendons (which connect muscle to bone) take 8–12+ weeks to thicken and stiffen.',
      'That speed gap is the #1 reason people feel wrist, elbow, shoulder, knee, or Achilles pain when moving up to harder exercises.',
      'Tendons respond best to steady 30–45 second static holds (isometrics) and slow 3–4 second lowering — not fast, bouncy reps.',
      'Turning on Tendon Armor adds just 2–3 minutes of targeted joint conditioning matched to today’s upper- or lower-body session.',
    ],
    researchNote: 'Based on Keith Baar (2017, Sports Medicine), Rio et al. (2015, BJSM), Kongsgaard et al. (2009), & Magnusson et al. (2010).',
  },
  {
    id: 'cardio',
    title: 'Why Add a 3–5 Min Cardio Finisher?',
    tag: 'Heart & Stamina',
    readTime: '30s read',
    headline: 'Short post-workout cardio improves heart health, stamina, and recovery without shrinking muscle gains.',
    bullets: [
      'Doing long cardio right before strength work can tire out your muscles, but a crisp 3–5 minute finisher at the end protects your strength gains.',
      'Elevating your heart rate boosts healthy blood flow and oxygen delivery to working muscles, helping clear soreness faster.',
      'On Rest Days, gentle 10-minute Zone-2 cardio (an easy conversational pace) speeds up recovery and supports pelvic & cardiovascular vitality.',
    ],
    researchNote: 'Based on Wilson et al. & Coffey & Hawley Concurrent Training Research.',
  },
  {
    id: 'recovery',
    title: 'Why the 72-Hour Recovery Guard Exists',
    tag: 'Smarter Growth',
    readTime: '30s read',
    headline: 'Muscles and tendons actually get stronger during rest — not during the workout itself.',
    bullets: [
      'A tough workout creates tiny microscopic stress signals. Your body repairs and strengthens muscle fibers and tendon collagen over the next 48–72 hours.',
      'Training the exact same sore muscle too soon interrupts repair and raises injury risk.',
      'When you train hard on a muscle group, the Recovery Guard automatically rotates you to fresh muscles until 72 hours have passed.',
    ],
    researchNote: 'Based on ACSM Progression Models (2009), Schoenfeld et al. (2016), & Magnusson et al. (2010).',
  },
  {
    id: 'kegel',
    title: 'Why Seated Pelvic Floor (Kegel) Mode?',
    tag: 'Pelvic Health',
    readTime: '30s read',
    headline: 'Strong, flexible pelvic floor muscles support bladder control, core stability, and sexual stamina for both men and women.',
    bullets: [
      'You can do it silently while sitting at a desk or commuting — nobody around you can tell.',
      'Firm 5–10 second holds build steady endurance, while fast 1-second squeezes train quick reflex control.',
      'Finishing every session with a 20–30 second Full Relax & Breathe drop is essential so the muscle stays healthy and never becomes overly tight.',
    ],
    researchNote: 'Based on Dorey et al. (2004, BJU International) & Kari Bo Clinical Pelvic Floor Protocols.',
  },
  {
    id: 'effort',
    title: 'Why Stopping ~2 Reps Short ("Just Right") Works Best',
    tag: 'Smart Effort',
    readTime: '30s read',
    headline: 'You do not need to collapse from exhaustion to get great results.',
    bullets: [
      'Stopping each set when you feel about 2 clean reps left in the tank delivers almost 100% of the strength and toning benefit.',
      'Going all-out to total failure every set creates far more joint soreness and fatigue without extra reward.',
      'When you hit your target reps cleanly two workouts in a row at "Just Right" effort, the app automatically levels you up.',
    ],
    researchNote: 'Based on Schoenfeld et al. (2017, 2019) & Schmidt & Lee Motor Control Principles.',
  },
  {
    id: 'household',
    title: 'Why Household Items Work as Real Weights',
    tag: 'Train Anywhere',
    readTime: '30s read',
    headline: 'Your muscles only feel gravity and tension — they have no idea whether you are holding a gym dumbbell or a water jug.',
    bullets: [
      'A 1.5L water bottle (~1.5 kg), 5L water gallon (~5 kg), or backpack filled with books (~8–12 kg) gives real progressive resistance at home.',
      'A sturdy dining chair or sofa edge pressed against a wall unlocks gentler incline push-ups and deeper glute/leg exercises without a gym.',
      'Tap the Gear button at the top right anytime to switch between Floor Only and whatever items are nearby.',
    ],
    researchNote: 'Based on Progressive Overload & Practical Home Resistance Biomechanics.',
  },
  {
    id: 'mobility',
    title: 'Why 5 Minutes of Mobility & Foot Care Keeps You Pain-Free',
    tag: 'Joint Freedom',
    readTime: '30s read',
    headline: 'Strength without full range of motion leaves you stiff — caring for your neck, hips, ankles, and feet makes every hour of the day feel lighter.',
    bullets: [
      'Hours at a desk or phone stiffen your neck, upper back, and hip flexors, which silently causes lower-back and shoulder aches during workouts.',
      'Your feet contain 26 bones and small stabilizing muscles ("the foot core") that control knee alignment, balance, and walking posture.',
      'Just 4–5 minutes of gentle mobility (Neck Reset, Deep Squat Opener, Foot Arch Prep) keeps joints moving freely without tiring your muscles.',
    ],
    researchNote:
      'Based on Behm et al. (2016, Applied Physiology, Nutrition, and Metabolism), Page (2012, IJSPT), & McKeon et al. (2015, BJSM — Foot Core System).',
  },
  {
    id: 'balance_power',
    title: 'Why Balance & Fast Power Keep Your Body Young',
    tag: 'Athletic Longevity',
    readTime: '30s read',
    headline: 'Quick fast-twitch power fades twice as fast as regular strength — and single-leg balance is one of the strongest markers of healthy aging.',
    bullets: [
      'A landmark study of 1,700+ adults showed that being able to balance cleanly on one leg for 10+ seconds strongly predicts long-term physical health and fall resistance.',
      'Explosive power (moving crisply on the way up, even quietly without jumping) protects fast-twitch muscle fibers that keep you nimble and light on your feet.',
      'A 3-minute Balance & Athletic Pop flow 2–3× a week upgrades brain-body coordination with zero gym equipment.',
    ],
    researchNote:
      'Based on Araujo et al. (2022, BJSM — 10-Second Balance & Survival), Springer et al. (2007, JGPT), & Reid & Fielding (2012, Exerc Sport Sci Rev).',
  },
  {
    id: 'zone2_vo2',
    title: 'Zone-2 Endurance vs. VO2 Max: The Two Heart Gears',
    tag: 'Heart & Longevity',
    readTime: '30s read',
    headline: 'Cardiorespiratory fitness is the single strongest predictor of lifespan and daily energy — and your heart needs two simple gears.',
    bullets: [
      'Gear 1 — Zone-2 Base (15–30 min easy pace): You can still speak full sentences while briskly walking, jogging, or marching. Builds all-day stamina and fat-burning efficiency.',
      'Gear 2 — VO2 Max Intervals (8 min once a week): 4 short bursts of hard brisk effort followed by calm recovery raise your peak oxygen ceiling.',
      'Pair 1–2 easy Zone-2 walks with just one weekly 8-minute VO2 Max session in Heart & Stamina for complete cardiovascular health.',
    ],
    researchNote:
      'Based on Mandsager et al. (2018, JAMA Network Open), Helgerud et al. (2007, MSSE), & San-Millán & Brooks (2018, Sports Medicine).',
  },
  {
    id: 'breath_sleep_fuel',
    title: 'Breathwork, Sleep, Protein & Water: The Hidden Half of Results',
    tag: 'Recovery & Fuel',
    readTime: '30s read',
    headline: 'Workouts send the signal to get stronger — sleep, protein, water, daily steps, and calm breathing actually build the result.',
    bullets: [
      'Sleep (7–9 hrs): Deep sleep releases muscle- and tendon-repair hormones. Sleeping poorly reduces recovery, so tapping "Tired" on Today gently trims your workout by ~25%.',
      'Protein (1.6–2.0 g/kg/day) & Water (~35 ml/kg/day): Gives your body the raw building blocks for firmer muscle, resilient tendons, and steady energy.',
      'Breathwork (2 min): Stanford clinical trials showed "Physiological Sigh" breathing (double inhale + long slow exhale) lowers stress faster than mindfulness meditation alone.',
    ],
    researchNote:
      'Based on Balban et al. (2023, Cell Reports Medicine), Morton et al. (2018, BJSM), Watson et al. (2015, AASM/SRS), & Paluch et al. (2022, The Lancet Public Health).',
  },
];

export type TermId =
  | 'hypertrophy'
  | 'strength'
  | 'conditioning'
  | 'skill'
  | 'recovery_guard'
  | 'cardio_finisher'
  | 'tendon_armor'
  | 'reps_in_tank'
  | 'mesocycle'
  | 'light_recovery'
  | 'per_side'
  | 'quiet_hotel'
  | 'pacing_mode'
  | 'zone2_cardio'
  | 'vo2_max'
  | 'physiological_sigh'
  | 'bolt_score'
  | 'neat_steps'
  | 'protein_target'
  | 'prime_score'
  | 'mobility_flow'
  | 'explosive_power'
  | 'discreet_kegel'
  | 'kegel_benefits'
  | 'joint_restrictions'
  | 'export_csv'
  | 'whtr_ratio'
  | 'body_recomp';

export interface TermDefinition {
  title: string;
  plainExplanation: string;
  relatedArticleId?: CoachArticle['id'];
}

export const TERM_GLOSSARY: Record<TermId, TermDefinition> = {
  hypertrophy: {
    title: 'Muscle Sculpt / Hypertrophy',
    plainExplanation:
      'Training to build fuller, firmer, and more toned muscle shape using moderate reps (8–18) with smooth control.',
  },
  strength: {
    title: 'Strength Training',
    plainExplanation:
      'Building pure force and power using harder exercises for fewer reps (4–8) with longer rests so your body fully recharges.',
  },
  conditioning: {
    title: 'Conditioning & Stamina',
    plainExplanation:
      'Improving heart endurance, calorie burn, and energy using higher reps (12–22) with shorter 40–45 second rests.',
    relatedArticleId: 'cardio',
  },
  skill: {
    title: 'Bodyweight Skill Practice',
    plainExplanation:
      'Learning crisp control on challenging bodyweight moves (like archer push-ups or pistol squats) while staying fresh and never training to exhaustion.',
  },
  recovery_guard: {
    title: '72-Hour Muscle Recovery Guard',
    plainExplanation:
      'Muscles grow while resting, not during the workout. After an intense session on a muscle group, the app automatically protects it for 2–3 days by rotating to fresh muscles.',
    relatedArticleId: 'recovery',
  },
  cardio_finisher: {
    title: '3–5 Min Cardio Finisher',
    plainExplanation:
      'A brief burst of cardio at the end of your workout that boosts heart health, calorie burn, and blood flow for faster recovery — without hurting your strength gains.',
    relatedArticleId: 'cardio',
  },
  tendon_armor: {
    title: 'Tendon Armor (Joint Conditioning)',
    plainExplanation:
      '2–3 minutes of slow holds or slow lowering that strengthen your tendons and joints (wrists, knees, Achilles), which adapt 2–3× slower than muscles.',
    relatedArticleId: 'tendon',
  },
  reps_in_tank: {
    title: 'Reps Left in the Tank (Effort)',
    plainExplanation:
      'How many more clean reps you could still do when you stop a set. Stopping with ~2 reps left ("Just Right") gives great results with much less soreness and injury risk.',
    relatedArticleId: 'effort',
  },
  mesocycle: {
    title: '4-Week Cycle (3 Build + 1 Light Week)',
    plainExplanation:
      'Three weeks of steady progress followed by one lighter recovery week so your muscles, joints, and energy bounce back stronger.',
  },
  light_recovery: {
    title: 'Light Recovery Week',
    plainExplanation:
      'Every 4th week reduces workout volume slightly to clear hidden fatigue while keeping your strength and habit intact.',
  },
  per_side: {
    title: 'Per Side (Left & Right)',
    plainExplanation:
      'A single-arm or single-leg exercise. Do the target reps or seconds on your left side, then repeat the same amount on your right side.',
  },
  quiet_hotel: {
    title: 'Quiet Hotel Mode',
    plainExplanation:
      'Automatically replaces jumping or noisy floor moves with silent, low-impact exercises so you never disturb neighbors or downstairs rooms.',
  },
  pacing_mode: {
    title: 'Pacing Mode',
    plainExplanation:
      'Strict Time Cap fits your workout neatly inside your chosen minute limit. Fixed Volume completes every planned set even if it takes a few extra minutes.',
  },
  zone2_cardio: {
    title: 'Zone-2 Easy Base Cardio',
    plainExplanation:
      'Steady, comfortable movement (brisk walk, light jog, indoor march) where your breathing rises slightly but you can still talk in full sentences. Builds stamina and heart health without fatigue.',
    relatedArticleId: 'zone2_vo2',
  },
  vo2_max: {
    title: 'VO2 Max (Peak Heart & Lung Ceiling)',
    plainExplanation:
      'The maximum amount of oxygen your heart and lungs can deliver during hard effort. Short weekly intervals (4 × 45s brisk push + easy walk) are the fastest, safest way to boost it.',
    relatedArticleId: 'zone2_vo2',
  },
  physiological_sigh: {
    title: 'Physiological Sigh (Double Inhale + Long Exhale)',
    plainExplanation:
      'Take one full breath in through your nose, a short second top-off sip of air, then one slow, relaxed exhale through your mouth. Proven in Stanford trials to calm your heart rate in minutes.',
    relatedArticleId: 'breath_sleep_fuel',
  },
  bolt_score: {
    title: 'BOLT Score (Comfortable Breath-Hold)',
    plainExplanation:
      'After a normal gentle exhale through your nose, time how many seconds pass until you feel the FIRST mild urge to breathe (not a maximum gasp). Higher scores reflect calmer, more efficient breathing.',
    relatedArticleId: 'breath_sleep_fuel',
  },
  neat_steps: {
    title: 'Daily Steps (Everyday Movement)',
    plainExplanation:
      'Light movement outside workouts (walking, errands, taking stairs). Research shows 7,500–10,000 daily steps powerfully supports heart health, energy, and lean body weight.',
    relatedArticleId: 'breath_sleep_fuel',
  },
  protein_target: {
    title: 'Daily Protein Guideline (Sex-Calibrated)',
    plainExplanation:
      'Calibrated from your weight and physiology: 1.5–1.8 g/kg for women and 1.6–2.0 g/kg for men (adjusted for average lean muscle mass vs. essential body fat at the same scale weight) — the research sweet spot for building toned muscle and repairing tendons.',
    relatedArticleId: 'breath_sleep_fuel',
  },
  prime_score: {
    title: '6-Pillar Prime Condition Score',
    plainExplanation:
      'A simple 0–100 snapshot across Strength, Mobility, Balance, Heart Recovery, Breath, and Core so you can spot your strongest traits and your #1 physical weak link at a glance.',
    relatedArticleId: 'balance_power',
  },
  mobility_flow: {
    title: 'Mobility & Joint Freedom Flow',
    plainExplanation:
      'Gentle active movements that unlock stiff necks, upper backs, hips, ankles, and feet so you move smoothly and stay pain-free during everyday life and workouts.',
    relatedArticleId: 'mobility',
  },
  explosive_power: {
    title: 'Athletic Power (Fast-Twitch Crispness)',
    plainExplanation:
      'Moving quickly and crisply on the lifting phase (even silently without jumping in Quiet Mode) to keep your fast-twitch muscle fibers nimble and responsive as you age.',
    relatedArticleId: 'balance_power',
  },
  discreet_kegel: {
    title: 'Daily Discreet Kegel Reminders',
    plainExplanation:
      'Sends subtle, private nudges labeled "Focus & Posture Reset" so nobody glancing at your screen knows it is pelvic floor training — helping you hit 2–3 quick seated resets per day.',
    relatedArticleId: 'kegel',
  },
  kegel_benefits: {
    title: 'Why Train Your Pelvic Floor (Kegels)?',
    plainExplanation:
      'Clinically proven (Dorey et al. & Kari Bo) to strengthen bladder control, stabilize your lower spine & deep core, improve blood flow, and boost sexual stamina & control for both men and women — all silently in 2–3 minutes while seated.',
    relatedArticleId: 'kegel',
  },
  joint_restrictions: {
    title: 'Joint Restrictions (Injury Protection)',
    plainExplanation:
      'Tap any joint that feels sensitive (wrists, shoulders, elbows, knees, or lower back). Prime automatically hides exercises that stress that joint and picks safer alternatives.',
    relatedArticleId: 'tendon',
  },
  export_csv: {
    title: 'Offline Backup (CSV)',
    plainExplanation:
      'Downloads your workout history as a standard spreadsheet (.csv) you can open in Excel/Google Sheets or attach manually to free Gemini if you are not using Google Drive OAuth.',
  },
  whtr_ratio: {
    title: 'Waist-to-Height Ratio (WHtR)',
    plainExplanation:
      'Your waist circumference (cm) divided by your height (cm). Research shows keeping waist under half your height (<0.50) predicts long-term health much more accurately than BMI, especially when building muscle.',
  },
  body_recomp: {
    title: 'Body Recomposition & Tape Tracking',
    plainExplanation:
      'Gaining firm muscle while losing fat at the same time. Scale weight may barely move, while your waist shrinks and shoulders/hips/arms firm up — monthly tape measurements capture this real progress.',
  },
};
