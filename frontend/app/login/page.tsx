'use client';

import {useRouter} from 'next/navigation';
import {FormEvent, useState} from 'react';
import Logo from '@/components/Logo';
import {useSession} from '@/context/SessionContext';
import {isEmail, loginErrorMessage, sendCodeOutcome} from '@/lib/login';

export default function LoginPage() {
    const {refresh} = useSession();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const sendCode = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setNotice('');
        setBusy(true);
        const res = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email}),
        });
        setBusy(false);
        if (sendCodeOutcome(res.status) === 'unavailable') {
            setError('The archive is unavailable right now. Try again in a moment.');
            return;
        }
        setShowCode(true);
        setNotice('If an account exists for that address, a 6-digit code is on its way.');
    };

    const login = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setBusy(true);
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, code}),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setError(loginErrorMessage(res.status, data.message));
            return;
        }
        await refresh();
        router.push('/');
    };

    return (
        <div className="login-wrap">
            <form className="login-card" onSubmit={showCode ? login : sendCode}>
                <div className="login-logo"><Logo size={56}/></div>
                <h1>Welcome back</h1>
                <p className="muted">Use the email on your archive account. We will send a one-time code.</p>
                <div className="stack">
                    <label>
                        Email
                        <input
                            type="email"
                            autoComplete="username"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </label>
                    {showCode && (
                        <label>
                            Login code
                            <input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="6-digit code"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                required
                            />
                        </label>
                    )}
                    <button type="submit" disabled={busy || !isEmail(email)}>
                        {showCode ? 'Sign in' : 'Send code'}
                    </button>
                </div>
                {notice && <p className="banner" role="status">{notice}</p>}
                {error && <p className="banner error" role="alert">{error}</p>}
            </form>
        </div>
    );
}
