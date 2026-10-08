// GPS stays between this browser and the application server, never an AI provider.
window.RiversideAssistance = (() => {
  const api = window.RiversideAPI, $ = s => document.querySelector(s);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = id => window.RiversideData.volunteers.find(v => v.id === id)?.name || id;
  const labels = { looking: 'Looking for a volunteer', offered: 'Offered · awaiting acceptance', accepted: 'Accepted · arrival not yet confirmed', arrived: 'Volunteer marked arrived', unavailable: 'No volunteer available — awaiting Mo’s review', cancelled: 'Assistance stopped · incident remains open unless explicitly resolved', completed: 'Assistance completed' };
  let tracking = false, starting = false, trackingVersion = 0, watch = null, timer = null, lastUpload = 0, uploading = false, issue = '';
  let locationPending = null, stationIdentity = null, helpVersion = 0;
  let serverOffset = 0;
  const manualChoices = new Map();
  function moOfferHTML(i) {
    if (api.getSession()?.user?.role !== 'mo' || i.status === 'resolved') return '';
    const state = api.getState(), blocked = i.assignee || i.assistance?.offers.some(o => o.status === 'pending');
    const reporters = state.reports.filter(r => i.reportIds.includes(r.id)).map(r => r.reporter.id);
    const options = (state.presence || []).map(p => {
      const reason = !p.hasAccount ? 'no account' : reporters.includes(p.id) ? 'reporter' : i.assistance?.offers.some(o => o.volunteerId === p.id) ? 'already offered' : p.state !== 'available' || !p.eligible ? p.state : state.incidents.some(j => j.assignee === p.id && j.status !== 'resolved' || j.assistance?.offers.some(o => o.status === 'pending' && o.volunteerId === p.id)) ? 'busy / holding an offer' : '';
      return `<option value="${escape(p.id)}" ${reason ? 'disabled' : ''} ${!reason && manualChoices.get(i.id) === p.id ? 'selected' : ''}>${escape(p.name)}${reason ? ` · ${escape(reason)}` : p.fresh ? ' · available' : ' · available, older location'}</option>`;
    }).join('');
    return `<section class="assistance-status"><h3>Offer to a volunteer</h3><p class="field-note">Mo chooses a helper; they must accept or decline within 60 seconds. ${i.assistance?.destination ? '' : 'This report has a zone but no GPS destination; nearest matching is unavailable.'}</p><form data-manual-offer="${escape(i.id)}"><label>Volunteer<select name="volunteerId" required ${blocked ? 'disabled' : ''}><option value="">Choose an available volunteer</option>${options}</select></label><button type="submit" class="primary" ${blocked ? 'disabled' : ''}>Send volunteer offer</button></form>${blocked ? '<p class="field-note">Stop the current assistance offer or assignment before choosing another helper.</p>' : ''}${!i.assistance?.destination ? '<button type="button" class="secondary" disabled>Retry matching · needs requester GPS</button>' : ''}</section>`;
  }
  function locationError(error) {
    if (error.code === 1) return new Error('Location access is blocked. On iPhone: Safari page menu → Website Settings → Location → Ask or Allow. Then Settings → Privacy & Security → Location Services → Safari Websites → While Using the App, with Precise Location on. Return here and tap the same button again. Safari may not show another popup after a previous denial. Reports still work without GPS by choosing a zone.');
    if (error.code === 3) return new Error('Location timed out after 15 seconds. Keep this page visible and try again where your device can get a location. Reports still work without GPS.');
    return new Error('Your browser could not get a location (position unavailable). Check your device’s Location Services and browser permission. If this persists in the embedded browser, open this same address in Safari or Chrome. Reports still work without GPS.');
  }
  function gps() {
    if (!window.isSecureContext || !navigator.geolocation) return Promise.reject(new Error('GPS needs a supported browser and HTTPS (or localhost on this computer).'));
    return new Promise((resolve, reject) => {
      // Some browser/OS permission failures never invoke either callback. Keep
      // the form recoverable and ignore a fix arriving after this attempt ends.
      let settled = false;
      const finish = (callback, value) => { if (settled) return; settled = true; clearTimeout(deadline); callback(value); };
      const deadline = setTimeout(() => finish(reject, new Error('Your browser has not responded to the location request. If no popup appeared on iPhone, check Safari Website Settings → Location and iPhone Location Services → Safari Websites. Keep this page open and try again; your report has not been sent.')), 30000);
      try { navigator.geolocation.getCurrentPosition(p => {
      const pos = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, capturedAt: p.timestamp };
      if (!Number.isFinite(pos.accuracy) || pos.accuracy < 0 || pos.accuracy > 100) finish(reject, new Error(`Location accuracy ${Number.isFinite(pos.accuracy) && pos.accuracy >= 0 ? `is ±${Math.ceil(pos.accuracy)} metres` : 'is unavailable'}; volunteer attendance needs 100 metres or better. Try a clearer location or another device. Reports still work without GPS.`));
      else if (!Number.isFinite(pos.capturedAt) || Date.now() - pos.capturedAt > 60000 || pos.capturedAt > Date.now() + 5000) finish(reject, new Error('The location timestamp is stale or invalid. Check your device’s clock and try again.'));
      else finish(resolve, pos);
      }, error => finish(reject, locationError(error)), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }); }
      catch { finish(reject, new Error('The browser could not start a location request. Check Safari website permission and iPhone Location Services, then try again.')); }
    });
  }
  function incidentHTML(i) {
    const a = i.assistance; if (!a) return moOfferHTML(i);
    const session = api.getSession(), actor = session.user?.id || session.guest.id, role = session.user?.role || 'public';
    const own = api.getState().reports.some(r => i.reportIds.includes(r.id) && r.reporter.id === actor && r.reporter.role === role);
    const offer = a.offers.find(o => o.status === 'pending');
    const active = !['cancelled', 'completed'].includes(a.state) && i.status !== 'resolved';
    const action = (label, action) => `<button type="button" class="secondary" data-assistance="${action}" data-incident="${escape(i.id)}">${label}</button>`;
    return `<section class="assistance-status"><h3>Volunteer assistance</h3><p><strong>${escape(labels[a.state] || a.state)}</strong></p>${i.assignee ? `<p>Responder: ${escape(name(i.assignee))}</p>` : ''}
      ${offer ? `<p>${role === 'mo' ? `Offered to ${escape(name(offer.volunteerId))} · ` : ''}<span data-offer-expiry="${escape(offer.expiresAt)}"></span></p>` : ''}
      ${a.destination ? `<p class="field-note">Requester GPS: ${a.destination.latitude.toFixed(5)}, ${a.destination.longitude.toFixed(5)} · ±${Math.round(a.destination.accuracy)} m · captured ${escape(new Date(a.destination.capturedAt).toLocaleTimeString())}</p>` : ''}
      <div class="form-actions">${active && (own || role === 'mo') ? action('Stop assistance', 'withdraw') : ''}${active && role === 'mo' && a.destination ? action('Retry matching', 'retry') : ''}${a.state === 'accepted' && i.assignee === actor ? action('Mark arrived', 'arrive') : ''}</div>
      ${role === 'mo' ? `<details><summary>Offer history</summary><ol>${a.events.map(e => `<li>${escape(e.action.replaceAll('_', ' '))}${e.volunteerId ? ` · ${escape(name(e.volunteerId))}` : ''} · ${escape(new Date(e.time).toLocaleTimeString())}</li>`).join('')}</ol></details>` : ''}</section>${moOfferHTML(i)}`;
  }
  function countdown() {
    document.querySelectorAll('[data-offer-expiry]').forEach(el => { const seconds = Math.max(0, Math.ceil((Date.parse(el.dataset.offerExpiry) - Date.now() - serverOffset) / 1000)); el.textContent = seconds ? `${seconds}s left to respond` : 'Offer expired · checking next responder'; });
  }
  setInterval(countdown, 1000);
  function stopTracking() {
    trackingVersion++; tracking = false; uploading = false;
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    clearInterval(timer); watch = null; timer = null;
  }
  async function upload(pos, version) {
    if (!tracking || version !== trackingVersion || uploading || Date.now() - lastUpload < 10000) return;
    const identity = api.getIdentityVersion();
    uploading = true; lastUpload = Date.now();
    try { await api.setPresence({ available: true, start: false, position: pos }); if (identity === api.getIdentityVersion()) issue = ''; }
    catch (e) { if (identity === api.getIdentityVersion()) issue = e.message; }
    finally { if (version === trackingVersion) { uploading = false; render(); } }
  }
  async function goAvailable() {
    if (starting || tracking) return;
    starting = true;
    const identity = api.getIdentityVersion();
    $('#go-available').disabled = true; issue = 'Getting your GPS location…'; render();
    try {
      const pos = await gps();
      if (identity !== api.getIdentityVersion()) return;
      // Set tracking first, since the presence response refreshes the UI.
      tracking = true; const version = ++trackingVersion; lastUpload = Date.now();
      await api.setPresence({ available: true, start: true, position: pos });
      if (!tracking || identity !== api.getIdentityVersion()) return;
      issue = '';
      watch = navigator.geolocation.watchPosition(p => upload({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, capturedAt: p.timestamp }, version), e => { if (version !== trackingVersion) return; issue = `${locationError(e).message} Updates will retry; old fixes are labelled and expire if no valid location arrives for 10 minutes. Pause stops sharing.`; render(); }, { enableHighAccuracy: true, maximumAge: 0 });
      timer = setInterval(async () => {
        if (!tracking || locationPending) return;
        locationPending = gps();
        try { await upload(await locationPending, version); } catch (e) { if (version === trackingVersion) { issue = e.message; render(); } }
        finally { locationPending = null; }
      }, 10000);
    } catch (e) { if (identity === api.getIdentityVersion()) { stopTracking(); issue = e.message; } }
    finally { if (identity === api.getIdentityVersion()) { starting = false; render(); } }
  }
  async function pause() {
    stopTracking();
    try { await api.setPresence({ available: false }); issue = 'Paused. Choose Go available when ready.'; }
    catch (e) { issue = `${e.message} GPS collection has stopped on this device. The server will remove the last position after 10 minutes without updates.`; }
    render();
  }
  function stationRow(station = {}) {
    const row = document.createElement('fieldset'); row.className = 'station-row';
    row.innerHTML = `<legend>Fictional station</legend><label>Name<input data-station="name" required maxlength="100"></label><label>Description<input data-station="description" required maxlength="500"></label><div class="coordinate-fields"><label>Latitude<input data-station="latitude" type="number" min="-90" max="90" step="any" required></label><label>Longitude<input data-station="longitude" type="number" min="-180" max="180" step="any" required></label></div><button type="button" class="secondary station-remove">Remove station</button>`;
    row.querySelectorAll('[data-station]').forEach(input => { input.value = station[input.dataset.station] ?? ''; });
    row.querySelector('.station-remove').addEventListener('click', () => row.remove());
    $('#station-fields').append(row);
  }
  async function loadStations(identity) {
    try {
      const result = await api.getStations(); if (identity !== api.getIdentityVersion()) return;
      $('#station-fields').replaceChildren(); result.stations.forEach(stationRow); $('#stations-enabled').checked = result.enabled;
    } catch (e) { if (identity === api.getIdentityVersion()) $('#station-feedback').textContent = e.message; }
  }
  function render() {
    const session = api.getSession(); if (!session) return;
    const state = api.getState(), role = session.user?.role;
    serverOffset = (state.serverTime || Date.now()) - Date.now();
    $('#volunteer-assistance').hidden = role !== 'volunteer';
    if (role === 'volunteer') {
      const p = (state.presence || []).find(p => p.id === session.user.id);
      // A periodic refresh can still contain the old paused state while the
      // initial presence POST is in flight. Do not cancel that opt-in early.
      if (tracking && !starting && p?.state === 'paused') stopTracking();
      $('#presence-feedback').textContent = `${p?.state === 'busy' ? 'Busy on an accepted assignment' : p?.eligible && p?.state === 'available' ? 'Available for offers' : 'Paused / location unavailable'}${p?.position ? ` · GPS ±${Math.round(p.position.accuracy)} m · last fix ${Math.max(0, Math.floor((Date.now() + serverOffset - p.position.capturedAt) / 1000))}s ago${p.fresh ? ' (fresh)' : ' (older position, used for matching)'}` : ''}${tracking ? ' · sharing stays on until you pause or sign out' : ''}${issue || p?.reason ? `. ${issue || p.reason}` : ''}`;
      $('#go-available').disabled = starting || tracking || api.isIdentityChanging();
      $('#go-available').textContent = starting ? 'Getting location…' : tracking ? 'Location sharing active' : 'Go available';
      $('#pause-volunteer').disabled = starting || (!tracking && p?.state === 'paused');
      const tasks = state.incidents.filter(i => i.assignee === session.user.id || i.assistance?.offers.some(o => o.status === 'pending' && o.volunteerId === session.user.id));
      $('#volunteer-offers').innerHTML = tasks.map(i => {
        const offer = i.assistance.offers.find(o => o.status === 'pending' && o.volunteerId === session.user.id);
        const text = state.reports.filter(r => i.reportIds.includes(r.id)).map(r => r.text).join('\n');
        return `<article class="offer-card"><h3>${escape(i.id)} · ${offer ? 'Incoming offer' : 'Your assignment'}</h3><p>${escape(text)}</p>${incidentHTML(i)}${offer ? `<div class="form-actions"><button type="button" class="primary" data-offer-decision="accept" data-offer="${escape(offer.id)}" data-incident="${escape(i.id)}">Accept offer</button><button type="button" class="secondary" data-offer-decision="decline" data-offer="${escape(offer.id)}" data-incident="${escape(i.id)}">Decline offer</button></div>` : i.status !== 'resolved' ? `<div class="form-actions"><button type="button" class="secondary" data-task-action="escalate" data-incident="${escape(i.id)}">Escalate to Mo</button><button type="button" class="primary" data-task-action="resolve" data-incident="${escape(i.id)}">Confirm resolved</button></div>` : ''}</article>`;
      }).join('') || '<p class="field-note">No incoming offers or assignments.</p>';
    } else { stopTracking(); $('#volunteer-offers').replaceChildren(); }
    if (role === 'mo') {
      $('#mo-presence').innerHTML = (state.presence || []).map(p => `<p><strong>${escape(p.name)}</strong> · ${escape(p.state)}${p.position ? ` · ${p.position.latitude.toFixed(5)}, ${p.position.longitude.toFixed(5)} · ±${Math.round(p.position.accuracy)} m · ${p.fresh ? 'fresh' : 'older position, used for matching'} · fix ${Math.max(0, Math.floor((Date.now() + serverOffset - p.position.capturedAt) / 1000))}s ago` : ' · no current location'}</p>`).join('');
      if (stationIdentity !== api.getIdentityVersion()) { stationIdentity = api.getIdentityVersion(); loadStations(stationIdentity); }
    } else { $('#mo-presence').replaceChildren(); $('#station-fields').replaceChildren(); stationIdentity = null; }
    countdown();
  }
  function showStations(result) {
    $('#help-feedback').textContent = result.answer + (result.stations?.length ? ' Tap a first-aid pin on the map for details.' : '');
    $('#first-aid-results').replaceChildren();
  }
  $('#find-first-aid').addEventListener('click', async () => {
    const version = ++helpVersion, identity = api.getIdentityVersion();
    $('#find-first-aid').disabled = true; $('#help-feedback').textContent = 'Getting location for station lookup…';
    let position, note = '';
    try {
      const config = await api.getStations();
      if (version !== helpVersion || identity !== api.getIdentityVersion()) return;
      if (config.enabled) { try { position = await gps(); } catch (e) { note = `${e.message} `; } }
      if (version !== helpVersion || identity !== api.getIdentityVersion()) return;
      const result = await api.findFirstAid({ position });
      if (version !== helpVersion || identity !== api.getIdentityVersion()) return;
      showStations({ ...result, answer: note + result.answer });
    } catch (e) { if (version === helpVersion && identity === api.getIdentityVersion()) $('#help-feedback').textContent = e.message; }
    finally { if (version === helpVersion) $('#find-first-aid').disabled = false; }
  });
  $('#go-available').addEventListener('click', goAvailable); $('#pause-volunteer').addEventListener('click', pause);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { countdown(); api.refresh().catch(() => {}); } });
  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-manual-offer]'); if (!form) return;
    event.preventDefault(); const button = form.querySelector('[type="submit"]'); button.disabled = true;
    try { await api.offerVolunteer(form.dataset.manualOffer, form.querySelector('[name="volunteerId"]').value); $('#feedback').textContent = 'Offer sent. The volunteer must accept before being assigned.'; }
    catch (e) { $('#feedback').textContent = e.message; api.refresh().catch(() => {}); }
    finally { button.disabled = false; }
  });
  document.addEventListener('change', event => { const form = event.target.closest('[data-manual-offer]'); if (form) manualChoices.set(form.dataset.manualOffer, event.target.value); });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-assistance], [data-offer-decision], [data-task-action]'); if (!button) return;
    button.disabled = true;
    try {
      if (button.dataset.assistance) await api.assistanceAction(button.dataset.incident, button.dataset.assistance);
      else if (button.dataset.offerDecision) await api.respondOffer(button.dataset.incident, button.dataset.offer, button.dataset.offerDecision);
      else await api.act(button.dataset.incident, button.dataset.taskAction);
      $('#feedback').textContent = 'Assistance status updated.';
    } catch (e) { $('#feedback').textContent = e.message; api.refresh().catch(() => {}); }
    finally { button.disabled = false; }
  });
  $('#station-add').addEventListener('click', () => { if ($('#station-fields').children.length < 20) stationRow(); });
  $('#stations-form').addEventListener('submit', async event => {
    event.preventDefault(); const identity = api.getIdentityVersion(); const button = event.target.querySelector('[type="submit"]'); button.disabled = true;
    const stations = [...$('#station-fields').children].map(row => Object.fromEntries([...row.querySelectorAll('[data-station]')].map(input => [input.dataset.station, ['latitude','longitude'].includes(input.dataset.station) ? Number(input.value) : input.value])));
    try { await api.saveStations({ enabled: $('#stations-enabled').checked, stations }); if (identity === api.getIdentityVersion()) $('#station-feedback').textContent = 'Fictional station configuration saved.'; }
    catch (e) { if (identity === api.getIdentityVersion()) $('#station-feedback').textContent = e.message; }
    finally { button.disabled = false; }
  });
  api.onIdentityChange(() => { stopTracking(); starting = false; helpVersion++; manualChoices.clear(); issue = ''; $('#help-feedback').textContent = ''; $('#first-aid-results').replaceChildren(); $('#mo-presence').replaceChildren(); $('#volunteer-offers').replaceChildren(); $('#station-fields').replaceChildren(); $('#find-first-aid').disabled = false; });
  api.subscribe(render);
  return { incidentHTML, gps, showStations };
})();
