'use client';
import {useSession} from '@/context/SessionContext';
import {api} from '@/helpers/api';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LoginPage() {
    const {setSession} = useSession();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(false);
    const router = useRouter();

    const isValidEmail = /^[^@\s]+@[^@\s]+.[^@\s]+$/.test(email);

    const handleSendCode = async () => {
        const res:any = await api('user/sendlogincode', {email});
        if (res.error) {
            setError(true);
            setMessage(res.message);
        } else {
            setError(false);
            setMessage('If your account exists, you will receive a 6-digit code in your email inbox. Fill this code in below.');
            setShowCode(true);
        }
    };

    const handleLogin = async () => {
        const res:any = await api('user/login', {email, code});
        if (res.error) {
            setError(true);
            setMessage(res.message);
        } else {
            setError(false);
            setMessage('Login successful!');
            setSession({sessionId: res.sessionId, user: res.user, workspaces: res.workspaces || [], workspace: null});
            localStorage.setItem('session', JSON.stringify(res));
            if (res.workspaces?.length) router.push('/selectteam'); else router.push('/messages');
        }
    };

return (<>
    <h1>Login</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className = "w-full p-2 border rounded mb-2"/>
    {showCode && (
        <input type="text" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-2 border rounded mb-2"/>
    )}

    {!showCode ? (
        <button onClick={handleSendCode} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={!isValidEmail}>Send Code</button>
    ) : (
        <button onClick={handleLogin} className="bg-green-600 text-white px-4 py-2 rounded">Login</button>
    )}

    {message && (
        <div className={`mt-4 p-3 rounded ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
        </div>
    )}
    </>);
}