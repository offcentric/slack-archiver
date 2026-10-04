'use client';

import {useEffect, useState} from 'react';
import {isVideoFile} from '@/lib/slackText';
import {ArchiveFile} from '@/lib/types';

export const PLACEHOLDER_SRC = '/media-placeholder.jpg';
export const VIDEO_PLACEHOLDER_SRC = '/video-placeholder.svg';

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
    const video = isVideoFile(file);

    useEffect(() => {
        setFailed(false);
    }, [file.id]);

    if (failed) {
        return video
            ? <img className={className} src={VIDEO_PLACEHOLDER_SRC} alt={`${label} (video unavailable)`} data-placeholder="true"/>
            : <img className={className} src={PLACEHOLDER_SRC} alt={`${label} (no preview)`} data-placeholder="true"/>;
    }
    if (video) {
        return (
            <video
                className={className}
                src={fileSrc(file)}
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                preload="metadata"
                poster={VIDEO_PLACEHOLDER_SRC}
                aria-label={`${label} (video)`}
                onError={() => setFailed(true)}
            />
        );
    }
    return <img className={className} src={fileSrc(file)} alt={label} onError={() => setFailed(true)}/>;
}
