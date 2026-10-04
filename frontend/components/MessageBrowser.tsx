'use client';

import Attachments from '@/components/Attachments';
import DateRangeFields from '@/components/DateRangeFields';
import Spinner from '@/components/Spinner';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {FormEvent, Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {archive} from '@/lib/client';
import {
    authorName,
    buildMessageListBody,
    formatWhen,
    itemsOf,
    messageFiltersFromQuery,
    messagePath,
    MessageFilters,
    PAGE_SIZE,
    sameFilters,
    truncate,
    userIdsForFilter,
} from '@/lib/messages';
import {hrefWith, queryValue} from '@/lib/viewQuery';
import {appendPage, LoadMore} from '@/lib/useLoadMore';
import SlackText from '@/components/SlackText';
import {formatSlackText} from '@/lib/slackText';
import {ArchiveMessage, SlackUser} from '@/lib/types';

const COLUMNS: Array<{key: 'datetime' | 'user' | 'text'; label: string}> = [
    {key: 'datetime', label: 'Date'},
    {key: 'user', label: 'Author'},
    {key: 'text', label: 'Message'},
];

function useNarrowLayout(): boolean {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            return;
        }
        const query = window.matchMedia('(max-width: 999px)');
        const apply = () => setNarrow(query.matches);
        apply();
        query.addEventListener('change', apply);
        return () => query.removeEventListener('change', apply);
    }, []);
    return narrow;
}

export default function MessageBrowser({workspace}: {workspace: string}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryKey = searchParams.toString();
    const queryChannel = queryValue(searchParams, 'channel');
    const [channels, setChannels] = useState<string[]>([]);
    const [people, setPeople] = useState<SlackUser[]>([]);
    const [messages, setMessages] = useState<ArchiveMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastCount, setLastCount] = useState(0);
    const [orderBy, setOrderBy] = useState<[string, 'asc' | 'desc']>(['ts', 'desc']);
    const [draft, setDraft] = useState<MessageFilters>(() => messageFiltersFromQuery(searchParams));
    const [applied, setApplied] = useState<MessageFilters>(() => messageFiltersFromQuery(searchParams));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [channelsOpen, setChannelsOpen] = useState(false);
    const narrow = useNarrowLayout();
    const channelToggle = useRef<HTMLButtonElement>(null);

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
        const next = messageFiltersFromQuery(searchParams);
        setDraft(next);
        setApplied((current) => sameFilters(current, next) ? current : next);
        setPage(1);
    }, [queryKey]);

    useEffect(() => {
        if (!channels.length || queryChannel) {
            return;
        }
        router.replace(hrefWith(pathname, searchParams, {channel: channels[0]}));
        // searchParams is read through queryKey; router identity is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channels, queryChannel, pathname, queryKey]);

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

    const remember = (updates: Record<string, string>) => {
        setPage(1);
        router.push(hrefWith(pathname, searchParams, updates));
    };

    const closeChannels = () => {
        setChannelsOpen(false);
        channelToggle.current?.focus();
    };

    const selectChannel = (channel: string) => {
        setChannelsOpen(false);
        remember({channel});
    };

    useEffect(() => {
        if (!channelsOpen) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeChannels();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [channelsOpen]);

    useEffect(() => {
        if (!narrow) {
            setChannelsOpen(false);
        }
    }, [narrow]);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const next = {...draft, text: draft.text.trim()};
        setDraft(next);
        setApplied(next);
        remember({
            channel: activeChannel,
            user: next.user,
            text: next.text,
            from: next.dateFrom,
            to: next.dateTo,
        });
    };

    const filterByAuthor = (message: ArchiveMessage) => {
        if (!message.user) {
            return;
        }
        const next = {...applied, user: message.user};
        setDraft(next);
        setApplied(next);
        remember({user: message.user, channel: activeChannel});
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

    const sortActive = (column: string) => orderBy[0] === column || (column === 'datetime' && orderBy[0] === 'ts');

    const sortMark = (column: string) => sortActive(column) ? (orderBy[1] === 'asc' ? ' ↑' : ' ↓') : '';

    const toggleSort = (column: string) => {
        setPage(1);
        setOrderBy((current) => {
            const active = current[0] === column || (column === 'datetime' && current[0] === 'ts');
            if (active) {
                return [column, current[1] === 'asc' ? 'desc' : 'asc'];
            }
            return [column, column === 'datetime' ? 'desc' : 'asc'];
        });
    };

    const sortButton = (column: typeof COLUMNS[number]) => (
        <button key={column.key} type="button" className="sort" aria-pressed={sortActive(column.key)} onClick={() => toggleSort(column.key)}>
            {column.label}{sortMark(column.key)}
        </button>
    );

    const hasMore = messages.length < total && lastCount >= PAGE_SIZE;

    return (
        <div className={channelsOpen ? 'browser is-channels-open' : 'browser'}>
            {channelsOpen && (
                <button type="button" className="sidebar-backdrop" aria-label="Close channels" onClick={closeChannels}/>
            )}
            <aside id="channel-list" className="sidebar" aria-hidden={narrow && !channelsOpen ? true : undefined} inert={narrow && !channelsOpen ? true : undefined}>
                <button type="button" className="sidebar-close" onClick={closeChannels}>Close</button>
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
                    <div className="browser-title">
                        <button
                            type="button"
                            className="channel-toggle ghost"
                            ref={channelToggle}
                            aria-expanded={channelsOpen}
                            aria-controls="channel-list"
                            onClick={() => setChannelsOpen(true)}
                        >
                            Channels
                        </button>
                        <h1>{activeChannel ? `#${activeChannel}` : 'Messages'}</h1>
                    </div>
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
                        <div className="sort-bar" role="group" aria-label="Sort messages">
                            <span className="sort-label">Sort</span>
                            {COLUMNS.map((column) => sortButton(column))}
                        </div>
                        <table className="grid">
                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column.key}>{sortButton(column)}</th>
                                    ))}
                                    <th>Replies</th>
                                </tr>
                            </thead>
                            <tbody aria-busy={loading} data-stale={loading && messages.length > 0 ? 'true' : undefined}>
                                {loading && (
                                    <tr className="loading-row">
                                        <td className="span-row" colSpan={4}><Spinner label="Loading messages…"/></td>
                                    </tr>
                                )}
                                {messages.map((message) => {
                                    const replies = message.replies || [];
                                    const open = expanded.has(message.ts);
                                    return (
                                        <Fragment key={message.ts}>
                                            <tr className={replies.length ? 'has-thread' : undefined}>
                                                <td data-label="Date">
                                                    <Link href={messagePath(workspace, message.ts)}>{formatWhen(message.datetime) || message.ts}</Link>
                                                </td>
                                                <td data-label="Author">{authorButton(message)}</td>
                                                <td className="message-text" data-label="Message">
                                                    <div className="slack-body">{message.text ? <SlackText text={message.text} names={names} workspace={workspace} channel={message.channel || activeChannel}/> : (message.files?.length ? '' : '—')}</div>
                                                    <Attachments files={message.files} compact/>
                                                </td>
                                                <td data-label="Replies">
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
                                                    <td data-label="Date">
                                                        <Link href={messagePath(workspace, reply.ts)}>{formatWhen(reply.datetime) || reply.ts}</Link>
                                                    </td>
                                                    <td data-label="Author">{authorButton(reply)}</td>
                                                    <td className="message-text" data-label="Message">
                                                        <div className="slack-body">{reply.text ? <SlackText text={reply.text} names={names} workspace={workspace} channel={reply.channel || activeChannel}/> : (reply.files?.length ? '' : '—')}</div>
                                                        <Attachments files={reply.files} compact/>
                                                    </td>
                                                    <td className="muted" data-label="Thread">{truncate(formatSlackText(message.text, names), 48) || 'reply'}</td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                                {!loading && messages.length === 0 && (
                                    <tr>
                                        <td className="span-row" colSpan={4}>No messages match these filters.</td>
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
