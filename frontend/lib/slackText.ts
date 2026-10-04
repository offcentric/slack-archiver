import slackEmojiMap from './slackEmoji.json';

const VISUAL_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'avi', 'mkv']);

// Standard Slack shortcodes, from the iamcal/emoji-data set Slack ships.
const SLACK_EMOJI = slackEmojiMap as Record<string, string>;
const EMOJI_CODE = /:([a-z0-9_+-]+):(?::(skin-tone-[2-6]):)?/g;

const SLACK_TOKEN = /<@([A-Z0-9]+)(?:\|([^>]+))?>|<#([A-Z0-9]+)\|([^>]+)>|<((?:https?:|mailto:)[^|>]+)\|([^>]+)>|<((?:https?:|mailto:)[^>]+)>/g;

export interface SlackTextPart {
    text: string;
    href?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    bull: '•',
    middot: '·',
    copy: '©',
    reg: '®',
    trade: '™',
};

function characterFromCode(code: number, entity: string): string {
    if (!Number.isInteger(code) || code < 0 || code > 0x10FFFF) {
        return entity;
    }
    return String.fromCodePoint(code);
}

function decodeSlack(value: string): string {
    return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, body: string) => {
        if (body.startsWith('#x') || body.startsWith('#X')) {
            return characterFromCode(Number.parseInt(body.slice(2), 16), entity);
        }
        if (body.startsWith('#')) {
            return characterFromCode(Number.parseInt(body.slice(1), 10), entity);
        }
        return NAMED_ENTITIES[body] ?? entity;
    });
}

function replaceEmojiCodes(value: string): string {
    return value.replace(EMOJI_CODE, (match, name: string, tone?: string) => {
        if (tone) {
            return SLACK_EMOJI[`${name}:${tone}`] ?? match;
        }
        return SLACK_EMOJI[name] ?? match;
    });
}

function presentSlack(value: string): string {
    const decoded = decodeSlack(value);
    let out = '';
    let index = 0;
    while (index < decoded.length) {
        if (decoded.startsWith('```', index)) {
            const end = decoded.indexOf('```', index + 3);
            if (end === -1) {
                out += replaceEmojiCodes(decoded.slice(index));
                break;
            }
            out += decoded.slice(index, end + 3);
            index = end + 3;
            continue;
        }
        if (decoded[index] === '`') {
            const end = decoded.indexOf('`', index + 1);
            if (end === -1) {
                out += replaceEmojiCodes(decoded.slice(index));
                break;
            }
            out += decoded.slice(index, end + 1);
            index = end + 1;
            continue;
        }
        const next = decoded.indexOf('`', index);
        const chunk = next === -1 ? decoded.slice(index) : decoded.slice(index, next);
        out += replaceEmojiCodes(chunk);
        index = next === -1 ? decoded.length : next;
    }
    return out;
}

export function slackTextParts(text: string | null | undefined, names: Map<string, string> = new Map()): SlackTextPart[] {
    if (!text) {
        return [];
    }
    const parts: SlackTextPart[] = [];
    let last = 0;
    for (const match of text.matchAll(SLACK_TOKEN)) {
        const index = match.index ?? 0;
        if (index > last) {
            parts.push({text: presentSlack(text.slice(last, index))});
        }
        if (match[1]) {
            parts.push({text: presentSlack(match[2] || names.get(match[1]) || match[1])});
        } else if (match[4]) {
            parts.push({text: `#${presentSlack(match[4])}`});
        } else if (match[5]) {
            parts.push({text: presentSlack(match[6]), href: decodeSlack(match[5])});
        } else if (match[7]) {
            const url = decodeSlack(match[7]);
            parts.push({text: url, href: url});
        }
        last = index + match[0].length;
    }
    if (last < text.length) {
        parts.push({text: presentSlack(text.slice(last))});
    }
    return parts.filter((part) => part.text !== '' || part.href);
}

export function formatSlackText(text: string | null | undefined, names: Map<string, string> = new Map()): string {
    return slackTextParts(text, names).map((part) => part.text).join('');
}

export function highlightTerms(text: string, query: string): Array<{text: string; match: boolean}> {
    const terms = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!text || !terms.length) {
        return [{text, match: false}];
    }
    const pattern = new RegExp(`(${terms.join('|')})`, 'ig');
    return text.split(pattern).filter((part) => part !== '').map((part) => ({
        text: part,
        match: terms.some((term) => new RegExp(`^${term}$`, 'i').test(part)),
    }));
}

export function isVisualFile(file: { mimetype?: string | null; filetype?: string | null }): boolean {
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
        return true;
    }
    return VISUAL_TYPES.has((file.filetype || '').toLowerCase());
}

export function isVideoFile(file: { mimetype?: string | null; filetype?: string | null }): boolean {
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.startsWith('video/')) {
        return true;
    }
    return ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes((file.filetype || '').toLowerCase());
}
