const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value, digits = 1) =>
  Number(Number(value).toFixed(digits));

function daysBetween(a, b) {
  const ms = Math.abs(new Date(b) - new Date(a));
  return ms / (1000 * 60 * 60 * 24);
}

function relativeDrift(baseline, current) {
  if (!baseline) return 0;
  return ((current - baseline) / baseline) * 100;
}

function getMetricPair(observations, code) {
  const matching = observations.filter((o) => o.code === code);

  if (matching.length < 2) {
    return {
      baseline: null,
      current: null,
      driftPct: 0,
    };
  }

  const baseline = matching[0].value;
  const current = matching[matching.length - 1].value;

  return {
    baseline,
    current,
    driftPct: relativeDrift(baseline, current),
  };
}

function calculateRefillGap(dispenses, asOfDate) {
  if (!dispenses.length) return 0;

  const last = dispenses[dispenses.length - 1];

  const expectedRefill = new Date(last.date);
  expectedRefill.setDate(
    expectedRefill.getDate() + Number(last.daysSupply || 0)
  );

  const asOf = new Date(asOfDate);
  const gap = (asOf - expectedRefill) / (1000 * 60 * 60 * 24);

  return Math.max(0, Math.round(gap));
}

function getContextScore(scenario) {
  switch (scenario) {
    case "possible_adr":
      return 100;
    case "routine_disruption":
      return 80;
    case "access_barrier":
      return 95;
    default:
      return 30;
  }
}

function getTemporalAlignment(scenario) {
  switch (scenario) {
    case "possible_adr":
      return 100;
    case "routine_disruption":
      return 80;
    case "access_barrier":
      return 70;
    default:
      return 40;
  }
}

function getInterpretation(scenario) {
  switch (scenario) {
    case "possible_adr":
      return {
        label: "Possible adverse-effect pathway",
        action:
          "Review treatment experience and symptoms before assuming routine non-adherence.",
      };

    case "routine_disruption":
      return {
        label: "Possible routine disruption",
        action:
          "Consider a low-friction check-in about routine, schedule, and medication-taking barriers.",
      };

    case "access_barrier":
      return {
        label: "Potential access or affordability barrier",
        action:
          "Review affordability, pharmacy access, and continuity barriers without assuming patient intent.",
      };

    default:
      return {
        label: "Needs clinician review",
        action: "Review the evidence and patient context.",
      };
  }
}


function buildRiskHistory(scenario, finalScore) {
  const templates = {
    possible_adr: [
      { date: "2026-07-22", score: 42 },
      { date: "2026-07-29", score: 50 },
      { date: "2026-08-05", score: 62 },
      { date: "2026-08-15", score: 75 },
      { date: "2026-08-25", score: 89 }
    ],
    routine_disruption: [
      { date: "2026-07-22", score: 24 },
      { date: "2026-07-29", score: 27 },
      { date: "2026-08-05", score: 32 },
      { date: "2026-08-15", score: 35 },
      { date: "2026-08-25", score: 32 }
    ],
    access_barrier: [
      { date: "2026-07-22", score: 26 },
      { date: "2026-07-29", score: 33 },
      { date: "2026-08-05", score: 41 },
      { date: "2026-08-15", score: 49 },
      { date: "2026-08-25", score: 57 }
    ]
  };

  const history =
    templates[scenario] || templates.routine_disruption;

  const templateFinal = history[history.length - 1].score;
  const scale = templateFinal > 0 ? finalScore / templateFinal : 1;

  return history.map((point) => ({
    ...point,
    score: round(clamp(point.score * scale))
  }));
}

function scoreRisk(context) {
  const hr = getMetricPair(
    context.observations,
    "Resting heart rate"
  );

  const sleep = getMetricPair(
    context.observations,
    "Sleep fragmentation index"
  );

  const refillGapDays = calculateRefillGap(
    context.dispenses,
    context.asOfDate
  );

  const costObservation = context.observations.find(
    (o) => o.code === "Medication acquisition cost proxy"
  );

  const pharmacyObservation = context.observations.find(
    (o) => o.code === "Pharmacy changes in recent period"
  );

  const refillScore = clamp((refillGapDays / 14) * 100);

  const physiologicalScore = clamp(
    Math.abs(hr.driftPct) * 5
  );

  const sleepScore = clamp(
    Math.abs(sleep.driftPct) * 4
  );

  const temporalScore = getTemporalAlignment(context.scenario);
  const contextScore = getContextScore(context.scenario);

  const riskScore = clamp(
    0.30 * refillScore +
      0.25 * physiologicalScore +
      0.20 * sleepScore +
      0.15 * temporalScore +
      0.10 * contextScore
  );

  const uncertaintyHalfWidth =
    context.scenario === "possible_adr" ? 7 :
    context.scenario === "access_barrier" ? 9 : 8;

  const confidence = clamp(100 - uncertaintyHalfWidth * 2);

  const drivers = [];

  if (refillGapDays >= 7) {
    drivers.push(`${refillGapDays}-day refill gap`);
  }

  if (Math.abs(hr.driftPct) >= 10) {
    drivers.push(
      `${Math.abs(round(hr.driftPct))}% resting-heart-rate deviation`
    );
  }

  if (Math.abs(sleep.driftPct) >= 15) {
    drivers.push(
      `${Math.abs(round(sleep.driftPct))}% sleep-fragmentation increase`
    );
  }

  if (context.scenario === "possible_adr") {
    drivers.push("temporal alignment with treatment initiation");
  }

  if (context.scenario === "access_barrier") {
    if (pharmacyObservation?.value >= 2) {
      drivers.push(`${pharmacyObservation.value} recent pharmacy changes`);
    }

    if (costObservation?.value >= 1.25) {
      drivers.push("elevated medication-acquisition cost proxy");
    }
  }

  if (!drivers.length) {
    drivers.push("no major multi-signal drift detected");
  }

  const interpretation = getInterpretation(context.scenario);

  let riskLevel = "STABLE";

  if (riskScore >= 85) riskLevel = "HIGH_PRIORITY_REVIEW";
  else if (riskScore >= 70) riskLevel = "REVIEW";
  else if (riskScore >= 40) riskLevel = "MONITOR";

  return {
    riskScore: round(riskScore),
    riskLevel,
    confidence,
    uncertainty: {
      lower: round(riskScore - uncertaintyHalfWidth),
      upper: round(riskScore + uncertaintyHalfWidth),
    },
    drivers,
    interpretation,
    metrics: {
      refillGapDays,
      heartRate: {
        baseline: hr.baseline,
        current: hr.current,
        driftPct: round(hr.driftPct),
      },
      sleepFragmentation: {
        baseline: sleep.baseline,
        current: sleep.current,
        driftPct: round(sleep.driftPct),
      },
    },
    scoring: {
      refillScore: round(refillScore),
      physiologicalScore: round(physiologicalScore),
      sleepScore: round(sleepScore),
      temporalScore,
      contextScore,
      weightedContribution: {
        refill: round(0.30 * refillScore),
        physiology: round(0.25 * physiologicalScore),
        sleep: round(0.20 * sleepScore),
        temporal: round(0.15 * temporalScore),
        context: round(0.10 * contextScore)
      }
    },
    riskHistory: buildRiskHistory(context.scenario, riskScore),
    safety: {
      decisionSupportOnly: true,
      autonomousDiagnosis: false,
      medicationChange: false,
      note:
        "Signals indicate a need for clinical review and do not establish causality or treatment changes.",
    },
  };
}

module.exports = {
  scoreRisk,
};
