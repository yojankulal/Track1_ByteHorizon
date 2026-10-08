# SINGULARITY 2026 --- Track 1 Requirements

## AI for Coastal Flood Intelligence

> **Source:** SINGULARITY 2026 Hackathon Problem Statements PDF provided
> for this hackathon.
>
> **Track:** 1 --- AI for Coastal Flood Intelligence\
> **Track theme:** **"Know before the water arrives."**
>
> This document is a structured extraction of the requirements,
> objectives, deliverables, judging criteria, and common expectations
> stated in the provided problem-statement PDF. It is intended to be
> supplied as context to another AI for project planning and
> development.

------------------------------------------------------------------------

## 1. Hackathon Context

SINGULARITY 2026 presents three AI tracks under a common mindset:

> **"Stop reacting, start anticipating."**

The hackathon asks teams to build **software-only AI systems** that can
identify problems early and tell people what to do about them.

For Track 1, the central problem is coastal flooding.

### Track 1 --- AI for Coastal Flood Intelligence

**Core question:**

> **Where, when and how severely will flooding hit?**

### AI toolkit identified by the organizers

The track highlights:

-   Time-series forecasting
-   Geospatial AI
-   Explainable ML

### Decision the system should support

> **Which zones should be warned and responded to first?**

------------------------------------------------------------------------

# 2. Track Story / Problem Context

The problem statement describes a coastal neighbourhood during a rainy
afternoon:

-   Rain is heavy.
-   The tide is climbing.
-   Drains are already struggling to cope.

The practical questions are:

-   Will the water reach a particular street?
-   When will it arrive?
-   How severe will the flooding be?
-   Should people on the ground floor leave immediately, or can they
    wait?
-   Which areas and people need help first?

The problem statement notes that current warnings often stop at a broad
statement such as **"flood risk: high."** The challenge is to build an
AI system that provides more actionable answers about:

-   **Where** flooding will occur.
-   **When** it will occur.
-   **How bad** it will be.
-   **Who needs help first.**

### Core philosophy

The solution should move beyond simply detecting or reporting an
existing flood.

It should provide **early intelligence that supports decisions before
the flooding happens.**

------------------------------------------------------------------------

# 3. What Every Winning Team Should Have

The hackathon document gives several expectations that apply across the
tracks.

## 3.1 Prediction, not just detection

The system should communicate:

> **What is about to happen, not only what already has happened.**

For Track 1, this means the system should predict future flooding rather
than merely display current flood conditions.

------------------------------------------------------------------------

## 3.2 An explanation

The system should explain **why the AI believes what it believes**.

The explanation should be understandable to a non-technical person.

For example, the system should be able to communicate contributing
factors such as:

-   High tide
-   Heavy rainfall
-   Low elevation
-   Other relevant environmental/geospatial factors

The exact example used in the Track 1 deliverables is:

> High tide + 85 mm rain + low elevation

------------------------------------------------------------------------

## 3.3 A recommended action

The system should not stop at a prediction.

The expected mindset is:

> **"Here is what to do next."**

The output should therefore help a user decide what action should be
taken.

------------------------------------------------------------------------

## 3.4 A working prototype

The organizers explicitly prioritize a functioning prototype.

Historical or simulated data is acceptable.

The problem statement emphasizes:

> **A dashboard that runs beats a slide deck that promises.**

Therefore, teams should prioritize a working system that can be
demonstrated.

------------------------------------------------------------------------

# 4. Track 1 Objectives

Track 1 contains three primary objectives.

------------------------------------------------------------------------

## Objective 1 --- Predict the Flood

### Requirement

Estimate:

1.  The **probability** of flooding.
2.  The **severity** of flooding.
3.  **When flooding will begin**.
4.  **When flooding will peak**.

The prediction should be made for **specific neighbourhoods**, rather
than only producing a broad city-level prediction.

### Suggested input signals explicitly mentioned in the problem statement

The system may draw on:

-   Rainfall
-   Tides
-   Storm surge
-   Terrain
-   Drainage
-   Land use
-   Past flood events

### Data source flexibility

The organizers explicitly allow:

-   Historical data
-   Simulated data

Therefore, a solution does not necessarily need to depend entirely on
live historical datasets.

### Required prediction dimensions

At minimum, the working flood-prediction model should cover:

  Prediction          Required
  ------------------- ----------
  Flood probability   Yes
  Flood severity      Yes
  Flood onset time    Yes
  Flood peak time     Yes

------------------------------------------------------------------------

# 5. Objective 2 --- Show Who and What Is in the Way

The system must provide **dynamic flood-risk maps**.

These maps should:

-   Highlight vulnerable zones.
-   Show the areas likely to be affected.
-   Map risk at a local/neighbourhood level.
-   Identify affected roads.
-   Identify affected buildings.
-   Identify critical facilities.

Examples of critical facilities explicitly mentioned include:

-   Hospitals
-   Shelters

The goal is to connect the predicted flood risk to the physical things
and places that matter during an emergency.

------------------------------------------------------------------------

# 6. Objective 3 --- Turn Insight into Action

The system should convert predictions into actionable emergency
intelligence.

It should:

1.  Explain why a zone is at risk.
2.  Raise early warnings.
3.  Recommend which areas emergency teams should reach first.

This means the final system should answer not only:

> **"What will happen?"**

but also:

> **"Why is it happening?"**

and:

> **"What should we do next?"**

and:

> **"Where should responders go first?"**

------------------------------------------------------------------------

# 7. Required Deliverables

The Track 1 section specifies the following deliverables.

## 7.1 Working flood-prediction model

The model must cover:

-   Probability
-   Severity
-   Onset time
-   Peak time

------------------------------------------------------------------------

## 7.2 Interactive dashboard

The solution should provide:

> **An interactive dashboard with a live, updating flood-risk map.**

The dashboard is expected to make the changing risk easy to understand.

------------------------------------------------------------------------

## 7.3 Zone-level alerts

The system should generate alerts at the zone level.

The problem statement gives this example:

> **High Flood Risk, Zone B. Onset 2:40 PM, peak 4:10 PM. Drivers: high
> tide + 85 mm rain + low elevation**

Therefore, an alert should ideally communicate:

-   Zone
-   Risk level
-   Expected onset
-   Expected peak
-   Main contributing factors

------------------------------------------------------------------------

## 7.4 Affected roads, buildings and critical facilities

For each zone, provide a list of:

-   Affected roads
-   Affected buildings
-   Affected critical facilities

Examples of critical facilities include:

-   Hospitals
-   Shelters

------------------------------------------------------------------------

## 7.5 Ranked emergency-response priority list

The system must produce:

> **A ranked priority list for emergency response.**

The ranking should help responders determine which zones require
attention first.

------------------------------------------------------------------------

## 7.6 Plain-language explanations

Every prediction should have an explanation understandable by a
non-expert.

The explanation should not simply expose a model score.

It should communicate the factors contributing to the prediction in
normal language.

------------------------------------------------------------------------

# 8. Evaluation / Judging Criteria

Track 1 is evaluated out of **100 points**.

The evaluation categories are:

  Criterion                    Weight
  ------------------------- ---------
  Prediction quality               25
  Local, geospatial depth          20
  Explainability                   15
  Actionability                    15
  Dashboard & usability            10
  Innovation                       10
  Demo & storytelling               5
  **Total**                   **100**

Bonus points may be awarded for creativity beyond the brief.

------------------------------------------------------------------------

# 9. Evaluation Criterion 1 --- Prediction Quality

## Weight: 25 points

This is the highest-weighted criterion.

### Judges will look for

-   Sensible modelling choices.
-   Testing on historical or simulated events.
-   Flood probability prediction.
-   Flood severity prediction.
-   Timing prediction.
-   Honest evaluation metrics.
-   A clear explanation of how the model was validated.

### Metrics/examples mentioned by the organizers

Possible metrics include:

-   Error in onset time
-   Precision
-   Recall
-   AUC

The point is not simply to report a model accuracy number.

The team should be able to explain:

-   What was predicted.
-   What data was used.
-   How the model was tested.
-   What metrics were used.
-   How well the system performs.

------------------------------------------------------------------------

# 10. Evaluation Criterion 2 --- Local, Geospatial Depth

## Weight: 20 points

The judges specifically want:

> **Neighbourhood-level resolution rather than city-wide guesses.**

### Important geospatial factors

The judges expect smart use of:

-   Elevation
-   Drainage
-   Land use

### Mapping requirement

Risk should be accurately mapped onto:

-   Roads
-   Buildings
-   Critical infrastructure

A strong solution should therefore connect the AI prediction to an
actual geographic context.

A generic city-wide risk number is weaker than a neighbourhood-level
system that can say:

> Zone B is at high risk, and these specific roads, buildings and
> facilities are likely to be affected.

------------------------------------------------------------------------

# 11. Evaluation Criterion 3 --- Explainability

## Weight: 15 points

The key judging question is:

> **Can a non-expert see why a zone is flagged?**

### Judges will look for

-   Ranked contributing factors.
-   Feature importance or similar explanations.
-   Explainable ML.
-   Everyday-language explanations.

The problem statement explicitly gives **feature importance or SHAP** as
examples of useful approaches.

### Important distinction

Do not show only:

> Flood probability = 87%

Instead, the system should help answer:

> Why is the probability 87%?

The factors should be ranked and translated into language that an
ordinary user can understand.

------------------------------------------------------------------------

# 12. Evaluation Criterion 4 --- Actionability

## Weight: 15 points

The system should produce:

-   Early warnings.
-   Specific warnings.
-   Timely warnings.
-   A defensible response priority ranking.

The judges ask:

> **Does the output tell someone what to do next?**

Therefore, the solution should turn predictions into practical response
decisions.

Examples of the type of output expected by the brief include:

-   Which zones should be responded to first.
-   Which areas need warnings.
-   Which locations are affected.

------------------------------------------------------------------------

# 13. Evaluation Criterion 5 --- Dashboard & Usability

## Weight: 10 points

The dashboard should be:

-   Clear
-   Live
-   Easy to read quickly

The judges specifically want:

> **Maps, timelines and alerts to work together as one story.**

This means the dashboard should not feel like unrelated charts placed on
one screen.

A user should be able to quickly understand:

1.  What is happening?
2.  Where is it happening?
3.  When will it happen?
4.  How severe will it be?
5.  Why is the area at risk?
6.  What should responders do?

------------------------------------------------------------------------

# 14. Evaluation Criterion 6 --- Innovation

## Weight: 10 points

The problem statement gives examples of innovative additions.

Potential areas mentioned include:

### Satellite imagery

Use satellite imagery as an additional signal or source of spatial
information.

### Computer vision

Use computer vision where appropriate.

### Forecast uncertainty ranges

Instead of presenting a prediction as an absolute certainty, communicate
uncertainty around the forecast.

### Generative-AI briefing

A generative-AI system could summarize the current situation for
response teams.

These are examples provided by the organizers; they are not stated as
mandatory requirements.

------------------------------------------------------------------------

# 15. Evaluation Criterion 7 --- Demo & Storytelling

## Weight: 5 points

The judges want:

> **A confident walkthrough of a realistic scenario, from incoming data
> to a decision, within the allotted time.**

Therefore, the demonstration should tell a complete story.

A strong demonstration should show a progression such as:

``` text
Incoming environmental data
        ↓
Flood prediction
        ↓
Risk map
        ↓
Affected locations
        ↓
Explanation
        ↓
Early warning
        ↓
Response priority
        ↓
Decision / recommended action
```

The exact demo sequence is a project-design recommendation; the
requirement from the organizers is the complete walkthrough from
incoming data to decision.

------------------------------------------------------------------------

# 16. Complete Track 1 Requirement Checklist

Use this checklist while developing the project.

## Prediction

-   [ ] Predict flood probability.
-   [ ] Predict flood severity.
-   [ ] Predict flood onset time.
-   [ ] Predict flood peak time.
-   [ ] Operate at specific/neighbourhood-level zones.
-   [ ] Use appropriate environmental/geospatial inputs.
-   [ ] Use rainfall information.
-   [ ] Use tide information.
-   [ ] Consider storm surge.
-   [ ] Consider terrain.
-   [ ] Consider drainage.
-   [ ] Consider land use.
-   [ ] Consider historical/simulated flood events.
-   [ ] Validate the model.
-   [ ] Report honest metrics.

## Geospatial intelligence

-   [ ] Create dynamic flood-risk maps.
-   [ ] Highlight vulnerable zones.
-   [ ] Map risk at neighbourhood level.
-   [ ] Map affected roads.
-   [ ] Map affected buildings.
-   [ ] Map affected critical facilities.
-   [ ] Include hospitals where relevant.
-   [ ] Include shelters where relevant.
-   [ ] Use elevation intelligently.
-   [ ] Use drainage intelligently.
-   [ ] Use land-use information intelligently.

## Alerts

-   [ ] Generate zone-level alerts.
-   [ ] Include risk level.
-   [ ] Include expected onset time.
-   [ ] Include expected peak time.
-   [ ] Include major prediction drivers.
-   [ ] Provide early warnings.

## Explainability

-   [ ] Explain why each zone is at risk.
-   [ ] Rank important contributing factors.
-   [ ] Consider feature importance.
-   [ ] Consider SHAP.
-   [ ] Translate technical model output into plain language.
-   [ ] Make explanations understandable to non-experts.

## Emergency action

-   [ ] Produce a ranked emergency-response priority list.
-   [ ] Identify which areas should be reached first.
-   [ ] Make the ranking defensible.
-   [ ] Provide actionable next steps.

## Dashboard

-   [ ] Build a working dashboard.
-   [ ] Make the risk map interactive.
-   [ ] Make the map live/updating.
-   [ ] Present maps, timelines and alerts together.
-   [ ] Make the interface readable in seconds.
-   [ ] Provide a clear flow from prediction to decision.

## Innovation --- optional/bonus direction

-   [ ] Satellite imagery.
-   [ ] Computer vision.
-   [ ] Forecast uncertainty ranges.
-   [ ] Generative-AI emergency briefing.
-   [ ] Other creative additions beyond the brief.

## Demo

-   [ ] Use a realistic scenario.
-   [ ] Demonstrate incoming data.
-   [ ] Demonstrate prediction.
-   [ ] Demonstrate geospatial risk.
-   [ ] Demonstrate affected assets.
-   [ ] Demonstrate explanation.
-   [ ] Demonstrate warning.
-   [ ] Demonstrate emergency prioritisation.
-   [ ] End with a decision/action.
-   [ ] Keep the walkthrough within the allotted presentation/demo time.

------------------------------------------------------------------------

# 17. What Is Mandatory vs. What Is Optional

## Explicitly required by the Track 1 brief

### Core AI output

-   Probability
-   Severity
-   Onset time
-   Peak time

### Core spatial output

-   Dynamic flood-risk map
-   Vulnerable zones
-   Affected roads
-   Affected buildings
-   Affected critical facilities

### Core decision support

-   Zone-level alerts
-   Plain-language explanation
-   Ranked emergency-response priorities

### Core prototype

-   Working flood-prediction model
-   Interactive dashboard
-   Demonstrable system

------------------------------------------------------------------------

## Mentioned as examples / possible innovation rather than mandatory requirements

The following are mentioned under the innovation criterion:

-   Satellite imagery
-   Computer vision
-   Forecast uncertainty ranges
-   Generative-AI briefing

These should be treated as opportunities to differentiate the project,
not as replacements for the core requirements.

------------------------------------------------------------------------

# 18. What the Project Should Ultimately Answer

A successful Track 1 system should allow a user to answer the following
questions:

### Where?

> Which neighbourhoods/zones are likely to flood?

### When?

> When will flooding begin?

### How bad?

> What will the severity be?

### When is the worst point?

> When will the flood peak?

### Why?

> What factors are causing the predicted risk?

### What is affected?

> Which roads, buildings and critical facilities are likely to be
> affected?

### Who needs attention first?

> Which zones should emergency teams prioritize?

### What should happen next?

> What action should be taken based on the prediction?

------------------------------------------------------------------------

# 19. Core Product Philosophy

The Track 1 problem statement can be reduced to this chain:

``` text
PREDICT
    ↓
Where will flooding occur?
    ↓
When will it start and peak?
    ↓
How severe will it be?
    ↓
MAP
    ↓
What zones, roads, buildings and facilities are affected?
    ↓
EXPLAIN
    ↓
Why does the AI believe the zone is at risk?
    ↓
ACT
    ↓
Which zones should responders reach first?
    ↓
DECIDE
    ↓
What should people/emergency teams do next?
```

The key idea is:

> **Do not build only a flood detector. Build a predictive
> decision-support system.**

------------------------------------------------------------------------

# 20. Suggested System Requirement Summary for an AI Developer

When using this document as context for another AI, the AI should treat
the following as the core acceptance criteria:

``` text
The project is for SINGULARITY 2026 — Track 1:
AI for Coastal Flood Intelligence.

The system must predict coastal flooding at a neighbourhood/zone level.

It must provide:
1. Flood probability.
2. Flood severity.
3. Expected flood onset time.
4. Expected flood peak time.
5. Dynamic interactive flood-risk mapping.
6. Vulnerable-zone identification.
7. Affected roads.
8. Affected buildings.
9. Affected critical facilities such as hospitals and shelters.
10. Zone-level alerts.
11. Explanation of why each zone is at risk.
12. Plain-language explanations.
13. Ranked emergency-response priorities.

The model should consider, where data is available:
- rainfall
- tides
- storm surge
- terrain
- drainage
- land use
- past flood events

Historical or simulated data is acceptable.

The dashboard should combine:
- map
- timeline
- alerts
- prediction information

The system should be evaluated using honest validation and suitable metrics.

Judging weights:
- Prediction quality: 25
- Local, geospatial depth: 20
- Explainability: 15
- Actionability: 15
- Dashboard & usability: 10
- Innovation: 10
- Demo & storytelling: 5

Total: 100.

Innovation opportunities mentioned by the organizers include:
- satellite imagery
- computer vision
- forecast uncertainty ranges
- generative-AI response briefings

The final prototype should demonstrate a realistic end-to-end scenario from incoming data to a response decision.
```

------------------------------------------------------------------------

# 21. Important Source Constraint

This document intentionally does **not** invent specific:

-   Dataset names
-   Geographic locations
-   ML algorithms
-   Programming languages
-   Cloud platforms
-   APIs
-   Database technologies
-   Map providers
-   Model architectures

Those are implementation decisions that are **not specified in the
provided Track 1 problem statement**.

They should be selected separately based on the team's technical
approach and available time.

------------------------------------------------------------------------

# 22. One-Line Problem Definition

> **Build a working AI system that predicts where, when, and how
> severely coastal flooding will occur, maps the
> people/assets/infrastructure likely to be affected, explains the
> prediction, and tells emergency responders which areas to
> prioritize.**

------------------------------------------------------------------------

## Source

**SINGULARITY 2026 --- SINGULARITY HACKATHON PROBLEM STATEMENTS**, Track
1: **AI for Coastal Flood Intelligence**, pages 3--9 of the provided
PDF.
