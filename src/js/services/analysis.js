// Person 3: this module is called by the server. Add provider credentials via
// server environment variables only. This is NOT an AI classifier.
const riversideAnalysis = {
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
if (typeof module !== "undefined" && module.exports) module.exports = riversideAnalysis;
else window.RiversideAI = riversideAnalysis;
