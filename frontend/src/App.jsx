import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Languages,
  Info,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

import "./App.css";

const API = import.meta.env.VITE_API_URL || "/api";

const SCENARIOS = [
  {
    id: "PX-1042",
    label: "Possible ADR",
    detail: "Physiological + refill drift",
  },
  {
    id: "PX-2088",
    label: "Routine disruption",
    detail: "Refill drift without physiology",
  },
  {
    id: "PX-3411",
    label: "Access barrier",
    detail: "Pharmacy + cost signals",
  },
];

const formatRisk = (value) => `${Number(value).toFixed(0)}%`;

function RiskBadge({ level }) {
  const config = {
    HIGH_PRIORITY_REVIEW: ["High priority", "risk-high"],
    REVIEW: ["Review", "risk-review"],
    MONITOR: ["Monitor", "risk-monitor"],
    STABLE: ["Stable", "risk-stable"],
  };

  const [label, className] = config[level] || ["Unknown", "risk-stable"];

  return <span className={`risk-badge ${className}`}>{label}</span>;
}

function MetricCard({ label, value, detail, tone = "" }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("PX-1042");
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [checkIn, setCheckIn] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [provenance, setProvenance] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aegisrx-workflow-status") || "{}"
      );
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetch(`${API}/patients`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load patients");
        return response.json();
      })
      .then((data) => setPatients(data.patients || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    setDetailLoading(true);
    setCheckIn("");
    setExplanation(null);

    Promise.all([
      fetch(`${API}/patients/${selectedId}`).then((r) => r.json()),
      fetch(`${API}/patients/${selectedId}/timeline`).then((r) => r.json()),
      fetch(`${API}/patients/${selectedId}/provenance`).then((r) => r.json()),
    ])
      .then(([detail, timelineData, provenanceData]) => {
        setPatient(detail);
        setTimeline(timelineData.events || []);
        setProvenance(provenanceData);
      })
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const summary = useMemo(
    () =>
      patients.reduce(
        (acc, current) => {
          if (current.riskLevel === "HIGH_PRIORITY_REVIEW") acc.high += 1;
          else if (current.riskLevel === "REVIEW") acc.review += 1;
          else if (current.riskLevel === "MONITOR") acc.monitor += 1;
          else acc.stable += 1;
          return acc;
        },
        { high: 0, review: 0, monitor: 0, stable: 0 }
      ),
    [patients]
  );

  const driverData = useMemo(() => {
    if (!patient?.assessment?.scoring) return [];

    const s = patient.assessment.scoring.weightedContribution;

    return [
      { name: "Refill", value: s.refill },
      { name: "Physiology", value: s.physiology },
      { name: "Sleep", value: s.sleep },
      { name: "Temporal", value: s.temporal },
      { name: "Context", value: s.context },
    ];
  }, [patient]);

  const evidenceGroups = useMemo(() => {
    if (!patient) return { observed: [], inferred: [], uncertain: [] };

    const { assessment } = patient;
    const observed = [...assessment.drivers];

    if (
      assessment.scenario === "access_barrier" ||
      patient.patient.scenario === "access_barrier"
    ) {
      observed.push("Pharmacy/cost proxy pattern detected");
    }

    return {
      observed,
      inferred: [assessment.interpretation.label],
      uncertain: [
        "Signal correlation does not establish causality",
        "Clinical context requires human review",
      ],
    };
  }, [patient]);



  const updateWorkflowStatus = (status) => {
    const next = {
      ...workflowStatus,
      [selectedId]: {
        status,
        updatedAt: new Date().toISOString(),
      },
    };

    setWorkflowStatus(next);
    localStorage.setItem(
      "aegisrx-workflow-status",
      JSON.stringify(next)
    );
  };

  const generateExplanation = async () => {
    setExplanationLoading(true);

    try {
      const response = await fetch(`${API}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          patientId: selectedId
        })
      });

      if (!response.ok) {
        throw new Error("Unable to generate explanation");
      }

      const data = await response.json();
      setExplanation(data.explanation || null);
    } catch (error) {
      console.error(error);

      setExplanation({
        source: "error",
        headline: "Explanation unavailable",
        summary:
          "The deterministic assessment is still available, but the explanation layer could not be reached.",
        observedEvidence:
          patient?.assessment?.drivers || [],
        possibleInterpretations: [],
        clinicianQuestions: [],
        uncertainty:
          "Review the deterministic evidence directly.",
        safetyNote:
          "Decision support only. No diagnosis or medication change."
      });
    } finally {
      setExplanationLoading(false);
    }
  };

  const generateCheckIn = async () => {
    setCheckInLoading(true);

    try {
      const response = await fetch(`${API}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: selectedId,
          language,
          tone: "Empathetic",
        }),
      });

      const data = await response.json();
      setCheckIn(data.message || "");
      updateWorkflowStatus("Patient check-in drafted");
    } catch (error) {
      console.error(error);
      setCheckIn("Unable to generate check-in.");
    } finally {
      setCheckInLoading(false);
    }
  };

  const selectScenario = (id) => {
    setSelectedId(id);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={20} />
          </div>

          <div>
            <div className="brand-name">AegisRx</div>
            <div className="brand-subtitle">CARE DRIFT COPILOT</div>
          </div>
        </div>

        <div className="topbar-status">
          <span className="live-dot" />
          Synthetic clinical prototype
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <div className="eyebrow">CLINICAL DECISION SUPPORT</div>
            <h1>Detect treatment drift before the next visit.</h1>
            <p>
              AegisRx turns fragmented passive signals into an
              explainable clinical review signal.
            </p>
          </div>

          <div className="hero-principle">
            <ShieldCheck size={19} />
            <div>
              <strong>Human in the loop</strong>
              <span>
                No autonomous diagnosis or medication changes
              </span>
            </div>
          </div>
        </section>

        <div className="scenario-strip card">
          <div className="scenario-intro">
            <div className="eyebrow">DEMO SCENARIOS</div>
            <strong>Show the three ways AegisRx reasons about drift</strong>
          </div>

          <div className="scenario-buttons">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                className={
                  selectedId === scenario.id
                    ? "scenario-button active"
                    : "scenario-button"
                }
                onClick={() => selectScenario(scenario.id)}
              >
                <span>{scenario.label}</span>
                <small>{scenario.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <section className="stat-grid">
          <MetricCard
            label="HIGH PRIORITY"
            value={summary.high}
            detail="Immediate clinical review"
            tone="high"
          />
          <MetricCard
            label="REVIEW"
            value={summary.review}
            detail="Needs closer assessment"
          />
          <MetricCard
            label="MONITOR"
            value={summary.monitor}
            detail="Observe emerging drift"
          />
          <MetricCard
            label="STABLE"
            value={summary.stable}
            detail="No major multi-signal drift"
          />
        </section>

        <section className="workspace">
          <aside className="patient-list card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PATIENT MONITOR</span>
                <h2>Care journeys</h2>
              </div>
              <UserRound size={18} />
            </div>

            <div className="patient-items">
              {loading ? (
                <div className="empty-state">Loading patients…</div>
              ) : (
                patients.map((item) => (
                  <button
                    key={item.id}
                    className={`patient-row ${
                      selectedId === item.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="patient-main">
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.id}</span>
                      </div>

                      <RiskBadge level={item.riskLevel} />
                    </div>

                    <div className="patient-meta">
                      <span>{item.condition}</span>
                      <span>{formatRisk(item.riskScore)}</span>
                    </div>

                    <div className="patient-signal">
                      {item.primarySignal}
                      <ChevronRight size={15} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="patient-detail">
            {detailLoading || !patient ? (
              <div className="card loading-panel">
                Loading patient analysis…
              </div>
            ) : (
              <>
                <div className="patient-header card">
                  <div>
                    <div className="eyebrow">PATIENT</div>
                    <h2>{patient.patient.name}</h2>
                    <p>
                      {patient.patient.id} · {patient.patient.age} yrs ·{" "}
                      {patient.patient.condition}
                    </p>
                  </div>

                  <RiskBadge level={patient.assessment.riskLevel} />
                </div>

                <div className="analysis-grid">
                  <div className="card risk-card">
                    <div className="eyebrow">CURRENT CARE DRIFT SIGNAL</div>

                    <div className="risk-main">
                      <div className="risk-ring">
                        <strong>
                          {formatRisk(patient.assessment.riskScore)}
                        </strong>
                        <span>risk</span>
                      </div>

                      <div className="risk-summary">
                        <h3>{patient.assessment.interpretation.label}</h3>

                        <p>
                          Confidence{" "}
                          <strong>
                            {patient.assessment.confidence}%
                          </strong>
                          {" · "}
                          uncertainty{" "}
                          <strong>
                            {patient.assessment.uncertainty.lower}%–{" "}
                            {patient.assessment.uncertainty.upper}%
                          </strong>
                        </p>

                        <div className="risk-direction">
                          <ArrowUpRight size={17} />
                          Review signal detected
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">WHY NOW?</div>
                        <h3>Evidence that triggered the review</h3>
                      </div>
                      <BrainCircuit size={18} />
                    </div>

                    <div className="driver-list">
                      {patient.assessment.drivers.map((driver) => (
                        <div className="driver" key={driver}>
                          <CheckCircle2 size={16} />
                          <span>{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="chart-grid">
                  <div className="card chart-card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">PROTOTYPE RISK TREND</div>
                        <h3>Risk trajectory between visits</h3>
                      </div>
                      <ArrowUpRight size={18} />
                    </div>

                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={patient.assessment.riskHistory}>
                          <CartesianGrid
                            stroke="rgba(255,255,255,0.06)"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#82969f", fontSize: 10 }}
                            tickFormatter={(value) =>
                              value.slice(5)
                            }
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "#82969f", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            width={34}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "#0b1920",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 10,
                              color: "#f3f7f8",
                            }}
                            labelStyle={{ color: "#42d8e8" }}
                          />

                          <ReferenceLine
                            y={70}
                            stroke="#f6c85f"
                            strokeDasharray="4 4"
                          />

                          <ReferenceLine
                            y={85}
                            stroke="#ff7184"
                            strokeDasharray="4 4"
                          />

                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#6ee7a1"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#6ee7a1" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-legend">
                      <span>
                        <i className="legend-yellow" />
                        review threshold
                      </span>
                      <span>
                        <i className="legend-red" />
                        high-priority threshold
                      </span>
                    </div>
                  </div>

                  <div className="card chart-card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">SIGNAL STRENGTH</div>
                        <h3>Weighted risk contribution</h3>
                      </div>
                      <Activity size={18} />
                    </div>

                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={driverData}
                          layout="vertical"
                          margin={{
                            top: 0,
                            right: 16,
                            bottom: 0,
                            left: 12,
                          }}
                        >
                          <CartesianGrid
                            stroke="rgba(255,255,255,0.05)"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fill: "#82969f", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={72}
                            tick={{ fill: "#c7d4d8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "#0b1920",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 10,
                              color: "#f3f7f8",
                            }}
                          />

                          <Bar
                            dataKey="value"
                            fill="#42d8e8"
                            radius={[0, 6, 6, 0]}
                            barSize={17}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="prototype-note">
                      Driver strengths are transparent prototype signals,
                      not validated clinical weights.
                    </div>
                  </div>
                </div>


                <div className="card ai-explanation-card">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">AI EXPLANATION LAYER</div>
                      <h3>Why this pattern?</h3>
                    </div>
                    <BrainCircuit size={18} />
                  </div>

                  {!explanation ? (
                    <div className="ai-empty">
                      <p>
                        Gemini explains the deterministic risk signal
                        using the evidence already computed by AegisRx.
                        The model cannot modify the risk score.
                      </p>

                      <button
                        className="primary-button"
                        onClick={generateExplanation}
                        disabled={explanationLoading}
                      >
                        {explanationLoading
                          ? "Generating explanation…"
                          : "Generate AI explanation"}
                      </button>
                    </div>
                  ) : (
                    <div className="ai-result">
                      <div className="ai-source">
                        {explanation.source === "gemini"
                          ? `GEMINI${explanation.model ? ` • ${explanation.model}` : ""}`
                          : "DETERMINISTIC FALLBACK"}
                      </div>

                      <h4>{explanation.headline}</h4>

                      <p className="ai-summary">
                        {explanation.summary}
                      </p>

                      <div className="ai-columns">
                        <div>
                          <span className="evidence-label observed">
                            OBSERVED
                          </span>

                          {(explanation.observedEvidence || []).map(
                            (item) => (
                              <div className="evidence-row" key={item}>
                                <CheckCircle2 size={15} />
                                <span>{item}</span>
                              </div>
                            )
                          )}
                        </div>

                        <div>
                          <span className="evidence-label inferred">
                            POSSIBLE INTERPRETATIONS
                          </span>

                          {(explanation.possibleInterpretations || []).map(
                            (item) => (
                              <div className="evidence-row" key={item}>
                                <BrainCircuit size={15} />
                                <span>{item}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="ai-questions">
                        <span className="evidence-label observed">
                          CLINICIAN QUESTIONS
                        </span>

                        {(explanation.clinicianQuestions || []).map(
                          (item) => (
                            <div className="evidence-row" key={item}>
                              <Stethoscope size={15} />
                              <span>{item}</span>
                            </div>
                          )
                        )}
                      </div>

                      <div className="uncertainty-box">
                        <AlertTriangle size={16} />

                        <div>
                          <strong>Uncertainty</strong>
                          <p>{explanation.uncertainty}</p>
                        </div>
                      </div>

                      <div className="ai-safety">
                        <ShieldCheck size={16} />
                        <span>{explanation.safetyNote}</span>
                      </div>
                    </div>
                  )}
                </div>


                <div className="card provenance-card">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">DATA PROVENANCE</div>
                      <h3>Evidence lineage</h3>
                    </div>
                    <Info size={18} />
                  </div>

                  <div className="provenance-flow">
                    <span>FHIR-compatible data</span>
                    <ChevronRight size={15} />
                    <span>Normalized features</span>
                    <ChevronRight size={15} />
                    <span>Risk engine</span>
                    <ChevronRight size={15} />
                    <span>AI explanation</span>
                  </div>

                  <div className="resource-grid">
                    {(provenance?.resources || []).map((resource, index) => (
                      <div
                        className="resource-card"
                        key={`${resource.resourceType}-${index}`}
                      >
                        <div className="resource-type">
                          {resource.resourceType}
                        </div>

                        <strong>{resource.label}</strong>

                        <div className="resource-meta">
                          <span>{resource.date}</span>
                          <span>
                            {resource.value} {resource.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="provenance-note">
                    Synthetic data for prototype demonstration only.
                    No real patient records are used.
                  </div>
                </div>

                <div className="evidence-grid">
                  <div className="card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">EVIDENCE LAYER</div>
                        <h3>What the system knows</h3>
                      </div>
                      <Info size={18} />
                    </div>

                    <div className="evidence-block">
                      <span className="evidence-label observed">
                        OBSERVED
                      </span>

                      {evidenceGroups.observed.map((item) => (
                        <div className="evidence-row" key={item}>
                          <CheckCircle2 size={15} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="evidence-block">
                      <span className="evidence-label inferred">
                        INFERRED
                      </span>

                      {evidenceGroups.inferred.map((item) => (
                        <div className="evidence-row" key={item}>
                          <BrainCircuit size={15} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="evidence-block">
                      <span className="evidence-label uncertain">
                        UNCERTAIN
                      </span>

                      {evidenceGroups.uncertain.map((item) => (
                        <div className="evidence-row" key={item}>
                          <AlertTriangle size={15} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card clinician-card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">CLINICIAN ACTION</div>
                        <h3>Review pathway</h3>
                      </div>
                      <Stethoscope size={18} />
                    </div>

                    <div className="action-box">
                      <Stethoscope size={19} />
                      <p>
                        {patient.assessment.interpretation.action}
                      </p>
                    </div>

                    <div className="workflow-status">
                      <div className="workflow-step">
                        <span
                          className={
                            workflowStatus[selectedId]?.status ===
                            "Evidence reviewed"
                              ? "workflow-dot done"
                              : "workflow-dot"
                          }
                        />
                        <div>
                          <strong>Evidence reviewed</strong>
                          <small>
                            Validate the observed signals and uncertainty.
                          </small>
                        </div>
                      </div>

                      <div className="workflow-step">
                        <span
                          className={
                            workflowStatus[selectedId]?.status ===
                            "Patient check-in drafted"
                              ? "workflow-dot done"
                              : "workflow-dot"
                          }
                        />
                        <div>
                          <strong>Patient check-in</strong>
                          <small>
                            Prepare a clinician-editable outreach draft.
                          </small>
                        </div>
                      </div>

                      <div className="workflow-step">
                        <span
                          className={
                            workflowStatus[selectedId]?.status ===
                            "Follow-up queued"
                              ? "workflow-dot done"
                              : "workflow-dot"
                          }
                        />
                        <div>
                          <strong>Follow-up</strong>
                          <small>
                            Queue the patient for human review.
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="workflow-buttons">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          updateWorkflowStatus("Evidence reviewed")
                        }
                      >
                        Review evidence
                      </button>

                      <button
                        className="secondary-button"
                        onClick={generateCheckIn}
                      >
                        Draft check-in
                      </button>

                      <button
                        className="primary-button"
                        onClick={() =>
                          updateWorkflowStatus("Follow-up queued")
                        }
                      >
                        Mark for follow-up
                      </button>
                    </div>

                    {workflowStatus[selectedId]?.status && (
                      <div className="workflow-confirmation">
                        <CheckCircle2 size={15} />
                        <span>
                          {workflowStatus[selectedId].status}
                        </span>
                      </div>
                    )}

                    <div className="safety-note">
                      <AlertTriangle size={17} />
                      <span>{patient.assessment.safety.note}</span>
                    </div>
                  </div>
                  </div>

                <div className="lower-grid">
                  <div className="card timeline-card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">TEMPORAL EVIDENCE</div>
                        <h2>Patient timeline</h2>
                      </div>
                      <Clock3 size={18} />
                    </div>

                    <div className="timeline-track">
                      {timeline.map((event, index) => (
                        <div
                          className="timeline-item"
                          key={`${event.date}-${index}`}
                        >
                          <div className="timeline-dot" />
                          <div className="timeline-date">
                            {event.date}
                          </div>
                          <div className="timeline-label">
                            {event.label}
                          </div>

                          {event.value !== undefined && (
                            <div className="timeline-value">
                              {event.value} {event.unit}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">COMMUNICATION</div>
                        <h3>Draft patient check-in</h3>
                      </div>
                      <Languages size={18} />
                    </div>

                    <select
                      value={language}
                      onChange={(event) =>
                        setLanguage(event.target.value)
                      }
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Marathi</option>
                    </select>

                    <button
                      className="primary-button"
                      onClick={generateCheckIn}
                      disabled={checkInLoading}
                    >
                      {checkInLoading
                        ? "Generating…"
                        : "Generate check-in"}
                    </button>

                    {checkIn && (
                      <div className="checkin-box">{checkIn}</div>
                    )}

                    <div className="draft-note">
                      Clinician-editable draft. AegisRx does not
                      autonomously contact patients.
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
