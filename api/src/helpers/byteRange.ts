export interface ByteRange {
    start: number;
    end: number;
}

export type RangeResult =
    | {kind: 'full'}
    | {kind: 'partial'; range: ByteRange}
    | {kind: 'unsatisfiable'};

/**
 * Parses a single HTTP byte range against a file of `size` bytes.
 * Multi-range requests fall back to the full body, which browsers accept.
 */
export function parseByteRange(header: string | string[] | undefined, size: number): RangeResult {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || size <= 0) {
        return {kind: 'full'};
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
    if (!match) {
        return {kind: 'full'};
    }
    const [, startRaw, endRaw] = match;
    if (startRaw === '' && endRaw === '') {
        return {kind: 'full'};
    }
    let start: number;
    let end: number;
    if (startRaw === '') {
        const suffix = Number(endRaw);
        if (suffix === 0) {
            return {kind: 'unsatisfiable'};
        }
        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(startRaw);
        end = endRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || start > end) {
        return {kind: 'unsatisfiable'};
    }
    return {kind: 'partial', range: {start, end}};
}
