'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import Attachments from '@/components/Attachments';
import {archive} from '@/lib/client';
import {authorName, channelMessagesPath, formatWhen, itemsOf, messagePath} from '@/lib/messages';
import SlackText from '@/components/SlackText';
import {ArchiveMessage, SlackUser} from '@/lib/types';

export default function MessageDetail({workspace, ts}: {workspace: string; ts: string}) {
    const [root, setRoot] = useState<ArchiveMessage | null>(null);
    const [focusTs, setFocusTs] = useState(ts);
    const [people, setPeople] = useState<SlackUser[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [messageRes, userRes] = await Promise.all([
                archive<ArchiveMessage>('message/get', {ts}),
                archive<{items?: SlackUser[]}>('slackuser/list', {workspace}),
            ]);
            if (cancelled) {
                return;
            }
            if (!messageRes.ok || !messageRes.data?.ts) {
                setError(messageRes.status === 404 ? 'That message is not in the archive.' : 'Could not load this message.');
                return;
            }
            if (messageRes.data.workspace && messageRes.data.workspace !== workspace) {
                setError('That message belongs to a different workspace.');
                return;
            }
            let thread = messageRes.data;
            if (thread.reply_to) {
                const parentRes = await archive<ArchiveMessage>('message/get', {ts: thread.reply_to});
                if (!cancelled && parentRes.ok && parentRes.data?.ts) {
                    thread = parentRes.data;
                }
            }
            if (cancelled) {
                return;
            }
            setFocusTs(ts);
            setRoot(thread);
            setPeople(itemsOf<SlackUser>(userRes.data).filter((person) => !person.workspace || person.workspace === workspace));
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace, ts]);

    const names = useMemo(() => {
        const map = new Map<string, string>();
        for (const person of people) {
            if (person.uid) {
                map.set(person.uid, person.real_name || person.name || person.uid);
            }
        }
        return map;
    }, [people]);

    if (error) {
        return <p className="banner error" role="alert">{error}</p>;
    }
    if (!root) {
        return <p className="status">Loading message…</p>;
    }

    const thread = [root, ...(root.replies || [])];
    return (
        <article className="thread">
            <p className="crumb">
                <Link href={channelMessagesPath(workspace, root.channel || '')}>
                    #{root.channel}
                </Link>
            </p>
            <h1>Thread</h1>
            {thread.map((message) => (
                <section key={message.ts} className={message.ts === focusTs ? 'post is-current' : 'post'} id={message.ts}>
                    <header>
                        <strong>{authorName(message, names)}</strong>
                        <Link href={messagePath(workspace, message.ts)}>{formatWhen(message.datetime) || message.ts}</Link>
                    </header>
                    <div className="message-text slack-body">{message.text ? <SlackText text={message.text} names={names} workspace={workspace} channel={message.channel || root.channel}/> : '—'}</div>
                    <Attachments files={message.files}/>
                </section>
            ))}
        </article>
    );
}
