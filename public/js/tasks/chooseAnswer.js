// ── Mini-Game: Choose Answer ("פתור ויכוח") ─────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;

  // ── Question bank (Hebrew shelter humor) ────────────────────
  var QUESTIONS = [
    { q: 'מי שוטף כלים היום?',             answers: ['כולם ביחד', 'הכלב', 'אף אחד'],                      correct: 0 },
    { q: 'מה עושים כשנגמר הבקרי?',          answers: ['מבשלים פסטה', 'בוכים', 'מתקשרים לפיצה'],             correct: 0 },
    { q: 'איפה השלט של הטלוויזיה?',         answers: ['בין הכריות', 'בחלל', 'בשכונה'],                      correct: 0 },
    { q: 'מה עושים כשיש ריב על השלט?',      answers: ['מחליפים תורות', 'צועקים יותר חזק', 'מחביאים את השלט'], correct: 0 },
    { q: 'איך מתמודדים עם רעש במקלט?',      answers: ['אטמי אוזניים', 'צועקים חזרה', 'בוכים בשקט'],         correct: 0 },
    { q: 'מה עושים כשנגמר המקום?',           answers: ['מסתדרים ביחד', 'דוחפים החוצה', 'בונים קומה שנייה'],   correct: 0 },
    { q: 'איך שומרים על שקט בלילה?',        answers: ['לוחשים', 'שמים מוזיקה חזקה', 'לא ישנים בכלל'],       correct: 0 },
    { q: 'מה הדבר הכי חשוב במקלט?',         answers: ['שיתוף פעולה', 'לנצח בוויכוח', 'לתפוס את המיטה הטובה'], correct: 0 },
    { q: 'מי אחראי על חלוקת האוכל?',        answers: ['כולם ביחד', 'הכי חזק', 'הכי רעב'],                   correct: 0 },
    { q: 'מה עושים כשמישהו עצבני?',          answers: ['מרגיעים אותו', 'מתעלמים', 'מתווכחים איתו'],          correct: 0 },
    { q: 'איך מחליטים מה לאכול?',            answers: ['הצבעה', 'מי שבישל מחליט', 'אבן נייר ומספריים'],      correct: 0 },
    { q: 'מי ישן ליד השירותים?',             answers: ['בתורות', 'הכי חדש', 'המפסיד בקלפים'],                correct: 0 },
    { q: 'מה עושים כשהאינטרנט נופל?',        answers: ['מדברים אחד עם השני', 'נכנסים לפאניקה', 'הולכים לישון'], correct: 0 },
  ];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;

    // Pick question from params or random
    var qData;
    if (params && params.questionIndex !== undefined && params.questionIndex < QUESTIONS.length) {
      qData = QUESTIONS[params.questionIndex];
    } else {
      qData = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    }

    // Allow server to override correct answer index
    var correctIdx = (params && params.correctIndex !== undefined) ? params.correctIndex : qData.correct;

    // Build question UI
    var questionEl = document.createElement('div');
    questionEl.className = 'choose-question';
    questionEl.textContent = qData.q;
    container.appendChild(questionEl);

    // Answers
    var answersContainer = document.createElement('div');
    answersContainer.className = 'choose-answers';

    qData.answers.forEach(function (answer, idx) {
      var btn = document.createElement('button');
      btn.className = 'choose-btn';
      btn.textContent = answer;

      var handler = function (e) {
        e.preventDefault();
        onAnswer(idx, correctIdx, btn, answersContainer);
      };

      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('click', handler);

      answersContainer.appendChild(btn);
    });

    container.appendChild(answersContainer);
  }

  function onAnswer(selectedIdx, correctIdx, btnEl, answersContainer) {
    if (!onDone) return;

    // Disable all buttons
    var btns = answersContainer.querySelectorAll('.choose-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].style.pointerEvents = 'none';
    }

    var correct = selectedIdx === correctIdx;

    // Highlight correct / wrong
    btnEl.classList.add(correct ? 'choose-correct' : 'choose-wrong');

    // Also highlight the correct one if wrong
    if (!correct) {
      btns[correctIdx].classList.add('choose-correct');
    }

    // Short delay for visual feedback
    setTimeout(function () {
      if (onDone) onDone(correct);
    }, 500);
  }

  function cleanup() {
    container = null;
    onDone = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('chooseAnswer', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.ChooseAnswer = { init: init, cleanup: cleanup };
})();
