# AegisRx Care Drift Copilot

> **Bharat Academix Global Innovation Hackathon 2026 — Round 3**

AegisRx is an explainable clinical decision-support prototype designed to surface possible treatment drift between routine clinical visits.

Instead of treating medication adherence as a simple yes/no outcome, AegisRx combines synthetic medication, refill, physiological, sleep, temporal, and contextual signals to produce an explainable review signal for clinicians.

The prototype is designed around one principle:

> **Detect early. Explain carefully. Keep the clinician in control.**

---

# Problem

A patient's treatment journey continues between clinical visits.

During that time, potentially useful signals can appear across different systems:

- medication dispensing and refill timing
- physiological changes
- sleep-pattern changes
- pharmacy or access-related signals
- temporal relationships between treatment initiation and subsequent changes

These signals can be fragmented and difficult to review together.

AegisRx explores whether these passive signals can be combined into a transparent clinical-review workflow before the next scheduled visit.

---

# Solution

AegisRx converts fragmented signals into a structured decision-support workflow:

```text
Synthetic FHIR-compatible data
            ↓
       Data normalization
            ↓
   Temporal feature extraction
            ↓
    Deterministic risk engine
            ↓
     Risk + uncertainty
            ↓
       "Why Now?" evidence
            ↓
     FHIR data provenance
            ↓
   Generative AI explanation
            ↓
     Clinician review action
            ↓
   Patient check-in draft
```

The important architectural boundary is:

> **The deterministic engine calculates the prototype risk signal. Gemini explains the supplied evidence.**

The generative model does not determine the risk score.

---

# Core Features

## 1. Explainable Care-Drift Detection

The prototype combines multiple signal families:

```text
Refill
Physiological drift
Sleep drift
Temporal relationship
Context
```

These signals are transformed into a transparent prototype risk assessment.

Example:

```text
Risk: 88.8%
Level: HIGH PRIORITY REVIEW
Confidence: 86%
Uncertainty: 81.8% – 95.8%
```

The score is intended as a prototype decision-support signal and is not a clinically validated prediction.

---

## 2. Three Demonstration Scenarios

The prototype includes three synthetic patient journeys designed to demonstrate different possible pathways.

### Possible Adverse-Effect Pathway

Signals include:

- refill gap
- resting-heart-rate deviation
- sleep-fragmentation increase
- temporal alignment with treatment initiation

The system surfaces the pattern for clinical review without claiming that an adverse drug reaction has been established.

### Routine Disruption

A lower-risk scenario representing possible routine disruption without a major multi-signal physiological drift.

### Access / Affordability Barrier

A scenario representing possible access or affordability friction through refill and pharmacy-related signals.

These scenarios demonstrate that AegisRx is designed to distinguish possible reasons behind treatment drift rather than reducing every case to a simple "non-adherence" label.

---

## 3. Risk Trajectory

AegisRx visualizes how the prototype risk signal changes across observation points.

Example:

```text
42 → 50 → 62 → 75 → 89
```

The dashboard displays threshold markers for:

- review
- high-priority review

This makes the temporal change in the signal easy to understand during the demo.

These thresholds and trajectories are prototype constructs and are not clinically validated.

---

## 4. Weighted Risk Contribution

The dashboard exposes how different signal families contribute to the deterministic prototype risk score.

Example:

```text
Refill       23.6
Physiology   20.2
Sleep        20.0
Temporal     15.0
Context      10.0
             ----
             88.8
```

This provides a transparent explanation of how the prototype score is assembled rather than presenting an unexplained black-box number.

The weighting is a prototype design choice and is not presented as a validated clinical model.

---

## 5. "Why Now?" Evidence Layer

AegisRx explicitly separates:

### Observed

Facts directly represented in the available synthetic data.

### Inferred

A possible interpretation derived from those observations.

### Uncertain

What the available evidence does not establish.

Example:

```text
OBSERVED

• 11-day refill gap
• 16.2% resting-heart-rate deviation
• 31.3% sleep-fragmentation increase
• temporal alignment with treatment initiation


INFERRED

• Possible adverse-effect pathway


UNCERTAIN

• Signal correlation does not establish causality
• Clinical context requires human review
```

This separation is designed to prevent the generative AI layer from being presented as clinical truth.

---

## 6. FHIR-Compatible Data Provenance

The prototype uses synthetic FHIR-compatible resource structures to represent the evidence lineage.

The dashboard exposes the path:

```text
FHIR-compatible data
        ↓
Normalized features
        ↓
Risk engine
        ↓
AI explanation
```

The demonstration uses structures representing resources such as:

- `Patient`
- `Condition`
- `MedicationRequest`
- `MedicationDispense`
- `Observation`

The prototype also exposes a provenance view showing the underlying resources that contributed to an assessment.

All data used in the demonstration is synthetic.

---

## 7. Generative AI Explanation Layer

Gemini is used after deterministic scoring.

The AI layer receives the already-computed assessment and generates a structured clinician-facing explanation containing:

- explanation headline
- concise summary
- observed evidence
- possible interpretations
- clinician questions
- uncertainty
- safety boundary

The model is explicitly instructed not to:

- change the deterministic risk score
- recalculate the risk
- establish causality
- diagnose a condition
- recommend starting medication
- recommend stopping medication
- recommend dosage changes
- autonomously prescribe treatment
- describe a patient as "non-compliant"

The AI layer is therefore downstream of the deterministic inference layer.

If the Gemini service is temporarily unavailable, the prototype uses a deterministic fallback explanation so that the application can continue demonstrating the core workflow.

---

## 8. Clinician Review Pathway

AegisRx converts a surfaced signal into a simple human-in-the-loop workflow:

```text
Evidence detected
       ↓
Review evidence
       ↓
Draft patient check-in
       ↓
Mark for follow-up
```

The dashboard provides explicit actions:

- Review evidence
- Draft check-in
- Mark for follow-up

Workflow state is stored locally in the browser for prototype demonstration.

The system does not autonomously contact patients.

---

## 9. Multilingual Patient Check-in

AegisRx includes a communication layer for clinician-editable patient check-ins.

Supported demonstration languages:

- English
- Hindi
- Marathi

The generated message is intended as a draft for clinician review.

The communication is designed to remain neutral and non-accusatory rather than assuming the reason for treatment drift.

---

## 10. Human-in-the-Loop Safety

AegisRx prominently communicates the boundary between automation and clinical judgment.

The prototype does not automatically:

```text
Diagnose
Prescribe
Change medication
Contact patients
```

Instead:

```text
Detect
   ↓
Explain
   ↓
Ask clinician questions
   ↓
Human review
   ↓
Follow-up
```

The goal is to support clinicians rather than replace clinical decision-making.

---

# End-to-End Architecture

```text
                   SYNTHETIC DATA
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
      Medication      Observations    Context
      / Refill        / Physiology    Signals
          └──────────────┬──────────────┘
                         ↓
                Temporal Features
                         ↓
              Deterministic Risk Engine
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
          Risk Score           Uncertainty
              │                     │
              └──────────┬──────────┘
                         ↓
                    "Why Now?"
                         ↓
                  Evidence Layer
                         ↓
                 Gemini Explanation
                         ↓
              Clinician Review Flow
                         ↓
               Patient Check-in Draft
```

---

# Technology Stack

## Frontend

- React
- Vite
- Recharts
- Lucide React
- CSS

## Backend

- Node.js
- Express
- Google Gemini API
- deterministic risk engine
- temporal feature processing
- synthetic FHIR-compatible resources

## Deployment

The repository includes a Render Blueprint for:

```text
React / Vite frontend
        +
Node.js / Express backend
```

---

# Project Structure

```text
aegisrx-care-drift-copilot/
│
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── engine/
│   │   ├── services/
│   │   └── ...
│   ├── data/
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│   └── DEMO_SCRIPT.md
│
├── tests/
│
├── render.yaml
├── README.md
└── .gitignore
```

---

# Local Setup

## Prerequisites

- Node.js 20+
- npm
- Git
- Gemini API key for AI functionality

---

## Backend Setup

```bash
cd backend
npm install
```

Create:

```text
backend/.env
```

with:

```env
PORT=8787
HOST=0.0.0.0
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Start the backend:

```bash
npm start
```

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

Expected:

```json
{
  "ok": true,
  "service": "AegisRx Care Drift Copilot"
}
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite development server proxies local `/api` requests to the backend.

---

# API Endpoints

```text
GET  /api/health
GET  /api/patients
GET  /api/patients/:id
GET  /api/patients/:id/timeline
GET  /api/patients/:id/provenance
POST /api/explain
```

Example patient request:

```bash
curl http://127.0.0.1:8787/api/patients/PX-1042
```

Example provenance request:

```bash
curl http://127.0.0.1:8787/api/patients/PX-1042/provenance
```

Example AI explanation request:

```bash
curl -X POST \
  http://127.0.0.1:8787/api/explain \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PX-1042"}'
```

---

# Testing

From the repository root:

```bash
node --test tests/risk-engine.test.js
```

The tests cover the deterministic risk-engine behavior used by the prototype.

---

# Production Build

Build the frontend:

```bash
cd frontend
npm run build
```

Production output:

```text
frontend/dist/
```

---

# Deployment

The repository contains:

```text
render.yaml
```

which defines:

1. Node.js backend web service
2. Vite static frontend

The backend requires:

```text
GEMINI_API_KEY
```

The frontend requires:

```text
VITE_API_URL
```

The backend deployment also uses:

```text
ALLOWED_ORIGIN
```

Secrets must be configured through the deployment platform and must never be committed to Git.

---

# Demo Flow

The recommended judging flow is:

```text
1. Open AegisRx
       ↓
2. Show the three scenarios
       ↓
3. Select the high-priority case
       ↓
4. Show the risk trajectory
       ↓
5. Show weighted signal contribution
       ↓
6. Show "Why Now?"
       ↓
7. Show FHIR provenance
       ↓
8. Generate AI explanation
       ↓
9. Show uncertainty + clinician questions
       ↓
10. Draft multilingual check-in
       ↓
11. Review evidence
       ↓
12. Mark for follow-up
```

This demonstrates the full system rather than only the AI component.

---

# Demo Scenarios

| Patient | Scenario | Prototype Signal |
|---|---|---|
| Priya Sharma | Possible adverse-effect pathway | High priority |
| Rahul Mehta | Routine disruption | Stable |
| Meera Nair | Access / affordability barrier | Monitor |

These are synthetic demonstration scenarios.

---

# Example Clinical-Review Flow

### Priya Sharma

```text
88.8% prototype risk
        ↓
HIGH PRIORITY REVIEW
        ↓
11-day refill gap
16.2% heart-rate deviation
31.3% sleep-fragmentation increase
temporal alignment
        ↓
Possible adverse-effect pathway
        ↓
Gemini explanation
        ↓
Clinician questions
        ↓
Patient check-in
        ↓
Follow-up
```

The system does not conclude that an adverse drug reaction has occurred.

---

# Why the AI Layer Is Downstream

AegisRx intentionally separates:

```text
DETERMINISTIC LAYER
        ↓
computes risk
        ↓
supplies evidence
        ↓
supplies uncertainty

GENERATIVE LAYER
        ↓
explains evidence
        ↓
suggests clinician questions
        ↓
drafts communication
```

This design reduces the risk of allowing a generative model to invent the underlying clinical signal.

---

# Future Scope

Potential future development includes:

- real FHIR server connectivity
- validated clinical feature definitions
- longitudinal patient cohorts
- calibrated predictive models
- formal model evaluation
- clinician feedback loops
- expanded multilingual support
- ABDM interoperability
- secure role-based access
- audit logging
- cloud-scale time-series infrastructure
- validated clinical workflow integration

These capabilities would require appropriate:

- privacy controls
- security architecture
- clinical validation
- governance
- data protection
- regulatory review

---

# Hackathon Context

**Event:** Bharat Academix Global Innovation Hackathon 2026

**Round:** Round 3 — Project Submission

**Project:** AegisRx Care Drift Copilot

**Theme:** Build for a Better Future

---

# Demonstration Disclaimer

This repository contains a hackathon prototype using synthetic data.

It is intended only to demonstrate a technical concept and should not be used for:

- diagnosis
- treatment decisions
- medication management
- prescription decisions
- real patient care

AegisRx is not a medical device and has not undergone clinical validation.

All risk scores, weights, thresholds, interpretations, and generated communications shown in the prototype are demonstration outputs.

No real patient records are used.
