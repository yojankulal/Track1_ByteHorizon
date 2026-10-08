# 03 — App Flow: Navigation & User Journey Map

**Project:** Coastal Flood Digital Twin (FloodTwin) — SINGULARITY 2026, Track 1

> The brief requires a **working dashboard** with an interactive live/updating risk map. This document defines every screen, click and path so the AI agent builds one coherent product, not isolated pages.

## 1. Product Shape

FloodTwin is a **map-first, single-primary-screen dashboard** with a few supporting views. There is **no public signup** in this version: the demo opens straight into the dashboard (a simple role toggle switches between *Responder* and *Resident* views). This keeps the build focused on the mandatory core.

## 2. Pages / Screens

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | **Dashboard (Command view)** | Main screen: risk map, selected-zone panel, timeline, priority list, AI briefing |
| `/zone/:zoneId` | **Zone Detail ("Explain My Zone")** | Full prediction, uncertainty ranges, ranked drivers, plain-language explanation, affected assets |
| `/alerts` | **Alerts** | All active zone alerts (zone, risk, onset, peak, main drivers), sortable |
| `/priority` | **Emergency Priority** | Ranked response list with reasons and affected assets |
| `/whatif` | **What-If Simulator** *(Phase 3)* | Change rainfall, tide, surge; see recalculated zones and ranking |
| `/replay` | **Flood Replay** *(Phase 2)* | Replay a historical/simulated event; compare prediction vs observed |
| `/escape` | **Escape Route / Safe Zone Finder** *(Phase 3)* | Pick a location, get a safe route to a shelter |
| `/about` | **Method & Limitations** | Data source (real vs simulated), models, metrics, honest limitations |

On the dashboard, Zone Detail, What-If and Escape Route can also open as a **right-hand drawer** so the user never loses the map.

## 3. Navigation Structure

- **Desktop:** slim top bar (logo • live status • mode toggle • time/scenario controls) + left icon rail (Dashboard, Alerts, Priority, What-If, Replay, About). The map fills the remaining space.
- **Mobile:** top bar + bottom tab bar (Map, Alerts, Priority, More). Zone panel becomes a draggable bottom sheet.
- **Back behaviour:** closing a drawer/sheet returns to the map with the previous viewport and selected time preserved. Browser back moves between routes.

## 4. Entry Point (First Screen)

A first-time visitor lands on `/` and sees:

1. The map of the pilot area with zones coloured by flood risk **at NOW**.
2. A header banner: *"Live — last updated hh:mm"* and a data-source badge (*Simulated data* or *Historical: Kerala 2018*), so the honesty about data is visible from second one.
3. The Emergency Priority list (top 3 visible) and any Critical/Severe alert banner.
4. A short dismissible hint: "Click a zone to see why it's at risk. Drag the timeline to see how it spreads."

No login wall. Loading state shows a skeleton map and skeleton cards.

## 5. Mode Flow (replaces auth flow)

There is no authentication in v1 **\[PROPOSED\]**.

- Top-bar **mode toggle**: *Responder (Command)* ↔ *Resident*.
- **Responder mode** shows priority ranking, all zones, affected assets, briefing, what-if.
- **Resident mode** shows the user's chosen zone alert in plain language, "should I leave?" guidance, and the escape route.
- The selected mode and chosen zone persist in browser storage; defaults to Responder.
- Emergency Command Mode (Phase 3) is a stripped-down Responder view: critical zones, roads at risk, facilities threatened, priority ranking only.

## 6. Dashboard Layout (Command View)

```text
+-------------------------------------------------------+
| COASTAL FLOOD INTELLIGENCE — LIVE      [Mode][Data]   |
+-----------------------+-------------------------------+
|                       | SELECTED ZONE                 |
|      RISK MAP         | Probability | Severity        |
| layers: zones, roads, | Onset | Peak (with ranges)    |
| buildings, hospitals, | MAIN DRIVERS (ranked)         |
| shelters, terrain     | Plain-language explanation    |
+-----------------------+-------------------------------+
| TIMELINE  NOW > +30m  | EMERGENCY PRIORITY            |
|  > +1h > +2h  [play]  | #1 Zone A  #2 Zone C  #3 ...  |
+-----------------------+-------------------------------+
| AI FLOOD BRIEFING                                     |
+-------------------------------------------------------+
```

## 7. Core User Journeys

### Journey 1 — Coordinator: "Where do I send teams first?" (primary demo path)

1. Opens `/`. Map shows zones coloured by risk at NOW; priority list shows #1 Zone A (Critical, *hospital access threatened*).
2. Clicks **Zone A** on the map or in the list. The right panel opens: probability 86%, severity Severe/Critical, onset 3:20–3:40 PM, peak 4:20–4:50 PM.
3. Reads **Main drivers** (heavy 3-hour rainfall, high tide, low elevation, high flow accumulation, poor drainage) and the plain-language sentence.
4. Toggles map layers to see affected **roads**, **buildings**, **hospitals**, **shelters** highlighted.
5. Drags the **timeline slider** NOW → +30 min → +1 h → +2 h. Newly affected roads and buildings light up; the priority list re-ranks live.
6. Reads the **AI Flood Briefing** and (optionally) clicks "Open full priority list" → `/priority`.

### Journey 2 — Coordinator: "What if it gets worse?"

1. From the dashboard clicks **What-If** (drawer or `/whatif`).
2. Raises rainfall or tide/storm-surge sliders. Clicks **Recalculate** (or live-updates).
3. Map, alerts and priority list update; a diff badge shows zones that changed (e.g. "Zone C: Severe → Critical").
4. **Reset** returns to the baseline scenario.

### Journey 3 — Resident: "Should I leave?"

1. Switches to **Resident** mode, picks their zone (or taps a location on the map).
2. Sees an alert card: risk, onset, peak, main drivers, plain-language guidance ("Water is expected to reach ground-floor level around 3:20 PM; leave before then").
3. Taps **Find safe route** → map shows the nearest shelter reachable on roads predicted to stay passable for the chosen time horizon, with a warning if none exists.

### Journey 4 — Judge/Reviewer: replay and honesty check

1. Opens **Replay**, selects a historical/simulated event.
2. Plays it; sees predicted vs observed flooding side by side with onset/peak error.
3. Opens **Method & Limitations** to see data source, metrics and caveats.

## 8. Map Interactions

- **Hover** a zone: tooltip with zone name, probability, severity.
- **Click** a zone: select, open the zone panel, highlight its boundary.
- **Click a road/building/facility:** popup with name/type, affected status, and the time it becomes affected.
- **Layer control:** Zones (default on), Severity, Roads, Buildings, Hospitals, Shelters, Terrain/elevation context.
- **Legend:** severity colours 0–4 (None, Minor, Moderate, Severe, Critical) always visible.
- **Timeline slider:** NOW, +30 min, +1 h, +2 h with a Play/Pause button; every map layer and panel is driven by the selected time offset.

## 9. Modal / Drawer / Overlay Interactions

| Trigger | Element | Closes via |
| --- | --- | --- |
| Click zone | Right drawer (Zone Detail) / mobile bottom sheet | X, Esc, click empty map |
| Critical alert appears | Top alert banner (non-blocking) | Dismiss; reappears if severity escalates |
| What-If | Right drawer | X, Reset |
| "How was this calculated?" | Modal with SHAP bar chart + method note | X, Esc |
| AI briefing "Regenerate" | Inline loading state in briefing card | n/a |

## 10. Redirect & Routing Logic

- Unknown route → `/` with a toast "Page not found".
- `/zone/:zoneId` with an invalid id → `/` with an error toast.
- Selecting a zone in the list or on the map updates the URL to `/zone/:zoneId` (shareable); closing the drawer returns to `/`.
- The selected time offset is kept in the query string (`?t=60`) so any state can be shared or reproduced for the demo.
- Mode switch keeps the current zone and time selection.

## 11. Empty States

| Situation | What shows |
| --- | --- |
| No zones above threshold | Green banner: "No significant flood risk in the next 12 hours" + last updated time |
| No affected roads/buildings at this time step | Message in the panel: "No roads affected at +30 min" |
| No safe route exists | Warning: "No safe route found — shelter in place on higher floors, contact emergency services" |
| No replay events available | Prompt to generate a simulated event |
| Onset forecast never crosses threshold | Onset shown as "—" with note "No flood onset expected in forecast window" |

## 12. Error States

| Error | Behaviour |
| --- | --- |
| Backend unreachable | Full-width banner "Cannot reach prediction service" + Retry; last cached results stay visible and marked *stale* |
| Model or forecast not ready | Skeleton + "Preparing forecasts…"; after timeout, show cached/precomputed results |
| Map tiles fail to load | Fallback to a plain basemap; zones/roads still drawn from GeoJSON |
| LLM briefing fails | Automatically switch to a template-generated briefing; never show an empty card |
| Invalid what-if input | Inline validation on the slider range; Recalculate disabled |

## 13. Loading States

- Initial load: skeleton map, skeleton zone cards, spinner on the timeline.
- Zone click: panel shows skeleton for drivers/explanation (target < 2 s).
- Timeline change: keep the previous layer visible with a subtle fade until the new step arrives (no blank map).
- What-If recalculation: progress indicator on the Recalculate button.

## 14. Alert Content Standard **\[OFFICIAL deliverable\]**

Every alert, everywhere in the UI, uses the same shape:

```text
ZONE:      Coastal Ward 7
RISK:      86% — Severe
ONSET:     3:20 PM (3:20–3:40 PM)
PEAK:      4:35 PM (4:20–4:50 PM)
DRIVERS:   1. Heavy 3-hour rainfall  2. High tide  3. Low elevation
WHY:       Heavy rainfall is occurring while tide levels are elevated. The area is low-lying, so water is expected to accumulate rapidly.
ACTION:    Ground-floor occupants should move to higher floors or leave before onset.
```

## 15. Demo Flow (9 steps)

1. **Incoming conditions** — rainfall rises, tide and surge rise.
2. **AI prediction** — several zones show increasing probability.
3. **Timing** — Zone A onset 3:20 PM, peak 4:35 PM.
4. **Geographic impact** — roads, buildings, critical facilities highlighted.
5. **Explanation** — rainfall, high tide, low elevation as top drivers.
6. **Priority** — #1 Zone A (hospital access), #2 Zone C (population), #3 Zone F (evacuation route).
7. **Simulation** — move timeline NOW → +30 min → +1 h → +2 h.
8. **What-if** — increase rainfall; affected zones and ranking change.
9. **AI briefing** — concise responder briefing from structured results.

**Story:** Prediction → Map → Explanation → Simulation → Prioritization → Action.
