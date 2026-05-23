import { AlertTriangle, Brain, ChevronsUpDown, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { fmtPct } from '../lib/format';

export type Signal = {
    name: string;
    value: string | number;
    verdict: 'bullish' | 'bearish' | 'neutral';
    reason: string;
};

export type Levels = {
    period_high?: number;
    period_low?: number;
    pivot?: number;
    r1?: number;
    r2?: number;
    s1?: number;
    s2?: number;
};

export type ForecastSummary = {
    horizon_steps: number;
    expected_return_pct: number | null;
    annualized_volatility_pct: number | null;
    last_price: number | null;
    projected_low_90: number | null;
    projected_high_90: number | null;
    projected_central: number | null;
    trend_slope_per_step: number | null;
};

export type ForecastData = {
    projection: { time: number; price: number; lower: number; upper: number }[];
    signals: Signal[];
    sentiment: { score: number; label: string; bullish_count: number; bearish_count: number };
    levels: Levels;
    summary: ForecastSummary;
};

export function ForecastPanel({ data }: { data: ForecastData }) {
    const { format } = useCurrency();
    const s = data.summary;
    const sentimentColor = data.sentiment.score > 15
        ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
        : data.sentiment.score < -15
          ? 'text-red-300 bg-red-500/15 border-red-500/30'
          : 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    const isUp = (s.expected_return_pct ?? 0) >= 0;

    if (!data.projection || data.projection.length === 0) {
        return (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-400" />
                <p className="text-sm text-[var(--muted)]">
                    Data historis tidak cukup untuk membuat prediksi. Coba range yang lebih panjang.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Sentiment / overall */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-1">
                <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Brain className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Sentimen Teknikal</span>
                </div>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${sentimentColor}`}>
                    {data.sentiment.label}
                </div>
                <div className="mt-3 text-xs text-[var(--muted)]">
                    Bullish: <span className="text-emerald-400">{data.sentiment.bullish_count}</span> ·
                    {' '}Bearish: <span className="text-red-400">{data.sentiment.bearish_count}</span>
                </div>
                <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-[var(--muted)]">
                        <span>Bearish</span>
                        <span>Bullish</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                            className="absolute top-0 h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 opacity-40"
                            style={{ left: 0, right: 0 }}
                        />
                        <div
                            className="absolute top-[-2px] h-3 w-1 bg-[var(--fg)]"
                            style={{ left: `${50 + data.sentiment.score / 2}%` }}
                        />
                    </div>
                    <div className="mt-1 text-right text-[10px] text-[var(--muted)]">
                        Skor: {data.sentiment.score.toFixed(1)}
                    </div>
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <div className="text-[10px] uppercase text-[var(--muted)]">Proyeksi 30 hari ke depan</div>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-2xl">{format(s.projected_central)}</span>
                        <span
                            className={`inline-flex items-center font-mono text-sm ${
                                isUp ? 'text-emerald-400' : 'text-red-400'
                            }`}
                        >
                            {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {fmtPct(s.expected_return_pct)}
                        </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                        Rentang 90%: {format(s.projected_low_90)} → {format(s.projected_high_90)}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                        Volatilitas tahunan: {s.annualized_volatility_pct?.toFixed(1) ?? '—'}%
                    </div>
                </div>
            </div>

            {/* Signals */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-[var(--muted)]">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Sinyal Indikator</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.signals.map((sig) => (
                        <div
                            key={sig.name}
                            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                        >
                            <span
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                                    sig.verdict === 'bullish'
                                        ? 'bg-emerald-500/15 text-emerald-300'
                                        : sig.verdict === 'bearish'
                                          ? 'bg-red-500/15 text-red-300'
                                          : 'bg-amber-500/15 text-amber-300'
                                }`}
                            >
                                {sig.verdict === 'bullish' ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : sig.verdict === 'bearish' ? (
                                    <TrendingDown className="h-4 w-4" />
                                ) : (
                                    <ChevronsUpDown className="h-4 w-4" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{sig.name}</span>
                                    <span className="font-mono text-xs">{String(sig.value)}</span>
                                </div>
                                <div className="text-[11px] text-[var(--muted)]">{sig.reason}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <div className="mb-3 flex items-center gap-2 text-[var(--muted)]">
                        <Target className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">Support &amp; Resistance</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <LevelBox label="R2" value={format(data.levels.r2)} tone="red" />
                        <LevelBox label="R1" value={format(data.levels.r1)} tone="red" />
                        <LevelBox label="S1" value={format(data.levels.s1)} tone="emerald" />
                        <LevelBox label="S2" value={format(data.levels.s2)} tone="emerald" />
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--muted)]">
                        Pivot: <span className="font-mono">{format(data.levels.pivot)}</span> · Period High:{' '}
                        <span className="font-mono">{format(data.levels.period_high)}</span> · Low:{' '}
                        <span className="font-mono">{format(data.levels.period_low)}</span>
                    </div>
                </div>

                <p className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    Prediksi ini berbasis statistik teknikal (regresi log-linear + sinyal RSI/MACD/MA). Bukan
                    rekomendasi finansial. Pasar bisa bergerak di luar rentang akibat berita & event makro.
                </p>
            </div>
        </div>
    );
}

function LevelBox({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'red' | 'emerald';
}) {
    const color = tone === 'red' ? 'text-red-300 border-red-500/20' : 'text-emerald-300 border-emerald-500/20';
    return (
        <div className={`rounded-md border bg-[var(--surface-2)] p-2 ${color}`}>
            <div className="text-[10px] uppercase tracking-wider">{label}</div>
            <div className="mt-0.5 font-mono text-xs">{value}</div>
        </div>
    );
}
