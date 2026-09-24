const fs = require("fs");
const path = require("path");

const DATA_ROOT = path.resolve(__dirname, "../../data");

function readJson(relativePath) {
  const filePath = path.join(DATA_ROOT, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listPatients() {
  return readJson("fhir/patients.json");
}

function getPatientRegistryRecord(patientId) {
  return listPatients().find((patient) => patient.id === patientId) || null;
}

function getPatientFHIR(patientId) {
  const safeId = String(patientId).replace(/[^A-Za-z0-9_-]/g, "");
  const file = `fhir/${safeId}.json`;
  return readJson(file);
}

module.exports = {
  listPatients,
  getPatientRegistryRecord,
  getPatientFHIR,
};
