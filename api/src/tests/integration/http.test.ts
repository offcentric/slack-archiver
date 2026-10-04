import request from 'supertest';
import {beforeAll, describe, expect, it} from 'vitest';

describe('HTTP integration', () => {
    let app;

    beforeAll(async () => {
        const server = await import('../../server');
        app = server.app;
    });

    it('GET /health returns ok without a session', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({status: 'ok'});
    });

    it('POST /user/sendlogincode without an email is a 400', async () => {
        const res = await request(app).post('/user/sendlogincode').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('missing_required_fields');
    });

    it('POST /message/list without a session is unauthorized', async () => {
        const res = await request(app).post('/message/list').send({workspace: 'acme', channel: 'general'});
        expect(res.status).toBe(401);
    });

    it('POST /message/search without a session is unauthorized', async () => {
        const res = await request(app).post('/message/search').send({q: 'hello'});
        expect(res.status).toBe(401);
    });

    it('GET /file/content/:id without a session is unauthorized', async () => {
        const res = await request(app).get('/file/content/12');
        expect(res.status).toBe(401);
    });

    it('POST /admin/sync without a session is unauthorized', async () => {
        const res = await request(app).post('/admin/sync').send({action: 'users', workspace: 'acme'});
        expect(res.status).toBe(401);
    });

    it('POST /admin/channels without a session is unauthorized', async () => {
        const res = await request(app).post('/admin/channels').send({workspace: 'acme'});
        expect(res.status).toBe(401);
    });

    it('POST /message/channels without a session is unauthorized', async () => {
        const res = await request(app).post('/message/channels').send({workspace: 'acme'});
        expect(res.status).toBe(401);
    });
});
