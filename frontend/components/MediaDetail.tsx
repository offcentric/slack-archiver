'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import ArchiveMedia from '@/components/ArchiveMedia';
import {archive} from '@/lib/client';
import {formatWhen, mediaByUserPath, messagePath} from '@/lib/messages';
import {ArchiveFile} from '@/lib/types';

export default function MediaDetail({workspace, id}: {workspace: string; id: string}) {
    const [file, setFile] = useState<ArchiveFile | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const numericId = Number(id);
            if (!Number.isInteger(numericId) || numericId <= 0) {
                setError('That file is not in the archive.');
                return;
            }
            const res = await archive<ArchiveFile>('file/get', {id: numericId});
            if (cancelled) {
                return;
            }
            if (!res.ok || !res.data?.id) {
                setError(res.status === 404 ? 'That file is not in the archive.' : 'Could not load this file.');
                return;
            }
            if (res.data.workspace && res.data.workspace !== workspace) {
                setError('That file belongs to a different workspace.');
                return;
            }
            setFile(res.data);
        })();
        return () => {
            cancelled = true;
        };
    }, [workspace, id]);

    if (error) {
        return <p className="banner error" role="alert">{error}</p>;
    }
    if (!file) {
        return <p className="status">Loading…</p>;
    }

    const who = file.real_name || file.slack_name || file.user || 'Unknown';
    return (
        <article className="panel media-stage">
            <p><Link href={`/w/${encodeURIComponent(workspace)}/media`}>Back to media</Link></p>
            <ArchiveMedia file={file} controls/>
            <p>{formatWhen(file.created_at)}</p>
            <p className="muted">
                {file.user ? <Link href={mediaByUserPath(workspace, file.user)}>{who}</Link> : who}
            </p>
            {file.message?.ts && (
                <p>
                    <Link href={messagePath(workspace, file.message.ts)}>
                        View message{file.message.channel ? ` in #${file.message.channel}` : ''}
                    </Link>
                </p>
            )}
        </article>
    );
}
