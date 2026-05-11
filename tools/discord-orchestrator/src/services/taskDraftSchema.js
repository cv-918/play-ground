const CATEGORY_VALUES = new Set(["WF", "GAME", "DOC", "VAL", "UNITY"]);
const PRIORITY_VALUES = new Set(["P0", "P1", "P2", "P3"]);
const RISK_VALUES = new Set(["low", "medium", "high"]);
const KIND_VALUES = new Set([
  "automation",
  "implementation",
  "documentation",
  "validation",
  "maintenance",
  "game",
  "data",
  "refactoring",
  "prototype",
  "workflow",
  "architecture",
  "unity",
  "release",
]);

export const TASK_DRAFT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "category",
    "priority",
    "kind",
    "reason",
    "suggested_risk",
    "workflow_path",
    "recommended_roles",
    "human_decision_gates",
    "required_validation",
    "suggested_next_manual_action",
    "clarifying_questions",
    "confidence",
  ],
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: [...CATEGORY_VALUES] },
    priority: { type: "string", enum: [...PRIORITY_VALUES] },
    kind: { type: "string", enum: [...KIND_VALUES] },
    reason: { type: "string" },
    suggested_risk: { type: "string", enum: [...RISK_VALUES] },
    workflow_path: { type: "string" },
    recommended_roles: {
      type: "array",
      items: { type: "string" },
    },
    human_decision_gates: {
      type: "array",
      items: { type: "string" },
    },
    required_validation: {
      type: "array",
      items: { type: "string" },
    },
    suggested_next_manual_action: { type: "string" },
    clarifying_questions: {
      type: "array",
      items: { type: "string" },
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
});

export function validateTaskDraft(value) {
  const errors = [];
  const draft = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!draft) {
    return { ok: false, errors: ["TaskDraft must be an object."] };
  }

  const normalized = {
    title: normalizeText(draft.title),
    category: normalizeText(draft.category).toUpperCase(),
    priority: normalizeText(draft.priority).toUpperCase(),
    kind: normalizeText(draft.kind).toLowerCase(),
    reason: normalizeText(draft.reason),
    suggested_risk: normalizeText(draft.suggested_risk).toLowerCase(),
    workflow_path: normalizeText(draft.workflow_path),
    recommended_roles: normalizeStringArray(draft.recommended_roles),
    human_decision_gates: normalizeStringArray(draft.human_decision_gates),
    required_validation: normalizeStringArray(draft.required_validation),
    suggested_next_manual_action: normalizeText(draft.suggested_next_manual_action),
    clarifying_questions: normalizeStringArray(draft.clarifying_questions),
    confidence: normalizeConfidence(draft.confidence),
  };

  requireText(normalized.title, "title", errors);
  requireText(normalized.reason, "reason", errors);
  requireText(normalized.workflow_path, "workflow_path", errors);
  requireText(normalized.suggested_next_manual_action, "suggested_next_manual_action", errors);

  if (!CATEGORY_VALUES.has(normalized.category)) {
    errors.push(`Invalid category: ${normalized.category || "(empty)"}`);
  }
  if (!PRIORITY_VALUES.has(normalized.priority)) {
    errors.push(`Invalid priority: ${normalized.priority || "(empty)"}`);
  }
  if (!KIND_VALUES.has(normalized.kind)) {
    errors.push(`Invalid kind: ${normalized.kind || "(empty)"}`);
  }
  if (!RISK_VALUES.has(normalized.suggested_risk)) {
    errors.push(`Invalid suggested_risk: ${normalized.suggested_risk || "(empty)"}`);
  }
  if (normalized.recommended_roles.length === 0) {
    errors.push("recommended_roles must contain at least one item.");
  }
  if (normalized.human_decision_gates.length === 0) {
    errors.push("human_decision_gates must contain at least one item.");
  }
  if (normalized.required_validation.length === 0) {
    errors.push("required_validation must contain at least one item.");
  }
  if (!Number.isFinite(normalized.confidence) || normalized.confidence < 0 || normalized.confidence > 1) {
    errors.push("confidence must be a number between 0 and 1.");
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, draft: normalized };
}

function requireText(value, fieldName, errors) {
  if (!value) {
    errors.push(`Missing required field: ${fieldName}`);
  }
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map(normalizeText).filter(Boolean))];
}

function normalizeConfidence(value) {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
