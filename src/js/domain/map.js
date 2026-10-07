(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.RiversideMapGeometry = value;
})(typeof window === 'undefined' ? globalThis : window, () => {
  const valid = p => p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
  function distance(a, b) {
    if (!valid(a) || !valid(b)) return null;
    const rad = n => n * Math.PI / 180, dlat = rad(b.latitude - a.latitude), dlng = rad(b.longitude - a.longitude);
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  function progress(initialDistance, remainingDistance) {
    if (!Number.isFinite(initialDistance) || !Number.isFinite(remainingDistance) || initialDistance < 0 || remainingDistance < 0) return 0;
    if (initialDistance < 1) return remainingDistance < 1 ? 1 : 0;
    return Math.max(0, Math.min(1, 1 - remainingDistance / initialDistance));
  }
  // Sample a quadratic Bezier in local latitude/longitude space. Decorative only.
  function curve(start, end, fraction = 1) {
    if (!valid(start) || !valid(end) || !Number.isFinite(fraction)) return [];
    const amount = Math.max(0, Math.min(1, fraction));
    const x = end.longitude - start.longitude, y = end.latitude - start.latitude;
    const control = { latitude: (start.latitude + end.latitude) / 2 + x * .18, longitude: (start.longitude + end.longitude) / 2 - y * .18 };
    return Array.from({ length: 49 }, (_, index) => {
      const t = index / 48 * amount, u = 1 - t;
      return { lat: u*u*start.latitude + 2*u*t*control.latitude + t*t*end.latitude,
        lng: u*u*start.longitude + 2*u*t*control.longitude + t*t*end.longitude };
    });
  }
  return { valid, distance, progress, curve };
});
