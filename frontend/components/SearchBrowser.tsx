'use client';

import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {FormEvent, useEffect, useMemo, useState} from 'react';
import {archive} from '@/lib/client';
import {authorName, channelMessagesPath, formatWhen, itemsOf, messagePath, PAGE_SIZE} from '@/lib/messages';
import SlackText from '@/components/SlackText';
import {ArchiveMessage, SlackUser} from '@/lib/types';
import {hrefWith, queryPage, queryValue} from '@/lib/viewQuery';

function personLabel(person: SlackUser): string {
    return person.real_name || person.name || person.uid;
}

export default function SearchBrowser({workspace}: {workspace: string}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const submittedQ = queryValue(searchParams, 'q');
    const submittedChannel = queryValue(searchParams, 'channel');
    const submittedUser = queryValue(searchParams, 'user');
    const page = queryPage(searchParams);
    const [channels, setChannels] = useState<string[]>([]);
    const [people, setPeople] = useState<SlackUser[]>([]);
    const [query, setQuery] = useState(submittedQ);
    const [channel, setChannel] = useState(submittedChannel);
    const [user, setUser] = useState(submittedUser);
    const [hits, setHits] = useState<ArchiveMessage[]>([]);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

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
            if (channelRes.ok) {
                setChannels(itemsOf<string>(channelRes.data));
            }
            if (userRes.ok) {
                const users = itemsOf<SlackUser>(userRes.data)
                    .filter((person) => person.uid && (!person.workspace || person.workspace === workspace))
                    .sort((a, b) => personLabel(a).localeCompare(personLabel(b)));
                setPeople(users);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    useEffect(() => {
        setQuery(submittedQ);
        setChannel(submittedChannel);
        setUser(submittedUser);
    }, [submittedQ, submittedChannel, submittedUser]);

    const names = useMemo(() => {
        const map = new Map<string, string>();
        for (const person of people) {
            map.set(person.uid, personLabel(person));
        }
        return map;
    }, [people]);

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
            if (submittedUser) {
                body.user = submittedUser;
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
    }, [workspace, submittedQ, submittedChannel, submittedUser, page]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const q = query.trim();
        if (!q) {
            return;
        }
        router.push(hrefWith(pathname, searchParams, {q, channel, user, page: 1}));
    };

    const showPage = (next: number) => {
        router.push(hrefWith(pathname, searchParams, {page: next}));
    };

    return (
        <section className="panel">
            <header className="browser-head">
                <h1>Search</h1>
                <p className="muted">Looks across channels in {workspace}. Channel and author are optional.</p>
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
                <label>
                    Author
                    <select value={user} onChange={(event) => setUser(event.target.value)} aria-label="Limit search to an author">
                        <option value="">Everyone</option>
                        {people.map((person) => (
                            <option key={person.uid} value={person.uid}>{personLabel(person)}</option>
                        ))}
                    </select>
                </label>
                <button type="submit">Search</button>
            </form>
            {error && <p className="banner error" role="alert">{error}</p>}
            {searched && !hits.length && !error && <p className="status">No messages matched.</p>}
            <ul className="results">
                {hits.map((hit) => (
                        <li key={hit.ts}>
                            {hit.channel && (
                                <p className="result-channel">
                                    <Link href={channelMessagesPath(workspace, hit.channel)} title={`Messages in #${hit.channel}`}>#{hit.channel}</Link>
                                </p>
                            )}
                            <p className="muted">
                                <span className="result-author">{authorName(hit, names)}</span>
                                {' · '}
                                <Link href={messagePath(workspace, hit.ts)} title="Go to message">{formatWhen(hit.datetime)}</Link>
                            </p>
                            <p className="message-text">{hit.text ? <SlackText text={hit.text} query={submittedQ}/> : '—'}</p>
                        </li>
                ))}
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
