'use client';

import Link from 'next/link';
import {ReactNode, useEffect, useState} from 'react';
import {archive} from '@/lib/client';
import {ALL_CHANNELS, channelMessagesPath, messagesByUserPath} from '@/lib/messages';

interface ChannelStat {
    channel: string;
    count: number;
}

interface UserStat {
    uid: string;
    name: string;
    count: number;
}

export interface StatsPeriod {
    key: string;
    label: string;
    count: number;
    channels: ChannelStat[];
    users: UserStat[];
}

interface WorkspaceStatsData {
    periods: StatsPeriod[];
}

const numberFormat = new Intl.NumberFormat();

function barWidth(count: number, max: number) {
    if (count <= 0 || max <= 0) {
        return 0;
    }
    return Math.max(1, Math.round((count / max) * 1000) / 10);
}

export default function WorkspaceStats({workspace, variant = 'summary'}: {workspace: string; variant?: 'summary' | 'full'}) {
    const [stats, setStats] = useState<WorkspaceStatsData | null>(null);
    const [error, setError] = useState('');
    const limit = variant === 'summary' ? 3 : 10;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await archive<WorkspaceStatsData>('message/stats', {workspace});
            if (cancelled) {
                return;
            }
            if (!res.ok) {
                setError(res.status === 401 ? 'Your session has expired. Log in again.' : 'Could not load workspace statistics.');
                return;
            }
            setStats(res.data);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace]);

    return (
        <section className="stats" aria-labelledby="workspace-stats">
            <h2 id="workspace-stats">{variant === 'summary' ? 'Archive' : 'Statistics'}</h2>
            {error && <p className="banner error" role="alert">{error}</p>}
            {!stats && !error && <p className="status">Loading statistics…</p>}
            {stats && variant === 'summary' && (
                <>
                    <div className="stat-periods">
                        {stats.periods.map((period) => (
                            <article className="stat-card" key={period.key}>
                                <strong>{numberFormat.format(period.count)}</strong>
                                <span className="muted">{period.label}</span>
                                <Rankings workspace={workspace} period={period} limit={limit}/>
                            </article>
                        ))}
                    </div>
                    <p className="stat-more">
                        <Link href={`/w/${encodeURIComponent(workspace)}/stats`}>Full statistics</Link>
                    </p>
                </>
            )}
            {stats && variant === 'full' && stats.periods.map((period) => (
                <section className="stat-period" key={period.key}>
                    <h3>{period.label} <span className="muted">{numberFormat.format(period.count)} messages</span></h3>
                    <div className="stat-split">
                        <RankColumn title="Channels" empty={period.channels.length === 0}>
                            <BarChart items={period.channels.slice(0, limit).map((item) => ({
                                key: item.channel,
                                label: <Link href={channelMessagesPath(workspace, item.channel)}>#{item.channel}</Link>,
                                count: item.count,
                            }))}/>
                        </RankColumn>
                        <RankColumn title="People" empty={period.users.length === 0}>
                            <BarChart tone="person" items={period.users.slice(0, limit).map((item) => ({
                                key: item.uid,
                                label: <Link href={messagesByUserPath(workspace, item.uid, ALL_CHANNELS)}>{item.name}</Link>,
                                count: item.count,
                            }))}/>
                        </RankColumn>
                    </div>
                </section>
            ))}
        </section>
    );
}

function Rankings({workspace, period, limit}: {workspace: string; period: StatsPeriod; limit: number}) {
    return (
        <>
            <h3>Channels</h3>
            {period.channels.length === 0 ? <p className="muted stat-empty">No messages</p> : (
                <ol className="stat-list">
                    {period.channels.slice(0, limit).map((item) => (
                        <li key={item.channel}>
                            <Link href={channelMessagesPath(workspace, item.channel)}>#{item.channel}</Link>
                            <span className="muted">{numberFormat.format(item.count)}</span>
                        </li>
                    ))}
                </ol>
            )}
            <h3>People</h3>
            {period.users.length === 0 ? <p className="muted stat-empty">No messages</p> : (
                <ol className="stat-list">
                    {period.users.slice(0, limit).map((item) => (
                        <li key={item.uid}>
                            <Link href={messagesByUserPath(workspace, item.uid, ALL_CHANNELS)}>{item.name}</Link>
                            <span className="muted">{numberFormat.format(item.count)}</span>
                        </li>
                    ))}
                </ol>
            )}
        </>
    );
}

function BarChart({items, tone = 'channel'}: {items: {key: string; label: ReactNode; count: number}[]; tone?: 'channel' | 'person'}) {
    const max = items.reduce((highest, item) => Math.max(highest, item.count), 0);
    return (
        <ol className="stat-bars">
            {items.map((item) => (
                <li key={item.key}>
                    <span className="stat-bar-name">{item.label}</span>
                    <span className="stat-bar-count">{numberFormat.format(item.count)}</span>
                    <span className="stat-track" aria-hidden="true">
                        <span className={tone === 'person' ? 'stat-fill is-person' : 'stat-fill'} style={{width: `${barWidth(item.count, max)}%`}}/>
                    </span>
                </li>
            ))}
        </ol>
    );
}

function RankColumn({title, empty, children}: {title: string; empty: boolean; children: ReactNode}) {
    return (
        <div>
            <h3>{title}</h3>
            {empty ? <p className="muted stat-empty">No messages</p> : children}
        </div>
    );
}
