export function sendCodeOutcome(status: number): 'continue' | 'unavailable' | 'limited' {
    if (status === 429) {
        return 'limited';
    }
    return status >= 500 ? 'unavailable' : 'continue';
}

export function loginErrorMessage(status: number, apiMessage?: string): string {
    if (status === 429 || apiMessage === 'rate_limited') {
        return 'Too many sign-in attempts. Wait a minute and try again.';
    }
    if (status >= 500) {
        return 'The archive is unavailable right now. Try again in a moment.';
    }
    if (apiMessage === 'invalid_code_format') {
        return 'Enter the 6-digit code from your email.';
    }
    return 'That code is incorrect or has expired. Request a new code and try again.';
}

export type SessionOutcome = 'ok' | 'unauthenticated' | 'unavailable';

/**
 * The API answers an unknown Bearer session with HTTP 200 `{status: 'logged_out'}`
 * rather than 401, and an API build that predates `/user/getuserdata` answers 404.
 * Only the first two mean "not logged in"; anything else is an API problem and must
 * not be mistaken for a missing session.
 */
export function sessionOutcome(status: number, data: unknown): SessionOutcome {
    const body = (data && typeof data === 'object' ? data : {}) as {userData?: unknown; status?: unknown};
    if (status === 200 && body.userData) {
        return 'ok';
    }
    if (status === 401 || (status === 200 && body.status === 'logged_out')) {
        return 'unauthenticated';
    }
    return 'unavailable';
}

export function sessionUnavailableMessage(): string {
    return 'The archive server ran into a problem. Try again in a moment.';
}

export function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
