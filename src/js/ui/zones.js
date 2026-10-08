// Public reference points; precise attendee GPS remains a separate, explicit choice.
(() => {
  const api = window.RiversideAPI, $ = selector => document.querySelector(selector);
  let latest = null, version = null, dirty = false, picking = null, saving = false;
  const fields = $('#zone-fields'), feedback = $('#zones-feedback');
  function cancelPick() {
    picking = null; $('#zone-pick-cancel').hidden = true;
    document.dispatchEvent(new CustomEvent('riverside-zone-pick-cancel'));
  }
  function row(zone = {}) {
    const item = document.createElement('fieldset'); item.className = 'zone-editor'; item.dataset.zoneId = zone.id || '';
    const legend = document.createElement('legend'); legend.textContent = zone.id ? 'Saved zone' : 'New zone'; item.append(legend);
    for (const [key, title, type, max] of [['name','Zone name','text',100],['description','Description','text',300],['latitude','Latitude','number'],['longitude','Longitude','number']]) {
      const label = document.createElement('label'), input = document.createElement('input');
      label.append(document.createTextNode(title)); input.name = key; input.type = type; input.required = true;
      if (max) input.maxLength = max;
      if (type === 'number') { input.step = 'any'; input.min = key === 'latitude' ? '-90' : '-180'; input.max = key === 'latitude' ? '90' : '180'; }
      input.value = zone[key] ?? ''; label.append(input); item.append(label);
    }
    const label = document.createElement('label'), active = document.createElement('input');
    label.className = 'check-label'; active.name = 'active'; active.type = 'checkbox'; active.checked = zone.active !== false;
    label.append(active, document.createTextNode('Selectable on the report form and visible on the map')); item.append(label);
    const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'secondary'; pick.textContent = 'Pick on map';
    pick.addEventListener('click', () => {
      cancelPick(); picking = item; $('#zone-pick-cancel').hidden = false;
      feedback.textContent = 'Tap the map to place this zone’s reference pin. Then save event zones.';
      document.dispatchEvent(new CustomEvent('riverside-zone-pick-start'));
    }); item.append(pick);
    if (!zone.id) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary'; remove.textContent = 'Remove unsaved zone';
      remove.addEventListener('click', () => { if (picking === item) cancelPick(); item.remove(); dirty = true; }); item.append(remove);
    }
    item.addEventListener('input', () => { dirty = true; });
    fields.append(item);
  }
  function editor(config) {
    cancelPick(); fields.replaceChildren(); config.zones.forEach(row); version = config.version; dirty = false;
  }
  function choices(config) {
    window.RiversideData.zones = [{ id: 'current-location', name: 'GPS location' }, { id: 'demo-location', name: 'Use demo location · fictional' }, ...config.zones];
    for (const selector of ['#zone', '#qa-draft-zone']) {
      const select = $(selector), selected = select.value || 'current-location'; select.replaceChildren();
      const option = (id, name, disabled = false) => { const o = document.createElement('option'); o.value = id; o.textContent = name; o.disabled = disabled; select.append(o); };
      option('current-location', 'Use my location'); option('demo-location', 'Use demo location · fictional'); config.zones.filter(z => z.active).forEach(z => option(z.id, z.name));
      if (!['current-location', 'demo-location'].includes(selected) && !config.zones.some(z => z.id === selected && z.active)) {
        option(selected, `${config.zones.find(z => z.id === selected)?.name || 'Previous zone'} · unavailable — choose another`, true);
      }
      select.value = selected;
    }
  }
  api.subscribe(() => {
    const config = api.getState()?.eventZones;
    if (!config) return;
    if (!latest || config.version !== latest.version) { latest = config; choices(config); }
    if (api.getSession()?.user?.role === 'mo' && (!dirty || version === null) && !saving && version !== config.version) editor(config);
  });
  api.onIdentityChange(() => { cancelPick(); fields.replaceChildren(); version = null; dirty = false; feedback.textContent = ''; $('#zones-panel').open = false; });
  $('#zone-add').addEventListener('click', () => {
    if (fields.children.length >= 12) { feedback.textContent = 'The MVP supports up to 12 zones, including retired zones.'; return; }
    row({ description: 'Event zone reference point.', active: true }); dirty = true;
  });
  $('#zone-reload').addEventListener('click', () => { if (latest) { editor(latest); feedback.textContent = 'Loaded the saved zones.'; } });
  $('#zone-pick-cancel').addEventListener('click', () => { cancelPick(); feedback.textContent = 'Map placement cancelled. Other edits are still here.'; });
  document.addEventListener('riverside-zone-picked', event => {
    if (!picking || api.getSession()?.user?.role !== 'mo') return;
    picking.querySelector('[name="latitude"]').value = event.detail.latitude.toFixed(6);
    picking.querySelector('[name="longitude"]').value = event.detail.longitude.toFixed(6);
    dirty = true; cancelPick(); feedback.textContent = 'Reference point selected. Save event zones to publish it.';
    $('#zones-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.addEventListener('riverside-zone-pick-unavailable', () => { cancelPick(); feedback.textContent = 'The map is unavailable. Enter latitude and longitude in the zone fields, then save.'; });
  document.addEventListener('riverside-zone-select', event => {
    if (!latest?.zones.some(z => z.id === event.detail && z.active)) return;
    $('#zone').value = event.detail;
    $('#report-feedback').textContent = 'Zone selected. Add your report below; nothing has been sent.';
    $('#report-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#zones-form').addEventListener('submit', async event => {
    event.preventDefault(); if (saving || api.getSession()?.user?.role !== 'mo') return;
    const identity = api.getIdentityVersion();
    const zones = [...fields.children].map(item => ({ ...(item.dataset.zoneId ? { id: item.dataset.zoneId } : {}),
      name: item.querySelector('[name="name"]').value, description: item.querySelector('[name="description"]').value,
      latitude: Number(item.querySelector('[name="latitude"]').value), longitude: Number(item.querySelector('[name="longitude"]').value), active: item.querySelector('[name="active"]').checked }));
    const button = $('#zones-form button[type="submit"]'); saving = true; button.disabled = true; feedback.textContent = 'Saving zones…';
    try {
      const result = await api.saveZones({ version, zones });
      if (identity !== api.getIdentityVersion()) return;
      latest = result; choices(result); editor(result); feedback.textContent = 'Event zones saved. Everyone’s map and report choices will update.';
    } catch (error) { if (identity === api.getIdentityVersion()) feedback.textContent = error.message; }
    finally { saving = false; button.disabled = false; }
  });
})();
