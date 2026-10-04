'use client';

import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {FormEvent, useEffect, useState} from 'react';
import {archive} from '@/lib/client';
import {channelMessagesPath, formatWhen, itemsOf, messagePath, PAGE_SIZE} from '@/lib/messages';
import {formatSlackText, highlightTerms} from '@/lib/slackText';
import {ArchiveMessage} from '@/lib/types';
import {hrefWith, queryPage, queryValue} from '@/lib/viewQuery';

export default function SearchBrowser({workspace}: {workspace: string}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const submittedQ = queryValue(searchParams, 'q');
    const submittedChannel = queryValue(searchParams, 'channel');
    const page = queryPage(searchParams);
    const [channels, setChannels] = useState<string[]>([]);
    const [query, setQuery] = useState(submittedQ);
    const [channel, setChannel] = useState(submittedChannel);
    const [hits, setHits] = useState<ArchiveMessage[]>([]);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await archive<{items?: string[]}>('message/channels', {workspace});
            if (!cancelled && res.ok) {
                setChannels(itemsOf<string>(res.data));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    useEffect(() => {
        setQuery(submittedQ);
        setChannel(submittedChannel);
    }, [submittedQ, submittedChannel]);

    useEffect(() => {
        if (!submittedQ) {
            return;
        }
        let cancelled = false;
        (async () => {
            const body: Record<string, unknown> = {
                q: submittedQ,
                workspace,
                limit: PAGE_SIZE,
                page,
            };
            if (submittedChannel) {
                body.channel = submittedChannel;
            }
            const res = await archive<ArchiveMessage[]>('message/search', body);
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setError('Search failed. Try a different phrase.');
                setHits([]);
                return;
            }
            setError('');
            setHits(itemsOf<ArchiveMessage>(res.data));
            setSearched(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace, submittedQ, submittedChannel, page]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const q = query.trim();
        if (!q) {
            return;
        }
        router.push(hrefWith(pathname, searchParams, {q, channel, page: 1}));
    };

    const showPage = (next: number) => {
        router.push(hrefWith(pathname, searchParams, {page: next}));
    };

    return (
        <section className="panel">
            <header className="browser-head">
                <h1>Search</h1>
                <p className="muted">Looks across channels in {workspace}. A channel here is optional.</p>
            </header>
            <form className="toolbar" onSubmit={onSubmit}>
                <label className="grow">
                    Query
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Words from a message" aria-label="Search query"/>
                </label>
                <label>
                    Channel
                    <select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Limit search to a channel">
                        <option value="">All channels</option>
                        {channels.map((name) => <option key={name} value={name}>#{name}</option>)}
                    </select>
                </label>
                <button type="submit">Search</button>
            </form>
            {error && <p className="banner error" role="alert">{error}</p>}
            {searched && !hits.length && !error && <p className="status">No messages matched.</p>}
            <ul className="results">
                {hits.map((hit) => {
                    const text = formatSlackText(hit.text);
                    const parts = highlightTerms(text, submittedQ);
                    return (
                        <li key={hit.ts}>
                            <p className="result-channel">
                                <Link href={channelMessagesPath(workspace, hit.channel)} title={`Messages in #${hit.channel}`}>#{hit.channel}</Link>
                            </p>
                            <p className="muted">
                                <Link href={messagePath(workspace, hit.ts)} title="Go to message">{formatWhen(hit.datetime)}</Link>
                            </p>
                            <p className="message-text">{text ? parts.map((part, index) => (
                                part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>
                            )) : '—'}</p>
                        </li>
                    );
                })}
            </ul>
            {hits.length > 0 && (
                <div className="pager">
                    <button type="button" disabled={page <= 1} onClick={() => showPage(page - 1)}>Previous</button>
                    <span>Page {page}</span>
                    <button type="button" disabled={hits.length < PAGE_SIZE} onClick={() => showPage(page + 1)}>Next</button>
                </div>
            )}
        </section>
    );
}
