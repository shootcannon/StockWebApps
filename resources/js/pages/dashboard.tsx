import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Flame,
    Globe2,
    Layers,
    Sparkles,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useAlert } from '../components/FufasAlert';
import { LiveBadge } from '../components/LiveBadge';
import { Sparkline } from '../components/Sparkline';
import { useCurrency } from '../lib/currency';
import { fmtBig, fmtPct } from '../lib/format';

type WatchRow = {
    id: number;
    type: 'crypto' | 'stock';
    symbol: string;
    name: string | null;
    image: string | null;
    price: number | null;
    change_24h_pct: number | null;
    currency: string;
};

type CryptoRow = {
    type: 'crypto';
    symbol: string;
    ticker: string;
    name: string;
    image: string | null;
    price: number;
    change_24h_pct: number;
};

type GlobalStats = {
    total_market_cap_usd?: number | null;
    total_volume_usd?: number | null;
    market_cap_change_24h_pct?: number | null;
    btc_dominance?: number | null;
    eth_dominance?: number | null;
    active_cryptocurrencies?: number | null;
    markets?: number | null;
};

type Category = {
    id: string | null;
    name: string;
    market_cap: number | null;
    market_cap_change_24h: number | null;
    volume: number | null;
    top_coins: string[];
};

type Candle = { time: number; open: number; high: number; low: number; close: number };

type Props = {
    watchlist: WatchRow[];
    trending: CryptoRow[];
    gainers: CryptoRow[];
    losers: CryptoRow[];
    global: GlobalStats;
    categories: Category[];
    featured: { btc: Candle[]; eth: Candle[] };
    fetched_at: string;
};

export default function Dashboard({
    watchlist,
    trending,
    gainers,
    losers,
    global,
    categories,
    featured,
    fetched_at,
}: Props) {
    const { format, currency } = useCurrency();
    const { confirm, success } = useAlert();
    const [moverTab, setMoverTab] = useState<'gainers' | 'losers' | 'trending'>('gainers');

    const movers = moverTab === 'gainers' ? gainers : moverTab === 'losers' ? losers : trending;

    function refresh() {
        router.reload({ preserveScroll: true, preserveState: false });
    }

    function removeFromWatchlist(w: WatchRow) {
        confirm({
            title: `Hapus dari watchlist?`,
            description: `${w.name ?? w.symbol} akan dihapus dari daftar pantauan kamu.`,
            confirmLabel: 'Hapus',
            danger: true,
            onConfirm: () => {
                router.delete(`/watchlist/${w.id}`, {
                    preserveScroll: true,
                    onSuccess: () => success(`${w.name ?? w.symbol} dihapus dari watchlist.`),
                });
            },
        });
    }

    return (
        <AppShell>
            <Head title="Dashboard" />

            {/* ── Hero ──────────────────────────────────── */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-emerald-500/5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            <Sparkles className="h-3 w-3" />
                            Real-time market intel
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Selamat datang di{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                Fufas Markets
                            </span>
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
                            Pantau crypto & saham real-time dari CoinGecko + Yahoo Finance. Buat watchlist, catat
                            analisa, set alert, dan lihat{' '}
                            <strong className="text-[var(--fg)]">prediksi 30 hari ke depan</strong> dengan sinyal
                            teknikal di tiap aset.
                        </p>
                    </div>
                    <LiveBadge fetchedAt={fetched_at} source="CoinGecko + Yahoo" onRefresh={refresh} />
                </div>

                {/* Mini featured charts */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FeaturedCard candles={featured.btc} label="Bitcoin" symbol="bitcoin" ticker="BTC" />
                    <FeaturedCard candles={featured.eth} label="Ethereum" symbol="ethereum" ticker="ETH" />
                </div>
            </div>

            {/* ── Global stats ──────────────────────────── */}
            <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                        Crypto Market Overview
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <StatCard
                        label="Total Mcap"
                        value={format(global.total_market_cap_usd, 0)}
                        sub={fmtPct(global.market_cap_change_24h_pct)}
                        subColor={(global.market_cap_change_24h_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
                    />
                    <StatCard label="24h Volume" value={format(global.total_volume_usd, 0)} />
                    <StatCard
                        label="BTC Dom."
                        value={
                            global.btc_dominance != null ? `${global.btc_dominance.toFixed(1)}%` : '—'
                        }
                    />
                    <StatCard
                        label="ETH Dom."
                        value={
                            global.eth_dominance != null ? `${global.eth_dominance.toFixed(1)}%` : '—'
                        }
                    />
                    <StatCard label="Coins" value={global.active_cryptocurrencies?.toLocaleString() ?? '—'} />
                    <StatCard label="Markets" value={global.markets?.toLocaleString() ?? '—'} />
                </div>
            </div>

            {/* ── Watchlist + Movers ────────────────────── */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Watchlist */}
                <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <h2 className="font-semibold">Watchlist Saya</h2>
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            {watchlist.length} aset · {currency}
                        </span>
                    </div>

                    {watchlist.length === 0 ? (
                        <div className="px-4 py-14 text-center">
                            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/8 ring-1 ring-emerald-500/20">
                                <Sparkles className="h-5 w-5 text-emerald-400" />
                            </div>
                            <p className="text-sm text-[var(--muted)]">
                                Belum ada watchlist.
                                <br />
                                Cari aset di kolom pencarian (mis.{' '}
                                <em className="text-[var(--fg)]">bitcoin</em> atau{' '}
                                <em className="text-[var(--fg)]">AAPL</em>), buka aset, lalu tekan{' '}
                                <em className="text-[var(--fg)]">Watchlist</em>.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                                {['bitcoin', 'ethereum', 'solana', 'AAPL', 'TSLA'].map((s) => (
                                    <Link
                                        key={s}
                                        href={`/asset/${/^[A-Z]+$/.test(s) ? 'stock' : 'crypto'}/${s}`}
                                        className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs transition hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300"
                                    >
                                        {s}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[var(--border)] text-left">
                                    <tr className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                                        <th className="px-4 py-3">Aset</th>
                                        <th className="px-4 py-3 text-right">Harga</th>
                                        <th className="px-4 py-3 text-right">24h %</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {watchlist.map((w) => {
                                        const up = (w.change_24h_pct ?? 0) >= 0;
                                        return (
                                            <tr
                                                key={w.id}
                                                className="group border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]"
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/asset/${w.type}/${encodeURIComponent(w.symbol)}`}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        {w.image ? (
                                                            <img
                                                                src={w.image}
                                                                alt=""
                                                                className="h-7 w-7 rounded-full ring-1 ring-[var(--border)]"
                                                            />
                                                        ) : (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-[10px] font-bold text-[var(--muted)]">
                                                                {(w.symbol || '?').slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-semibold">
                                                                {w.name || w.symbol}
                                                            </div>
                                                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                                                {w.type} · {w.symbol}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                    {format(w.price)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    <span className="inline-flex items-center gap-1">
                                                        {up ? (
                                                            <TrendingUp className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <TrendingDown className="h-3.5 w-3.5" />
                                                        )}
                                                        {fmtPct(w.change_24h_pct)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => removeFromWatchlist(w)}
                                                        className="rounded-lg p-1.5 text-[var(--muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                                        aria-label="Hapus"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Movers */}
                <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex border-b border-[var(--border)]">
                        <MoverTab active={moverTab === 'gainers'} onClick={() => setMoverTab('gainers')}>
                            <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                            Gainers
                        </MoverTab>
                        <MoverTab active={moverTab === 'losers'} onClick={() => setMoverTab('losers')}>
                            <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                            Losers
                        </MoverTab>
                        <MoverTab active={moverTab === 'trending'} onClick={() => setMoverTab('trending')}>
                            <Flame className="h-3.5 w-3.5 text-amber-400" />
                            Top
                        </MoverTab>
                    </div>

                    <ul className="divide-y divide-[var(--border)]">
                        {movers.slice(0, 10).map((m) => {
                            const up = m.change_24h_pct >= 0;
                            return (
                                <li key={m.symbol}>
                                    <Link
                                        href={`/asset/crypto/${m.symbol}`}
                                        className="flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-[var(--surface-2)]"
                                    >
                                        {m.image ? (
                                            <img src={m.image} alt="" className="h-6 w-6 shrink-0 rounded-full" />
                                        ) : (
                                            <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-3)]" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold">{m.ticker}</div>
                                            <div className="truncate text-[10px] text-[var(--muted)]">{m.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-xs">{format(m.price)}</div>
                                            <div className={`font-mono text-[10px] ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {fmtPct(m.change_24h_pct)}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                        {movers.length === 0 && (
                            <li className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                                Data sedang dimuat…
                            </li>
                        )}
                    </ul>
                </section>
            </div>

            {/* ── Categories ────────────────────────────── */}
            {categories.length > 0 && (
                <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <h2 className="flex items-center gap-2 font-semibold">
                            <Layers className="h-4 w-4 text-[var(--muted)]" /> Top Categories
                        </h2>
                        <Link
                            href="/markets"
                            className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                        >
                            Lihat semua →
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
                        {categories.slice(0, 8).map((c) => {
                            const denom = (c.market_cap ?? 0) - (c.market_cap_change_24h ?? 0);
                            const pct = denom > 0 ? ((c.market_cap_change_24h ?? 0) / denom) * 100 : null;
                            const up = (pct ?? 0) >= 0;
                            return (
                                <div
                                    key={c.id ?? c.name}
                                    className="bg-[var(--surface)] p-4 transition hover:bg-[var(--surface-2)]"
                                >
                                    <div className="text-sm font-semibold">{c.name}</div>
                                    <div className="mt-1 font-mono text-xs text-[var(--muted)]">
                                        {fmtBig(c.market_cap)}
                                    </div>
                                    {pct != null && (
                                        <div className={`mt-1 font-mono text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {fmtPct(pct)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── Top 10 Crypto ─────────────────────────── */}
            {trending.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <h2 className="font-semibold">Top 10 Crypto by Market Cap</h2>
                        <Link
                            href="/markets"
                            className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                        >
                            Semua →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
                        {trending.map((t) => {
                            const up = t.change_24h_pct >= 0;
                            return (
                                <Link
                                    key={t.symbol}
                                    href={`/asset/crypto/${t.symbol}`}
                                    className="group bg-[var(--surface)] p-4 transition hover:bg-[var(--surface-2)]"
                                >
                                    <div className="flex items-center gap-2">
                                        {t.image ? (
                                            <img
                                                src={t.image}
                                                alt=""
                                                className="h-7 w-7 rounded-full transition group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="h-7 w-7 rounded-full bg-[var(--surface-3)]" />
                                        )}
                                        <div className="font-bold">{t.ticker}</div>
                                    </div>
                                    <div className="mt-2 font-mono text-sm">{format(t.price)}</div>
                                    <div className={`mt-0.5 font-mono text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {fmtPct(t.change_24h_pct)}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </AppShell>
    );
}

/* ── Sub-components ──────────────────────────────────── */

function FeaturedCard({
    candles,
    label,
    symbol,
    ticker,
}: {
    candles: Candle[];
    label: string;
    symbol: string;
    ticker: string;
}) {
    const { format } = useCurrency();
    if (!candles || candles.length === 0) {
        return (
            <div className="flex h-20 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--muted)]">
                {label} chart sedang dimuat…
            </div>
        );
    }
    const closes = candles.map((c) => c.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const pct = ((last - first) / first) * 100;
    const up = pct >= 0;

    return (
        <Link
            href={`/asset/crypto/${symbol}`}
            className="group rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:border-emerald-500/30 hover:bg-[var(--surface-3)]"
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-[var(--muted)]">{label}</div>
                    <div className="font-mono text-xl font-bold">{format(last)}</div>
                    <div className={`mt-0.5 font-mono text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtPct(pct)} <span className="text-[var(--muted)]">90d</span>
                    </div>
                </div>
                <div className="text-right">
                    <Sparkline values={closes} up={up} width={140} height={48} />
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                        {ticker}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function StatCard({
    label,
    value,
    sub,
    subColor,
}: {
    label: string;
    value: string;
    sub?: string;
    subColor?: string;
}) {
    return (
        <div className="rounded-xl p-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</div>
            <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
            {sub && <div className={`mt-0.5 font-mono text-[10px] ${subColor}`}>{sub}</div>}
        </div>
    );
}

function MoverTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition ${
                active
                    ? 'border-b-2 border-emerald-400 text-[var(--fg)]'
                    : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
        >
            {children}
        </button>
    );
}
