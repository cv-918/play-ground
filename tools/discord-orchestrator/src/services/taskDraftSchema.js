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
const TASK_DRAFT_FIELD_NAMES = new Set([
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
]);

export const TASK_DRAFT_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "AIWorkflow TaskDraft",
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
    title: { type: "string", minLength: 1 },
    category: { type: "string", enum: [...CATEGORY_VALUES] },
    priority: { type: "string", enum: [...PRIORITY_VALUES] },
    kind: { type: "string", enum: [...KIND_VALUES] },
    reason: { type: "string", minLength: 1 },
    suggested_risk: { type: "string", enum: [...RISK_VALUES] },
    workflow_path: { type: "string", minLength: 1 },
    recommended_roles: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    human_decision_gates: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    required_validation: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    suggested_next_manual_action: { type: "string", minLength: 1 },
    clarifying_questions: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
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

  const unknownFields = Object.keys(draft).filter((fieldName) => !TASK_DRAFT_FIELD_NAMES.has(fieldName));
  if (unknownFields.length > 0) {
    errors.push(`Unknown TaskDraft field(s): ${unknownFields.join(", ")}`);
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
  requireStringArray(draft.recommended_roles, "recommended_roles", errors, { allowEmpty: false });
  requireStringArray(draft.human_decision_gates, "human_decision_gates", errors, { allowEmpty: false });
  requireStringArray(draft.required_validation, "required_validation", errors, { allowEmpty: false });
  requireStringArray(draft.clarifying_questions, "clarifying_questions", errors, { allowEmpty: true });

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
  if (typeof draft.confidence !== "number") {
    errors.push("confidence must be a JSON number between 0 and 1.");
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

function requireStringArray(value, fieldName, errors, options = {}) {
  const allowEmpty = options.allowEmpty === true;
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return;
  }
  if (!allowEmpty && value.length === 0) {
    errors.push(`${fieldName} must contain at least one item.`);
  }
  const invalidItems = value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item !== "string" || !normalizeText(item));
  if (invalidItems.length > 0) {
    const indexes = invalidItems.map(({ index }) => index).join(", ");
    errors.push(`${fieldName} must contain only non-empty strings. Invalid index(es): ${indexes}`);
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
