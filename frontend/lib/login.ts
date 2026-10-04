export function sendCodeOutcome(status: number): 'continue' | 'unavailable' {
    return status >= 500 ? 'unavailable' : 'continue';
}

export function loginErrorMessage(status: number, apiMessage?: string): string {
    if (status >= 500) {
        return 'The archive is unavailable right now. Try again in a moment.';
    }
    if (apiMessage === 'invalid_code_format') {
        return 'Enter the 6-digit code from your email.';
    }
    return 'That code is incorrect or has expired. Request a new code and try again.';
}

export function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
