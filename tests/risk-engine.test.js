const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizePatientBundle } = require("../backend/src/models/fhir");
const { scoreRisk } = require("../backend/src/engine/riskEngine");
const fs = require("fs");

function load(id) {
  return JSON.parse(
    fs.readFileSync(`backend/data/fhir/${id}.json`, "utf8")
  );
}

test("PX-1042 produces a high-priority review signal", () => {
  const context = normalizePatientBundle(load("PX-1042"));
  const result = scoreRisk(context);

  assert.equal(result.riskLevel, "HIGH_PRIORITY_REVIEW");
  assert.ok(result.riskScore >= 85);
  assert.ok(result.drivers.length >= 2);
  assert.equal(result.safety.autonomousDiagnosis, false);
});

test("PX-2088 produces a non-high-priority signal", () => {
  const context = normalizePatientBundle(load("PX-2088"));
  const result = scoreRisk(context);

  assert.ok(result.riskScore < 85);
  assert.ok(result.riskLevel !== "HIGH_PRIORITY_REVIEW");
});

test("PX-3411 identifies an access barrier pattern", () => {
  const context = normalizePatientBundle(load("PX-3411"));
  const result = scoreRisk(context);

  assert.match(
    result.interpretation.label,
    /access|affordability/i
  );
});
