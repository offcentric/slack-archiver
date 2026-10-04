'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useState} from 'react';
import {archive} from '@/lib/client';
import {formatWhen, itemsOf, messagePath, PAGE_SIZE} from '@/lib/messages';
import {formatSlackText} from '@/lib/slackText';
import {ArchiveMessage} from '@/lib/types';

export default function SearchBrowser({workspace}: {workspace: string}) {
    const [channels, setChannels] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [channel, setChannel] = useState('');
    const [submitted, setSubmitted] = useState<{q: string; channel: string} | null>(null);
    const [page, setPage] = useState(1);
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
        if (!submitted?.q) {
            return;
        }
        let cancelled = false;
        (async () => {
            const body: Record<string, unknown> = {
                q: submitted.q,
                workspace,
                limit: PAGE_SIZE,
                page,
            };
            if (submitted.channel) {
                body.channel = submitted.channel;
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
    }, [workspace, submitted, page]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const q = query.trim();
        if (!q) {
            return;
        }
        setPage(1);
        setSubmitted({q, channel});
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
                {hits.map((hit) => (
                    <li key={hit.ts}>
                        <p className="muted">#{hit.channel} · {formatWhen(hit.datetime)}</p>
                        <Link href={messagePath(workspace, hit.ts)}>{formatSlackText(hit.text) || hit.ts}</Link>
                    </li>
                ))}
            </ul>
            {hits.length > 0 && (
                <div className="pager">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
                    <span>Page {page}</span>
                    <button type="button" disabled={hits.length < PAGE_SIZE} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
            )}
        </section>
    );
}
