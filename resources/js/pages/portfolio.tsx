import { Head, Link, router } from '@inertiajs/react';
import { Briefcase, ChevronDown, ChevronRight, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useAlert } from '../components/FufasAlert';
import { useCurrency } from '../lib/currency';
import { fmtPct, fmtQty } from '../lib/format';

type Tx = {
    id: number;
    side: 'buy' | 'sell';
    quantity: number;
    entry_price: number;
    currency: string;
    purchased_at: string | null;
    note: string | null;
};

type Asset = {
    type: 'crypto' | 'stock';
    symbol: string;
    name: string;
    image: string | null;
    quantity: number;
    avg_price: number;
    current_price: number | null;
    value: number | null;
    cost: number;
    pnl: number | null;
    pnl_pct: number | null;
    transactions: Tx[];
};

type Props = {
    assets: Asset[];
    totals: { value: number; cost: number; pnl: number; pnl_pct: number };
};

export default function Portfolio({ assets, totals }: Props) {
    const { format } = useCurrency();
    const { confirm, success } = useAlert();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    function deleteTx(id: number, label = 'transaksi') {
        confirm({
            title: 'Hapus transaksi?',
            description: `${label} akan dihapus dari portfolio kamu secara permanen.`,
            confirmLabel: 'Hapus',
            danger: true,
            onConfirm: () =>
                router.delete(`/holdings/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => success('Transaksi berhasil dihapus.'),
                }),
        });
    }

    const totalUp = totals.pnl >= 0;

    return (
        <AppShell>
            <Head title="Portfolio" />

            {/* ── Header ───────────────────────────────── */}
            <div className="mb-6 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Portfolio</h1>
                    <p className="text-sm text-[var(--muted)]">
                        Tracking realtime: nilai, biaya rata-rata, dan unrealized P/L.
                    </p>
                </div>
            </div>

            {/* ── Summary cards ────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <BigCard label="Total Value"    value={format(totals.value)} />
                <BigCard label="Total Cost"     value={format(totals.cost)} />
                <BigCard
                    label="Unrealized P/L"
                    value={format(totals.pnl)}
                    sub={fmtPct(totals.pnl_pct)}
                    color={totalUp ? 'text-emerald-400' : 'text-red-400'}
                    accent={totalUp ? 'emerald' : 'red'}
                />
                <BigCard label="Aset" value={String(assets.length)} />
            </div>

            {/* ── Holdings table ───────────────────────── */}
            <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <h2 className="flex items-center gap-2 font-semibold">
                        <Briefcase className="h-4 w-4 text-[var(--muted)]" /> Holdings
                    </h2>
                    <span className="text-xs text-[var(--muted)]">
                        Tambah transaksi dari halaman aset masing-masing.
                    </span>
                </div>

                {assets.length === 0 ? (
                    <div className="px-4 py-14 text-center">
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-2)]">
                            <Briefcase className="h-5 w-5 text-[var(--muted)]" />
                        </div>
                        <p className="text-sm text-[var(--muted)]">
                            Belum ada transaksi.
                            <br />
                            Buka halaman aset → "Posisi Saya" → "Tambah" untuk mulai tracking.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-[var(--border)]">
                                <tr className="text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                                    <th className="w-8 px-3 py-3" />
                                    <th className="px-3 py-3">Aset</th>
                                    <th className="px-3 py-3 text-right">Qty</th>
                                    <th className="px-3 py-3 text-right">Avg Cost</th>
                                    <th className="px-3 py-3 text-right">Harga</th>
                                    <th className="px-3 py-3 text-right">Value</th>
                                    <th className="px-3 py-3 text-right">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((a) => {
                                    const key  = `${a.type}:${a.symbol}`;
                                    const open = !!expanded[key];
                                    const up   = (a.pnl ?? 0) >= 0;
                                    return (
                                        <>
                                            <tr
                                                key={key}
                                                className="border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]"
                                            >
                                                <td className="px-3 py-3">
                                                    <button
                                                        onClick={() =>
                                                            setExpanded((s) => ({ ...s, [key]: !s[key] }))
                                                        }
                                                        className="rounded-md p-0.5 text-[var(--muted)] transition hover:text-[var(--fg)]"
                                                    >
                                                        {open ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Link
                                                        href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        {a.image ? (
                                                            <img
                                                                src={a.image}
                                                                alt=""
                                                                className="h-7 w-7 rounded-full ring-1 ring-[var(--border)]"
                                                            />
                                                        ) : (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-[10px] font-bold text-[var(--muted)]">
                                                                {(a.symbol || '?').slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-semibold">{a.name}</div>
                                                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                                                {a.type} · {a.symbol}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono">{fmtQty(a.quantity)}</td>
                                                <td className="px-3 py-3 text-right font-mono">{format(a.avg_price)}</td>
                                                <td className="px-3 py-3 text-right font-mono">{format(a.current_price)}</td>
                                                <td className="px-3 py-3 text-right font-mono font-semibold">{format(a.value)}</td>
                                                <td className={`px-3 py-3 text-right font-mono ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    <div className="inline-flex items-center justify-end gap-1 font-semibold">
                                                        {up ? (
                                                            <TrendingUp className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <TrendingDown className="h-3.5 w-3.5" />
                                                        )}
                                                        {format(a.pnl)}
                                                    </div>
                                                    <div className="text-[10px] opacity-80">{fmtPct(a.pnl_pct)}</div>
                                                </td>
                                            </tr>

                                            {/* Expanded transactions */}
                                            {open && (
                                                <tr
                                                    key={`${key}-tx`}
                                                    className="border-t border-[var(--border)] bg-[var(--surface-2)]"
                                                >
                                                    <td />
                                                    <td colSpan={6} className="px-3 py-3">
                                                        <table className="w-full text-xs">
                                                            <thead className="text-[var(--muted)]">
                                                                <tr>
                                                                    <th className="py-1 text-left font-semibold">Side</th>
                                                                    <th className="py-1 text-right font-semibold">Qty</th>
                                                                    <th className="py-1 text-right font-semibold">Entry</th>
                                                                    <th className="py-1 text-right font-semibold">Date</th>
                                                                    <th />
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {a.transactions.map((t) => (
                                                                    <tr
                                                                        key={t.id}
                                                                        className="group border-t border-[var(--border)]"
                                                                    >
                                                                        <td className="py-1.5">
                                                                            <span
                                                                                className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                                                    t.side === 'buy'
                                                                                        ? 'bg-emerald-500/15 text-emerald-300'
                                                                                        : 'bg-red-500/15 text-red-300'
                                                                                }`}
                                                                            >
                                                                                {t.side}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-1.5 text-right font-mono">
                                                                            {fmtQty(t.quantity)}
                                                                        </td>
                                                                        <td className="py-1.5 text-right font-mono">
                                                                            {format(t.entry_price)}
                                                                        </td>
                                                                        <td className="py-1.5 text-right text-[var(--muted)]">
                                                                            {t.purchased_at ?? '—'}
                                                                        </td>
                                                                        <td className="py-1.5 text-right">
                                                                            <button
                                                                                onClick={() =>
                                                                                    deleteTx(
                                                                                        t.id,
                                                                                        `${t.side.toUpperCase()} ${fmtQty(t.quantity)} ${a.symbol}`,
                                                                                    )
                                                                                }
                                                                                className="rounded-lg p-1 text-[var(--muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                                                                aria-label="Hapus"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AppShell>
    );
}

function BigCard({
    label,
    value,
    sub,
    color,
    accent,
}: {
    label: string;
    value: string;
    sub?: string;
    color?: string;
    accent?: 'emerald' | 'red';
}) {
    return (
        <div
            className={`overflow-hidden rounded-2xl border bg-[var(--surface)] px-4 py-4 transition ${
                accent === 'emerald'
                    ? 'border-emerald-500/20 hover:border-emerald-500/40'
                    : accent === 'red'
                      ? 'border-red-500/20 hover:border-red-500/40'
                      : 'border-[var(--border)]'
            }`}
        >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</div>
            <div className="mt-0.5 font-mono text-lg font-bold">{value}</div>
            {sub && <div className={`mt-0.5 font-mono text-xs font-semibold ${color}`}>{sub}</div>}
        </div>
    );
}
