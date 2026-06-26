/**
 * GroundedProvider — the zero-config default.
 *
 * It does NOT call any LLM. Instead it answers deterministically from the
 * retrieved (verified) operational context, so it can never fabricate data and
 * needs no API key. This is the safe default that satisfies the hard
 * "never invent operational data" requirement; LLM providers are opt-in.
 */
const { AIProvider } = require('./base');

function fmtDuration(seconds) {
  const s = Math.round(seconds || 0);
  if (s <= 0) return 'no wait';
  const m = Math.round(s / 60);
  return m < 60 ? `~${m} min` : `~${Math.floor(m / 60)}h ${m % 60}m`;
}

function longestWait(queues) {
  return [...queues].sort((a, b) => (b.estimatedWaitSeconds || 0) - (a.estimatedWaitSeconds || 0))[0] || null;
}

function findQueueByMention(question, queues) {
  const q = question.toLowerCase();
  return queues.find(x => x.label && q.includes(x.label.toLowerCase()))
    || queues.find(x => x.key && q.includes(String(x.key).toLowerCase()));
}

class GroundedProvider extends AIProvider {
  get name() { return 'grounded'; }

  async answer({ question, context }) {
    const q = (question || '').toLowerCase();
    const queues = context.queues || [];
    const totals = context.totals || {};
    const predictions = context.predictions || {};
    const staff = context.staff || [];

    const noData = queues.length === 0 && (totals.totalIssued || 0) === 0;

    // longest / slowest / busiest queue
    if (/(longest|highest|most|biggest).*(wait|queue|line)|slow(est)?|busiest|which queue/.test(q)) {
      const lw = longestWait(queues);
      if (!lw) return { text: "I don't have any active queues to compare right now." };
      return {
        text: `**${lw.label}** currently has the longest wait — about **${fmtDuration(lw.estimatedWaitSeconds)}** with **${lw.waitingCount}** waiting${lw.nowServing != null ? ` (now serving #${lw.nowServing})` : ''}.`,
      };
    }

    // predict / forecast / remaining traffic
    if (/predict|forecast|traffic|remaining|expect|congest/.test(q)) {
      const congestion = predictions.congestion || [];
      if (congestion.length) {
        return { text: congestion.map(c => `⚠️ ${c.message} _Recommended: ${c.recommendation} (${c.confidence} confidence)._`).join('\n\n') };
      }
      return { text: `No congestion is forecast in the next hour based on current trends.${predictions.modelSource === 'trained' ? ' (trained model)' : ''} I won't guess beyond the data available.` };
    }

    // suggestions / optimisation
    if (/suggest|improve|reduce|optimi|recommend|action/.test(q)) {
      const recs = predictions.recommendations || [];
      if (recs.length) return { text: 'Here’s what the data suggests:\n\n' + recs.map(r => `- **${r.action || 'action'}** — ${r.reason}`).join('\n') };
      return { text: 'Queues look balanced right now — no specific action is warranted by the current data.' };
    }

    // staff performance
    if (/staff|operator|agent|who.*served|performance/.test(q)) {
      if (!staff.length) return { text: 'No staff performance data is available yet.' };
      const top = staff.slice(0, 5).map(s => `- **${s.username}** — ${s.tokensServed} served, avg ${fmtDuration(s.avgServiceSeconds)}`).join('\n');
      return { text: `Staff performance (by tokens served):\n\n${top}` };
    }

    // "why is queue X slow"
    const mentioned = findQueueByMention(question, queues);
    if (mentioned && /why|slow|long|behind/.test(q)) {
      return {
        text: `**${mentioned.label}** has **${mentioned.waitingCount}** waiting (~${fmtDuration(mentioned.estimatedWaitSeconds)}). ` +
          (mentioned.atCapacity ? 'It is **at capacity**, which is driving the wait up. ' : '') +
          `Average service time here is about ${fmtDuration(mentioned.avgServiceSeconds)}. I base this only on live queue data — I won't speculate on causes I can't see.`,
      };
    }

    // summary / report / how are we doing
    if (/summary|report|overview|how.*(doing|today)|status|snapshot/.test(q) || noData === false) {
      if (noData) return { text: "There's no queue activity recorded yet today, so I don't have figures to summarise." };
      const totalWaiting = queues.reduce((s, x) => s + (x.waitingCount || 0), 0);
      const lw = longestWait(queues);
      const lines = [
        `**Today so far:** ${totals.totalIssued || 0} tokens issued, ${totals.totalExpired || 0} expired, ${totals.totalReferred || 0} referred.`,
        `**Now:** ${totalWaiting} waiting across ${queues.length} queue(s); average wait ${fmtDuration(totals.avgWaitSeconds)}.`,
        lw ? `**Busiest:** ${lw.label} (${lw.waitingCount} waiting).` : null,
        (predictions.recommendations || []).length ? `**Suggested:** ${predictions.recommendations[0].reason}` : null,
      ].filter(Boolean);
      return { text: lines.join('\n\n') };
    }

    // default — say what I can help with (no fabrication)
    return {
      text: "I can answer from live queue data — try: *“Which queue has the longest wait?”*, *“Predict remaining traffic”*, *“Generate today's summary”*, *“Suggest ways to reduce waiting”*, or *“How is staff performance?”* I only report verified figures; if the data isn't there, I'll say so.",
    };
  }
}

module.exports = { GroundedProvider };
