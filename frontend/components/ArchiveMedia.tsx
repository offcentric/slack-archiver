'use client';

import {useEffect, useRef, useState} from 'react';
import {isVideoFile} from '@/lib/slackText';
import {ArchiveFile} from '@/lib/types';

export const PLACEHOLDER_SRC = '/media-placeholder.jpg';
export const VIDEO_PLACEHOLDER_SRC = '/video-placeholder.svg';
export const MAX_MEDIA_RETRIES = 4;

const BLANK_SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export function fileSrc(file: ArchiveFile): string {
    return `/api/files/${file.id}`;
}

export function thumbnailSrc(file: ArchiveFile): string {
    return `/api/files/${file.id}/thumbnail`;
}

export function retryDelay(attempt: number, random = Math.random): number {
    const base = Math.min(8000, 1000 * 2 ** attempt);
    return base + Math.floor(random() * 500);
}

export function withRetry(src: string, attempt: number): string {
    return attempt > 0 ? `${src}?retry=${attempt}` : src;
}

interface Props {
    file: ArchiveFile;
    controls?: boolean;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
    lazy?: boolean;
}

export default function ArchiveMedia({file, controls = false, autoPlay = false, muted = false, className, lazy = false}: Props) {
    const [attempt, setAttempt] = useState(0);
    const [waiting, setWaiting] = useState(false);
    const [failed, setFailed] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const label = file.title || file.name || 'Archived file';
    const video = isVideoFile(file);

    useEffect(() => {
        setAttempt(0);
        setWaiting(false);
        setFailed(false);
    }, [file.id]);

    useEffect(() => () => {
        if (timer.current) {
            clearTimeout(timer.current);
        }
    }, []);

    const onError = () => {
        if (attempt >= MAX_MEDIA_RETRIES) {
            setFailed(true);
            return;
        }
        setWaiting(true);
        timer.current = setTimeout(() => {
            timer.current = null;
            setWaiting(false);
            setAttempt((current) => current + 1);
        }, retryDelay(attempt));
    };

    if (failed) {
        return video
            ? <img className={className} src={VIDEO_PLACEHOLDER_SRC} alt={`${label} (video unavailable)`} data-placeholder="true"/>
            : <img className={className} src={PLACEHOLDER_SRC} alt={`${label} (no preview)`} data-placeholder="true"/>;
    }
    if (waiting) {
        return <img className={className} src={BLANK_SRC} alt={`${label} (loading)`} data-pending="true"/>;
    }
    if (video && !controls) {
        return (
            <img
                className={className}
                src={withRetry(thumbnailSrc(file), attempt)}
                alt={`${label} (video)`}
                loading={lazy ? 'lazy' : undefined}
                decoding="async"
                onError={onError}
            />
        );
    }
    if (video) {
        return (
            <video
                className={className}
                src={withRetry(fileSrc(file), attempt)}
                controls={controls}
                autoPlay={autoPlay}
                muted={muted}
                preload="metadata"
                poster={thumbnailSrc(file)}
                aria-label={`${label} (video)`}
                onError={onError}
            />
        );
    }
    return (
        <img
            className={className}
            src={withRetry(fileSrc(file), attempt)}
            alt={label}
            loading={lazy ? 'lazy' : undefined}
            decoding="async"
            onError={onError}
        />
    );
}
