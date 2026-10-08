// Injected only by the isolated judge launchers, never by npm start.
(() => {
  const volunteer = new URLSearchParams(location.search).get('demo-role') === 'volunteer';
  const position = () => ({ coords: { latitude:volunteer ? -37.7958 : -37.7992, longitude:volunteer ? 144.9612 : 144.962, accuracy:8 }, timestamp:Date.now() });
  let next = 0; const watches = new Map();
  Object.defineProperty(navigator, 'geolocation', { value: {
    getCurrentPosition(ok) { setTimeout(() => ok(position()), 20); },
    watchPosition(ok) { const id = ++next; ok(position()); watches.set(id, setInterval(() => ok(position()), 10000)); return id; },
    clearWatch(id) { clearInterval(watches.get(id)); watches.delete(id); }
  } });
  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('aside'); banner.className = 'judge-banner';
    banner.innerHTML = '<strong>JUDGE DEMO · Simulated AI, GPS and schematic map · Separate demo data</strong><details><summary>Demo sign-ins &amp; instructions</summary><p>Open each workspace in a separate new tab. Event-goers need no account.</p><p><a href="/?demo-role=attendee" target="_blank" rel="noopener">Event-goer tab</a> · <a href="/?demo-role=mo" target="_blank" rel="noopener">Mo tab</a> · <a href="/?demo-role=volunteer" target="_blank" rel="noopener">Volunteer tab</a></p><p>Staff sign in → Mo: <code>mo</code> / <code>mo</code>. Priya: <code>priya</code> / <code>priya</code>. Alex: <code>alex</code> / <code>alex</code>.</p><p>1. In the volunteer tab, sign in as Priya and press Go available. 2. In the attendee tab, choose Use my location and send a fictional report with Send report only. 3. In Mo’s tab, select the incident, choose Priya and send an offer. 4. Priya accepts. 5. Mo presses Start demo movement; dotted progress fills over 90 seconds. Arrival and resolution still need human confirmation.</p><p>These are public demo credentials for this sandbox only. Anyone with a shared demo link can use them; enter fictional information only. Google Maps, real GPS, live AI and Google walking estimates are not exercised. See JUDGES.md for more cases and optional live setup.</p></details>';
    document.body.prepend(banner);

  });
})();
