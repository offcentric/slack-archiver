'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import SlackText from '@/components/SlackText';
import {archive} from '@/lib/client';
import {authorName, channelMessagesPath, formatWhen, itemsOf, messagePath} from '@/lib/messages';
import {ArchiveMessage} from '@/lib/types';

const RECENT_MESSAGE_COUNT = 25;

export default function RecentMessages({workspace}: {workspace: string}) {
    const [messages, setMessages] = useState<ArchiveMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const res = await archive<{items?: ArchiveMessage[]}>('message/list', {
                workspace,
                _limit: RECENT_MESSAGE_COUNT,
                _page: 1,
                _orderby: ['ts', 'desc'],
            });
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setMessages([]);
                setError(res.status === 401 ? 'Your session has expired. Log in again.' : 'Could not load recent messages.');
                setLoading(false);
                return;
            }
            setError('');
            setMessages(itemsOf<ArchiveMessage>(res.data));
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    return (
        <section className="recent" aria-labelledby="recent-messages">
            <h2 id="recent-messages">Recent messages</h2>
            <p className="muted">The latest {RECENT_MESSAGE_COUNT} messages across every channel.</p>
            {loading && <p className="status">Loading recent messages…</p>}
            {error && <p className="banner error" role="alert">{error}</p>}
            {!loading && !error && messages.length === 0 && <p className="status">No messages in this workspace yet.</p>}
            {messages.length > 0 && (
                <ul className="results">
                    {messages.map((message) => (
                        <li key={message.ts}>
                            {message.channel && (
                                <p className="result-channel">
                                    <Link href={channelMessagesPath(workspace, message.channel)} title={`Messages in #${message.channel}`}>#{message.channel}</Link>
                                </p>
                            )}
                            <p className="muted">
                                <span className="result-author">{authorName(message, new Map())}</span>
                                {' · '}
                                <Link href={messagePath(workspace, message.ts)} title="Go to message">{formatWhen(message.datetime) || message.ts}</Link>
                            </p>
                            <p className="message-text">{message.text ? <SlackText text={message.text}/> : '—'}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
