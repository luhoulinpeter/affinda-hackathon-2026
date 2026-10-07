// Person 1: conversation exists only in this page. The server rechecks all context.
(() => {
  const api = window.RiversideAPI;
  const $ = selector => document.querySelector(selector);
  const data = window.RiversideData;
  let exchanges = [];
  let generation = 0;
  let asking = false;
  let submitting = false;
  $('#qa-draft-zone').append(new Option('Select a zone', ''));
  data.zones.forEach(zone => $('#qa-draft-zone').append(new Option(zone.name, zone.id)));
  data.categories.forEach(item => $('#qa-draft-category').append(new Option(item.name, item.id)));
  function availability() {
    const session = api.getSession();
    if (!session) return;
    $('#qa-panel').hidden = false;
    const status = ['jev', 'luna'].map(name => {
      const provider = session.ai?.[name];
      const allowance = Number.isInteger(provider?.remainingCalls) ? ` (${provider.remainingCalls} calls left)` : '';
      return `${name === 'jev' ? 'Jev' : 'OpenRouter'}: ${provider?.enabled ? 'live calls enabled' : provider?.reason || 'unavailable'}${allowance}`;
    }).join(' · ');
    $('#ai-status').textContent = status;
    $('#qa-availability').textContent = `${status}. ${session.guideApproved ? 'Fictional event guide approved.' : 'Fictional event guide awaiting team approval; site facts are unavailable.'} Only your permitted records are used.`;
    $('#qa-send').disabled = asking || submitting || api.isIdentityChanging();
    $('#qa-draft-submit').disabled = submitting || api.isIdentityChanging();
  }
  function clear() {
    generation++; exchanges = []; asking = false; submitting = false;
    $('#qa-messages').replaceChildren(); $('#qa-form').reset();
    $('#qa-draft-form').reset(); $('#qa-draft').hidden = true;
    $('#qa-feedback').textContent = ''; availability();
  }
  function renderMessages() {
    $('#qa-messages').replaceChildren();
    for (const exchange of exchanges) {
      const article = document.createElement('article'); article.className = 'qa-exchange';
      const question = document.createElement('p'); question.className = 'qa-question'; question.textContent = `You: ${exchange.question}`;
      const answer = document.createElement('p'); answer.textContent = `Riverside: ${exchange.answer}`;
      article.append(question, answer);
      for (const source of exchange.sources || []) {
        const details = document.createElement('details'); details.className = 'qa-source';
        const title = document.createElement('summary'); title.textContent = `Source: ${source.title} (${source.id})`;
        const content = document.createElement('p'); content.textContent = source.text;
        details.append(title, content); article.append(details);
      }
      $('#qa-messages').append(article);
    }
  }
  $('#qa-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (asking || submitting || api.isIdentityChanging()) return;
    const question = $('#qa-question').value.trim();
    if (!question) return;
    const version = generation;
    const identity = api.getIdentityVersion();
    asking = true; availability(); $('#qa-feedback').textContent = 'Checking your question…';
    try {
      const result = await api.ask({ question, history: exchanges.slice(-4).map(item => ({ question: item.question, answer: item.answer.slice(0, 1000) })) });
      if (version !== generation || identity !== api.getIdentityVersion()) return;
      exchanges = [...exchanges, { question, answer: result.answer, sources: result.sources }].slice(-4);
      renderMessages(); $('#qa-question').value = '';
      $('#qa-feedback').textContent = result.outcome === 'unknown' ? 'Some information is unknown. Check the answer and sources.' : '';
      if (result.draft) {
        $('#qa-draft-form').reset(); $('#qa-draft-text').value = result.draft.text;
        $('#qa-draft-category').value = result.draft.category;
        $('#qa-draft-urgent').checked = result.draft.immediateConcern;
        $('#qa-draft').hidden = false;
        $('#qa-draft-title').textContent = 'Report draft · Not submitted yet';
      }
    } catch (error) {
      if (version === generation && identity === api.getIdentityVersion()) $('#qa-feedback').textContent = error.message;
      api.refresh().catch(() => {});
    } finally { if (version === generation) { asking = false; availability(); } }
  });
  $('#qa-draft-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || api.isIdentityChanging()) return;
    const version = generation; const identity = api.getIdentityVersion();
    submitting = true; availability(); $('#qa-feedback').textContent = 'Submitting report…';
    try {
      const result = await api.submitReport({ zone: $('#qa-draft-zone').value, category: $('#qa-draft-category').value, text: $('#qa-draft-text').value, immediateConcern: $('#qa-draft-urgent').checked });
      if (version !== generation || identity !== api.getIdentityVersion()) return;
      $('#qa-draft').hidden = true; $('#qa-draft-form').reset();
      $('#qa-feedback').textContent = `Report received as ${result.id}. It is available to Mo for human review. No responder has been dispatched.`;
    } catch (error) {
      if (version === generation && identity === api.getIdentityVersion()) $('#qa-feedback').textContent = error.message;
    } finally { if (version === generation) { submitting = false; availability(); } }
  });
  $('#qa-draft-cancel').addEventListener('click', () => { if (!submitting) { $('#qa-draft').hidden = true; $('#qa-draft-form').reset(); } });
  $('#qa-clear').addEventListener('click', clear);
  api.onIdentityChange(clear); api.subscribe(availability); availability();
})();
