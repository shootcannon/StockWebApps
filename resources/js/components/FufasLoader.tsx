import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/* ── Top progress bar ───────────────────────────────── */

export function FufasProgress() {
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
    const doneTimer = useRef<number | null>(null);

    useEffect(() => {
        const offStart = router.on('start', () => {
            if (doneTimer.current) clearTimeout(doneTimer.current);
            setState('loading');
        });
        const offFinish = router.on('finish', () => {
            setState('done');
            doneTimer.current = window.setTimeout(() => setState('idle'), 400);
        });
        return () => {
            offStart();
            offFinish();
            if (doneTimer.current) clearTimeout(doneTimer.current);
        };
    }, []);

    if (state === 'idle') return null;

    return (
        <div className="fixed left-0 right-0 top-0 z-[9999] h-[2px] overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                style={{
                    animation:
                        state === 'loading'
                            ? 'fufas-progress 3s ease-out forwards'
                            : 'fufas-progress-done 0.25s ease-out forwards',
                }}
            />
        </div>
    );
}

/* ── Full-page branded splash / loader ──────────────── */

export function FufasSplash({ show }: { show: boolean }) {
    const [mounted, setMounted] = useState(show);

    useEffect(() => {
        if (show) {
            setMounted(true);
        } else {
            const t = setTimeout(() => setMounted(false), 500);
            return () => clearTimeout(t);
        }
    }, [show]);

    if (!mounted) return null;

    return (
        <div
            className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-[var(--bg)]"
            style={{
                transition: 'opacity 0.4s ease',
                opacity: show ? 1 : 0,
            }}
        >
            <div className="flex flex-col items-center gap-5">
                {/* Animated rings + icon */}
                <div className="relative flex h-24 w-24 items-center justify-center">
                    {/* Outer ring */}
                    <div
                        className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                        style={{ animation: 'fufas-ring-outer 3s linear infinite' }}
                    />
                    {/* Inner ring */}
                    <div
                        className="absolute inset-2 rounded-full border-2 border-emerald-500/30 border-dashed"
                        style={{ animation: 'fufas-ring-inner 2s linear infinite' }}
                    />
                    {/* Core */}
                    <div className="fufas-glow-ring relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-7 w-7 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                        </svg>
                    </div>
                </div>

                {/* Brand name */}
                <div className="flex items-end gap-0.5">
                    {'FUFAS'.split('').map((ch, i) => (
                        <span
                            key={i}
                            className="text-2xl font-bold tracking-wider text-emerald-400"
                            style={{
                                animation: 'fufas-letter 1.6s ease-in-out infinite',
                                animationDelay: `${i * 0.12}s`,
                                display: 'inline-block',
                            }}
                        >
                            {ch}
                        </span>
                    ))}
                    <span className="mb-0.5 ml-1.5 text-sm font-medium tracking-widest text-[var(--muted)]">
                        MARKETS
                    </span>
                </div>

                {/* Bouncing dots */}
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                            style={{
                                animation: 'fufas-dot 1.4s ease-in-out infinite',
                                animationDelay: `${i * 0.18}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Inline chart / section loader ──────────────────── */

export function FufasInlineLoader({ text = 'Memuat data…' }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
                <div
                    className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent"
                    style={{ animation: 'fufas-spin 0.75s linear infinite' }}
                />
            </div>
            <span className="text-xs text-[var(--muted)]">{text}</span>
        </div>
    );
}

/* ── Skeleton shimmer block ─────────────────────────── */

export function FufasSkeleton({ className = '' }: { className?: string }) {
    return <div className={`fufas-skeleton rounded ${className}`} />;
}

/* ── Chart overlay loader ───────────────────────────── */

export function FufasChartOverlay() {
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--surface)]/70 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2">
                <div className="relative h-8 w-8">
                    <div className="absolute inset-0 rounded-full border-[1.5px] border-[var(--border)]" />
                    <div
                        className="absolute inset-0 rounded-full border-[1.5px] border-emerald-400 border-t-transparent"
                        style={{ animation: 'fufas-spin 0.75s linear infinite' }}
                    />
                </div>
                <span className="text-[10px] text-[var(--muted)]">Memuat chart…</span>
            </div>
        </div>
    );
}
