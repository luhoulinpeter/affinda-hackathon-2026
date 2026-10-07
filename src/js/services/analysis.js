// Person 3: replace this adapter with a call to the team's server.
// Never put API keys in this browser file. This is NOT an AI classifier.
window.RiversideAI = {
  async analyse(report, openIncidents) {
    return {
      zone: report.zone,
      category: "unclassified",
      urgency: "unclear",
      linkTo: null,
      brief: "Awaiting human review",
      mode: "stub"
    };
  }
};
