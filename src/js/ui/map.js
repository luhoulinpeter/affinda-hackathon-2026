// Google is a basemap provider only. Location/incident state comes from our server.
(() => {
  const api = window.RiversideAPI, geometry = window.RiversideMapGeometry;
  const $ = selector => document.querySelector(selector);
  const panel = $('#map-panel');
  let map = null, libraries = null, loader = null, config = null, sequence = 0, configured = false, failure = '';
  const markers = new Map(), lines = new Map();
  let info = null, pickingZone = false;

  function unavailable(message, fatal = false) {
    if (fatal) failure = message;
    $('#live-map').hidden = true;
    $('#map-fallback').hidden = false;
    $('#map-status').textContent = message;
    $('#map-recentre').disabled = true;
  }
  function clear() {
    pickingZone = false;
    markers.forEach(item => { if (item.animation) cancelAnimationFrame(item.animation); item.marker.map = null; });
    markers.clear();
    lines.forEach(pair => pair.forEach(line => line.setMap(null)));
    lines.clear();
    info?.close();
    $('#map-summary').textContent = '';
    $('#map-estimates').replaceChildren();
  }
  function loadGoogle(key) {
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const fail = () => {
        unavailable('Google Maps could not load. Check the demo key, connection or daily quota. Reporting still works below.', true);
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error('Google Maps unavailable')); }
      };
      const timeout = setTimeout(fail, 15000);
      window.gm_authFailure = fail;
      window.riversideGoogleReady = async () => {
        try {
          const [maps, marker] = await Promise.all([window.google.maps.importLibrary('maps'), window.google.maps.importLibrary('marker')]);
          if (settled) return;
          settled = true; clearTimeout(timeout); resolve({ ...maps, ...marker });
        } catch { fail(); }
      };
      script.nonce = document.querySelector('meta[name="maps-nonce"]')?.content || '';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&v=weekly&callback=riversideGoogleReady`;
      script.async = true;
      script.onerror = fail;
      document.head.append(script);
    });
    return loader;
  }
  function latLng(p) { return { lat: p.latitude, lng: p.longitude }; }
  function point(kind, id, position, title, color, glyph, click, seen) {
    const key = `${kind}:${id}`;
    seen.add(key);
    let item = markers.get(key);
    if (!item) {
      const pin = new libraries.PinElement({ background: color, borderColor: '#ffffff', glyphColor: '#ffffff', glyphText: glyph, scale: 1 });
      const dot = document.createElement('span'); dot.className = 'map-start-dot';
      const marker = new libraries.AdvancedMarkerElement({ map, position: latLng(position), title, content: kind === 'start' ? dot : pin.element, gmpClickable: !!click });
      item = { marker, pin, current: latLng(position), click };
      if (click) marker.addListener('click', () => item.click?.());
      markers.set(key, item);
    } else {
      item.marker.title = title;
      item.pin.glyphText = glyph;
      item.click = click;
      // Interpolation smooths measured fixes; it does not produce new GPS samples.
      if (item.animation) cancelAnimationFrame(item.animation);
      const start = item.current, end = latLng(position), began = performance.now();
      const animate = now => {
        const t = Math.min(1, (now - began) / 800);
        item.current = { lat: start.lat + (end.lat-start.lat)*t, lng: start.lng + (end.lng-start.lng)*t };
        item.marker.position = item.current;
        item.animation = t < 1 ? requestAnimationFrame(animate) : null;
      };
      item.animation = requestAnimationFrame(animate);
    }
  }
  function stationDetails(station) {
    const content = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = station.name;
    const description = document.createElement('p'); description.textContent = station.description;
    content.append(title, description);
    info ||= new libraries.InfoWindow();
    info.setContent(content);
    info.open({ map, anchor: markers.get(`station:${station.id}`)?.marker });
  }
  function zoneDetails(zone, role) {
    const content = document.createElement('div'), title = document.createElement('strong'), description = document.createElement('p'), note = document.createElement('p');
    title.textContent = zone.name; description.textContent = zone.description;
    note.textContent = 'Zone reference point · approximate location, not a boundary.';
    content.append(title, description, note);
    if (role !== 'mo') {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Use this zone';
      button.addEventListener('click', () => { info.close(); document.dispatchEvent(new CustomEvent('riverside-zone-select', { detail: zone.id })); }); content.append(button);
    }
    info ||= new libraries.InfoWindow(); info.setContent(content); info.open({ map, anchor: markers.get(`zone:${zone.id}`)?.marker });
  }
  function draw(data, role) {
    const seen = new Set();
    (data.zones || []).forEach(z => {
      const letter = z.name.match(/^zone\s+([a-z])\b/i)?.[1] || Array.from(z.name.trim())[0] || 'Z';
      point('zone', z.id, z, `${z.name} · event zone`, '#85652c', letter.toUpperCase(), () => zoneDetails(z, role), seen);
    });
    data.stations.forEach(s => point('station', s.id, s, `${s.name} · fictional`, '#14796a', '+', () => stationDetails(s), seen));
    data.volunteers.filter(v => v.fresh && geometry.valid(v.position)).forEach(v => point('volunteer', v.id, v.position, `${v.name} · ${v.state}${v.demo ? ' · simulated movement' : ''}`, v.state === 'busy' ? '#7e729d' : '#225c9e', 'V', null, seen));
    data.incidents.filter(i => geometry.valid(i.position)).forEach(i => point('incident', i.id, i.position, `${role === 'public' ? 'Your request · ' : ''}${i.id} · ${i.status}${i.demoLocation ? ' · fictional demo location' : i.locationKind === 'zone' ? ' · approximate zone location' : ''}`, i.status === 'resolved' ? '#677c73' : '#be5c36', role === 'public' ? '●' : '!', role === 'mo' ? () => document.dispatchEvent(new CustomEvent('riverside-map-select', { detail: i.id })) : null, seen));
    data.incidents.filter(i => geometry.valid(i.startPosition) && geometry.valid(i.position) && ['accepted', 'arrived'].includes(i.assistanceState)).forEach(i => point('start', i.id, i.startPosition, `${i.id} · volunteer starting location${i.demo ? ' · fictional movement demo' : ''}`, '#225c9e', '●', null, seen));
    markers.forEach((item, key) => {
      if (!seen.has(key)) { if (item.animation) cancelAnimationFrame(item.animation); item.marker.map = null; markers.delete(key); }
    });
    const activeLines = new Set();
    for (const incident of data.incidents) {
      const responder = data.volunteers.find(v => v.id === incident.assignee && v.fresh && geometry.valid(v.position));
      const start = geometry.valid(incident.startPosition) ? incident.startPosition : responder?.position;
      if (incident.locationKind === 'zone' || !geometry.valid(start) || !geometry.valid(incident.position) || !['accepted', 'arrived'].includes(incident.assistanceState)) continue;
      activeLines.add(incident.id);
      let pair = lines.get(incident.id);
      if (!pair) {
        pair = ['#6a757c', '#ffffff'].map((strokeColor, index) => new window.google.maps.Polyline({ map, strokeOpacity: 0, clickable: false, zIndex: index + 1,
          icons: [{ icon: { path: window.google.maps.SymbolPath?.CIRCLE ?? 0, scale: index ? 2 : 4, fillColor: strokeColor, fillOpacity: 1, strokeWeight: 0 }, offset: '0', repeat: '12px' }] }));
        lines.set(incident.id, pair);
      }
      const remaining = responder ? geometry.distance(responder.position, incident.position) : null;
      const amount = Number.isFinite(incident.progress) ? incident.progress : geometry.progress(incident.initialDistanceMetres, remaining);
      pair[0].setPath(geometry.curve(start, incident.position));
      pair[1].setPath(geometry.curve(start, incident.position, amount));
    }
    lines.forEach((pair, id) => { if (!activeLines.has(id)) { pair.forEach(line => line.setMap(null)); lines.delete(id); } });
  }
  async function refresh() {
    if (!api.getSession() || api.isIdentityChanging()) return;
    const request = ++sequence, identity = api.getIdentityVersion();
    const current = () => request === sequence && identity === api.getIdentityVersion() && !api.isIdentityChanging();
    panel.hidden = false;
    try {
      const data = await api.getMapData();
      if (!current()) return;
      const role = api.getSession()?.user?.role || 'public';
      $('#map-title').textContent = role === 'mo' ? 'The whole picture' : role === 'volunteer' ? 'Your field map' : 'Find your help point';
      $('#staff-map-legend').hidden = role === 'public';
      $('#public-map-legend').hidden = role !== 'public' || !data.incidents.length;
      $('#map-privacy').textContent = role === 'public' ? 'Your assigned volunteer’s starting location and dotted progress are shown. Their moving location is private. Lines show approximate progress, not a walking route or arrival promise.' : 'First-aid stations are fictional. Dotted curves show approximate progress, not walking routes. Private reports are assigned by Mo; incident details open only for Mo or your assignment.';
      const unlocated = data.incidents.filter(i => !geometry.valid(i.position)).length;
      const fresh = data.volunteers.filter(v => !v.demo && v.fresh && geometry.valid(v.position)).length;
      const simulated = data.volunteers.filter(v => v.demo && geometry.valid(v.position)).length;
      $('#map-summary').textContent = `${(data.zones || []).length} event zones · ` + (role === 'public' ? `${data.stations.length} fictional first-aid stations${data.incidents.length ? ` · ${data.incidents.length} assigned request${data.incidents.length === 1 ? '' : 's'} shown` : ''}` : `${data.incidents.length} incidents · ${unlocated} without a map position · ${fresh} volunteers sharing a current position${simulated ? ` · ${simulated} simulated journey` : ''}`);
      $('#map-estimates').replaceChildren();
      for (const incident of data.incidents.filter(i => i.walkingEstimate)) {
        const estimate = incident.walkingEstimate, row = document.createElement('p');
        row.textContent = `${incident.id} · ${estimate.state === 'ready' ? 'Starting walking estimate: ' : ''}${estimate.label}${estimate.state === 'ready' ? ' · Google Maps · fixed from the starting location' : ''}${incident.demo ? ' · simulated location' : ''}`;
        $('#map-estimates').append(row);
        if (estimate.state === 'ready') {
          const warning = document.createElement('p');
          warning.textContent = [...(estimate.warnings || []), 'Walking routes may be missing sidewalks or pedestrian paths. Follow on-site access instructions; arrival needs volunteer confirmation.'].join(' ');
          $('#map-estimates').append(warning);
        }
      }
      if (!configured) { config = await api.getMapsConfig(); if (!current()) return; configured = true; }
      if (!config.key) { unavailable('Google Maps needs a demo key. Use Find first aid below to look up stations; reporting remains available.'); return; }
      if (!libraries) { $('#map-status').textContent = 'Loading Google Maps…'; libraries = await loadGoogle(config.key); if (!current()) return; }
      if (failure) return;
      $('#live-map').hidden = false;
      $('#map-fallback').hidden = true;
      $('#map-recentre').disabled = false;
      if (!map) {
        map = new libraries.Map($('#live-map'), { center: config.centre, zoom: 16, mapId: 'DEMO_MAP_ID', disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false });
        map.addListener('click', event => {
          if (!pickingZone || api.getSession()?.user?.role !== 'mo' || !event.latLng) return;
          pickingZone = false;
          document.dispatchEvent(new CustomEvent('riverside-zone-picked', { detail: { latitude: event.latLng.lat(), longitude: event.latLng.lng() } }));
        });
      }
      const staleJourney = data.incidents.some(i => i.assignee && ['accepted', 'arrived'].includes(i.assistanceState) && i.progress === null);
      $('#map-status').textContent = pickingZone ? 'Tap the map to place the zone reference point. Save event zones to publish it.' : `${data.label}. ${data.incidents.some(i => i.demo) ? 'Fictional movement demo active; these journey positions are simulated.' : staleJourney ? 'Volunteer GPS progress is unavailable. Arrival still needs human confirmation.' : data.incidents.some(i => i.demoLocation) ? 'Demo requester locations are fictional test points; volunteer positions update while devices share GPS.' : 'Positions update while devices share GPS.'}`;
      draw(data, role);
    } catch {
      if (!current()) return;
      // Hide old staff state on errors rather than presenting it as current.
      clear(); unavailable('Map updates are unavailable. Existing reporting and assignment controls remain below.');
    }
  }
  document.addEventListener('riverside-zone-pick-start', () => {
    if (!map || failure || $('#live-map').hidden || api.getSession()?.user?.role !== 'mo') { document.dispatchEvent(new CustomEvent('riverside-zone-pick-unavailable')); return; }
    pickingZone = true; $('#map-status').textContent = 'Tap the map to place the zone reference point. Save event zones to publish it.';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.addEventListener('riverside-zone-pick-cancel', () => { pickingZone = false; });
  $('#map-recentre').addEventListener('click', () => { if (map && config) { map.setCenter(config.centre); map.setZoom(16); } });
  api.onIdentityChange(() => { sequence++; clear(); $('#live-map').hidden = true; panel.hidden = true; });
  api.subscribe(refresh);
})();
