'use client';

import {FormEvent, useEffect, useState} from 'react';
import {archive} from '@/lib/client';
import {itemsOf} from '@/lib/messages';
import {isAdmin, UserProfile} from '@/lib/types';

export default function AdminSync({user}: {user: UserProfile}) {
    const [workspace, setWorkspace] = useState(user.workspaces[0]?.workspace || '');
    const [channels, setChannels] = useState<string[]>([]);
    const [channel, setChannel] = useState('');
    const [limit, setLimit] = useState('200');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!workspace) {
            return;
        }
        let cancelled = false;
        (async () => {
            const res = await archive<{items?: string[]}>('admin/channels', {workspace});
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setChannels([]);
                setError('Could not load Slack channels for this workspace.');
                return;
            }
            const names = itemsOf<string>(res.data);
            setChannels(names);
            setChannel(names[0] || '');
            setError('');
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    if (!isAdmin(user)) {
        return <p className="banner error" role="alert">The admin tools are only available to admin accounts.</p>;
    }

    const syncUsers = async () => {
        setBusy(true);
        setStatus('Syncing Slack users…');
        setError('');
        const res = await archive<{imported?: number}>('admin/sync', {action: 'users', workspace});
        setBusy(false);
        if (!res.ok) {
            setStatus('');
            setError('User sync failed. Check the workspace token and try again.');
            return;
        }
        setStatus(`Imported ${res.data.imported ?? 0} Slack users into ${workspace}.`);
    };

    const syncMessages = async (event: FormEvent) => {
        event.preventDefault();
        if (!channel) {
            setError('Choose a channel to sync.');
            return;
        }
        setBusy(true);
        setError('');
        setStatus('Syncing messages from Slack. This can take several minutes.');
        const body: Record<string, unknown> = {action: 'messages', workspace, channel};
        const parsedLimit = parseInt(limit, 10);
        if (parsedLimit > 0) {
            body.limit = parsedLimit;
        }
        const res = await archive<{imported?: number}>('admin/sync', body);
        setBusy(false);
        if (!res.ok) {
            setStatus('');
            setError('Message sync failed. Confirm the bot is in that channel and try again.');
            return;
        }
        setStatus(`Imported ${res.data.imported ?? 0} messages from #${channel}.`);
    };

    const generateThumbnails = async () => {
        setBusy(true);
        setError('');
        setStatus('Generating thumbnails for videos that do not have one yet. This can take several minutes.');
        const res = await archive<{generated?: number; skipped?: number; failed?: number}>('admin/thumbnails', {workspace});
        setBusy(false);
        if (!res.ok) {
            setStatus('');
            setError('Thumbnail generation failed. Confirm ffmpeg is installed on the archive server and try again.');
            return;
        }
        const generated = res.data.generated ?? 0;
        const skipped = res.data.skipped ?? 0;
        const failed = res.data.failed ?? 0;
        setStatus(`Thumbnails for ${workspace}: ${generated} created, ${skipped} already present, ${failed} failed.`);
    };

    return (
        <section className="panel admin">
            <header className="browser-head">
                <h1>Admin sync</h1>
                <p className="muted">Pull Slack users and channel history into the archive. Direct messages are not included.</p>
            </header>
            <label>
                Workspace
                <select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
                    {user.workspaces.map((item) => (
                        <option key={item.workspace} value={item.workspace}>{item.workspace}</option>
                    ))}
                </select>
            </label>
            <div className="admin-actions">
                <button type="button" onClick={syncUsers} disabled={busy || !workspace}>Sync Slack users</button>
                <button type="button" onClick={generateThumbnails} disabled={busy || !workspace}>Generate video thumbnails</button>
            </div>
            <form className="toolbar" onSubmit={syncMessages}>
                <label>
                    Channel
                    <select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Channel to sync">
                        {channels.map((name) => <option key={name} value={name}>#{name}</option>)}
                    </select>
                </label>
                <label>
                    Limit
                    <input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="numeric" aria-label="Message limit"/>
                </label>
                <button type="submit" disabled={busy || !channel}>Sync messages</button>
            </form>
            {status && <p className="banner" role="status">{status}</p>}
            {error && <p className="banner error" role="alert">{error}</p>}
        </section>
    );
}
