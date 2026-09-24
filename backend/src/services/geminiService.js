const SYSTEM_INSTRUCTION = `
You are AegisRx, a clinical decision-support explanation assistant.

The deterministic AegisRx risk engine has already calculated the risk score.
You ONLY explain the supplied evidence.

Rules:
- Never change the supplied risk score.
- Never diagnose a disease or adverse drug reaction.
- Never recommend starting, stopping, increasing, or decreasing medication.
- Never claim causality from correlation.
- Distinguish observed evidence from inferred interpretation.
- Explicitly acknowledge uncertainty.
- Use calm, non-accusatory language.
- Never label a patient "non-compliant".
`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    observedEvidence: {
      type: "array",
      items: { type: "string" }
    },
    possibleInterpretations: {
      type: "array",
      items: { type: "string" }
    },
    clinicianQuestions: {
      type: "array",
      items: { type: "string" }
    },
    uncertainty: { type: "string" },
    safetyNote: { type: "string" }
  },
  required: [
    "headline",
    "summary",
    "observedEvidence",
    "possibleInterpretations",
    "clinicianQuestions",
    "uncertainty",
    "safetyNote"
  ]
};

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash"
];

let clientPromise;

async function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;

  if (!clientPromise) {
    clientPromise = import("@google/genai").then(({ GoogleGenAI }) => {
      return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });
    });
  }

  return clientPromise;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return (
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily") ||
    message.includes("429") ||
    message.includes("resource exhausted")
  );
}

function fallback(payload) {
  return {
    source: "deterministic-fallback",
    model: null,
    headline: payload.interpretation.label,
    summary:
      "The deterministic risk engine detected a multi-signal pattern that requires clinician review.",
    observedEvidence: payload.drivers,
    possibleInterpretations: [
      payload.interpretation.label,
      "Routine disruption or access friction may also contribute."
    ],
    clinicianQuestions: [
      "Has the patient experienced new symptoms or treatment difficulties?",
      "Have there been recent changes in routine, access, or medication availability?"
    ],
    uncertainty:
      "The available signals do not establish causality or confirm the underlying reason for treatment drift.",
    safetyNote:
      "Decision support only. AegisRx does not diagnose conditions or recommend medication changes."
  };
}

async function generateClinicalExplanation(payload) {
  const client = await getClient();

  if (!client) {
    return fallback(payload);
  }

  const prompt = `
Explain this deterministic AegisRx assessment for a clinician.

The risk score and evidence are authoritative. Do not modify them.

PATIENT
Name: ${payload.patientName}
Condition: ${payload.condition}
Medication: ${payload.medication}

RISK
Score: ${payload.riskScore}%
Level: ${payload.riskLevel}
Confidence: ${payload.confidence}%
Uncertainty: ${payload.uncertainty.lower}% to ${payload.uncertainty.upper}%

INTERPRETATION
${payload.interpretation.label}

OBSERVED DRIVERS
${payload.drivers.map((x) => `- ${x}`).join("\n")}

METRICS
${JSON.stringify(payload.metrics, null, 2)}
`;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA
          }
        });

        if (!response?.text) {
          throw new Error(`Empty response from ${model}`);
        }

        return {
          source: "gemini",
          model,
          ...JSON.parse(response.text)
        };
      } catch (error) {
        console.warn(
          `Gemini ${model} attempt ${attempt + 1} failed:`,
          error?.message || error
        );

        if (!isTransient(error)) break;

        await sleep(1000 * (attempt + 1));
      }
    }
  }

  console.warn("All Gemini models unavailable. Using deterministic fallback.");
  return {
    ...fallback(payload),
    fallbackReason: "Gemini temporarily unavailable"
  };
}

module.exports = {
  generateClinicalExplanation
};
