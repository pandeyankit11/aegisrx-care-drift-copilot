// server.js — AegisRx Prototype Endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Hybrid Inference Engine (Statistical Risk + Mock LLM Explanation)
function computeRiskScore({ patientId, refillGapDays, expectedGapDays, hrBaseline, hrCurrent }) {
  // 1. Statistical Anomaly Calculation
  const refillDelay = Math.max(0, refillGapDays - expectedGapDays) / expectedGapDays;
  const hrDrift = Math.abs(hrCurrent - hrBaseline) / hrBaseline;
  
  // Weighted risk: 70% weight on pharmacy refill gap, 30% on wearable vitals drift
  const raw = 0.7 * refillDelay + 0.3 * hrDrift;
  const risk = Math.min(1, raw);
  const uncertainty = 0.12; // ±12% Bayesian confidence band
  
  const riskScore = Math.round(risk * 100);
  const confidenceInterval = [
    Math.max(0, Math.round((risk - uncertainty) * 100)),
    Math.min(100, Math.round((risk + uncertainty) * 100)),
  ];

  // 2. Clinical Context & Explanation (Mock LLM Output based on threshold)
  let clinicalEvidence = "Normal adherence pattern detected. Baseline vitals stable.";
  let suggestedCheckIn = "No action required.";
  let riskLevel = "LOW";

  if (riskScore > 60) {
      riskLevel = "ELEVATED";
      clinicalEvidence = "Patient has a 15-day refill gap (PDC drop). Concurrent 16% drift in resting heart rate suggests potential Adverse Drug Reaction (ADR) avoidance rather than forgetfulness.";
      suggestedCheckIn = "Hi [Patient Name], some patients experience mild fatigue or palpitations with this medication. How have you been feeling this week?";
  }

  return {
    patientId,
    timestamp: new Date().toISOString(),
    riskInference: {
      riskLevel,
      riskScore: `${riskScore}%`,
      confidenceInterval: `[${confidenceInterval[0]}%, ${confidenceInterval[1]}%]`,
    },
    clinicalCopilot: {
      evidence: clinicalEvidence,
      suggestedAction: suggestedCheckIn
    }
  };
}

// REST API Endpoint
app.post('/api/assess', (req, res) => {
  const { patientId, refillGapDays, expectedGapDays, hrBaseline, hrCurrent } = req.body;
  
  // Basic validation
  if ([refillGapDays, expectedGapDays, hrBaseline, hrCurrent].some(v => typeof v !== 'number')) {
    return res.status(400).json({ error: 'Missing or invalid numeric fields.' });
  }
  
  res.json(computeRiskScore({ patientId, refillGapDays, expectedGapDays, hrBaseline, hrCurrent }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AegisRx inference engine running on port ${PORT}`));
