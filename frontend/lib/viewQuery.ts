export interface QuerySource {
    get(name: string): string | null;
    toString(): string;
}

export function queryValue(source: QuerySource, key: string): string {
    return source.get(key)?.trim() || '';
}

export function queryPage(source: QuerySource): number {
    const page = Number(source.get('page'));
    return Number.isInteger(page) && page > 1 ? page : 1;
}

export function hrefWith(pathname: string, current: QuerySource, updates: Record<string, string | number | null | undefined>): string {
    const next = new URLSearchParams(current.toString());
    for (const [key, value] of Object.entries(updates)) {
        const text = value === undefined || value === null ? '' : String(value).trim();
        if (!text || (key === 'page' && text === '1')) {
            next.delete(key);
        } else {
            next.set(key, text);
        }
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
}
