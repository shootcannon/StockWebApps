import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Sparkline } from '../components/Sparkline';
import { useCurrency } from '../lib/currency';
import { fmtBig, fmtPct } from '../lib/format';

type Row = {
    type: 'crypto';
    symbol: string;
    ticker: string;
    name: string;
    image: string | null;
    price: number;
    change_1h_pct: number | null;
    change_24h_pct: number | null;
    change_7d_pct: number | null;
    market_cap: number | null;
    volume: number | null;
    rank: number | null;
    sparkline: number[] | null;
};

type Category = {
    id: string | null;
    name: string;
    market_cap: number | null;
    market_cap_change_24h: number | null;
    top_coins: string[];
};

type Props = {
    rows: Row[];
    page: number;
    order: string;
    categories: Category[];
};

const ORDERS: { id: string; label: string }[] = [
    { id: 'market_cap_desc', label: 'Market Cap ↓' },
    { id: 'market_cap_asc',  label: 'Market Cap ↑' },
    { id: 'volume_desc',     label: 'Volume ↓'     },
    { id: 'volume_asc',      label: 'Volume ↑'     },
    { id: 'id_asc',          label: 'A → Z'        },
];

export default function Markets({ rows, page, order, categories }: Props) {
    const { format } = useCurrency();

    function go(p: number, o: string = order) {
        router.get('/markets', { page: p, order: o }, { preserveScroll: true });
    }

    return (
        <AppShell>
            <Head title="Markets" />

            {/* ── Header ───────────────────────────────── */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Markets</h1>
                    <p className="text-sm text-[var(--muted)]">
                        Daftar crypto by market cap · klik aset untuk chart & analisa.
                    </p>
                </div>
                <select
                    value={order}
                    onChange={(e) => go(1, e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm transition focus:border-emerald-500/60 focus:outline-none"
                >
                    {ORDERS.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* ── Categories strip ─────────────────────── */}
            <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                    <Layers className="h-4 w-4 text-[var(--muted)]" />
                    <h2 className="font-semibold">Categories</h2>
                </div>
                <div className="flex overflow-x-auto">
                    {categories.map((c) => {
                        const denom = (c.market_cap ?? 0) - (c.market_cap_change_24h ?? 0);
                        const pct   = denom > 0 ? ((c.market_cap_change_24h ?? 0) / denom) * 100 : null;
                        const up    = (pct ?? 0) >= 0;
                        return (
                            <div
                                key={c.id ?? c.name}
                                className="shrink-0 border-r border-[var(--border)] p-4 last:border-r-0"
                                style={{ minWidth: 180 }}
                            >
                                <div className="text-sm font-semibold">{c.name}</div>
                                <div className="mt-1 font-mono text-xs text-[var(--muted)]">
                                    {fmtBig(c.market_cap)}
                                </div>
                                {pct != null && (
                                    <div className={`mt-0.5 font-mono text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {fmtPct(pct)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Table ────────────────────────────────── */}
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border)]">
                            <tr className="text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                                <th className="px-3 py-3">#</th>
                                <th className="px-3 py-3">Aset</th>
                                <th className="px-3 py-3 text-right">Harga</th>
                                <th className="hidden px-3 py-3 text-right sm:table-cell">1h</th>
                                <th className="px-3 py-3 text-right">24h</th>
                                <th className="hidden px-3 py-3 text-right md:table-cell">7d</th>
                                <th className="hidden px-3 py-3 text-right lg:table-cell">Market Cap</th>
                                <th className="hidden px-3 py-3 text-right lg:table-cell">Volume</th>
                                <th className="hidden px-3 py-3 text-right md:table-cell">7d Chart</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr
                                    key={r.symbol}
                                    className="border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]"
                                >
                                    <td className="px-3 py-3 text-xs text-[var(--muted)]">
                                        {r.rank ?? '—'}
                                    </td>
                                    <td className="px-3 py-3">
                                        <Link
                                            href={`/asset/crypto/${r.symbol}`}
                                            className="flex items-center gap-2.5"
                                        >
                                            {r.image ? (
                                                <img
                                                    src={r.image}
                                                    alt=""
                                                    className="h-7 w-7 rounded-full ring-1 ring-[var(--border)]"
                                                />
                                            ) : (
                                                <div className="h-7 w-7 rounded-full bg-[var(--surface-3)]" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-semibold">{r.name}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                                    {r.ticker}
                                                </div>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono font-semibold">
                                        {format(r.price)}
                                    </td>
                                    <ChangeCell n={r.change_1h_pct} className="hidden sm:table-cell" />
                                    <ChangeCell n={r.change_24h_pct} />
                                    <ChangeCell n={r.change_7d_pct} className="hidden md:table-cell" />
                                    <td className="hidden px-3 py-3 text-right font-mono text-[var(--muted)] lg:table-cell">
                                        {fmtBig(r.market_cap)}
                                    </td>
                                    <td className="hidden px-3 py-3 text-right font-mono text-[var(--muted)] lg:table-cell">
                                        {fmtBig(r.volume)}
                                    </td>
                                    <td className="hidden px-3 py-3 text-right md:table-cell">
                                        {r.sparkline && r.sparkline.length > 0 ? (
                                            <Sparkline
                                                values={r.sparkline}
                                                up={(r.change_7d_pct ?? 0) >= 0}
                                                width={100}
                                                height={32}
                                            />
                                        ) : (
                                            <span className="text-[var(--muted)]">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm">
                    <span className="text-xs text-[var(--muted)]">Halaman {page}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => go(page - 1)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-3)] disabled:opacity-40"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                        </button>
                        <button
                            disabled={rows.length < 50}
                            onClick={() => go(page + 1)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-3)] disabled:opacity-40"
                        >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}

function ChangeCell({ n, className = '' }: { n: number | null; className?: string }) {
    const up = (n ?? 0) >= 0;
    return (
        <td className={`px-3 py-3 text-right font-mono text-xs ${
            n == null ? 'text-[var(--muted)]' : up ? 'text-emerald-400' : 'text-red-400'
        } ${className}`}>
            {fmtPct(n)}
        </td>
    );
}
