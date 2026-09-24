const express = require("express");

const {
  listPatients,
  getPatientRegistryRecord,
  getPatientFHIR,
} = require("../utils/dataStore");

const { normalizePatientBundle } = require("../models/fhir");
const { scoreRisk } = require("../engine/riskEngine");
const { generateClinicalExplanation } = require("../services/geminiService");

const router = express.Router();

function buildAssessment(patientId) {
  const registryRecord = getPatientRegistryRecord(patientId);

  if (!registryRecord) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const bundle = getPatientFHIR(patientId);
  const context = normalizePatientBundle(bundle);
  const assessment = scoreRisk(context);

  return {
    patient: registryRecord,
    assessment,
    timeline: context,
  };
}

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "AegisRx Care Drift Copilot",
    mode: "synthetic-data-prototype",
    ai: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

router.get("/patients", (req, res) => {
  const patients = listPatients().map((patient) => {
    const result = buildAssessment(patient.id);

    return {
      ...patient,
      riskScore: result.assessment.riskScore,
      riskLevel: result.assessment.riskLevel,
      confidence: result.assessment.confidence,
      primarySignal: result.assessment.interpretation.label,
      drivers: result.assessment.drivers.slice(0, 2),
    };
  });

  res.json({ patients });
});

router.get("/patients/:id", (req, res) => {
  res.json(buildAssessment(req.params.id));
});

router.get("/patients/:id/timeline", (req, res) => {
  const result = buildAssessment(req.params.id);

  const events = [
    ...result.timeline.dispenses.map((d) => ({
      type: "MedicationDispense",
      date: d.date,
      label: `Medication dispensed (${d.daysSupply} day supply)`,
    })),
    ...result.timeline.observations.map((o) => ({
      type: "Observation",
      date: o.date,
      label: o.code,
      value: o.value,
      unit: o.unit,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json({
    patientId: req.params.id,
    asOfDate: result.timeline.asOfDate,
    events,
  });
});

router.post("/assess", (req, res) => {
  const patientId = req.body?.patientId;

  if (!patientId) {
    return res.status(400).json({
      error: "patientId is required",
    });
  }

  return res.json(buildAssessment(patientId));
});


router.post("/explain", async (req, res, next) => {
  try {
    const patientId = req.body?.patientId;

    if (!patientId) {
      return res.status(400).json({
        error: "patientId is required",
      });
    }

    const result = buildAssessment(patientId);

    const explanation = await generateClinicalExplanation({
      patientName: result.patient.name,
      condition: result.patient.condition,
      medication: result.patient.medication,
      riskScore: result.assessment.riskScore,
      riskLevel: result.assessment.riskLevel,
      confidence: result.assessment.confidence,
      uncertainty: result.assessment.uncertainty,
      drivers: result.assessment.drivers,
      interpretation: result.assessment.interpretation,
      metrics: result.assessment.metrics,
    });

    res.json({
      patientId,
      explanation,
      safety: result.assessment.safety,
    });
  } catch (error) {
    next(error);
  }
});


router.get("/patients/:id/provenance", (req, res) => {
  const result = buildAssessment(req.params.id);

  const resources = [
    ...result.timeline.dispenses.map((item) => ({
      resourceType: "MedicationDispense",
      date: item.date,
      label: `Medication dispensed (${item.daysSupply} day supply)`,
      value: item.daysSupply,
      unit: "days",
    })),

    ...result.timeline.observations.map((item) => ({
      resourceType: "Observation",
      date: item.date,
      label: item.code,
      value: item.value,
      unit: item.unit,
    })),
  ];

  res.json({
    patientId: req.params.id,
    source: "synthetic FHIR-compatible resources",
    normalization: "FHIR resources → normalized temporal features",
    resources,
  });
});

router.get("/scenarios", (req, res) => {
  res.json({
    scenarios: [
      {
        id: "possible_adr",
        label: "Possible adverse-effect pathway",
        patientId: "PX-1042",
      },
      {
        id: "routine_disruption",
        label: "Possible routine disruption",
        patientId: "PX-2088",
      },
      {
        id: "access_barrier",
        label: "Potential access / affordability barrier",
        patientId: "PX-3411",
      },
    ],
  });
});

router.post("/checkin", (req, res) => {
  const {
    patientId,
    language = "English",
    tone = "Empathetic",
  } = req.body || {};

  if (!patientId) {
    return res.status(400).json({
      error: "patientId is required",
    });
  }

  const result = buildAssessment(patientId);
  const name = result.patient.name.split(" ")[0];

  const English = `Hi ${name}, your care team would like to check how your current treatment is going. Have you experienced any difficulty taking your medication regularly or any new symptoms?`;

  const messages = {
    English,
    Hindi: `नमस्ते ${name}, आपकी care team आपकी वर्तमान दवा और उपचार के बारे में जानना चाहती है। क्या आपको दवा नियमित रूप से लेने में कोई कठिनाई या कोई नए लक्षण महसूस हुए हैं?`,
    Marathi: `नमस्कार ${name}, तुमच्या उपचाराची स्थिती जाणून घेण्यासाठी तुमची care team संपर्क करत आहे. औषध नियमितपणे घेण्यात काही अडचण किंवा नवीन लक्षणे जाणवली आहेत का?`,
  };

  res.json({
    patientId,
    language,
    tone,
    message: messages[language] || messages.English,
    note:
      "Draft for clinician review. AegisRx does not autonomously contact patients.",
  });
});

module.exports = router;
