import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import LoginPage from './page';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({push, replace: vi.fn()}),
}));

vi.mock('@/context/SessionContext', () => ({
    useSession: () => ({setUser: vi.fn(), refresh, user: null, loading: false, logout: vi.fn()}),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('login page', () => {
    it('asks for a code after a non-500 send-code response and hides that error', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 400,
            ok: false,
            json: async () => ({message: 'user_not_found'}),
        }));
        render(<LoginPage/>);
        await user.type(screen.getByLabelText('Email'), 'missing@example.com');
        await user.click(screen.getByRole('button', {name: 'Send code'}));
        expect(await screen.findByLabelText('Login code')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByRole('status').textContent).toMatch(/If an account exists/);
    });

    it('shows an error when sending a code fails on the server', async () => {
        const user = userEvent.setup();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 500,
            ok: false,
            json: async () => ({message: 'failed_to_send_code'}),
        }));
        render(<LoginPage/>);
        await user.type(screen.getByLabelText('Email'), 'ada@example.com');
        await user.click(screen.getByRole('button', {name: 'Send code'}));
        expect((await screen.findByRole('alert')).textContent).toMatch(/unavailable/i);
        expect(screen.queryByLabelText('Login code')).toBeNull();
    });

    it('explains an incorrect code and stores the user after success', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({status: 200, ok: true, json: async () => ({ok: true})})
            .mockResolvedValueOnce({status: 401, ok: false, json: async () => ({message: 'auth_fail'})})
            .mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({user: {id: 1, email: 'ada@example.com', role: 1, workspaces: []}}),
            });
        vi.stubGlobal('fetch', fetchMock);
        render(<LoginPage/>);
        await user.type(screen.getByLabelText('Email'), 'ada@example.com');
        await user.click(screen.getByRole('button', {name: 'Send code'}));
        await user.type(await screen.findByLabelText('Login code'), '000000');
        await user.click(screen.getByRole('button', {name: 'Sign in'}));
        expect((await screen.findByRole('alert')).textContent).toMatch(/incorrect or has expired/i);

        await user.click(screen.getByRole('button', {name: 'Sign in'}));
        expect(refresh).toHaveBeenCalled();
        expect(push).toHaveBeenCalledWith('/');
    });
});
