export function validateProjectId(projectId) {
  if (typeof projectId !== "string" || projectId.length === 0) {
    return false;
  }

  return /^[A-Za-z0-9_-]+$/.test(projectId);
}
