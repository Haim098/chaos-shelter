// ── Game Constants ──────────────────────────────────────────────

// Player limits
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

// Game state machine phases
const PHASE = {
  LOBBY:          'LOBBY',
  ROLE_REVEAL:    'ROLE_REVEAL',
  PLAYING:        'PLAYING',
  SABOTAGE_EVENT: 'SABOTAGE_EVENT',
  VOTING:         'VOTING',
  RESULTS:        'RESULTS',
};

// Roles
const ROLE = {
  CREW:     'crew',
  SABOTEUR: 'saboteur',
};

// How many saboteurs per player count
// 3-6 players: 1 saboteur, 7-8 players: 2 saboteurs
function saboteurCount(playerCount) {
  return playerCount >= 7 ? 2 : 1;
}

// ── Meters ──────────────────────────────────────────────────────
const SURVIVAL_START  = 0;    // crew fills this to 100 to win
const BAKARI_START    = 100;  // saboteur drains this to 0 to win
const SURVIVAL_WIN    = 100;
const BAKARI_LOSE     = 0;
const TASK_REWARD     = 5;    // +5% survival per task completion

// ── Timing (ms) ─────────────────────────────────────────────────
const ROLE_REVEAL_DURATION = 5000;   // 5s role reveal screen
const ROUND_DURATION       = 180000; // 3 minutes per round
const TASK_INTERVAL        = 12000;  // new task every 12s
const VOTE_DURATION        = 30000;  // 30s to vote
const DECAY_INTERVAL       = 10000;  // meter decay tick every 10s
const DECAY_AMOUNT         = 2;      // -2% bakari per decay tick (after round timer expires)
const RESULTS_DURATION     = 8000;   // 8s results screen

// ── Sabotage Actions ────────────────────────────────────────────
const SABOTAGE = {
  lights: { label: 'כיבוי אורות',      cost: 5,  cooldown: 20000 },
  alarm:  { label: 'אזעקת שווא',        cost: 8,  cooldown: 25000 },
  steal:  { label: 'גניבת בקרי',        cost: 10, cooldown: 30000 },
};

// ── Task Types ──────────────────────────────────────────────────
const TASK_TYPES = [
  { type: 'tapCircles',   label: 'סדר את הצעצועים',   duration: 6000,  circles: { min: 5, max: 8 } },
  { type: 'wireConnect',  label: 'חבר את החוטים',      duration: 10000, wires: 4 },
  { type: 'tapToWake',    label: 'תעיר את דניאל!',     duration: 5000,  taps: 15 },
  { type: 'chooseAnswer', label: 'מי צודק בוויכוח?',  duration: 8000,  options: 3 },
  { type: 'memoryMatch',    label: 'זכור וגלה',              duration: 10000, pairs: 4 },
  { type: 'simonSays',      label: 'הקלד את הקוד',           duration: 10000, sequenceLength: 5 },
  { type: 'catchItems',     label: 'תפוס אספקה!',            duration: 8000,  target: 8 },
  { type: 'colorSort',      label: 'מיין פחיות',              duration: 10000, cans: 6 },
  { type: 'balanceMeter',   label: 'ייצב את הגנרטור',        duration: 7000,  holdTime: 3, speed: 2 },
  { type: 'mazeNavigate',   label: 'מצא את הדרך',            duration: 10000 },
];

// ── Question Bank for chooseAnswer ──────────────────────────────
const QUESTIONS = [
  { q: 'מה עושים כשיש ריב על השלט?',       answers: ['מחליפים תורות', 'צועקים יותר חזק', 'מחביאים את השלט'],   correct: 0 },
  { q: 'איך מתמודדים עם רעש במקלט?',       answers: ['אטמי אוזניים', 'צועקים חזרה', 'בוכים בשקט'],            correct: 0 },
  { q: 'מה עושים כשנגמר המקום?',            answers: ['מסתדרים ביחד', 'דוחפים החוצה', 'בונים קומה שנייה'],      correct: 0 },
  { q: 'איך שומרים על שקט בלילה?',          answers: ['לוחשים', 'שמים מוזיקה חזקה', 'לא ישנים בכלל'],          correct: 0 },
  { q: 'מה הדבר הכי חשוב במקלט?',           answers: ['שיתוף פעולה', 'לנצח בוויכוח', 'לתפוס את המיטה הטובה'], correct: 0 },
  { q: 'מי אחראי על חלוקת האוכל?',          answers: ['כולם ביחד', 'הכי חזק', 'הכי רעב'],                      correct: 0 },
  { q: 'מה עושים כשמישהו עצבני?',            answers: ['מרגיעים אותו', 'מתעלמים', 'מתווכחים איתו'],             correct: 0 },
  { q: 'איך מחליטים מה לאכול?',              answers: ['הצבעה', 'מי שבישל מחליט', 'אבן נייר ומספריים'],         correct: 0 },
];

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  PHASE,
  ROLE,
  saboteurCount,
  SURVIVAL_START,
  BAKARI_START,
  SURVIVAL_WIN,
  BAKARI_LOSE,
  TASK_REWARD,
  ROLE_REVEAL_DURATION,
  ROUND_DURATION,
  TASK_INTERVAL,
  VOTE_DURATION,
  DECAY_INTERVAL,
  DECAY_AMOUNT,
  RESULTS_DURATION,
  SABOTAGE,
  TASK_TYPES,
  QUESTIONS,
};
