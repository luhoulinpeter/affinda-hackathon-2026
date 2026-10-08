# Event zones — 8 October 2026

Three fictional reference pins around the University of Melbourne are provided: Zone A · Main stage, Zone B · Water tent and Zone C · Entry. Brown `Z` pins are public and separate from green first-aid pins. These are reference points, not mapped boundaries or verified event facilities.

## Use it

1. Event-goers and volunteers can open a zone pin and choose **Use this zone**, or select the same zone under **Incident zone**. Selecting a pin does not send a report.
2. **Send report only** with a zone records an approximate incident point at that zone's saved reference position, without requesting GPS or a volunteer. Mo sees that incident pin, the original text and an explicit approximate-location note. Ordinary incident pins remain visible to volunteers under the existing sensitivity rules; unrelated incident pins stay hidden from event-goers.
3. **Use my location** remains the default. A measured GPS report uses its actual validated position. **Send & request volunteer** still requires fresh accurate GPS, even with a zone selected. Zone-only reports do not fabricate a walking estimate or progress path; Mo can offer them manually, and eligible volunteers can choose them.
4. Mo opens **Event zones** below the operations panels, edits names/descriptions, and uses **Pick on map** or coordinate fields to place each reference point. **Save event zones** publishes the configuration; the phone app polls every six seconds.
5. Mo can add zones (up to 12 total, including retired zones). Turn off **Selectable on the report form and visible on the map** to retire one. Saved zones retain stable IDs; incident names and reference positions are snapshots, so moving/renaming/retiring a zone preserves earlier report history. Older reports made before this feature are not given invented historical coordinates.

Mo drafts survive polling. Concurrent saves use a version check; **Reload saved zones** replaces the draft after a conflict. A retired selection already in an attendee's form stays visibly unavailable and requires another choice; it never silently switches to precise GPS.

## Measured verification

- **169/169 automated tests passed**: [complete output](checks/event-zones-tests.txt). Uses temporary stores and simulated AI/GPS/routing. New coverage checks Mo-only edits, CSRF/origin protection, stale-version conflicts, invalid coordinates/unknown IDs, custom zones, retirement, persistence/restart, history snapshots, server-owned reference positions, no coordinates in AI input, public/volunteer visibility, custom-zone AI ranking validation and no fabricated progress for approximate incidents.
- Actual browser sandbox: attendee opened a zone pin, selected it and submitted report-only; Mo received its approximate pin/details. Mo renamed and placed a zone with a map click, saved, added a custom zone and retired it. Attendee and Priya saw updated pins/choices; a selected retired zone stayed unavailable without switching to GPS. Original incident kept its original name/reference. Priya's incident marker remained non-clickable; Mo's editor remained role-restricted. Volunteer layout measured 375 px viewport / 375 px page width, then viewport override reset. Physical iPhone use was not tested.
- Actual HTTPS app returned 200 for the page, new UI module, zones and map endpoints; all three sample zone pins and the public popup were verified. [Live screenshot](checks/event-zones-live.png), [custom-zone sandbox screenshot](checks/event-zones.png).
- Existing phone launcher restarted on the current tunnel origin. Before/after hashes matched for 2 accounts, all 12 original reports, 12 incident IDs and the existing AI ledger; routing attempts unchanged at zero. Normal session/presence/assistance restart recovery remains in effect; staff sign in and go available again. No live AI or Routes requests were made, and the persisted automatic-test ledger was not reset.

The current ephemeral HTTPS origin is recorded privately in `.riverside/phone-access.json`. The obsolete `society-generation-standings-act` tunnel is not the current app link. Native GPS accuracy/permissions and live Google walking estimates remain separately unverified; routing remains disabled pending the previously requested approval/configuration.
