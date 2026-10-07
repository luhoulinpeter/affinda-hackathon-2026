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
  zones: [
    { id: "zone-a", name: "Zone A · Main stage" },
    { id: "zone-b", name: "Zone B · Water tent" },
    { id: "zone-c", name: "Zone C · Entry" }
  ],
  volunteers: [
    { id: "vol-priya", name: "Priya (fictional)", zone: "zone-a" },
    { id: "vol-alex", name: "Alex (fictional)", zone: "zone-b" },
    { id: "vol-sam", name: "Sam (fictional)", zone: "zone-c" }
  ],
  example: { zone: "zone-b", text: "There is a spill beside the water tent. The walkway is slippery.", immediateConcern: false }
};
if (typeof module !== "undefined" && module.exports) module.exports = riversideFixtures;
else window.RiversideData = riversideFixtures;
