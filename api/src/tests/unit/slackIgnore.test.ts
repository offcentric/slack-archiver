import {afterEach, describe, expect, it} from 'vitest';
import {ignoredSlackUserIds, isIgnoredSlackUser} from '../../helpers/slackIgnore';

const KEY = 'SLACK_IGNORED_USERS_BEACYCLINGHERO';

afterEach(() => {
    delete process.env[KEY];
});

describe('ignored Slack users', () => {
    it('reads a comma-separated list of user ids for the workspace', () => {
        process.env[KEY] = 'USLACKBOT, U123 ,';
        expect([...ignoredSlackUserIds('beacyclinghero')]).toEqual(['USLACKBOT', 'U123']);
        expect(isIgnoredSlackUser('beacyclinghero', 'USLACKBOT')).toBe(true);
        expect(isIgnoredSlackUser('beacyclinghero', 'U999')).toBe(false);
        expect(isIgnoredSlackUser('beacyclinghero', null)).toBe(false);
        expect(isIgnoredSlackUser('other', 'USLACKBOT')).toBe(false);
    });
});
