function getValue(resource) {
  return resource?.valueQuantity?.value ?? null;
}

function normalizePatientBundle(bundle) {
  const resources = bundle.resources || [];

  const patient = resources.find((r) => r.resourceType === "Patient");
  const condition = resources.find((r) => r.resourceType === "Condition");

  const medicationRequest = resources.find(
    (r) => r.resourceType === "MedicationRequest"
  );

  const dispenses = resources
    .filter((r) => r.resourceType === "MedicationDispense")
    .map((r) => ({
      id: r.id,
      date: r.whenHandedOver,
      daysSupply: Number(r.daysSupply || 0),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const observations = resources
    .filter((r) => r.resourceType === "Observation")
    .map((r) => ({
      id: r.id,
      code: r.code?.text || "Unknown observation",
      date: r.effectiveDateTime,
      value: Number(getValue(r)),
      unit: r.valueQuantity?.unit || "",
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    patient: {
      id: patient?.id,
      name: patient?.name?.[0]?.text || "Unknown",
      gender: patient?.gender || null,
      birthDate: patient?.birthDate || null,
    },
    condition: condition?.code?.text || "Unknown condition",
    medication:
      medicationRequest?.medicationReference?.reference?.replace(
        "Medication/",
        ""
      ) || "Unknown medication",
    dispenses,
    observations,
    asOfDate: bundle.asOfDate,
    scenario: bundle.scenario,
  };
}

module.exports = {
  normalizePatientBundle,
};
