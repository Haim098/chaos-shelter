/**
 * Toast Component
 * Shows temporary notification messages.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Components = window.App.Components || {};

  var DOM = window.App.Utils.DOM;

  var Toast = {};
  var TOAST_DURATION = 3000;

  /**
   * Show a toast notification.
   * @param {string} message - text to display
   * @param {string} type - 'info' | 'success' | 'error' | 'warning'
   * @param {number} duration - ms to show (default 3000)
   */
  Toast.show = function (message, type, duration) {
    var container = DOM.id('toast-container');
    if (!container) return;

    type = type || 'info';
    duration = duration || TOAST_DURATION;

    var toast = DOM.create('div', 'toast toast-' + type);
    toast.textContent = message;
    toast.style.cssText = [
      'padding: 12px 20px',
      'border-radius: 10px',
      'font-size: 0.9rem',
      'font-weight: 600',
      'text-align: center',
      'pointer-events: auto',
      'animation: slideDown 0.3s ease',
      'box-shadow: 0 4px 16px rgba(0,0,0,0.4)',
      'max-width: 100%',
      'word-break: break-word'
    ].join(';');

    switch (type) {
      case 'success':
        toast.style.background = '#2e7d32';
        toast.style.color = '#fff';
        break;
      case 'error':
        toast.style.background = '#c62828';
        toast.style.color = '#fff';
        break;
      case 'warning':
        toast.style.background = '#e65100';
        toast.style.color = '#fff';
        break;
      default:
        toast.style.background = 'rgba(50, 62, 38, 0.95)';
        toast.style.color = '#e8e0d0';
        break;
    }

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);

    // Allow tap to dismiss
    toast.addEventListener('click', function () {
      toast.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    });
  };

  /** Shortcut methods */
  Toast.info = function (msg, dur) { Toast.show(msg, 'info', dur); };
  Toast.success = function (msg, dur) { Toast.show(msg, 'success', dur); };
  Toast.error = function (msg, dur) { Toast.show(msg, 'error', dur); };
  Toast.warning = function (msg, dur) { Toast.show(msg, 'warning', dur); };

  window.App.Components.Toast = Toast;
})();
