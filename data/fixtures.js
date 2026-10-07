// Shared fictional examples. Person 2 owns changes to these data shapes.
const riversideFixtures = {
  categories: [
    { id: "medical", name: "Medical" },
    { id: "crowding", name: "Crowding" },
    { id: "lost-person", name: "Lost person" },
    { id: "staffing", name: "Staffing" },
    { id: "hazard", name: "Hazard" },
    { id: "other", name: "Other / unsure" }
  ],
  // Team decisions, 7 October 2026: any safety volunteer may take any issue type (no skill
  // matching); each zone keeps at least 1 available volunteer; 2 open reports in one zone
  // within 10 minutes alert Mo. Shift times are in festival (Melbourne) time.
  rules: { timeZone: "Australia/Melbourne", cluster: { reports: 2, minutes: 10 } },
  zones: [
    { id: "zone-a", name: "Zone A · Main stage", minimumCoverage: 1 },
    { id: "zone-b", name: "Zone B · Water tent", minimumCoverage: 1 },
    { id: "zone-c", name: "Zone C · Entry", minimumCoverage: 1 }
  ],
  // Fictional roster, proposed for the team to edit. Two volunteers work only the late
  // shift so the demo can show an off-shift volunteer being skipped.
  volunteers: [
    { id: "vol-priya", name: "Priya (fictional)", zone: "zone-a", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-mateo", name: "Mateo (fictional)", zone: "zone-a", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-hana", name: "Hana (fictional)", zone: "zone-a", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-noor", name: "Noor (fictional)", zone: "zone-a", shift: { start: "18:00", end: "24:00" } },
    { id: "vol-alex", name: "Alex (fictional)", zone: "zone-b", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-kai", name: "Kai (fictional)", zone: "zone-b", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-zara", name: "Zara (fictional)", zone: "zone-b", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-ben", name: "Ben (fictional)", zone: "zone-b", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-sam", name: "Sam (fictional)", zone: "zone-c", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-lena", name: "Lena (fictional)", zone: "zone-c", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-omar", name: "Omar (fictional)", zone: "zone-c", shift: { start: "00:00", end: "24:00" } },
    { id: "vol-jordan", name: "Jordan (fictional)", zone: "zone-c", shift: { start: "18:00", end: "24:00" } }
  ],
  example: { zone: "zone-b", text: "There is a spill beside the water tent. The walkway is slippery.", immediateConcern: false }
};
if (typeof module !== "undefined" && module.exports) module.exports = riversideFixtures;
else window.RiversideData = riversideFixtures;
