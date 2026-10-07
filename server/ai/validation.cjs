const invalid = () => { throw new Error('Invalid provider response.'); };
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) invalid();
  return value;
}
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalid();
  return value.trim();
}
function classification(value, categories) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const keys = Object.keys(value);
  const legacy = keys.length === 2 && keys.includes('category') && keys.includes('urgency');
  const current = keys.length === 3 && keys.includes('category') && keys.includes('urgency') && keys.includes('sensitivity');
  if (!legacy && !current) invalid();
  if (!categories.includes(value.category) || !['routine', 'urgent', 'unclear'].includes(value.urgency)) invalid();
  if (legacy) return { category: value.category, urgency: value.urgency };
  if (!['ordinary', 'sensitive', 'unclear'].includes(value.sensitivity)) invalid();
  return { category: value.category, urgency: value.urgency, sensitivity: value.sensitivity };
}
function screening(value) {
  object(value, ['intent']);
  if (!['information', 'first_aid_information', 'safety', 'unclear'].includes(value.intent)) invalid();
  return { intent: value.intent };
}
function summary(value) { object(value, ['summary']); return { summary: text(value.summary, 1200) }; }
function answer(value, allowedIds) {
  object(value, ['answer', 'sources', 'unknown']);
  if (typeof value.unknown !== 'boolean' || !Array.isArray(value.sources) || value.sources.length > 12 || value.sources.some(id => typeof id !== 'string' || !allowedIds.includes(id))) invalid();
  const result = { answer: text(value.answer, 4000), sources: [...new Set(value.sources)], unknown: value.unknown };
  if (!result.unknown && !result.sources.length) invalid();
  return result;
}
module.exports = { object, text, classification, screening, summary, answer };
