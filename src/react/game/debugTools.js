export const QA_TOOLS_STORAGE_KEY = "student-react-qa-tools-v1";

export function qaToolsEnabled() {
  if (!import.meta.env.PROD) return true;

  try {
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get("qaTools") === "1") return true;
    return globalThis.localStorage.getItem(QA_TOOLS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function autoBattlePausedForQa() {
  try {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("pauseAutoBattle") === "1";
  } catch {
    return false;
  }
}
