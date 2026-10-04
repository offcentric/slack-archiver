import {describe, expect, it} from 'vitest';
import {consumeLoginAttempt, reserveCodeSend} from '../../helpers/loginThrottle';

describe('login throttles', () => {
    it('keeps 60 seconds between code sends for one address', () => {
        const email = `person-${Date.now()}@example.com`;
        const start = 1_700_000_000_000;
        expect(reserveCodeSend(email, start)).toBe(0);
        expect(reserveCodeSend(email, start + 10_000)).toBe(50);
        expect(reserveCodeSend(email, start + 60_000)).toBe(0);
    });

    it('blocks a sixth sign-in for the same email within a minute', () => {
        const email = `login-${Date.now()}@example.com`;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            expect(consumeLoginAttempt(email, `198.51.100.${attempt}`)).toBe(0);
        }
        expect(consumeLoginAttempt(email, '198.51.100.99')).toBeGreaterThan(0);
    });

    it('blocks the 21st sign-in from one address within a minute', () => {
        const ip = `203.0.113.${Date.now() % 200}`;
        for (let attempt = 0; attempt < 20; attempt += 1) {
            expect(consumeLoginAttempt(`user-${Date.now()}-${attempt}@example.com`, ip)).toBe(0);
        }
        expect(consumeLoginAttempt(`overflow-${Date.now()}@example.com`, ip)).toBeGreaterThan(0);
    });
});
