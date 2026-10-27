let pending: string | null = null;
export function setPendingRedirect(path: string | null) { pending = path; }
export function getPendingRedirect() { return pending; }
export function consumePendingRedirect() { const p = pending; pending = null; return p; }