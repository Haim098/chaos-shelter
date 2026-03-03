/**
 * Socket Utility Module
 * Wraps socket.io client connection and event handling.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Utils = window.App.Utils || {};

  var socket = null;
  var eventHandlers = {};
  var connected = false;

  var Socket = {};

  /** Initialize socket connection */
  Socket.connect = function () {
    if (socket) return socket;

    socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000
    });

    socket.on('connect', function () {
      connected = true;
      console.log('[Socket] Connected:', socket.id);
      Socket._fireInternal('connected', { id: socket.id });
    });

    socket.on('disconnect', function (reason) {
      connected = false;
      console.log('[Socket] Disconnected:', reason);
      Socket._fireInternal('disconnected', { reason: reason });
    });

    socket.on('connect_error', function (err) {
      console.warn('[Socket] Connection error:', err.message);
      Socket._fireInternal('error', { message: err.message });
    });

    return socket;
  };

  /** Listen for a server event */
  Socket.on = function (event, handler) {
    if (!socket) Socket.connect();
    socket.on(event, handler);
  };

  /** Emit event to server (with optional ack callback) */
  Socket.emit = function (event, data, callback) {
    if (!socket) {
      console.warn('[Socket] Not connected, cannot emit:', event);
      return;
    }
    if (typeof callback === 'function') {
      socket.emit(event, data, callback);
    } else {
      socket.emit(event, data);
    }
  };

  /** Remove event listener */
  Socket.off = function (event, handler) {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.removeAllListeners(event);
      }
    }
  };

  /** Get socket id */
  Socket.getId = function () {
    return socket ? socket.id : null;
  };

  /** Check connection */
  Socket.isConnected = function () {
    return connected;
  };

  /** Get raw socket reference */
  Socket.getSocket = function () {
    return socket;
  };

  /** Internal event system for connection status */
  Socket._internalHandlers = {};

  Socket._fireInternal = function (event, data) {
    var handlers = Socket._internalHandlers[event];
    if (handlers) {
      handlers.forEach(function (h) { h(data); });
    }
  };

  Socket.onStatus = function (event, handler) {
    if (!Socket._internalHandlers[event]) {
      Socket._internalHandlers[event] = [];
    }
    Socket._internalHandlers[event].push(handler);
  };

  window.App.Utils.Socket = Socket;
})();
