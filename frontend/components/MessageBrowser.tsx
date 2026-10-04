'use client';

import Attachments from '@/components/Attachments';
import DateRangeFields from '@/components/DateRangeFields';
import Spinner from '@/components/Spinner';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {FormEvent, Fragment, useEffect, useMemo, useState} from 'react';
import {archive} from '@/lib/client';
import {
    authorName,
    buildMessageListBody,
    emptyFilters,
    formatWhen,
    itemsOf,
    messagePath,
    MessageFilters,
    PAGE_SIZE,
    truncate,
    userIdsForFilter,
} from '@/lib/messages';
import {appendPage, LoadMore} from '@/lib/useLoadMore';
import {formatSlackText} from '@/lib/slackText';
import {ArchiveMessage, SlackUser} from '@/lib/types';

const COLUMNS: Array<{key: 'datetime' | 'user' | 'text'; label: string}> = [
    {key: 'datetime', label: 'Date'},
    {key: 'user', label: 'Author'},
    {key: 'text', label: 'Message'},
];

export default function MessageBrowser({workspace}: {workspace: string}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryChannel = searchParams.get('channel') || '';
    const [channels, setChannels] = useState<string[]>([]);
    const [people, setPeople] = useState<SlackUser[]>([]);
    const [messages, setMessages] = useState<ArchiveMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastCount, setLastCount] = useState(0);
    const [orderBy, setOrderBy] = useState<[string, 'asc' | 'desc']>(['ts', 'desc']);
    const [draft, setDraft] = useState<MessageFilters>(emptyFilters());
    const [applied, setApplied] = useState<MessageFilters>(emptyFilters());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const activeChannel = queryChannel || channels[0] || '';

    const toggleThread = (ts: string) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(ts)) {
                next.delete(ts);
            } else {
                next.add(ts);
            }
            return next;
        });
    };
    const names = useMemo(() => {
        const map = new Map<string, string>();
        for (const person of people) {
            if (person.uid) {
                map.set(person.uid, person.real_name || person.name || person.uid);
            }
        }
        return map;
    }, [people]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [channelRes, userRes] = await Promise.all([
                archive<{items?: string[]}>('message/channels', {workspace}),
                archive<{items?: SlackUser[]}>('slackuser/list', {workspace}),
            ]);
            if (cancelled) {
                return;
            }
            if (!channelRes.ok) {
                setError(channelRes.status === 401 ? 'Your session has expired. Log in again.' : 'Could not load channels.');
                setLoading(false);
                return;
            }
            setChannels(itemsOf<string>(channelRes.data));
            const users = itemsOf<SlackUser>(userRes.data).filter((person) => !person.workspace || person.workspace === workspace);
            setPeople(users);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    useEffect(() => {
        if (!activeChannel) {
            return;
        }
        let cancelled = false;
        (async () => {
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            const userIds = userIdsForFilter(applied.user, people);
            const res = await archive<{items?: ArchiveMessage[]; totalitems?: number}>('message/listthreaded', buildMessageListBody({
                workspace,
                channel: activeChannel,
                page,
                orderBy,
                filters: applied,
                userIds,
            }));
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setError(res.status === 401 ? 'Your session has expired. Log in again.' : 'Could not load messages.');
                if (page === 1) {
                    setMessages([]);
                }
                setLoading(false);
                setLoadingMore(false);
                return;
            }
            setError('');
            const next = itemsOf<ArchiveMessage>(res.data);
            setLastCount(next.length);
            setMessages((current) => appendPage(current, next, page, (message) => message.ts));
            setTotal(Number(res.data.totalitems || 0));
            if (page === 1) {
                setExpanded(new Set());
            }
            setLoading(false);
            setLoadingMore(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeChannel, page, orderBy, applied, people]);

    const selectChannel = (channel: string) => {
        setPage(1);
        router.push(`/w/${encodeURIComponent(workspace)}/messages?channel=${encodeURIComponent(channel)}`);
    };

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPage(1);
        setApplied({...draft});
    };

    const filterByAuthor = (message: ArchiveMessage) => {
        if (!message.user) {
            return;
        }
        setPage(1);
        setDraft((current) => ({...current, user: message.user || ''}));
        setApplied((current) => ({...current, user: message.user || ''}));
    };

    const authorButton = (message: ArchiveMessage) => {
        const name = authorName(message, names);
        if (!message.user) {
            return name;
        }
        return (
            <button type="button" className="user-link" onClick={() => filterByAuthor(message)}>
                {name}
            </button>
        );
    };

    const toggleSort = (column: string) => {
        setPage(1);
        setOrderBy((current) => {
            if (current[0] === column) {
                return [column, current[1] === 'asc' ? 'desc' : 'asc'];
            }
            return [column, column === 'datetime' || column === 'ts' ? 'desc' : 'asc'];
        });
    };

    const hasMore = messages.length < total && lastCount >= PAGE_SIZE;

    return (
        <div className="browser">
            <aside className="sidebar">
                <p className="sidebar-label">Channels</p>
                {channels.length === 0 && !loading && <p className="muted">No archived channels yet.</p>}
                <ul>
                    {channels.map((channel) => (
                        <li key={channel}>
                            <button
                                type="button"
                                className={channel === activeChannel ? 'channel is-active' : 'channel'}
                                aria-current={channel === activeChannel ? 'true' : undefined}
                                onClick={() => selectChannel(channel)}
                            >
                                #{channel}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
            <section className="browser-main">
                <header className="browser-head">
                    <h1>{activeChannel ? `#${activeChannel}` : 'Messages'}</h1>
                    <p className="muted">{total} message{total === 1 ? '' : 's'}</p>
                </header>
                {error && <p className="banner error" role="alert">{error}</p>}
                {!activeChannel && !loading && <p className="status">This workspace has no archived channels to browse.</p>}
                {activeChannel && (
                    <>
                        <form className="toolbar" onSubmit={applyFilters}>
                            <label>
                                Author
                                <select
                                    aria-label="Filter by author"
                                    value={draft.user}
                                    onChange={(event) => setDraft({...draft, user: event.target.value})}
                                >
                                    <option value="">Everyone</option>
                                    {people.map((person) => (
                                        <option key={person.uid} value={person.uid}>{person.real_name || person.name || person.uid}</option>
                                    ))}
                                </select>
                            </label>
                            <DateRangeFields
                                value={{dateFrom: draft.dateFrom, dateTo: draft.dateTo}}
                                onChange={(range) => setDraft({...draft, ...range})}
                            />
                            <label className="grow">
                                Text
                                <input
                                    aria-label="Filter message text"
                                    placeholder="Message text"
                                    value={draft.text}
                                    onChange={(event) => setDraft({...draft, text: event.target.value})}
                                />
                            </label>
                            <button type="submit">Apply</button>
                        </form>
                        <table className="grid">
                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column.key}>
                                            <button type="button" className="sort" onClick={() => toggleSort(column.key === 'datetime' ? 'datetime' : column.key)}>
                                                {column.label}
                                                {orderBy[0] === column.key || (column.key === 'datetime' && orderBy[0] === 'ts')
                                                    ? (orderBy[1] === 'asc' ? ' ↑' : ' ↓')
                                                    : ''}
                                            </button>
                                        </th>
                                    ))}
                                    <th>Replies</th>
                                </tr>
                            </thead>
                            <tbody aria-busy={loading} data-stale={loading && messages.length > 0 ? 'true' : undefined}>
                                {loading && (
                                    <tr className="loading-row">
                                        <td colSpan={4}><Spinner label="Loading messages…"/></td>
                                    </tr>
                                )}
                                {messages.map((message) => {
                                    const replies = message.replies || [];
                                    const open = expanded.has(message.ts);
                                    return (
                                        <Fragment key={message.ts}>
                                            <tr className={replies.length ? 'has-thread' : undefined}>
                                                <td>
                                                    <Link href={messagePath(workspace, message.ts)}>{formatWhen(message.datetime) || message.ts}</Link>
                                                </td>
                                                <td>{authorButton(message)}</td>
                                                <td className="message-text">
                                                    <p>{formatSlackText(message.text, names) || (message.files?.length ? '' : '—')}</p>
                                                    <Attachments files={message.files} compact/>
                                                </td>
                                                <td>
                                                    {replies.length ? (
                                                        <button
                                                            type="button"
                                                            className="thread-toggle"
                                                            aria-expanded={open}
                                                            onClick={() => toggleThread(message.ts)}
                                                        >
                                                            {open ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                                        </button>
                                                    ) : <span className="muted">—</span>}
                                                </td>
                                            </tr>
                                            {open && replies.map((reply) => (
                                                <tr key={reply.ts} className="reply-row">
                                                    <td>
                                                        <Link href={messagePath(workspace, reply.ts)}>{formatWhen(reply.datetime) || reply.ts}</Link>
                                                    </td>
                                                    <td>{authorButton(reply)}</td>
                                                    <td className="message-text">
                                                        <p>{formatSlackText(reply.text, names) || (reply.files?.length ? '' : '—')}</p>
                                                        <Attachments files={reply.files} compact/>
                                                    </td>
                                                    <td className="muted">{truncate(formatSlackText(message.text, names), 48) || 'reply'}</td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                                {!loading && messages.length === 0 && (
                                    <tr>
                                        <td colSpan={4}>No messages match these filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <LoadMore enabled={hasMore && !loading} pending={loadingMore} onLoad={() => setPage((value) => value + 1)}/>
                    </>
                )}
            </section>
        </div>
    );
}
