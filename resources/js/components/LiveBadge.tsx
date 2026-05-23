import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LiveBadge({
    fetchedAt,
    source,
    onRefresh,
}: {
    fetchedAt: string | null;
    source?: string;
    onRefresh?: () => void | Promise<void>;
}) {
    const [_, force] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const t = setInterval(() => force((v) => v + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const ago = fetchedAt ? humanAgo(new Date(fetchedAt)) : null;

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px]">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {source && <span className="text-[var(--muted)]">{source}</span>}
            {ago && <span className="text-[var(--muted)]">· {ago}</span>}
            {onRefresh && (
                <button
                    type="button"
                    onClick={async () => {
                        if (refreshing) return;
                        setRefreshing(true);
                        try {
                            await onRefresh();
                        } finally {
                            setRefreshing(false);
                        }
                    }}
                    className="ml-1 inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--fg)]"
                    title="Refresh"
                >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    );
}

function humanAgo(d: Date) {
    const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 5) return 'baru saja';
    if (s < 60) return `${s}d lalu`;
    if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
    if (s < 86400) return `${Math.floor(s / 3600)}j lalu`;
    return `${Math.floor(s / 86400)}h lalu`;
}
