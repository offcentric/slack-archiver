import {useEffect, useRef} from 'react';

export function appendPage<T>(current: T[], next: T[], page: number, key: (item: T) => string | number): T[] {
    if (page <= 1) {
        return next;
    }
    const seen = new Set(current.map(key));
    return [...current, ...next.filter((item) => !seen.has(key(item)))];
}

export function useLoadMore(onLoad: () => void, enabled: boolean) {
    const ref = useRef<HTMLParagraphElement | null>(null);
    const onLoadRef = useRef(onLoad);
    onLoadRef.current = onLoad;

    useEffect(() => {
        const node = ref.current;
        if (!node || !enabled || typeof IntersectionObserver === 'undefined') {
            return;
        }
        let requested = false;
        const observer = new IntersectionObserver((entries) => {
            if (requested || !entries.some((entry) => entry.isIntersecting)) {
                return;
            }
            requested = true;
            onLoadRef.current();
        }, {rootMargin: '400px'});
        observer.observe(node);
        return () => observer.disconnect();
    }, [enabled]);

    return ref;
}

export function LoadMore({enabled, pending, onLoad}: {enabled: boolean; pending: boolean; onLoad: () => void}) {
    const ref = useLoadMore(onLoad, enabled && !pending);
    if (!enabled && !pending) {
        return null;
    }
    return (
        <p ref={ref} className="load-more" role="status">
            {pending ? 'Loading more…' : ''}
        </p>
    );
}
