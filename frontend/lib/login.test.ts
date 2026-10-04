import {describe, expect, it} from 'vitest';
import {isEmail, loginErrorMessage, sendCodeOutcome, sessionOutcome, sessionUnavailableMessage} from './login';
import {onlyWorkspace} from './types';
import {buildMessageListBody, userIdsForFilter} from './messages';
import {formatSlackText} from './slackText';

describe('login', () => {
    it('hides every send-code failure except a server error', () => {
        expect(sendCodeOutcome(200)).toBe('continue');
        expect(sendCodeOutcome(400)).toBe('continue');
        expect(sendCodeOutcome(404)).toBe('continue');
        expect(sendCodeOutcome(500)).toBe('unavailable');
        expect(sendCodeOutcome(503)).toBe('unavailable');
    });

    it('explains a bad one-time code', () => {
        expect(loginErrorMessage(401, 'auth_fail')).toMatch(/incorrect or has expired/);
        expect(loginErrorMessage(400, 'invalid_code_format')).toMatch(/6-digit/);
        expect(loginErrorMessage(500)).toMatch(/unavailable/);
    });

    it('separates a missing session from a broken archive API', () => {
        expect(sessionOutcome(200, {userData: {id: 1}})).toBe('ok');
        expect(sessionOutcome(401, {message: 'auth_fail'})).toBe('unauthenticated');
        expect(sessionOutcome(200, {status: 'logged_out', success: true})).toBe('unauthenticated');
        expect(sessionOutcome(404, {error: true, code: 404})).toBe('unavailable');
        expect(sessionOutcome(500, {})).toBe('unavailable');
        expect(sessionOutcome(200, {})).toBe('unavailable');
        expect(sessionUnavailableMessage()).toBe('The archive server ran into a problem. Try again in a moment.');
    });

    it('checks a basic email shape', () => {
        expect(isEmail('a@b.c')).toBe(true);
        expect(isEmail('not-an-email')).toBe(false);
    });
});

describe('workspace selection', () => {
    it('skips the picker when the account has one workspace', () => {
        expect(onlyWorkspace({
            id: 1,
            email: 'a@b.c',
            role: 1,
            workspaces: [{workspace: 'acme', uid: null, name: null, real_name: 'Ada'}],
        })).toBe('acme');
        expect(onlyWorkspace({
            id: 1,
            email: 'a@b.c',
            role: 1,
            workspaces: [
                {workspace: 'acme', uid: null, name: null, real_name: null},
                {workspace: 'beta', uid: null, name: null, real_name: null},
            ],
        })).toBeNull();
    });
});

describe('message list requests', () => {
    it('always sends the workspace and channel, and keeps draft text out until applied', () => {
        const body = buildMessageListBody({
            workspace: 'acme',
            channel: 'general',
            page: 2,
            orderBy: ['datetime', 'desc'],
            filters: {text: 'deploy', user: 'U123', dateFrom: '2026-01-01', dateTo: '2026-01-31'},
            userIds: ['U123'],
        });
        expect(body).toMatchObject({
            workspace: 'acme',
            channel: 'general',
            _page: 2,
            _orderby: ['datetime', 'desc'],
            text: 'deploy',
            user: ['U123'],
            date_from: '2026-01-01',
            date_to: '2026-01-31',
        });
        const open = buildMessageListBody({
            workspace: 'acme',
            channel: 'general',
            page: 1,
            orderBy: ['ts', 'desc'],
            filters: {text: '', user: '', dateFrom: '', dateTo: ''},
        });
        expect(open).not.toHaveProperty('date_from');
        expect(open).not.toHaveProperty('date_to');
    });

    it('maps an author name to Slack ids and misses to an empty result', () => {
        const people = [{uid: 'U1', name: 'ada', real_name: 'Ada Lovelace'}];
        expect(userIdsForFilter('ada', people)).toEqual(['U1']);
        expect(userIdsForFilter('U999', people)).toEqual(['U999']);
        expect(userIdsForFilter('nobody', people)).toEqual(['__none__']);
        expect(userIdsForFilter('  ', people)).toBeUndefined();
    });
});

describe('slack text', () => {
    it('turns mentions into names', () => {
        const names = new Map([['U1', 'Ada']]);
        expect(formatSlackText('hi <@U1> see <#C1|general>', names)).toBe('hi Ada see #general');
    });
});
