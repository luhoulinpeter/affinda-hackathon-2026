(() => {
  const api = window.RiversideAPI;
  const $ = selector => document.querySelector(selector);
  let sequence = 0, claiming = false;
  async function render() {
    const request = ++sequence, identity = api.getIdentityVersion();
    if (api.getSession()?.user?.role !== 'volunteer' || api.isIdentityChanging()) { $('#available-incidents').replaceChildren(); return; }
    try {
      const result = await api.getAvailableIncidents();
      if (request !== sequence || identity !== api.getIdentityVersion()) return;
      const state = api.getState(), me = state.presence?.find(p => p.id === api.getSession().user.id);
      const ready = me?.state === 'available' && me.eligible;
      const status = $('#claim-feedback').textContent;
      const availabilityNote = status.startsWith('Choose Go available') || status.startsWith('You can see new incidents while busy');
      if (ready && availabilityNote) $('#claim-feedback').textContent = '';
      $('#available-incidents').replaceChildren();
      for (const incident of result.incidents) {
        const card = document.createElement('article'); card.className = 'offer-card';
        const title = document.createElement('h4'); title.textContent = `${incident.id} · ${window.RiversideData.zones.find(z => z.id === incident.zone)?.name || incident.zone}`;
        const note = document.createElement('p'); note.className = 'field-note'; note.textContent = 'Details are private until assigned. Choosing accepts this incident immediately.';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.dataset.claimIncident = incident.id; button.disabled = claiming || !ready; button.textContent = 'Accept this incident';
        card.append(title, note, button); $('#available-incidents').append(card);
      }
      if (!result.incidents.length) $('#available-incidents').textContent = 'No ordinary incidents waiting for a volunteer.';
      else if (!ready && !claiming && (!status || availabilityNote)) $('#claim-feedback').textContent = me?.state === 'busy' ? 'You can see new incidents while busy. Finish your current assignment before accepting another.' : 'Choose Go available before accepting an incident.';
    } catch (e) { if (request === sequence && identity === api.getIdentityVersion()) { $('#available-incidents').replaceChildren(); $('#claim-feedback').textContent = e.message; } }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-claim-incident]'); if (!button || claiming || api.isIdentityChanging()) return;
    const identity = api.getIdentityVersion(); claiming = true; button.disabled = true;
    $('#claim-feedback').textContent = 'Accepting incident…';
    try { await api.claimIncident(button.dataset.claimIncident); if (identity === api.getIdentityVersion()) $('#claim-feedback').textContent = 'Incident accepted. Its details are now in Your assignment.'; }
    catch (e) { if (identity === api.getIdentityVersion()) $('#claim-feedback').textContent = e.message; }
    finally { if (identity === api.getIdentityVersion()) { claiming = false; render(); } }
  });
  api.onIdentityChange(() => { sequence++; claiming = false; $('#available-incidents').replaceChildren(); $('#claim-feedback').textContent = ''; });
  api.subscribe(render);
})();
