/**
 * DOM Utility Module
 * Provides helper functions for DOM manipulation.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Utils = window.App.Utils || {};

  var DOM = {};

  /** Get element by ID */
  DOM.id = function (id) {
    return document.getElementById(id);
  };

  /** Query single element */
  DOM.qs = function (selector, parent) {
    return (parent || document).querySelector(selector);
  };

  /** Query all elements */
  DOM.qsa = function (selector, parent) {
    return Array.from((parent || document).querySelectorAll(selector));
  };

  /** Show element (add .active for screens, remove .hidden otherwise) */
  DOM.show = function (el) {
    if (!el) return;
    if (typeof el === 'string') el = DOM.id(el);
    if (!el) return;
    el.classList.remove('hidden');
  };

  /** Hide element */
  DOM.hide = function (el) {
    if (!el) return;
    if (typeof el === 'string') el = DOM.id(el);
    if (!el) return;
    el.classList.add('hidden');
  };

  /** Switch to a screen by id (e.g. 'lobby', 'crewGame') */
  DOM.showScreen = function (screenName) {
    var screens = DOM.qsa('.screen');
    screens.forEach(function (s) {
      s.classList.remove('active');
    });
    var target = DOM.id('screen-' + screenName);
    if (target) {
      target.classList.add('active');
    }
  };

  /** Show overlay */
  DOM.showOverlay = function (overlayName) {
    var el = DOM.id('screen-' + overlayName);
    if (el) el.classList.add('active');
  };

  /** Hide overlay */
  DOM.hideOverlay = function (overlayName) {
    var el = DOM.id('screen-' + overlayName);
    if (el) el.classList.remove('active');
  };

  /** Create element with optional class and text */
  DOM.create = function (tag, className, textContent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
  };

  /** Set inner HTML safely */
  DOM.setHTML = function (el, html) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.innerHTML = html;
  };

  /** Set text content */
  DOM.setText = function (el, text) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.textContent = text;
  };

  /** Add event listener with touch-friendly handling */
  DOM.on = function (el, event, handler) {
    if (typeof el === 'string') el = DOM.id(el);
    if (!el) return;
    el.addEventListener(event, handler);
  };

  /** Remove all children */
  DOM.clear = function (el) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.innerHTML = '';
  };

  /** Add class */
  DOM.addClass = function (el, cls) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.classList.add(cls);
  };

  /** Remove class */
  DOM.removeClass = function (el, cls) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.classList.remove(cls);
  };

  /** Toggle class */
  DOM.toggleClass = function (el, cls, force) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.classList.toggle(cls, force);
  };

  /** Check if has class */
  DOM.hasClass = function (el, cls) {
    if (typeof el === 'string') el = DOM.id(el);
    return el ? el.classList.contains(cls) : false;
  };

  /** Set CSS style */
  DOM.css = function (el, prop, value) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.style[prop] = value;
  };

  /** Set attribute */
  DOM.attr = function (el, name, value) {
    if (typeof el === 'string') el = DOM.id(el);
    if (el) el.setAttribute(name, value);
  };

  /** Delegate event listener */
  DOM.delegate = function (parent, selector, event, handler) {
    if (typeof parent === 'string') parent = DOM.id(parent);
    if (!parent) return;
    parent.addEventListener(event, function (e) {
      var target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e);
      }
    });
  };

  window.App.Utils.DOM = DOM;
})();
