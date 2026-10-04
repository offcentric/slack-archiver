'use client';

import {useEffect, useState} from 'react';
import {isVideoFile} from '@/lib/slackText';
import {ArchiveFile} from '@/lib/types';

export const PLACEHOLDER_SRC = '/media-placeholder.jpg';

export function fileSrc(file: ArchiveFile): string {
    return `/api/files/${file.id}`;
}

interface Props {
    file: ArchiveFile;
    controls?: boolean;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
}

export default function ArchiveMedia({file, controls = false, autoPlay = false, muted = false, className}: Props) {
    const [failed, setFailed] = useState(false);
    const label = file.title || file.name || 'Archived file';

    useEffect(() => {
        setFailed(false);
    }, [file.id]);

    if (failed) {
        return <img className={className} src={PLACEHOLDER_SRC} alt={`${label} (no preview)`} data-placeholder="true"/>;
    }
    if (isVideoFile(file)) {
        return (
            <video
                className={className}
                src={fileSrc(file)}
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                preload="metadata"
                poster={PLACEHOLDER_SRC}
                onError={() => setFailed(true)}
            />
        );
    }
    return <img className={className} src={fileSrc(file)} alt={label} onError={() => setFailed(true)}/>;
}
