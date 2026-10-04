import {applyRange, DateRange} from './dateRange';
import {ArchiveMessage, SlackUser} from './types';
import {queryValue, QuerySource} from './viewQuery';

export const PAGE_SIZE = 40;

export interface MessageFilters extends DateRange {
    text: string;
    user: string;
}

export const emptyFilters = (): MessageFilters => ({text: '', user: '', dateFrom: '', dateTo: ''});

export function messageFiltersFromQuery(source: QuerySource): MessageFilters {
    return {
        text: queryValue(source, 'text'),
        user: queryValue(source, 'user'),
        dateFrom: queryValue(source, 'from'),
        dateTo: queryValue(source, 'to'),
    };
}

export function sameFilters(left: MessageFilters, right: MessageFilters): boolean {
    return left.text === right.text && left.user === right.user && left.dateFrom === right.dateFrom && left.dateTo === right.dateTo;
}

export function buildMessageListBody(input: {
    workspace: string;
    channel: string;
    page: number;
    limit?: number;
    orderBy: [string, 'asc' | 'desc'];
    filters: MessageFilters;
    userIds?: string[];
}) {
    const body: Record<string, unknown> = {
        workspace: input.workspace,
        channel: input.channel,
        _limit: input.limit ?? PAGE_SIZE,
        _page: input.page,
        _orderby: input.orderBy,
    };
    const text = input.filters.text.trim();
    if (text) {
        body.text = text;
    }
    if (input.userIds?.length) {
        body.user = input.userIds;
    }
    return applyRange(body, input.filters);
}

export function userIdsForFilter(query: string, people: SlackUser[]): string[] | undefined {
    const trimmed = query.trim();
    if (!trimmed) {
        return undefined;
    }
    if (/^U[A-Z0-9]+$/.test(trimmed)) {
        return [trimmed];
    }
    const needle = trimmed.toLowerCase();
    const matches = people.filter((person) => {
        return (person.real_name || '').toLowerCase().includes(needle)
            || (person.name || '').toLowerCase().includes(needle);
    });
    if (!matches.length) {
        return ['__none__'];
    }
    return matches.map((person) => person.uid).filter(Boolean);
}

export function authorName(message: ArchiveMessage, people: Map<string, string>): string {
    const slackuser = Array.isArray(message.slackuser) ? message.slackuser[0] : null;
    return slackuser?.real_name || slackuser?.name || (message.user ? people.get(message.user) : '') || message.user || 'Unknown';
}

export function formatWhen(value?: string | null): string {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(date);
}

export function messagePath(workspace: string, ts: string): string {
    return `/w/${encodeURIComponent(workspace)}/messages/${encodeURIComponent(ts)}`;
}

export function channelMessagesPath(workspace: string, channel: string): string {
    return `/w/${encodeURIComponent(workspace)}/messages?channel=${encodeURIComponent(channel)}`;
}

export function mediaPath(workspace: string, id: number): string {
    return `/w/${encodeURIComponent(workspace)}/media/${id}`;
}

export function truncate(value: string, length = 160): string {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (clean.length <= length) {
        return clean;
    }
    return `${clean.slice(0, length - 1)}…`;
}

export function itemsOf<T>(data: unknown): T[] {
    if (Array.isArray(data)) {
        return data as T[];
    }
    if (data && typeof data === 'object' && Array.isArray((data as {items?: T[]}).items)) {
        return (data as {items: T[]}).items;
    }
    return [];
}
