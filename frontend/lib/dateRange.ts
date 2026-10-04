export interface DateRange {
    dateFrom: string;
    dateTo: string;
}

export const FIRST_ARCHIVE_YEAR = 2013;

export const emptyRange = (): DateRange => ({dateFrom: '', dateTo: ''});

export function yearOptions(now = new Date()): number[] {
    const current = now.getFullYear();
    const years: number[] = [];
    for (let year = current; year >= FIRST_ARCHIVE_YEAR; year -= 1) {
        years.push(year);
    }
    return years;
}

export function rangeForYear(year: number | string): DateRange {
    const value = String(year);
    return {dateFrom: `${value}-01-01`, dateTo: `${value}-12-31`};
}

export function yearOfRange(range: DateRange): string {
    const match = /^(\d{4})-01-01$/.exec(range.dateFrom);
    if (match && range.dateTo === `${match[1]}-12-31`) {
        return match[1];
    }
    return '';
}

export function applyRange(body: Record<string, unknown>, range: DateRange): Record<string, unknown> {
    if (range.dateFrom) {
        body.date_from = range.dateFrom;
    }
    if (range.dateTo) {
        body.date_to = range.dateTo;
    }
    return body;
}
