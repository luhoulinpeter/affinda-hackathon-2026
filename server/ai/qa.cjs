const v = require('./validation.cjs');
const defaultGuide = require('../../data/event-guide.json');
const zones = require('../../data/fixtures.js').zones;
const zoneName = id => zones.find(zone => zone.id === id)?.name || id;
function buildSources(actor, state, guide = defaultGuide) {
  const sources = guide.approved === true && guide.fictional === true ? guide.entries.filter(item => item.audience === 'public' || (item.audience === 'staff' && actor.role !== 'public')).map(({ id, title, text }) => ({ id, title, text })) : [];
  const counts = { open: state.incidents.filter(item => item.status !== 'resolved').length, urgentOpen: state.incidents.filter(item => item.status !== 'resolved' && item.attention === 'urgent').length };
  sources.push({ id: 'permitted-overview', title: 'Current permitted incident counts', text: `Scope: ${actor.role === 'mo' ? 'All incidents' : 'Only records permitted for this user'}. Open: ${counts.open}. Urgent and open: ${counts.urgentOpen}. At most 30 incident details are included.` });
  // Bounded inputs. Never pass full internal history, model outputs, accounts or credentials.
  for (const incident of state.incidents.slice(-30).reverse()) {
    sources.push({ id: incident.id, title: `Current status ${incident.id}`, text: `Incident ${incident.id}\nZone: ${zoneName(incident.zone)}\nStatus: ${incident.status}\nAttention: ${incident.attention}\nSource reports: ${incident.reportIds.join(', ')}` });
    for (const report of state.reports.filter(item => incident.reportIds.includes(item.id))) {
      sources.push({ id: report.id, title: `Original report ${report.id}`, text: `Reported zone: ${zoneName(report.zone)}\nReporter-selected category: ${report.category}\nImmediate concern flag: ${report.immediateConcern === true ? 'Yes' : 'No'}\nReported at: ${report.time}\nOriginal unverified report text:\n${report.text}` });
    }
  }
  // Truncation is explicit so the model cannot claim a complete narrative of a large queue.
  let size = 0;
  const bounded = sources.filter(source => { size += source.text.length; return size <= 16000; });
  const overview = bounded.find(source => source.id === 'permitted-overview');
  overview.text += state.incidents.length > 30 || bounded.length < sources.length ? ' Detail sources are truncated; do not claim they describe the complete queue.' : ' All permitted incident details are included.';
  return bounded;
}
function validateInput(body) {
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 2000) throw Object.assign(new Error('Write a question between 1 and 2,000 characters.'), { status: 400 });
  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > 4 || history.some(item => !item || typeof item.question !== 'string' || !item.question.trim() || item.question.length > 2000 || typeof item.answer !== 'string' || item.answer.length > 4000)) throw Object.assign(new Error('Invalid conversation history.'), { status: 400 });
  return { question: body.question.trim(), history: history.map(item => ({ question: item.question, answer: item.answer })) };
}
const handoff = (question, unavailable = false) => ({ outcome: unavailable ? 'unavailable' : 'report_draft', answer: unavailable ? 'Safety screening is unavailable. If this describes an issue, prepare a report below. It has not been submitted. Use the established event emergency procedure for immediate help.' : 'This may describe a safety issue. Check the draft, select a zone and submit it for human review. It has not been submitted. Use the established event emergency procedure for immediate help.', sources: [], draft: { text: question, category: 'other', immediateConcern: false } });
async function answerQuestion({ body, actor, getState, providers, guide = defaultGuide, isCurrent = () => true }) {
  const { question, history } = validateInput(body);
  let screen;
  try { screen = v.screening(await providers.screen(question, history)); }
  catch { return handoff(question, true); }
  if (!isCurrent()) throw Object.assign(new Error('Session changed. Refresh and try again.'), { status: 403 });
  if (screen.intent !== 'information') return handoff(question);
  const sources = buildSources(actor, getState(), guide);
  try {
    const result = v.answer(await providers.answer(question, history, sources), sources.map(item => item.id));
    if (!isCurrent()) throw Object.assign(new Error('Session changed. Refresh and try again.'), { status: 403 });
    return { outcome: result.unknown ? 'unknown' : 'answer', answer: result.answer, sources: result.sources.map(id => sources.find(item => item.id === id)) };
  } catch (error) {
    if (error.status) throw error;
    return { outcome: 'unavailable', answer: 'Answers are unavailable. Reports can still be submitted for human review.', sources: [] };
  }
}
module.exports = { buildSources, validateInput, answerQuestion };
