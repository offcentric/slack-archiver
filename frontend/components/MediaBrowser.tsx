'use client';

import {FormEvent, useEffect, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import ArchiveMedia from '@/components/ArchiveMedia';
import DateRangeFields from '@/components/DateRangeFields';
import Spinner from '@/components/Spinner';
import {archive} from '@/lib/client';
import {applyRange, DateRange} from '@/lib/dateRange';
import {formatWhen, itemsOf, mediaPath, PAGE_SIZE} from '@/lib/messages';
import {isVideoFile} from '@/lib/slackText';
import {appendPage, LoadMore} from '@/lib/useLoadMore';
import {ArchiveFile, SlackUser} from '@/lib/types';
import {hrefWith, queryValue} from '@/lib/viewQuery';

type MediaOrder = 'asc' | 'desc';

function mediaOrder(source: {get(name: string): string | null}): MediaOrder {
    return queryValue(source, 'sort') === 'asc' ? 'asc' : 'desc';
}

function mediaQuery(source: {get(name: string): string | null}): {channel: string; user: string; range: DateRange; order: MediaOrder} {
    return {
        channel: queryValue(source, 'channel'),
        user: queryValue(source, 'user'),
        range: {dateFrom: queryValue(source, 'from'), dateTo: queryValue(source, 'to')},
        order: mediaOrder(source),
    };
}

export default function MediaBrowser({workspace}: {workspace: string}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryKey = searchParams.toString();
    const initial = mediaQuery(searchParams);
    const [channels, setChannels] = useState<string[]>([]);
    const [people, setPeople] = useState<SlackUser[]>([]);
    const [channel, setChannel] = useState(initial.channel);
    const [user, setUser] = useState(initial.user);
    const [draftChannel, setDraftChannel] = useState(initial.channel);
    const [draftUser, setDraftUser] = useState(initial.user);
    const [range, setRange] = useState<DateRange>(initial.range);
    const [draftRange, setDraftRange] = useState<DateRange>(initial.range);
    const [order, setOrder] = useState<MediaOrder>(initial.order);
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<ArchiveFile[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastCount, setLastCount] = useState(0);
    const [active, setActive] = useState<ArchiveFile | null>(null);
    const [error, setError] = useState('');

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
            setChannels(itemsOf<string>(channelRes.data));
            setPeople(itemsOf<SlackUser>(userRes.data).filter((person) => !person.workspace || person.workspace === workspace));
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    useEffect(() => {
        const next = mediaQuery(searchParams);
        setDraftChannel(next.channel);
        setDraftUser(next.user);
        setDraftRange(next.range);
        setChannel(next.channel);
        setUser(next.user);
        setRange(next.range);
        setOrder(next.order);
        setPage(1);
    }, [queryKey]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            const body: Record<string, unknown> = {
                workspace,
                media: true,
                _limit: PAGE_SIZE,
                _page: page,
                _orderby: ['created_at', order],
            };
            if (channel) {
                body.channel = channel;
            }
            if (user) {
                body.user = user;
            }
            applyRange(body, range);
            const res = await archive<{items?: ArchiveFile[]; totalitems?: number}>('file/list', body);
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setError('Could not load media.');
                if (page === 1) {
                    setItems([]);
                }
                setLoading(false);
                setLoadingMore(false);
                return;
            }
            setError('');
            const next = itemsOf<ArchiveFile>(res.data);
            setLastCount(next.length);
            setItems((current) => appendPage(current, next, page, (file) => file.id));
            setTotal(Number(res.data.totalitems || 0));
            setLoading(false);
            setLoadingMore(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace, channel, user, range, order, page]);

    useEffect(() => {
        if (!active) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActive(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active]);

    const remember = (updates: Record<string, string>) => {
        setPage(1);
        router.push(hrefWith(pathname, searchParams, updates));
    };

    const chooseOrder = (next: MediaOrder) => {
        if (next === order) {
            return;
        }
        setOrder(next);
        setPage(1);
        remember({sort: next === 'asc' ? 'asc' : ''});
    };

    const filterByUser = (uid: string) => {
        setDraftUser(uid);
        setUser(uid);
        remember({user: uid, channel, from: range.dateFrom, to: range.dateTo});
    };

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setChannel(draftChannel);
        setUser(draftUser);
        setRange({...draftRange});
        remember({
            channel: draftChannel,
            user: draftUser,
            from: draftRange.dateFrom,
            to: draftRange.dateTo,
        });
    };

    const hasMore = items.length < total && lastCount >= PAGE_SIZE;

    return (
        <section className="panel">
            <header className="browser-head">
                <h1>Media</h1>
                <p className="muted">{total} file{total === 1 ? '' : 's'}</p>
            </header>
            <form className="toolbar" onSubmit={applyFilters}>
                <label>
                    Channel
                    <select value={draftChannel} onChange={(event) => setDraftChannel(event.target.value)}>
                        <option value="">All channels</option>
                        {channels.map((name) => <option key={name} value={name}>#{name}</option>)}
                    </select>
                </label>
                <label>
                    User
                    <select value={draftUser} onChange={(event) => setDraftUser(event.target.value)}>
                        <option value="">Everyone</option>
                        {people.map((person) => (
                            <option key={person.uid} value={person.uid}>{person.real_name || person.name || person.uid}</option>
                        ))}
                    </select>
                </label>
                <DateRangeFields value={draftRange} onChange={setDraftRange}/>
                <button type="submit">Apply</button>
            </form>
            <div className="media-sort" role="group" aria-label="Sort media">
                <span className="sort-label">Sort</span>
                <button type="button" className="sort" aria-pressed={order === 'desc'} onClick={() => chooseOrder('desc')}>Newest</button>
                <button type="button" className="sort" aria-pressed={order === 'asc'} onClick={() => chooseOrder('asc')}>Oldest</button>
            </div>
            {error && <p className="banner error" role="alert">{error}</p>}
            {loading && <Spinner label="Loading media…"/>}
            <ul className="album" aria-busy={loading} data-stale={loading && items.length > 0 ? 'true' : undefined}>
                {items.map((file) => {
                    const who = file.real_name || file.slack_name || file.user || 'Unknown';
                    const video = isVideoFile(file);
                    return (
                        <li key={file.id}>
                            <button
                                type="button"
                                className={video ? 'thumb is-video' : 'thumb'}
                                aria-label={video ? `Play ${file.title || file.name || 'video'}` : undefined}
                                onClick={() => setActive(file)}
                            >
                                <ArchiveMedia file={file} muted lazy/>
                                {video && (
                                    <span className="play-overlay" aria-hidden="true">
                                        <span className="play-icon"/>
                                    </span>
                                )}
                            </button>
                            <p>
                                <a href={mediaPath(workspace, file.id)} target="_blank" rel="noopener noreferrer">
                                    {formatWhen(file.created_at)}
                                </a>
                            </p>
                            <p className="muted">
                                {file.user ? (
                                    <button type="button" className="user-link" onClick={() => filterByUser(file.user || '')}>
                                        {who}
                                    </button>
                                ) : who}
                            </p>
                        </li>
                    );
                })}
            </ul>
            {!items.length && !error && !loading && <p className="status">No images or videos match these filters.</p>}
            <LoadMore enabled={hasMore && !loading} pending={loadingMore} onLoad={() => setPage((value) => value + 1)}/>
            {active && (
                <div className="lightbox" role="dialog" aria-modal="true" aria-label={active.title || 'Media'} onClick={() => setActive(null)}>
                    <div className="lightbox-frame" onClick={(event) => event.stopPropagation()}>
                        <ArchiveMedia file={active} controls autoPlay/>
                        <button type="button" className="ghost" onClick={() => setActive(null)}>Close</button>
                    </div>
                </div>
            )}
        </section>
    );
}
