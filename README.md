# AegisRx: Passive Clinical Non-Adherence Inference Engine 🦋

**Manipal Hackathon 2026 - Round 1 Submission**
**Team:** alstrox (Team ID: 51120)
**Track:** Healthcare / Disability (SDG 3)

## The Butterfly Effect 
In chronic illness management, a skipped dose is a small ripple that can escalate into a severe clinical event (e.g., congestive heart failure). AegisRx is a passive clinical copilot designed to detect these ripples early. Rather than relying on inaccurate patient self-reporting, AegisRx aggregates indirect signals (pharmacy refills, EHR lab drift, and wearable vitals) to probabilistically infer non-adherence. 

## Prototype Architecture
This Round 1 prototype demonstrates our **Hybrid Inference Engine**:
1. **Passive Signal Ingestion:** Receives simulated FHIR-compatible payloads (refill cadences, wearable heart-rate drift).
2. **Statistical Risk Scoring:** Calculates a weighted risk score and Bayesian confidence interval based on temporal anomalies.
3. **Clinical Context:** Outputs plain-English clinical reasoning and empathetic, non-accusatory patient check-in prompts.

## Quickstart

**1. Install Dependencies**
\`\`\`bash
npm install
\`\`\`

**2. Run the Engine**
\`\`\`bash
node server.js
\`\`\`
*(The server will start on port 3000)*

**3. Test the Endpoint (Simulated High-Risk Patient)**
Send a POST request to `http://localhost:3000/api/assess` with the following JSON:
\`\`\`json
{
  "patientId": "PT-8842",
  "refillGapDays": 45,
  "expectedGapDays": 30,
  "hrBaseline": 68,
  "hrCurrent": 79
}
\`\`\`

**Sample Response:**
\`\`\`json
{
  "patientId": "PT-8842",
  "timestamp": "2026-09-17T14:30:00.000Z",
  "riskInference": {
    "riskLevel": "ELEVATED",
    "riskScore": "69%",
    "confidenceInterval": "[57%, 81%]"
  },
  "clinicalCopilot": {
    "evidence": "Patient has a 15-day refill gap (PDC drop). Concurrent 16% drift in resting heart rate suggests potential Adverse Drug Reaction (ADR) avoidance rather than forgetfulness.",
    "suggestedAction": "Hi [Patient Name], some patients experience mild fatigue or palpitations with this medication. How have you been feeling this week?"
  }
}
\`\`\`

## Roadmap to Round 2
In Round 2, we will integrate a mock HL7 FHIR server to ingest real-time patient data streams and build the interactive Clinician UI Dashboard for this API.
