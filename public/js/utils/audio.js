/**
 * Audio Utility Module
 * Lightweight sound effects using Web Audio API.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Utils = window.App.Utils || {};

  var audioCtx = null;
  var enabled = true;

  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        enabled = false;
      }
    }
    return audioCtx;
  }

  /** Resume audio context (call on first user interaction) */
  function resume() {
    var ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  /** Play a simple tone */
  function playTone(freq, duration, type) {
    if (!enabled) return;
    var ctx = getCtx();
    if (!ctx) return;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = type || 'sine';
    osc.frequency.value = freq || 440;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.3));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (duration || 0.3));
  }

  var Audio = {};

  Audio.resume = resume;

  Audio.enable = function () { enabled = true; };
  Audio.disable = function () { enabled = false; };
  Audio.isEnabled = function () { return enabled; };

  /** UI click sound */
  Audio.click = function () {
    playTone(800, 0.08, 'square');
  };

  /** Success sound */
  Audio.success = function () {
    playTone(523, 0.15, 'sine');
    setTimeout(function () { playTone(659, 0.15, 'sine'); }, 100);
    setTimeout(function () { playTone(784, 0.2, 'sine'); }, 200);
  };

  /** Failure sound */
  Audio.fail = function () {
    playTone(300, 0.2, 'sawtooth');
    setTimeout(function () { playTone(200, 0.3, 'sawtooth'); }, 150);
  };

  /** Alert / alarm sound */
  Audio.alarm = function () {
    playTone(880, 0.15, 'square');
    setTimeout(function () { playTone(660, 0.15, 'square'); }, 150);
    setTimeout(function () { playTone(880, 0.15, 'square'); }, 300);
    setTimeout(function () { playTone(660, 0.15, 'square'); }, 450);
  };

  /** Countdown tick */
  Audio.tick = function () {
    playTone(1000, 0.05, 'sine');
  };

  /** Vote cast sound */
  Audio.vote = function () {
    playTone(600, 0.1, 'triangle');
    setTimeout(function () { playTone(800, 0.12, 'triangle'); }, 80);
  };

  /** Dramatic reveal */
  Audio.reveal = function () {
    playTone(200, 0.4, 'sine');
    setTimeout(function () { playTone(400, 0.3, 'sine'); }, 300);
    setTimeout(function () { playTone(600, 0.5, 'sine'); }, 500);
  };

  /** Sabotage sound */
  Audio.sabotage = function () {
    playTone(150, 0.5, 'sawtooth');
    setTimeout(function () { playTone(100, 0.4, 'sawtooth'); }, 200);
  };

  window.App.Utils.Audio = Audio;
})();
