import {del, get, set} from './cache';

export const CODE_COOLDOWN_SECONDS = 60;
export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_IP_LIMIT = 20;
export const LOGIN_WINDOW_SECONDS = 60;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function reserveCodeSend(email: string, now = Date.now()): number {
    const key = `login_code_sent_${normalizeEmail(email)}`;
    const sentAt = get(key);
    if (typeof sentAt === 'number') {
        const remaining = Math.ceil(CODE_COOLDOWN_SECONDS - (now - sentAt) / 1000);
        if (remaining > 0) {
            return remaining;
        }
    }
    set(key, now, CODE_COOLDOWN_SECONDS);
    return 0;
}

export async function clearCodeCooldown(email: string) {
    await del(`login_code_sent_${normalizeEmail(email)}`);
}

interface Allowance {
    count: number;
    since: number;
}

export function consumeAllowance(cacheKey: string, limit: number, windowSeconds: number, now = Date.now()): {allowed: boolean; retryAfter: number} {
    const current = get(cacheKey) as Allowance | false;
    const fresh = !current || typeof current !== 'object' || now - current.since >= windowSeconds * 1000;
    if (fresh) {
        set(cacheKey, {count: 1, since: now}, windowSeconds);
        return {allowed: true, retryAfter: 0};
    }
    const retryAfter = Math.max(1, Math.ceil((current.since + windowSeconds * 1000 - now) / 1000));
    if (current.count >= limit) {
        return {allowed: false, retryAfter};
    }
    const elapsed = (now - current.since) / 1000;
    set(cacheKey, {count: current.count + 1, since: current.since}, Math.max(1, Math.ceil(windowSeconds - elapsed)));
    return {allowed: true, retryAfter: 0};
}

export function consumeLoginAttempt(email: string, ip: string): number {
    const byEmail = consumeAllowance(`login_email_${normalizeEmail(email)}`, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_SECONDS);
    const byIp = consumeAllowance(`login_ip_${ip || 'unknown'}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SECONDS);
    if (byEmail.allowed && byIp.allowed) {
        return 0;
    }
    return Math.max(byEmail.retryAfter, byIp.retryAfter);
}
