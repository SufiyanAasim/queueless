/**
 * Application-wide event bus (v1.4.5 Phase 3).
 *
 * A thin wrapper over Node's EventEmitter that lets modules communicate through
 * events instead of tightly-coupled service calls. Emitting is fire-and-forget
 * and never blocks the caller; handlers are isolated so one failing subscriber
 * can't break the request path or other subscribers.
 */
const { EventEmitter } = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

const EVENTS = Object.freeze({
  TOKEN_ISSUED: 'token.issued',
  TOKEN_CALLED: 'token.called',
  TOKEN_REFERRED: 'token.referred',
  TOKEN_EXPIRED: 'token.expired',
  QUEUE_CREATED: 'queue.created',
  QUEUE_UPDATED: 'queue.updated',
  QUEUE_ARCHIVED: 'queue.archived',
  MESSAGE_SENT: 'message.sent',
  PREDICTION_GENERATED: 'prediction.generated',
});

function emit(event, payload) {
  // Defer to the next tick so emitting never adds latency to the caller.
  setImmediate(() => {
    try {
      emitter.emit(event, payload);
    } catch (err) {
      console.error(`[events] emit "${event}" failed:`, err.message);
    }
  });
}

function on(event, handler) {
  emitter.on(event, async (payload) => {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[events] handler for "${event}" failed:`, err.message);
    }
  });
}

module.exports = { EVENTS, emit, on, emitter };
