import { Head, router } from '@inertiajs/react';
import { ArrowLeftRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { PriceChart, type Candle } from '../components/PriceChart';
import { useCurrency } from '../lib/currency';
import { fmtPct } from '../lib/format';
import { useTheme } from '../lib/theme';

type Side = {
    type: 'crypto' | 'stock';
    symbol: string;
    quote: {
        ticker: string;
        name: string;
        image?: string | null;
        price: number;
        change_24h_pct: number;
        currency: string;
    } | null;
    candles: Candle[];
};

type Props = { a: Side; b: Side; range: string };

const RANGES = ['1mo', '3mo', '6mo', '1y', 'max'];

type SearchResult = {
    type: 'crypto' | 'stock';
    symbol: string;
    ticker: string;
    name: string;
    image?: string | null;
};

function Picker({
    side,
    onPick,
}: {
    side: 'A' | 'B';
    onPick: (r: SearchResult) => void;
}) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<{ crypto: SearchResult[]; stock: SearchResult[] }>({
        crypto: [],
        stock: [],
    });
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!q) {
            setResults({ crypto: [], stock: [] });
            return;
        }
        const t = window.setTimeout(async () => {
            const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            if (r.ok) setResults(await r.json());
        }, 250);
        return () => window.clearTimeout(t);
    }, [q]);

    return (
        <div className="relative">
            <input
                value={q}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                placeholder={`Ganti aset ${side}…`}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm"
            />
            {open && (results.crypto.length > 0 || results.stock.length > 0) && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] shadow-xl">
                    {[...results.crypto, ...results.stock].slice(0, 12).map((r) => (
                        <button
                            key={`${r.type}:${r.symbol}`}
                            onClick={() => {
                                onPick(r);
                                setOpen(false);
                                setQ('');
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-3)]"
                        >
                            {r.image && <img src={r.image} alt="" className="h-5 w-5 rounded-full" />}
                            <span className="font-medium">{r.ticker}</span>
                            <span className="text-xs text-[var(--muted)]">{r.name}</span>
                            <span className="ml-auto rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] uppercase">
                                {r.type}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Compare({ a, b, range }: Props) {
    const { format } = useCurrency();
    const { theme } = useTheme();

    function update(params: Record<string, string>) {
        router.get(
            '/compare',
            {
                a_type: a.type,
                a: a.symbol,
                b_type: b.type,
                b: b.symbol,
                range,
                ...params,
            },
            { preserveScroll: true },
        );
    }

    // Normalize to percent-from-start so the chart shows relative perf.
    const normalize = (candles: Candle[]): Candle[] => {
        if (candles.length === 0) return candles;
        const base = candles[0].close;
        return candles.map((c) => ({
            ...c,
            open: ((c.open - base) / base) * 100,
            high: ((c.high - base) / base) * 100,
            low: ((c.low - base) / base) * 100,
            close: ((c.close - base) / base) * 100,
        }));
    };

    const aN = normalize(a.candles);
    const bN = normalize(b.candles);

    return (
        <AppShell>
            <Head title={`Compare: ${a.symbol} vs ${b.symbol}`} />

            <div className="mb-4 flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                <h1 className="text-2xl font-semibold">Compare</h1>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-2 flex items-center gap-2">
                        {a.quote?.image && <img src={a.quote.image} alt="" className="h-7 w-7 rounded-full" />}
                        <div>
                            <div className="font-semibold">{a.quote?.name ?? a.symbol}</div>
                            <div className="text-[10px] uppercase text-[var(--muted)]">
                                {a.type} · {a.symbol}
                            </div>
                        </div>
                        <div className="ml-auto text-right">
                            <div className="font-mono">{format(a.quote?.price)}</div>
                            <div
                                className={`font-mono text-xs ${
                                    (a.quote?.change_24h_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                            >
                                {fmtPct(a.quote?.change_24h_pct)}
                            </div>
                        </div>
                    </div>
                    <Picker
                        side="A"
                        onPick={(r) => update({ a_type: r.type, a: r.symbol })}
                    />
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-2 flex items-center gap-2">
                        {b.quote?.image && <img src={b.quote.image} alt="" className="h-7 w-7 rounded-full" />}
                        <div>
                            <div className="font-semibold">{b.quote?.name ?? b.symbol}</div>
                            <div className="text-[10px] uppercase text-[var(--muted)]">
                                {b.type} · {b.symbol}
                            </div>
                        </div>
                        <div className="ml-auto text-right">
                            <div className="font-mono">{format(b.quote?.price)}</div>
                            <div
                                className={`font-mono text-xs ${
                                    (b.quote?.change_24h_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                            >
                                {fmtPct(b.quote?.change_24h_pct)}
                            </div>
                        </div>
                    </div>
                    <Picker
                        side="B"
                        onPick={(r) => update({ b_type: r.type, b: r.symbol })}
                    />
                </div>
            </div>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-[var(--muted)]">
                        Relative performance · start = 0% (normalized)
                    </div>
                    <div className="flex gap-1">
                        {RANGES.map((r) => (
                            <button
                                key={r}
                                onClick={() => update({ range: r })}
                                className={`rounded px-2 py-1 text-xs ${
                                    range === r
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]'
                                }`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
                        {a.quote?.ticker ?? a.symbol}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="inline-block h-2 w-3 rounded-sm bg-amber-500" />
                        {b.quote?.ticker ?? b.symbol}
                    </div>
                </div>

                <PriceChart
                    candles={aN}
                    chartType="line"
                    overlay={{ candles: bN, name: b.quote?.ticker ?? b.symbol }}
                    theme={theme}
                    className="h-[240px] sm:h-[360px] md:h-[460px]"
                />
            </section>
        </AppShell>
    );
}
