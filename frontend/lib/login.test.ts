import {describe, expect, it} from 'vitest';
import {isEmail, loginErrorMessage, sendCodeOutcome, sessionOutcome, sessionUnavailableMessage} from './login';
import {onlyWorkspace} from './types';
import {buildMessageListBody, formatWhen, messagesByUserPath, userIdsForFilter} from './messages';
import {formatSlackText, highlightTerms, parseSlackMessage, slackTextParts} from './slackText';

describe('login', () => {
    it('hides every send-code failure except a server error', () => {
        expect(sendCodeOutcome(200)).toBe('continue');
        expect(sendCodeOutcome(400)).toBe('continue');
        expect(sendCodeOutcome(404)).toBe('continue');
        expect(sendCodeOutcome(429)).toBe('limited');
        expect(sendCodeOutcome(500)).toBe('unavailable');
        expect(sendCodeOutcome(503)).toBe('unavailable');
    });

    it('explains a bad one-time code', () => {
        expect(loginErrorMessage(401, 'auth_fail')).toMatch(/incorrect or has expired/);
        expect(loginErrorMessage(400, 'invalid_code_format')).toMatch(/6-digit/);
        expect(loginErrorMessage(429, 'rate_limited')).toMatch(/Too many sign-in attempts/);
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
        const everywhere = buildMessageListBody({
            workspace: 'acme',
            channel: '*',
            page: 1,
            orderBy: ['ts', 'desc'],
            filters: {text: '', user: '', dateFrom: '', dateTo: ''},
            userIds: ['U1'],
        });
        expect(everywhere).not.toHaveProperty('channel');
        expect(everywhere).toMatchObject({workspace: 'acme', user: ['U1']});
    });

    it('maps an author name to Slack ids and misses to an empty result', () => {
        const people = [{uid: 'U1', name: 'ada', real_name: 'Ada Lovelace'}];
        expect(userIdsForFilter('ada', people)).toEqual(['U1']);
        expect(userIdsForFilter('U999', people)).toEqual(['U999']);
        expect(userIdsForFilter('nobody', people)).toEqual(['__none__']);
        expect(userIdsForFilter('  ', people)).toBeUndefined();
    });

    it('links a person to the message list filtered by them', () => {
        expect(messagesByUserPath('acme', 'U1', 'general')).toBe('/w/acme/messages?channel=general&user=U1');
        expect(messagesByUserPath('acme', 'U1')).toBe('/w/acme/messages?user=U1');
    });

    it('shows the clock in 24-hour form', () => {
        const value = '2026-09-24T16:09:00Z';
        const date = new Date(value);
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const formatted = formatWhen(value);
        expect(formatted).toContain(`${hour}:${minute}`);
        expect(formatted).not.toMatch(/\b(AM|PM)\b/);
    });
});

describe('slack text', () => {
    it('turns mentions into names', () => {
        const names = new Map([['U1', 'Ada']]);
        expect(formatSlackText('hi <@U1> see <#C1|general>', names)).toBe('hi Ada see #general');
        expect(slackTextParts('yes, <@U01DGEKUFBJ> this', new Map([['U01DGEKUFBJ', 'mark']]))).toEqual([
            {text: 'yes, '},
            {text: 'mark', mention: 'U01DGEKUFBJ'},
            {text: ' this'},
        ]);
        expect(slackTextParts('<@U404>')).toEqual([{text: 'U404', mention: 'U404'}]);
    });

    it('turns a Slack link into a labeled hyperlink', () => {
        expect(slackTextParts('see <https://slack.offcentric.com/|slack.offcentric.com> today')).toEqual([
            {text: 'see '},
            {text: 'slack.offcentric.com', href: 'https://slack.offcentric.com/'},
            {text: ' today'},
        ]);
        expect(slackTextParts('go to <https://example.com/a?b=1&amp;c=2>')).toEqual([
            {text: 'go to '},
            {text: 'https://example.com/a?b=1&c=2', href: 'https://example.com/a?b=1&c=2'},
        ]);
        expect(formatSlackText('1 &lt; 2 &amp; 3 &quot;hi&quot; &#39;there&#39;')).toBe('1 < 2 & 3 "hi" \'there\'');
    });

    it('turns standard Slack emoji shortcodes into characters', () => {
        expect(formatSlackText('nice :thumbsup: and :+1:')).toBe('nice 👍 and 👍');
        expect(formatSlackText('yes :thumbsup::skin-tone-3:')).toBe('yes 👍🏼');
        expect(formatSlackText('ship :rocket:')).toBe('ship 🚀');
        expect(formatSlackText('keep :not_a_real_emoji: and `:thumbsup:`')).toBe('keep :not_a_real_emoji: and :thumbsup:');
        expect(slackTextParts('see <https://example.com/:thumbsup:|ok :heart:>')).toEqual([
            {text: 'see '},
            {text: 'ok ❤️', href: 'https://example.com/:thumbsup:'},
        ]);
    });

    it('renders Slack markdown and leaves snake_case alone', () => {
        expect(parseSlackMessage('*Task created* by Ada')).toEqual([
            {type: 'paragraph', children: [
                {type: 'bold', children: [{type: 'text', text: 'Task created'}]},
                {type: 'text', text: ' by Ada'},
            ]},
        ]);
        expect(parseSlackMessage('dates **Exactly: 06/07**')).toEqual([
            {type: 'paragraph', children: [
                {type: 'text', text: 'dates '},
                {type: 'bold', children: [{type: 'text', text: 'Exactly: 06/07'}]},
            ]},
        ]);
        expect(parseSlackMessage('refreshUrl: _string_')).toEqual([
            {type: 'paragraph', children: [
                {type: 'text', text: 'refreshUrl: '},
                {type: 'italic', children: [{type: 'text', text: 'string'}]},
            ]},
        ]);
        expect(formatSlackText('postbooking_webhook_failed')).toBe('postbooking_webhook_failed');
        expect(formatSlackText('~no longer true~')).toBe('no longer true');
        expect(parseSlackMessage('use `npm test`')).toEqual([
            {type: 'paragraph', children: [
                {type: 'text', text: 'use '},
                {type: 'code', children: [{type: 'text', text: 'npm test'}]},
            ]},
        ]);
        expect(parseSlackMessage('```\n/user/getbookings\n```')).toEqual([
            {type: 'pre', text: '/user/getbookings'},
        ]);
        expect(parseSlackMessage('> quoted\n- one\n- two')).toEqual([
            {type: 'quote', children: [{type: 'text', text: 'quoted'}]},
            {type: 'list', ordered: false, items: [[{type: 'text', text: 'one'}], [{type: 'text', text: 'two'}]]},
        ]);
        expect(parseSlackMessage('see [docs](https://example.com/docs)')).toEqual([
            {type: 'paragraph', children: [
                {type: 'text', text: 'see '},
                {type: 'link', href: 'https://example.com/docs', children: [{type: 'text', text: 'docs'}]},
            ]},
        ]);
        expect(parseSlackMessage('*<@U01DGEKUFBJ>*', new Map([['U01DGEKUFBJ', 'mark']]))).toEqual([
            {type: 'paragraph', children: [
                {type: 'bold', children: [{type: 'mention', id: 'U01DGEKUFBJ', text: 'mark'}]},
            ]},
        ]);
    });

    it('marks only the searched words', () => {
        expect(highlightTerms('Deploy the deploy script', 'deploy')).toEqual([
            {text: 'Deploy', match: true},
            {text: ' the ', match: false},
            {text: 'deploy', match: true},
            {text: ' script', match: false},
        ]);
        expect(highlightTerms('nothing here', 'deploy').every((part) => !part.match)).toBe(true);
    });
});
