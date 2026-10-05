import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import NavBar from './NavBar';

const logout = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock('@/context/SessionContext', () => ({
    useSession: () => ({
        user: {
            id: 1,
            email: 'ada@example.com',
            role: 100,
            workspaces: [{workspace: 'acme', uid: 'U1', name: 'ada', real_name: 'Ada Lovelace'}],
        },
        logout,
    }),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/w/acme/messages',
    useRouter: () => ({push}),
}));

afterEach(() => {
    cleanup();
    logout.mockReset();
    push.mockReset();
});

describe('nav bar account menu', () => {
    it('keeps Admin and Log out inside the name menu', async () => {
        const user = userEvent.setup();
        render(<NavBar/>);

        expect(screen.queryByRole('menuitem', {name: 'Admin'})).toBeNull();
        expect(screen.queryByRole('menuitem', {name: 'Log out'})).toBeNull();

        await user.click(screen.getByRole('button', {name: 'Ada Lovelace'}));
        expect(screen.getByRole('menuitem', {name: 'Statistics'}).getAttribute('href')).toBe('/w/acme/stats');
        expect(screen.getByRole('menuitem', {name: 'Admin'}).getAttribute('href')).toBe('/admin');

        await user.click(screen.getByRole('menuitem', {name: 'Log out'}));
        expect(logout).toHaveBeenCalledOnce();
        expect(push).toHaveBeenCalledWith('/login');
    });
});
