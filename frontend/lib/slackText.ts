const VISUAL_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'avi', 'mkv']);

export function formatSlackText(text: string | null | undefined, names: Map<string, string> = new Map()): string {
    if (!text) {
        return '';
    }
    return text
        .replace(/<@([A-Z0-9]+)(?:\|([^>]+))?>/g, (_match, id: string, label?: string) => label || names.get(id) || id)
        .replace(/<#[A-Z0-9]+\|([^>]+)>/g, (_match, name: string) => `#${name}`)
        .replace(/<(https?:[^|>]+)\|([^>]+)>/g, (_match, _url: string, label: string) => label)
        .replace(/<(https?:[^>]+)>/g, (_match, url: string) => url);
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
