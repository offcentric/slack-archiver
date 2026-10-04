'use client';

import {useEffect, useState} from 'react';
import ArchiveMedia from '@/components/ArchiveMedia';
import {ArchiveFile} from '@/lib/types';
import {isVisualFile} from '@/lib/slackText';

export default function Attachments({files, compact = false}: {files?: ArchiveFile[] | null; compact?: boolean}) {
    const visual = (Array.isArray(files) ? files : []).filter((file) => file?.id && isVisualFile(file));
    const [active, setActive] = useState<ArchiveFile | null>(null);

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

    if (!visual.length) {
        return null;
    }

    return (
        <div className={compact ? 'inline-files' : 'attachments'}>
            {visual.map((file) => compact ? (
                <button
                    key={file.id}
                    type="button"
                    className="inline-file"
                    onClick={() => setActive(file)}
                    aria-label={`Open ${file.title || file.name || 'attachment'}`}
                >
                    <ArchiveMedia file={file} muted lazy/>
                </button>
            ) : (
                <ArchiveMedia key={file.id} file={file} controls/>
            ))}
            {active && (
                <div className="lightbox" role="dialog" aria-modal="true" aria-label={active.title || 'Attachment'} onClick={() => setActive(null)}>
                    <div className="lightbox-frame" onClick={(event) => event.stopPropagation()}>
                        <ArchiveMedia file={active} controls autoPlay/>
                        <button type="button" className="ghost" onClick={() => setActive(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
