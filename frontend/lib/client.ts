export async function archive<T = Record<string, unknown>>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
    const res = await fetch(`/api/archive/${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({} as T));
    return {ok: res.ok, status: res.status, data};
}
