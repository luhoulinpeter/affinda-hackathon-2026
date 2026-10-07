// Tab identifiers select an HttpOnly session cookie; they are not credentials.
// Probe sibling tabs because duplicating a tab can copy sessionStorage.
window.RiversideTab = (() => {
  const key = 'riverside-tab-v1';
  let id, channel, finish, settled = false, timeout;
  const ready = new Promise((resolve, reject) => {
    try {
      if (typeof BroadcastChannel === 'undefined') throw new Error('This browser cannot separate sign-ins by tab. Use a current Safari or Chrome browser.');
      id = sessionStorage.getItem(key);
      if (!/^[a-f0-9-]{36}$/.test(id || '')) id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
      const documentId = crypto.randomUUID();
      channel = new BroadcastChannel('riverside-tab-ownership-v1');
      finish = () => { settled = true; resolve(id); };
      channel.onmessage = ({ data }) => {
        if (!data || data.id !== id || data.documentId === documentId) return;
        if (data.type === 'probe') channel.postMessage({ type: 'occupied', id, documentId, target: data.documentId });
        if (data.type === 'occupied' && data.target === documentId) {
          id = crypto.randomUUID();
          try { sessionStorage.setItem(key, id); }
          catch (error) { clearTimeout(timeout); channel.close(); reject(error); return; }
          clearTimeout(timeout);
          // A sleeping sibling may answer late. Switch the copied tab back to
          // a fresh identity instead of keeping an inherited sign-in forever.
          if (settled) { channel.close(); window.location.reload(); return; }
          probe();
        }
      };
      function probe() {
        channel.postMessage({ type: 'probe', id, documentId });
        timeout = setTimeout(finish, 350);
      }
      probe();
      // Restoring a page from the back/forward cache must check ownership again.
      window.addEventListener('pagehide', () => channel.close());
      window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
    } catch (error) { reject(new Error(`Independent sign-in could not start. Allow website storage and reload. ${error.message}`)); }
  });
  // API requests await this promise and show startup failures through the UI.
  ready.catch(() => {});
  return { ready };
})();
