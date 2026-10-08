# 04 — UI/UX Design Brief

**Project:** Coastal Flood Digital Twin (FloodTwin) — SINGULARITY 2026, Track 1

> The brief grades **Dashboard/usability (10 pts)** and rewards a working dashboard over slides. All visual choices below are **\[PROPOSED\]** and exist to keep the AI agent coherent across every screen. A responder under stress must read the situation in seconds.

## 1. Design Principles

1. **Map first.** The map is the product; panels support it.
2. **Glanceable under stress.** Severity is readable from colour, size and one word, without reading paragraphs.
3. **Never colour alone.** Every severity colour is paired with a label and an icon/pattern (accessibility).
4. **Plain language over jargon.** Technical drivers are always translated into a sentence a resident could act on.
5. **Honest about uncertainty.** Show ranges and a visible data-source badge; do not imply false precision.
6. **One alert shape everywhere:** zone, risk, onset, peak, main drivers.

## 2. Aesthetic Direction

Calm, operational, "control-room" feel: **dark-mode first**, minimal, dense-but-clean, similar in spirit to Linear, Vercel and Raycast for chrome, and to emergency-operations dashboards for information density. No decorative illustrations; data and the map carry the visual weight. Light mode is available as an option (e.g. for projectors in bright rooms).

## 3. Colour Palette

### Core UI (dark mode)

| Role | Hex | Use |
| --- | --- | --- |
| Background | `#0B1220` | App background |
| Surface | `#111A2E` | Panels, cards |
| Surface raised | `#18243D` | Drawers, popovers, hover states |
| Border | `#243352` | Dividers, card outlines |
| Text primary | `#E8EEF9` | Headings, key numbers |
| Text secondary | `#9FB0CC` | Labels, helper text |
| Primary / accent | `#2F8CFF` | Buttons, selected zone outline, links, focus ring |
| Secondary accent | `#22D3EE` | Water/tide-related highlights, timeline progress |

### Core UI (light mode, optional)

Background `#F6F8FC`, Surface `#FFFFFF`, Border `#D9E1EF`, Text primary `#0F1B33`, Text secondary `#51607F`, Primary `#1565D8`.

### Severity scale (shared across map, badges, charts)

| Level | Label | Colour | Hex | Icon/pattern |
| --- | --- | --- | --- | --- |
| 0 | None | Slate | `#64748B` | circle outline |
| 1 | Minor | Yellow | `#FACC15` | single wave |
| 2 | Moderate | Orange | `#FB923C` | double wave |
| 3 | Severe | Red | `#EF4444` | triple wave |
| 4 | Critical | Deep magenta | `#C026D3` | triangle with exclamation, hatched fill on map |

Map fills use 55–65% opacity so roads and terrain stay readable underneath. Zone probability can additionally drive fill opacity, with severity driving hue.

### Semantic colours

Success/safe route `#22C55E`; Warning `#F59E0B`; Error `#EF4444`; Info `#2F8CFF`. Critical facilities use distinct marker shapes: hospital = white cross on red circle, shelter = house on green circle, other = neutral square. Affected roads use a bold red/magenta line with a dashed outline when only *partially* affected.

## 4. Typography

| Use | Font | Size / weight |
| --- | --- | --- |
| UI & headings | **Inter** | H1 24/700, H2 18/600, H3 15/600 |
| Body | Inter | 14/400 (13 in dense tables) |
| Key numbers (probability, times) | Inter, tabular numerals | 28–32/700 |
| Code/IDs/coordinates | **Geist Mono** or JetBrains Mono | 12–13/400 |
| Map labels | Inter | 11–12/500, with halo for contrast |

Minimum body size 14 px on desktop and 16 px on mobile inputs. Line height 1.4–1.5.

## 5. Spacing, Shape and Elevation

- 4 px base grid; common steps 4/8/12/16/24/32.
- **Border radius:** 8 px for cards and inputs, 12 px for drawers/sheets, 999 px for pills/badges.
- **Shadows:** subtle only; in dark mode prefer 1 px borders over shadows. Drawers get one soft shadow to separate from the map.
- **Density:** compact tables and lists (row height 36–40 px); generous padding around the map controls.

## 6. Layout

- **Desktop (≥ 1200 px):** left icon rail (64 px), map (fluid), right panel (380–420 px). Timeline docked at the bottom of the map; priority list and AI briefing below or beside the panel.
- **Tablet (768–1199 px):** icon rail collapses; right panel becomes an overlay drawer.
- **Mobile (< 768 px):** full-screen map, bottom tab bar (Map, Alerts, Priority, More), zone panel as a draggable bottom sheet (peek / half / full), timeline as a compact control above the sheet.
- Support a 1080p projector view: slightly larger type for the demo ("Presentation mode" toggle scales key numbers up).

## 7. Key UI Components

1. **Risk Map** — MapLibre GL or Leaflet; zone polygons, road lines, building footprints, facility markers, layer control, legend, time-synced.
2. **Zone Card / Selected Zone Panel** — name, severity badge, probability (large number + small bar), onset and peak with range, mini timeline, drivers list, plain-language box, affected-assets counts.
3. **Alert Card** — the standard shape: ZONE / RISK / ONSET / PEAK / DRIVERS / WHY / ACTION, severity-coloured left border.
4. **Driver List** — ranked horizontal SHAP bars with direction (increases/decreases risk) and a human label (e.g. "Heavy 3-hour rainfall").
5. **Priority List** — ranked rows: rank number, zone, severity badge, one-line reason, small icons for hospital/road/shelter impact.
6. **Timeline Slider** — NOW / +30m / +1h / +2h ticks, play/pause, current time label, changes map and panels together.
7. **Briefing Card** — AI Flood Commander text with "Generated from model outputs" label and regenerate button.
8. **What-If Panel** — sliders for rainfall, tide, storm surge, reset button, diff badges for changed zones.
9. **Data-Source Badge** — persistent pill: "Simulated data" or "Historical data".
10. **Metrics Modal** — shows precision/recall/AUC/onset error and limitations.

## 8. Interaction & Motion

- Hover on zone: 150 ms outline highlight + tooltip. Click: select with accent outline and panel slide-in (200 ms).
- Timeline change: cross-fade layers (200–300 ms); newly affected roads pulse once.
- Critical alerts: banner slides down once; a subtle pulse on the affected zone, no continuous flashing (avoid distress and seizure risk).
- Respect `prefers-reduced-motion`: disable pulses and fades.
- Loading: skeletons instead of spinners wherever layout is known.

## 9. Content & Tone (Microcopy)

- Plain language, short sentences, action first. Example: *"Heavy rainfall is occurring while tide levels are elevated. The area is also low-lying, so water is expected to accumulate rapidly."*
- Times in local 12-hour format with ranges: *"Onset 3:20–3:40 PM"*.
- Probability shown as a percentage; severity always shown with its word.
- Resident guidance is direct and specific ("Ground-floor occupants: move upstairs or leave before 3:20 PM") and never alarmist or vague.
- The AI briefing must read like a duty-officer summary: 3–5 sentences, top 3 priorities, one recommended action. It states only what the model outputs support.

## 10. Reference Apps

Linear and Vercel (dark, minimal chrome), Raycast (command-palette feel), Windy and Google Flood Hub (map-forward weather/flood visualisation), Mapbox/Kepler.gl dashboards (layer controls), Notion (clear readable text panels).

## 11. Accessibility

- Contrast: text at least 4.5:1, large text and UI components at least 3:1; verify severity colours on both themes.
- Severity encoded by colour **and** label **and** icon/pattern (colour-blind safe).
- Full keyboard navigation: Tab through zones/list, Enter to select, Esc to close drawers, arrow keys for the timeline.
- Visible focus ring (2 px accent outline).
- ARIA labels on map layers, severity badges and the timeline; zone selection announced to screen readers; a table view alternative to the map listing zones with the same data.
- Touch targets at least 44 × 44 px on mobile.
- Do not rely on hover for any essential information.

## 12. Mobile Responsiveness Requirements

Fully responsive; map and bottom sheet usable one-handed; no horizontal scrolling; essential info (zone, risk, onset, peak, top driver) visible in the sheet's peek state.

## 13. Tech Notes for the Agent

- Define design tokens (colours, spacing, radii) once as CSS variables / Tailwind theme; never hard-code hex values in components.
- Build severity colour and label as a single shared helper used by map, badges, charts and alerts.
- Provide dark and light themes via tokens; default dark.
- If using Streamlit instead of React, approximate the same palette via the theme config and custom CSS, keep the same component set, and note which interactions (e.g. slider-driven map transitions) are simplified.
