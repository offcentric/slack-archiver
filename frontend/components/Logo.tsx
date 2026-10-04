export default function Logo({size = 32, withWordmark = true}: {size?: number; withWordmark?: boolean}) {
    return (
        <span className="logo" aria-label="Slack Archive">
            <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
                <defs>
                    <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#4f3cc9"/>
                        <stop offset="1" stopColor="#1a7f8e"/>
                    </linearGradient>
                </defs>
                <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logo-bg)"/>
                <path
                    d="M18 20h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H30l-9 7v-7h-3a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z"
                    fill="#fff7ea"
                />
                <rect x="23" y="27" width="18" height="3" rx="1.5" fill="#ff7a59"/>
                <rect x="23" y="33" width="12" height="3" rx="1.5" fill="#ffc46b"/>
            </svg>
            {withWordmark && (
                <span className="wordmark">
                    Slack<strong>Archive</strong>
                </span>
            )}
        </span>
    );
}
