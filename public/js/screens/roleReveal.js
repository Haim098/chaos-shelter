/**
 * Role Reveal Screen Module
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Screens = window.App.Screens || {};

  var DOM = window.App.Utils.DOM;
  var Audio = window.App.Utils.Audio;
  var Timer = window.App.Components.Timer;

  var RoleReveal = {};

  var ROLE_DATA = {
    crew: {
      icon: '🛡️',
      title: 'צוות המקלט',
      description: 'השלם משימות כדי לשמור על ההישרדות. גלה מי המחבל והצבע נגדו!',
      bgImage: '/assets/bg-role-reveal-crew.png',
      cardClass: 'crew'
    },
    saboteur: {
      icon: '🗡️',
      title: 'המחבל',
      description: 'חבל במקלט בסתר. השלם משימות מזויפות כדי לא לעורר חשד. גנוב את הבקרי!',
      bgImage: '/assets/bg-role-reveal-saboteur.png',
      cardClass: 'saboteur'
    }
  };

  RoleReveal.init = function () {
    // No interactive elements needed on init
  };

  /**
   * Show the role reveal screen
   * @param {object} data - { role, name, players }
   */
  RoleReveal.show = function (data) {
    var role = data.role || 'crew';
    var roleInfo = ROLE_DATA[role] || ROLE_DATA.crew;

    // Set background
    var bg = DOM.id('role-reveal-bg');
    if (bg) bg.style.backgroundImage = "url('" + roleInfo.bgImage + "')";

    // Set card content
    var card = DOM.id('role-card');
    if (card) {
      card.className = 'role-card ' + roleInfo.cardClass;
    }

    DOM.setText('role-icon', roleInfo.icon);
    DOM.setText('role-title', roleInfo.title);
    DOM.setText('role-description', roleInfo.description);

    // Show screen
    window.App.showScreen('roleReveal');
    Audio.reveal();

    // Countdown timer (5 seconds)
    Timer.start('roleReveal', 'role-timer', 5, {
      urgentAt: 2,
      onDone: function () {
        // The server will send game:playing when it's time
        // This timer is just visual feedback
      }
    });
  };

  window.App.Screens.RoleReveal = RoleReveal;
})();
