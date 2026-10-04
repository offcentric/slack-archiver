'use client';

import {useRouter} from 'next/navigation';
import {FormEvent, useEffect, useState} from 'react';
import Logo from '@/components/Logo';
import {useSession} from '@/context/SessionContext';
import {isEmail, loginErrorMessage, sendCodeOutcome} from '@/lib/login';

export default function LoginPage() {
    const {refresh, error: sessionError} = useSession();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [retryIn, setRetryIn] = useState(0);
    const shownError = error || sessionError || '';

    useEffect(() => {
        if (retryIn <= 0) {
            return;
        }
        const timer = setTimeout(() => setRetryIn((current) => current - 1), 1000);
        return () => clearTimeout(timer);
    }, [retryIn]);

    const requestCode = async (resent: boolean) => {
        setError('');
        setNotice('');
        setBusy(true);
        const res = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email}),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        const outcome = sendCodeOutcome(res.status);
        if (outcome === 'unavailable') {
            setError('The archive is unavailable right now. Try again in a moment.');
            return;
        }
        if (outcome === 'limited') {
            const wait = Math.max(1, Number(data.retry_after) || 60);
            setShowCode(true);
            setRetryIn(wait);
            setNotice(`You can request another code in ${wait} seconds.`);
            return;
        }
        setShowCode(true);
        setRetryIn(60);
        setNotice(resent
            ? 'If an account exists for that address, a new code is on its way.'
            : 'If an account exists for that address, a 6-digit code is on its way.');
    };

    const sendCode = async (event: FormEvent) => {
        event.preventDefault();
        await requestCode(false);
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
        const session = await refresh();
        if (session?.error) {
            setError(session.error);
            return;
        }
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
                    {showCode && (
                        <button type="button" className="text-link" disabled={busy || retryIn > 0 || !isEmail(email)} onClick={() => requestCode(true)}>
                            {retryIn > 0 ? `Resend code in ${retryIn}s` : 'Resend code'}
                        </button>
                    )}
                </div>
                {notice && <p className="banner" role="status">{notice}</p>}
                {shownError && <p className="banner error" role="alert">{shownError}</p>}
            </form>
        </div>
    );
}
