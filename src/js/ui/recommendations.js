window.RiversideRecommendations = (() => {
  const api = window.RiversideAPI, cache = new Map();
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const update = () => document.dispatchEvent(new CustomEvent('riverside-recommendation-update'));
  function signature(incident) {
    return JSON.stringify([incident.status, incident.assignee, incident.sensitive, incident.sensitivityReview,
      incident.category, incident.attention, incident.zone, incident.location, incident.assistance?.destination, incident.assistance?.offers,
      (api.getState().presence || []).map(p => [p.id, p.state, p.eligible, p.fresh, p.position?.latitude, p.position?.longitude])]);
  }
  function html(incident) {
    if (api.getSession()?.user?.role !== 'mo' || incident.status === 'resolved') return '';
    const held = incident.sensitive || ['pending', 'unavailable', 'legacy'].includes(incident.sensitivityReview);
    const status = incident.sensitive ? 'Private · Mo assigns personally' : incident.sensitivityReview === 'pending' ? 'AI privacy check pending · held for Mo' : incident.sensitivityReview === 'unavailable' ? 'AI privacy check unavailable · Mo review required' : incident.sensitivityReview === 'legacy' ? 'Older AI result has no privacy decision · Mo review required' : 'Ordinary · volunteers may choose when eligible';
    let content = `<section class="analysis-note"><h3>Privacy and assignment</h3><p>${escape(status)}</p><button type="button" class="secondary" data-private-incident="${escape(incident.id)}" data-private-value="${held ? 'false' : 'true'}">${held ? 'Approve ordinary volunteer selection' : 'Mark private for personal assignment'}</button>`;
    if (incident.assignee && ['accepted', 'arrived'].includes(incident.assistance?.state)) content += `<h3>Fictional movement demo</h3><p class="field-note">Animate a 90-second journey around the University of Melbourne. Both journey endpoints and the moving position are fictional; this never changes arrival or resolution.</p><div class="form-actions"><button type="button" class="secondary" data-demo-incident="${escape(incident.id)}" data-demo-action="start">Start / restart demo movement</button><button type="button" class="secondary" data-demo-incident="${escape(incident.id)}" data-demo-action="stop">Stop demo movement</button></div>`;
    if (!incident.assignee && !incident.assistance?.offers.some(o => o.status === 'pending')) {
      const item = cache.get(incident.id), current = item?.signature === signature(incident);
      const enabled = api.getSession()?.ai?.luna?.enabled === true;
      content += `<h3>Suggested volunteers</h3><p class="field-note">AI can order eligible helpers using roster zone, approximate distance and location freshness. It cannot assess medical qualifications. Choose a volunteer in the assignment form and send an offer.</p><button type="button" class="secondary" data-recommend-incident="${escape(incident.id)}" ${item?.pending || !enabled ? 'disabled' : ''}>${item?.pending ? 'Preparing suggestions…' : 'Suggest with AI'}</button>`;
      if (!enabled) content += '<p class="field-note">AI is unavailable. Manual assignment remains available above.</p>';
      if (item?.error) content += `<p role="status">${escape(item.error)}</p>`;
      if (item?.result && current) content += item.result.recommendations.length ? `<ol>${item.result.recommendations.map(p => `<li><strong>${escape(p.name)}</strong><p class="field-note">${p.reasons.map(escape).join(' ')}</p></li>`).join('')}</ol><p class="field-note">Advisory order only. No offer has been sent.</p>` : '<p>No eligible volunteers right now. Check availability or wait for someone to go available.</p>';
      else if (item?.result) content += '<p class="field-note">Availability changed. Request a fresh suggestion before choosing.</p>';
    }
    return content + '</section>';
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-recommend-incident], [data-private-incident], [data-demo-incident]');
    if (!button || api.getSession()?.user?.role !== 'mo' || api.isIdentityChanging()) return;
    const identity = api.getIdentityVersion();
    if (button.dataset.demoIncident) {
      button.disabled = true;
      try { await api.demoJourney(button.dataset.demoIncident, button.dataset.demoAction); }
      catch (e) { if (identity === api.getIdentityVersion()) document.querySelector('#feedback').textContent = e.message; }
      finally { if (identity === api.getIdentityVersion()) { button.disabled = false; update(); } }
      return;
    }
    if (button.dataset.privateIncident) {
      button.disabled = true;
      try { await api.setSensitivity(button.dataset.privateIncident, button.dataset.privateValue === 'true'); }
      catch (e) { if (identity === api.getIdentityVersion()) document.querySelector('#feedback').textContent = e.message; }
      finally { if (identity === api.getIdentityVersion()) { button.disabled = false; update(); } }
      return;
    }
    const id = button.dataset.recommendIncident;
    if (cache.get(id)?.pending) return;
    const incident = api.getState().incidents.find(i => i.id === id); if (!incident) return;
    const item = { pending: true, signature: signature(incident) }; cache.set(id, item); update();
    try { const result = await api.recommendVolunteer(id); if (identity === api.getIdentityVersion()) item.result = result; }
    catch (e) { if (identity === api.getIdentityVersion()) item.error = e.message; }
    finally { if (identity === api.getIdentityVersion()) { item.pending = false; update(); } }
  });
  api.onIdentityChange(() => { cache.clear(); update(); });
  return { html };
})();
