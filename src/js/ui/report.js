// One report form, with an explicit choice to request a volunteer.
(() => {
  const api = window.RiversideAPI;
  const $ = selector => document.querySelector(selector);
  const form = $('#report-form');
  let submitting = false, retry = null;
  const buttons = () => [...form.querySelectorAll('[type="submit"]')];
  const feedback = (message, error = false) => {
    $('#report-feedback').textContent = message;
    $('#report-feedback').classList.toggle('error', error);
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || api.isIdentityChanging()) return;
    const identity = api.getIdentityVersion();
    const input = { zone: $('#zone').value, category: $('#category').value,
      text: $('#report-text').value, immediateConcern: $('#immediate-concern').checked };
    if ($('#report-sensitive').checked) input.sensitive = true;
    if (input.zone === 'current-location') input.reportLocation = true;
    const requestHelp = event.submitter?.id === 'request-volunteer';
    submitting = true; buttons().forEach(button => { button.disabled = true; });
    try {
      if (input.zone !== 'demo-location' && (requestHelp || input.reportLocation)) {
        feedback('Getting your GPS location. Nothing has been submitted yet…');
        input.position = await window.RiversideAssistance.gps();
        if (identity !== api.getIdentityVersion()) return;
      }
      if (requestHelp) {
        // Keep a stable request reference when retrying an uncertain network result.
        const fingerprint = JSON.stringify({ ...input, position: undefined });
        if (retry?.fingerprint !== fingerprint) retry = { fingerprint, id: crypto.randomUUID() };
        input.requestAssistance = true; input.requestId = retry.id;
      }
      feedback('Sending your report…');
      const result = await api.submitReport(input);
      if (identity !== api.getIdentityVersion()) return;
      if ($('#report-text').value === input.text) {
        $('#report-text').value = ''; $('#immediate-concern').checked = false;
        $('#report-sensitive').checked = false;
      }
      retry = null;
      feedback(requestHelp
        ? `Report ${result.id} received with a volunteer request. Check Your reports for offers, acceptance and arrival. A volunteer has not necessarily accepted yet.`
        : `Report ${result.id} received. Check Your reports for its status. No volunteer was requested.`);
    } catch (error) {
      if (identity === api.getIdentityVersion()) feedback(`${error.message} Your text is saved here; ${input.reportLocation && !input.position && !requestHelp ? 'choose a zone to send without GPS, or allow location and try the same button again.' : 'try the same button again.'}`, true);
    } finally {
      if (identity === api.getIdentityVersion()) { submitting = false; buttons().forEach(button => { button.disabled = false; }); }
    }
  });
  api.onIdentityChange(() => { submitting = false; retry = null; feedback(''); buttons().forEach(button => { button.disabled = false; }); });
})();
