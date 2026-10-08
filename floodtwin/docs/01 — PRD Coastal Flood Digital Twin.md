# 01 — Product Requirements Document (PRD)

**Project:** Coastal Flood Digital Twin — SINGULARITY 2026, Track 1: AI for Coastal Flood Intelligence

> **Source of truth note:** Items marked **\[OFFICIAL\]** come from the hackathon brief. Items marked **\[PROPOSED\]** are our own product decisions.

## App Name

**FloodTwin** — Coastal Flood Digital Twin

## Tagline

Stop reacting, start anticipating: we predict where flooding will hit, when, how severely, why, and who responders should help first.

## Problem

Coastal communities usually learn about floods only once water is already in the street. City-wide risk scores are too coarse to tell an emergency team *which street*, *which hospital access road*, or *which shelter* is threatened, or how many minutes they have. The central question is: **Where, when and how severely will flooding hit?** **\[OFFICIAL\]**

The people who feel this pain:

- Emergency coordinators who must decide which zones to reach first.
- Residents (especially ground-floor occupants) who need to know whether and when to leave.
- Hospital and shelter operators whose access routes may be cut off.

## Core Value Proposition

FloodTwin turns raw environmental signals into **actionable early intelligence** at neighbourhood level, in one operational loop:

**PREDICT → MAP → EXPLAIN → SIMULATE → PRIORITIZE → ACT**

What makes it different:

1. Neighbourhood/zone-level prediction, not one city-wide score.
2. Four outputs per zone: probability, severity, onset, peak (with uncertainty ranges).
3. Impact mapped onto real roads, buildings and critical facilities.
4. Plain-language explanation with ranked drivers (SHAP).
5. A defensible, ranked emergency-priority list rather than severity alone.

## Target Users

**Primary — Emergency Response Coordinator.** A duty officer at a municipal disaster-management cell who has minutes, not hours, to decide where to send teams. They need a ranked list, a map, and a short plain-language reason for each recommendation.

**Secondary — Resident / Community Warden.** A person living in a low-lying coastal ward who needs a clear alert: will water reach my street, when, and should I leave?

## Practical Questions the System Must Answer **\[OFFICIAL\]**

- Will water reach a particular street?
- When will it happen?
- How severe will it be?
- Should ground-floor people leave?
- Who needs help first?
- Which areas should emergency teams reach first?

## Core Features (Must Have) **\[OFFICIAL\]**

1. **Flood-prediction model** producing per zone: probability, severity, onset, peak.
2. **Interactive live/updating risk map** with vulnerable zones.
3. **Impact identification:** affected roads, affected buildings, critical facilities (hospitals, shelters).
4. **Zone alerts** containing: zone, risk, onset, peak, main drivers.
5. **Ranked emergency-priority list** (which areas emergency teams reach first).
6. **Plain-language explanations** of why a zone is at risk.
7. **Working dashboard** (not slides only).

## Strong-Demo Features (Phase 2) **\[PROPOSED\]**

- Flood progression timeline slider (NOW → +30m → +1h → +2h), described honestly as an *AI-driven flood progression simulation*, not a hydrodynamic model.
- Uncertainty ranges on onset and peak (from Chronos forecast samples).
- Improved alert wording.
- Flood Replay: replay a historical/simulated event and compare prediction vs outcome.

## Nice to Have / Innovation (Phase 3) **\[PROPOSED\]**

Build at most one or two of these well rather than many unfinished:

- What-If Flood Simulator (change rainfall, tide, surge; recalculate).
- Escape Route Mode / Safe Zone Finder (safe route to a shelter using predicted road risk).
- Emergency Command Mode (responder-only view).
- AI Flood Commander (LLM briefing generated strictly from structured outputs; it must never invent predictions).
- Flood Chain Reaction visualization (rain → drainage overload → road flooding → hospital access reduction → priority escalation).

Optional examples named in the brief: satellite imagery, computer vision, uncertainty ranges, generative-AI briefings. None are mandatory.

## Out of Scope (this version)

- A validated hydrodynamic / physics flood simulator (we do not claim one).
- Real-time ingestion from live sensors with production reliability (historical or simulated data is acceptable per the brief).
- User accounts for the general public, SMS/push delivery, or integration with real government alert systems.
- Satellite imagery and computer-vision flood detection (optional, not planned for core).
- Multi-city support; one pilot geography only.
- Native mobile apps (responsive web only).

## User Stories

- As an **emergency coordinator**, I want a ranked list of zones so that I send teams to the highest-priority areas first.
- As an **emergency coordinator**, I want to see which roads, buildings, hospitals and shelters are affected so that I can plan access and evacuation.
- As an **emergency coordinator**, I want onset and peak times (with ranges) so that I know how long I have to act.
- As a **coordinator**, I want to know *why* a zone is at risk so that I can trust and defend the recommendation.
- As a **coordinator**, I want to move a timeline slider forward so that I can see how the flood is expected to spread.
- As a **coordinator**, I want to raise rainfall or tide in a what-if panel so that I can see how priorities change under worse conditions.
- As a **resident**, I want a plain-language alert for my zone so that I know whether to leave and when.
- As a **resident**, I want a safe route to the nearest shelter that avoids predicted flooded roads.

## Success Metrics

**Prediction quality (judged 25 pts)** — tested on historical or simulated events and reported honestly:

- Probability: precision, recall, ROC-AUC, PR-AUC.
- Severity: accuracy, macro F1, confusion matrix.
- Timing: mean absolute onset-time error and peak-time error.
- Operations: high-risk-zone detection and priority-ranking quality.

**Product / demo metrics:**

- Every alert shows zone, risk, onset, peak and main drivers (100% coverage).
- Selecting any zone yields prediction + plain-language explanation in under 2 seconds.
- Demo story runs end-to-end without manual fixes: Prediction → Map → Explanation → Simulation → Prioritization → Action.
- Limitations are stated openly in the dashboard/pitch.

## Judging Criteria Alignment **\[OFFICIAL\]**

| Category | Weight | How we address it |
| --- | --: | --- |
| Prediction quality | 25 | XGBoost (prob + severity) + Chronos-T5-Small (onset + peak); time-based validation |
| Local/geospatial depth | 20 | Zones + roads, buildings, facilities from OSM, DEM-derived terrain features |
| Explainability | 15 | SHAP ranked drivers + plain-language text |
| Actionability | 15 | Early, specific alerts + priority engine |
| Dashboard/usability | 10 | Map-first dashboard with zone panel and timeline |
| Innovation | 10 | Digital twin concept, uncertainty, what-if, escape routes, AI briefing |
| Demo/storytelling | 5 | Scripted 9-step demo story |

## Open Questions

- Which pilot geography? (Kerala coast is the suggested real-data candidate; otherwise a simulated coastal city.)
- Real Kerala dataset vs simulated data — decided by the 30-minute rule (see TRD).
- Which one or two innovation features to build first after the mandatory core.

## Final Project Definition

A Coastal Flood Digital Twin that uses AI, temporal environmental signals and geospatial data to predict flood probability, severity, onset and peak at neighbourhood level; map affected roads, buildings and critical facilities; explain the main causes; simulate how flooding progresses; and rank the areas requiring emergency response first.
