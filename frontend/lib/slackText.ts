import slackEmojiMap from './slackEmoji.json';

const VISUAL_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'avi', 'mkv']);

// Standard Slack shortcodes, from the iamcal/emoji-data set Slack ships.
const SLACK_EMOJI = slackEmojiMap as Record<string, string>;
const EMOJI_CODE = /:([a-z0-9_+-]+):(?::(skin-tone-[2-6]):)?/g;

const SLACK_TOKEN = /<@([A-Z0-9]+)(?:\|([^>]+))?>|<#([A-Z0-9]+)\|([^>]+)>|<((?:https?:|mailto:)[^|>]+)\|([^>]+)>|<((?:https?:|mailto:)[^>]+)>/g;

export interface SlackTextPart {
    text: string;
    href?: string;
    mention?: string;
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
    const pattern = new RegExp(SLACK_TOKEN.source, 'g');
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        const index = match.index;
        if (index > last) {
            parts.push({text: presentSlack(text.slice(last, index))});
        }
        if (match[1]) {
            parts.push({text: presentSlack(match[2] || names.get(match[1]) || match[1]), mention: match[1]});
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
    return parts.filter((part) => part.text !== '' || part.href || part.mention);
}

export type SlackNode =
    | {type: 'text'; text: string}
    | {type: 'mention'; id: string; text: string}
    | {type: 'pre'; text: string}
    | {type: 'bold' | 'italic' | 'strike' | 'code' | 'paragraph' | 'quote'; children: SlackNode[]}
    | {type: 'link'; href: string; children: SlackNode[]}
    | {type: 'heading'; level: number; children: SlackNode[]}
    | {type: 'list'; ordered: boolean; items: SlackNode[][]};

const MARKDOWN_LINK = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/;

function boundaryBefore(value: string, index: number): boolean {
    if (index === 0) {
        return true;
    }
    return !/[A-Za-z0-9]/.test(value[index - 1]);
}

function boundaryAfter(value: string, index: number): boolean {
    if (index >= value.length) {
        return true;
    }
    return !/[A-Za-z0-9]/.test(value[index]);
}

function closingIndex(value: string, start: number, marker: string, bounded: boolean): number {
    if (start >= value.length || /\s/.test(value[start])) {
        return -1;
    }
    for (let index = start; index < value.length; index += 1) {
        if (value[index] === '\n') {
            return -1;
        }
        if (!value.startsWith(marker, index)) {
            continue;
        }
        const content = value.slice(start, index);
        if (!content || /\s$/.test(content)) {
            continue;
        }
        const after = index + marker.length;
        if (bounded && !boundaryAfter(value, after)) {
            continue;
        }
        return index;
    }
    return -1;
}

function readSlot(value: string, index: number, slots: SlackNode[]): {node: SlackNode; next: number} | null {
    if (value[index] !== '\uE000') {
        return null;
    }
    const end = value.indexOf('\uE001', index);
    if (end === -1) {
        return null;
    }
    const slot = slots[Number(value.slice(index + 1, end))];
    if (!slot) {
        return null;
    }
    return {node: slot, next: end + 1};
}

function parseInline(value: string, slots: SlackNode[]): SlackNode[] {
    const nodes: SlackNode[] = [];
    let buffer = '';
    let index = 0;
    const flush = () => {
        if (buffer) {
            nodes.push({type: 'text', text: buffer});
            buffer = '';
        }
    };
    while (index < value.length) {
        const slot = readSlot(value, index, slots);
        if (slot) {
            flush();
            nodes.push(slot.node);
            index = slot.next;
            continue;
        }
        const wrapped = wrapAt(value, index);
        if (wrapped) {
            flush();
            if (wrapped.kind === 'code') {
                nodes.push({type: 'code', children: parseSlotsOnly(wrapped.body, slots)});
            } else if (wrapped.kind === 'link') {
                nodes.push({type: 'link', href: wrapped.href, children: parseInline(wrapped.body, slots)});
            } else {
                nodes.push({type: wrapped.kind, children: parseInline(wrapped.body, slots)});
            }
            index = wrapped.next;
            continue;
        }
        buffer += value[index];
        index += 1;
    }
    flush();
    return nodes;
}

function parseSlotsOnly(value: string, slots: SlackNode[]): SlackNode[] {
    const nodes: SlackNode[] = [];
    let buffer = '';
    let index = 0;
    const flush = () => {
        if (buffer) {
            nodes.push({type: 'text', text: buffer});
            buffer = '';
        }
    };
    while (index < value.length) {
        const slot = readSlot(value, index, slots);
        if (slot) {
            flush();
            nodes.push(slot.node);
            index = slot.next;
            continue;
        }
        buffer += value[index];
        index += 1;
    }
    flush();
    return nodes;
}

type Wrap =
    | {kind: 'bold' | 'italic' | 'strike' | 'code'; body: string; next: number}
    | {kind: 'link'; href: string; body: string; next: number};

function wrapAt(value: string, index: number): Wrap | null {
    const link = value.slice(index).match(MARKDOWN_LINK);
    if (link) {
        return {kind: 'link', body: link[1], href: link[2], next: index + link[0].length};
    }
    const candidates: Array<{marker: string; kind: 'bold' | 'italic' | 'strike' | 'code'; bounded: boolean}> = [
        {marker: '**', kind: 'bold', bounded: false},
        {marker: '__', kind: 'bold', bounded: false},
        {marker: '~~', kind: 'strike', bounded: false},
        {marker: '`', kind: 'code', bounded: false},
        {marker: '*', kind: 'bold', bounded: true},
        {marker: '_', kind: 'italic', bounded: true},
        {marker: '~', kind: 'strike', bounded: true},
    ];
    for (const candidate of candidates) {
        if (!value.startsWith(candidate.marker, index)) {
            continue;
        }
        if (candidate.marker === '`' && value.startsWith('```', index)) {
            continue;
        }
        if ((candidate.marker === '*' || candidate.marker === '_') && value.startsWith(candidate.marker + candidate.marker, index)) {
            continue;
        }
        if (candidate.marker === '~' && value.startsWith('~~', index)) {
            continue;
        }
        if (candidate.bounded && !boundaryBefore(value, index)) {
            continue;
        }
        const open = index + candidate.marker.length;
        const close = closingIndex(value, open, candidate.marker, candidate.bounded);
        if (close === -1) {
            continue;
        }
        return {kind: candidate.kind, body: value.slice(open, close), next: close + candidate.marker.length};
    }
    return null;
}

function isBlockStart(line: string): boolean {
    return /^> ?/.test(line) || /^[-*]\s+\S/.test(line) || /^\d+\.\s+\S/.test(line) || /^#{1,3}\s+\S/.test(line);
}

function parseFlow(value: string, slots: SlackNode[]): SlackNode[] {
    const lines = value.split('\n');
    const nodes: SlackNode[] = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '') {
            index += 1;
            continue;
        }
        if (/^> ?/.test(line)) {
            const quoted: string[] = [];
            while (index < lines.length && /^> ?/.test(lines[index])) {
                quoted.push(lines[index].replace(/^> ?/, ''));
                index += 1;
            }
            nodes.push({type: 'quote', children: parseInline(quoted.join('\n'), slots)});
            continue;
        }
        if (/^[-*]\s+\S/.test(line)) {
            const items: SlackNode[][] = [];
            while (index < lines.length && /^[-*]\s+\S/.test(lines[index])) {
                items.push(parseInline(lines[index].replace(/^[-*]\s+/, ''), slots));
                index += 1;
            }
            nodes.push({type: 'list', ordered: false, items});
            continue;
        }
        if (/^\d+\.\s+\S/.test(line)) {
            const items: SlackNode[][] = [];
            while (index < lines.length && /^\d+\.\s+\S/.test(lines[index])) {
                items.push(parseInline(lines[index].replace(/^\d+\.\s+/, ''), slots));
                index += 1;
            }
            nodes.push({type: 'list', ordered: true, items});
            continue;
        }
        const heading = /^(#{1,3})\s+(\S.*)$/.exec(line);
        if (heading) {
            nodes.push({type: 'heading', level: heading[1].length, children: parseInline(heading[2], slots)});
            index += 1;
            continue;
        }
        const paragraph: string[] = [];
        while (index < lines.length && lines[index].trim() !== '' && !isBlockStart(lines[index])) {
            paragraph.push(lines[index]);
            index += 1;
        }
        nodes.push({type: 'paragraph', children: parseInline(paragraph.join('\n'), slots)});
    }
    return nodes;
}

function protectTokens(value: string, names: Map<string, string>): {text: string; slots: SlackNode[]} {
    const slots: SlackNode[] = [];
    const pattern = new RegExp(SLACK_TOKEN.source, 'g');
    let text = '';
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
        text += value.slice(last, match.index);
        if (match[1]) {
            slots.push({type: 'mention', id: match[1], text: presentSlack(match[2] || names.get(match[1]) || match[1])});
        } else if (match[4]) {
            slots.push({type: 'text', text: `#${presentSlack(match[4])}`});
        } else if (match[5]) {
            slots.push({type: 'link', href: decodeSlack(match[5]), children: parseInline(presentSlack(match[6]), [])});
        } else if (match[7]) {
            const url = decodeSlack(match[7]);
            slots.push({type: 'link', href: url, children: [{type: 'text', text: url}]});
        }
        text += `\uE000${slots.length - 1}\uE001`;
        last = match.index + match[0].length;
    }
    text += value.slice(last);
    return {text, slots};
}

function parseFlowSegment(value: string, names: Map<string, string>): SlackNode[] {
    const protectedText = protectTokens(value, names);
    return parseFlow(presentSlack(protectedText.text), protectedText.slots);
}

export function parseSlackMessage(text: string | null | undefined, names: Map<string, string> = new Map()): SlackNode[] {
    if (!text) {
        return [];
    }
    const nodes: SlackNode[] = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('```', index)) {
            const end = text.indexOf('```', index + 3);
            if (end === -1) {
                nodes.push(...parseFlowSegment(text.slice(index), names));
                break;
            }
            let body = text.slice(index + 3, end).replace(/^\n/, '').replace(/\n$/, '');
            nodes.push({type: 'pre', text: decodeSlack(body)});
            index = end + 3;
            if (text[index] === '\n') {
                index += 1;
            }
            continue;
        }
        const next = text.indexOf('```', index);
        const chunk = next === -1 ? text.slice(index) : text.slice(index, next);
        nodes.push(...parseFlowSegment(chunk, names));
        index = next === -1 ? text.length : next;
    }
    return nodes;
}

function nodeToText(node: SlackNode): string {
    switch (node.type) {
        case 'text':
        case 'mention':
        case 'pre':
            return node.text;
        case 'list':
            return node.items.map((item) => item.map(nodeToText).join('')).join('\n');
        default:
            return node.children.map(nodeToText).join('');
    }
}

export function formatSlackText(text: string | null | undefined, names: Map<string, string> = new Map()): string {
    return parseSlackMessage(text, names).map(nodeToText).join('\n');
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
