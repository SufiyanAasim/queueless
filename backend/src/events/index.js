/**
 * Wires event-bus subscribers. Called once at server boot so domain events
 * (token referred, queue created, message sent, …) fan out to the notification
 * center without the emitting modules knowing who listens.
 */
const { on, EVENTS } = require('./bus');
const notifications = require('../services/notification.service');

let registered = false;

function registerSubscribers() {
  if (registered) return;
  registered = true;

  on(EVENTS.TOKEN_REFERRED, notifications.onTokenReferred);
  on(EVENTS.QUEUE_CREATED, notifications.onQueueCreated);
  on(EVENTS.QUEUE_ARCHIVED, notifications.onQueueArchived);
  on(EVENTS.MESSAGE_SENT, notifications.onMessageSent);

  console.log('[events] subscribers registered');
}

module.exports = { registerSubscribers };
