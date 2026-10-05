import {describe, expect, it} from 'vitest';
import {slackUserSaveRow} from '../../models/slackuser';

describe('slack user save row', () => {
    it('keeps Slack’s string id out of the integer primary key', () => {
        const row = slackUserSaveRow({
            id: 'U01DGEKUFBJ',
            team_id: 'T123',
            name: 'mistermark77',
            real_name: 'Mark Mulder',
            is_bot: false,
            profile: {email: 'a@b.c', real_name: 'Mark Mulder', image_72: 'https://example.com/a.png'},
            is_admin: true,
            updated: 1710000000,
        }, 'beacyclinghero');

        expect(row).toEqual({
            uid: 'U01DGEKUFBJ',
            workspace: 'beacyclinghero',
            team_id: 'T123',
            name: 'mistermark77',
            real_name: 'Mark Mulder',
            is_bot: false,
        });
        expect(row).not.toHaveProperty('id');
        expect(row).not.toHaveProperty('profile');
    });

    it('falls back to the profile name', () => {
        expect(slackUserSaveRow({id: 'U2', profile: {real_name: 'Ada'}}, 'acme').real_name).toBe('Ada');
    });
});
