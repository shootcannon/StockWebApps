import { Head, router } from '@inertiajs/react';
import {
    BarChart2,
    Bell,
    BookOpen,
    Brain,
    Briefcase as BriefcaseIcon,
    Calculator,
    LinkIcon,
    Newspaper,
    Pencil,
    Plus,
    Star,
    Trash2,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useAlert } from '../components/FufasAlert';
import { FufasChartOverlay } from '../components/FufasLoader';
import { ForecastPanel, type ForecastData } from '../components/ForecastPanel';
import { LiveBadge } from '../components/LiveBadge';
import { MacdChart } from '../components/MacdChart';
import { PriceChart, type Candle, type ChartType, type IndicatorState } from '../components/PriceChart';
import { RsiChart } from '../components/RsiChart';
import { useCurrency } from '../lib/currency';
import { fmtBig, fmtQty } from '../lib/format';
import { useTheme } from '../lib/theme';

type Quote = {
    type: 'crypto' | 'stock';
    symbol: string;
    ticker: string;
    name: string;
    image?: string | null;
    price: number;
    change_24h_pct: number;
    market_cap?: number | null;
    volume?: number | null;
    high_24h?: number | null;
    low_24h?: number | null;
    currency: string;
    exchange?: string | null;
};

type Note    = { id: number; title: string | null; body: string; created_at: string };
type Alert   = { id: number; condition: 'above' | 'below'; price: string | number; active: boolean; triggered: boolean };
type Holding = { id: number; side: 'buy' | 'sell'; quantity: string | number; entry_price: string | number; purchased_at: string | null; note: string | null };
type News    = { title: string; publisher: string; link: string | null; published: number | null; thumbnail: string | null };

type Props = {
    type: 'crypto' | 'stock';
    symbol: string;
    quote: Quote | null;
    candles: Candle[];
    forecast: ForecastData;
    notes: Note[];
    alerts: Alert[];
    holdings: Holding[];
    inWatchlist: boolean;
    news: News[];
    fetched_at: string;
};

const RANGES: { label: string; range: string; interval: string }[] = [
    { label: '1D',  range: '1d',   interval: '5m'  },
    { label: '5D',  range: '5d',   interval: '15m' },
    { label: '1M',  range: '1mo',  interval: '1d'  },
    { label: '3M',  range: '3mo',  interval: '1d'  },
    { label: '6M',  range: '6mo',  interval: '1d'  },
    { label: '1Y',  range: '1y',   interval: '1wk' },
    { label: 'All', range: 'max',  interval: '1mo' },
];

const CHART_TYPES: { id: ChartType; label: string }[] = [
    { id: 'candles', label: 'Candles' },
    { id: 'line',    label: 'Line'    },
    { id: 'area',    label: 'Area'    },
    { id: 'bars',    label: 'Bars'    },
];

type Tab = 'chart' | 'forecast' | 'analysis' | 'positions' | 'news';

export default function AssetPage(props: Props) {
    const { type, symbol, quote, notes, alerts, holdings, inWatchlist, news } = props;
    const { format, currency, rate } = useCurrency();
    const { theme } = useTheme();
    const { confirm, success, error, info } = useAlert();

    const [candles,              setCandles]              = useState<Candle[]>(props.candles);
    const [forecast,             setForecast]             = useState<ForecastData>(props.forecast);
    const [rangeIdx,             setRangeIdx]             = useState(3);
    const [chartType,            setChartType]            = useState<ChartType>('candles');
    const [indicators,           setIndicators]           = useState<IndicatorState>({
        ma20: true, ma50: true, ema12: false, ema26: false, bollinger: false, volume: true,
    });
    const [showRSI,              setShowRSI]              = useState(false);
    const [showMACD,             setShowMACD]             = useState(false);
    const [loading,              setLoading]              = useState(false);
    const [tab,                  setTab]                  = useState<Tab>('chart');
    const [showForecastOnChart,  setShowForecastOnChart]  = useState(true);
    const [fetchedAt,            setFetchedAt]            = useState(props.fetched_at);

    // notes
    const [noteOpen,    setNoteOpen]    = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [noteTitle,   setNoteTitle]   = useState('');
    const [noteBody,    setNoteBody]    = useState('');

    // alert form
    const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
    const [alertPrice,     setAlertPrice]     = useState('');

    // holding form
    const [holdingOpen, setHoldingOpen] = useState(false);
    const [hSide,  setHSide]  = useState<'buy' | 'sell'>('buy');
    const [hQty,   setHQty]   = useState('');
    const [hEntry, setHEntry] = useState('');
    const [hDate,  setHDate]  = useState('');

    // converter
    const [convAmount, setConvAmount] = useState('1');

    useEffect(() => {
        let cancelled = false;
        const r = RANGES[rangeIdx];
        setLoading(true);
        fetch(`/api/candles/${type}/${encodeURIComponent(symbol)}?range=${r.range}&interval=${r.interval}`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setCandles(data.candles ?? []);
                if (data.forecast) setForecast(data.forecast);
                setFetchedAt(new Date().toISOString());
            })
            .catch(() => {})
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [rangeIdx, type, symbol]);

    async function refresh() {
        try {
            await fetch(`/api/refresh/${type}/${encodeURIComponent(symbol)}`, { method: 'POST' });
        } catch { /* ignore */ }
        router.reload({ preserveScroll: true, preserveState: false });
    }

    const up = (quote?.change_24h_pct ?? 0) >= 0;

    const stats = useMemo(() => {
        if (candles.length === 0) return null;
        const closes = candles.map((c) => c.close);
        const min = Math.min(...candles.map((c) => c.low));
        const max = Math.max(...candles.map((c) => c.high));
        const ma20 = closes.slice(-20);
        const ma20Avg = ma20.reduce((a, b) => a + b, 0) / ma20.length;
        const rets: number[] = [];
        for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        const meanR = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
        const variance = rets.reduce((a, b) => a + (b - meanR) ** 2, 0) / (rets.length || 1);
        const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
        return { min, max, ma20: ma20Avg, vol };
    }, [candles]);

    const netQty = useMemo(() => {
        let q = 0; let cost = 0;
        for (const h of holdings) {
            const sign = h.side === 'sell' ? -1 : 1;
            q += sign * Number(h.quantity);
            cost += sign * Number(h.quantity) * Number(h.entry_price);
        }
        return { qty: q, avg: q !== 0 ? cost / q : 0, cost };
    }, [holdings]);

    function addToWatchlist() {
        router.post(
            '/watchlist',
            { type, symbol, name: quote?.name ?? symbol, image: quote?.image ?? null },
            {
                preserveScroll: true,
                onSuccess: () => success(`${quote?.name ?? symbol} ditambahkan ke watchlist!`),
                onError: () => error('Gagal menambahkan ke watchlist.'),
            },
        );
    }

    function openCreateNote() {
        setEditingNote(null); setNoteTitle(''); setNoteBody('');
        setNoteOpen(true);
    }

    function openEditNote(n: Note) {
        setEditingNote(n); setNoteTitle(n.title ?? ''); setNoteBody(n.body);
        setNoteOpen(true);
    }

    function submitNote(e: React.FormEvent) {
        e.preventDefault();
        if (editingNote) {
            router.patch(`/notes/${editingNote.id}`, { title: noteTitle, body: noteBody }, {
                preserveScroll: true,
                onSuccess: () => { setNoteOpen(false); success('Catatan diperbarui.'); },
                onError: () => error('Gagal menyimpan catatan.'),
            });
        } else {
            router.post('/notes', { type, symbol, title: noteTitle, body: noteBody }, {
                preserveScroll: true,
                onSuccess: () => { setNoteOpen(false); success('Catatan disimpan!'); },
                onError: () => error('Gagal menyimpan catatan.'),
            });
        }
    }

    function deleteNote(n: Note) {
        confirm({
            title: 'Hapus catatan?',
            description: n.title ? `"${n.title}" akan dihapus permanen.` : 'Catatan ini akan dihapus permanen.',
            confirmLabel: 'Hapus',
            danger: true,
            onConfirm: () =>
                router.delete(`/notes/${n.id}`, {
                    preserveScroll: true,
                    onSuccess: () => success('Catatan dihapus.'),
                }),
        });
    }

    function submitAlert(e: React.FormEvent) {
        e.preventDefault();
        const p = parseFloat(alertPrice);
        if (!p || p <= 0) { error('Masukkan harga yang valid.'); return; }
        router.post('/alerts', { type, symbol, condition: alertCondition, price: p }, {
            preserveScroll: true,
            onSuccess: () => { setAlertPrice(''); success('Alert berhasil dibuat!'); },
            onError: () => error('Gagal membuat alert.'),
        });
    }

    function deleteAlert(a: Alert) {
        confirm({
            title: 'Hapus alert?',
            description: `Alert ${a.condition === 'above' ? 'di atas' : 'di bawah'} $${a.price} akan dihapus.`,
            confirmLabel: 'Hapus',
            danger: true,
            onConfirm: () =>
                router.delete(`/alerts/${a.id}`, {
                    preserveScroll: true,
                    onSuccess: () => success('Alert dihapus.'),
                }),
        });
    }

    function toggleAlert(a: Alert) {
        router.patch(`/alerts/${a.id}`, { active: !a.active }, {
            preserveScroll: true,
            onSuccess: () => info(a.active ? 'Alert di-pause.' : 'Alert diaktifkan kembali.'),
        });
    }

    function submitHolding(e: React.FormEvent) {
        e.preventDefault();
        const qty = parseFloat(hQty); const entry = parseFloat(hEntry);
        if (!qty || !entry) { error('Isi jumlah dan harga entry.'); return; }
        router.post('/holdings', {
            type, symbol,
            name: quote?.name ?? symbol,
            image: quote?.image ?? null,
            side: hSide, quantity: qty, entry_price: entry,
            currency: 'USD', purchased_at: hDate || null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setHoldingOpen(false); setHQty(''); setHEntry(''); setHDate('');
                success('Transaksi berhasil dicatat!');
            },
            onError: () => error('Gagal menyimpan transaksi.'),
        });
    }

    function deleteHolding(id: number) {
        confirm({
            title: 'Hapus transaksi?',
            description: 'Transaksi ini akan dihapus dari portfolio kamu.',
            confirmLabel: 'Hapus',
            danger: true,
            onConfirm: () =>
                router.delete(`/holdings/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => success('Transaksi dihapus.'),
                }),
        });
    }

    function copyLink() {
        if (typeof window === 'undefined') return;
        navigator.clipboard?.writeText(window.location.href);
        info('Link disalin!');
    }

    const convertedAmount = (parseFloat(convAmount) || 0) * (quote?.price ?? 0) * rate;
    const reversePrice    = (parseFloat(convAmount) || 0) / (quote?.price || 1);
    const dataSource      = type === 'crypto' ? 'CoinGecko' : 'Yahoo Finance';

    return (
        <AppShell>
            <Head title={quote ? `${quote.ticker} – ${quote.name}` : symbol} />

            {/* ── Asset header ─────────────────────────── */}
            <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-start gap-3">
                    {quote?.image && (
                        <img
                            src={quote.image}
                            alt=""
                            className="h-12 w-12 rounded-full shadow ring-2 ring-[var(--border)]"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <h1 className="text-xl font-bold leading-tight">{quote?.name ?? symbol}</h1>
                            <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                                {quote?.ticker ?? symbol}
                            </span>
                            <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                {type}
                            </span>
                            {quote?.exchange && (
                                <span className="text-[10px] text-[var(--muted)]">{quote.exchange}</span>
                            )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-2xl font-bold">{format(quote?.price)}</span>
                            <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-xs font-semibold ${
                                    up
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-red-500/10 text-red-400'
                                }`}
                            >
                                {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {(quote?.change_24h_pct ?? 0).toFixed(2)}%
                                <span className="text-[var(--muted)]">24h</span>
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <LiveBadge fetchedAt={fetchedAt} source={dataSource} onRefresh={refresh} />
                            <div className="flex gap-1.5">
                                <button
                                    onClick={copyLink}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs transition hover:bg-[var(--surface-3)]"
                                >
                                    <LinkIcon className="h-3 w-3" /> Share
                                </button>
                                <button
                                    onClick={addToWatchlist}
                                    disabled={inWatchlist}
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-60 ${
                                        inWatchlist
                                            ? 'border-amber-500/30 bg-amber-500/8 text-amber-300'
                                            : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-300'
                                    }`}
                                >
                                    <Star className={`h-3 w-3 ${inWatchlist ? 'fill-amber-400 text-amber-400' : ''}`} />
                                    {inWatchlist ? 'Tersimpan' : '+ Watchlist'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick stats ──────────────────────────── */}
            <div className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
                <StatBox label="Market Cap"  value={fmtBig(quote?.market_cap)} />
                <StatBox label="Volume 24h"  value={fmtBig(quote?.volume)} />
                <StatBox label="24h High"    value={format(quote?.high_24h)} />
                <StatBox label="24h Low"     value={format(quote?.low_24h)} />
                <StatBox label="Period High" value={format(stats?.max)} />
                <StatBox label="Vol (ann.)"  value={stats?.vol ? `${stats.vol.toFixed(1)}%` : '—'} />
            </div>

            {/* ── Tabs ─────────────────────────────────── */}
            <div className="mb-4 flex gap-0.5 overflow-x-auto border-b border-[var(--border)]">
                <TabBtn icon={BarChart2}     active={tab === 'chart'}     onClick={() => setTab('chart')}>Chart</TabBtn>
                <TabBtn icon={Brain}         active={tab === 'forecast'}  onClick={() => setTab('forecast')}>Prediksi</TabBtn>
                <TabBtn icon={BookOpen}      active={tab === 'analysis'}  onClick={() => setTab('analysis')}>Analisa</TabBtn>
                <TabBtn icon={BriefcaseIcon} active={tab === 'positions'} onClick={() => setTab('positions')}>Posisi</TabBtn>
                <TabBtn icon={Newspaper}     active={tab === 'news'}      onClick={() => setTab('news')}>Berita</TabBtn>
            </div>

            {/* ── TAB: Chart ───────────────────────────── */}
            {tab === 'chart' && (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-1">
                            {RANGES.map((r, i) => (
                                <button
                                    key={r.label}
                                    onClick={() => setRangeIdx(i)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                        rangeIdx === i
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--fg)]'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex shrink-0 overflow-hidden rounded-lg border border-[var(--border)] text-xs">
                            {CHART_TYPES.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setChartType(c.id)}
                                    className={`px-2.5 py-1 font-medium transition ${
                                        chartType === c.id
                                            ? 'bg-[var(--surface-3)] text-[var(--fg)]'
                                            : 'text-[var(--muted)] hover:text-[var(--fg)]'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1">
                        {([
                            { key: 'ma20',     label: 'MA 20',    dot: '#60a5fa' },
                            { key: 'ma50',     label: 'MA 50',    dot: '#f59e0b' },
                            { key: 'ema12',    label: 'EMA 12',   dot: '#22d3ee' },
                            { key: 'ema26',    label: 'EMA 26',   dot: '#a78bfa' },
                            { key: 'bollinger',label: 'Bollinger',dot: '#f472b6' },
                            { key: 'volume',   label: 'Volume',   dot: '#94a3b8' },
                        ] as const).map(({ key, label, dot }) => (
                            <Toggle
                                key={key}
                                label={label}
                                active={!!indicators[key]}
                                onClick={() => setIndicators((s) => ({ ...s, [key]: !s[key] }))}
                                dot={dot}
                            />
                        ))}
                        <Toggle label="RSI"      active={showRSI}             onClick={() => setShowRSI((v) => !v)}             dot="#a78bfa" />
                        <Toggle label="MACD"     active={showMACD}            onClick={() => setShowMACD((v) => !v)}            dot="#22d3ee" />
                        <Toggle label="Forecast" active={showForecastOnChart} onClick={() => setShowForecastOnChart((v) => !v)} dot="#c4b5fd" />
                    </div>

                    <div className="relative">
                        {loading && <FufasChartOverlay />}
                        <PriceChart
                            candles={candles}
                            chartType={chartType}
                            indicators={indicators}
                            forecast={showForecastOnChart ? forecast.projection : undefined}
                            theme={theme}
                            className="h-[220px] sm:h-[320px] md:h-[460px]"
                        />
                        {showRSI && (
                            <div className="mt-3 border-t border-[var(--border)] pt-3">
                                <div className="mb-1.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                                    <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                                    RSI (14)
                                </div>
                                <RsiChart candles={candles} theme={theme} />
                            </div>
                        )}
                        {showMACD && (
                            <div className="mt-3 border-t border-[var(--border)] pt-3">
                                <div className="mb-1.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                                    <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                                    MACD (12, 26, 9)
                                </div>
                                <MacdChart candles={candles} theme={theme} />
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── TAB: Forecast ────────────────────────── */}
            {tab === 'forecast' && <ForecastPanel data={forecast} />}

            {/* ── TAB: Analysis ────────────────────────── */}
            {tab === 'analysis' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Notes */}
                    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                            <h3 className="flex items-center gap-2 font-semibold">
                                <BookOpen className="h-4 w-4 text-[var(--muted)]" /> Catatan Analisa
                            </h3>
                            <button
                                onClick={openCreateNote}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
                            >
                                <Plus className="h-3 w-3" /> Tambah
                            </button>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {notes.length === 0 && (
                                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                                    Belum ada catatan. Tulis ide trading / analisa fundamental.
                                </p>
                            )}
                            {notes.map((n) => (
                                <div key={n.id} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            {n.title && (
                                                <div className="font-semibold text-[var(--fg)]">{n.title}</div>
                                            )}
                                            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
                                                {n.body}
                                            </p>
                                            <div className="mt-1.5 text-[10px] text-[var(--muted)]">
                                                {new Date(n.created_at).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditNote(n)}
                                                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                                                aria-label="Edit"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => deleteNote(n)}
                                                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-400"
                                                aria-label="Hapus"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Alerts */}
                    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                            <h3 className="flex items-center gap-2 font-semibold">
                                <Bell className="h-4 w-4 text-[var(--muted)]" /> Alert Harga
                            </h3>
                        </div>
                        <form onSubmit={submitAlert} className="border-b border-[var(--border)] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-[var(--muted)]">Notifikasi jika</span>
                                <select
                                    value={alertCondition}
                                    onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm transition focus:border-emerald-500/60 focus:outline-none"
                                >
                                    <option value="above">di atas</option>
                                    <option value="below">di bawah</option>
                                </select>
                                <input
                                    type="number"
                                    step="any"
                                    value={alertPrice}
                                    onChange={(e) => setAlertPrice(e.target.value)}
                                    placeholder={quote ? quote.price.toString() : '0'}
                                    className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 font-mono text-sm transition focus:border-emerald-500/60 focus:outline-none"
                                    required
                                />
                                <span className="text-xs text-[var(--muted)]">USD</span>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
                                >
                                    Set Alert
                                </button>
                            </div>
                        </form>
                        <div className="divide-y divide-[var(--border)]">
                            {alerts.length === 0 && (
                                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                                    Belum ada alert untuk aset ini.
                                </p>
                            )}
                            {alerts.map((a) => (
                                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                a.triggered
                                                    ? 'bg-amber-500/15 text-amber-300'
                                                    : a.active
                                                      ? 'bg-emerald-500/15 text-emerald-300'
                                                      : 'bg-[var(--surface-3)] text-[var(--muted)]'
                                            }`}
                                        >
                                            {a.triggered ? 'triggered' : a.active ? 'active' : 'off'}
                                        </span>
                                        <span className="text-[var(--muted)]">
                                            {a.condition === 'above' ? '↑ above' : '↓ below'}
                                        </span>
                                        <span className="font-mono">{format(Number(a.price))}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleAlert(a)}
                                            className="rounded-lg px-2 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                                        >
                                            {a.active ? 'Pause' : 'Aktifkan'}
                                        </button>
                                        <button
                                            onClick={() => deleteAlert(a)}
                                            className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-400"
                                            aria-label="Hapus"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Converter */}
                    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
                        <h3 className="mb-3 flex items-center gap-2 font-semibold">
                            <Calculator className="h-4 w-4 text-[var(--muted)]" /> Converter
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-medium text-[var(--muted)]">
                                    Jumlah {quote?.ticker ?? symbol}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={convAmount}
                                    onChange={(e) => setConvAmount(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm transition focus:border-emerald-500/60 focus:outline-none"
                                />
                                <div className="mt-1.5 text-xs text-[var(--muted)]">
                                    ={' '}
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency,
                                        maximumFractionDigits: 2,
                                    }).format(convertedAmount)}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--muted)]">USD</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={convAmount}
                                    onChange={(e) => setConvAmount(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm transition focus:border-emerald-500/60 focus:outline-none"
                                />
                                <div className="mt-1.5 text-xs text-[var(--muted)]">
                                    = {fmtQty(reversePrice)} {quote?.ticker ?? symbol}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* ── TAB: Positions ───────────────────────── */}
            {tab === 'positions' && (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <BriefcaseIcon className="h-4 w-4 text-[var(--muted)]" /> Posisi Saya
                        </h3>
                        <button
                            onClick={() => setHoldingOpen(true)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
                        >
                            <Plus className="h-3 w-3" /> Tambah Transaksi
                        </button>
                    </div>

                    {netQty.qty !== 0 && (
                        <div className="grid grid-cols-3 gap-px border-b border-[var(--border)] bg-[var(--border)]">
                            <div className="bg-[var(--surface)] p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Net Qty</div>
                                <div className="mt-0.5 font-mono text-sm font-bold">{fmtQty(netQty.qty)}</div>
                            </div>
                            <div className="bg-[var(--surface)] p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Avg Entry</div>
                                <div className="mt-0.5 font-mono text-sm font-bold">{format(netQty.avg)}</div>
                            </div>
                            <div className="bg-[var(--surface)] p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Unrealized P/L</div>
                                <div className={`mt-0.5 font-mono text-sm font-bold ${
                                    quote && netQty.qty * quote.price - netQty.cost >= 0
                                        ? 'text-emerald-400'
                                        : 'text-red-400'
                                }`}>
                                    {quote ? format(netQty.qty * quote.price - netQty.cost) : '—'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-[var(--border)]">
                        {holdings.length === 0 && (
                            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                                Belum ada posisi. Catat pembelian / penjualan untuk track P/L.
                            </p>
                        )}
                        {holdings.map((h) => (
                            <div key={h.id} className="group flex items-center justify-between px-4 py-3 text-sm transition hover:bg-[var(--surface-2)]">
                                <div className="flex items-center gap-2.5">
                                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                        h.side === 'buy'
                                            ? 'bg-emerald-500/15 text-emerald-300'
                                            : 'bg-red-500/15 text-red-300'
                                    }`}>
                                        {h.side}
                                    </span>
                                    <span className="font-mono font-semibold">{fmtQty(Number(h.quantity))}</span>
                                    <span className="text-[var(--muted)]">@</span>
                                    <span className="font-mono">{format(Number(h.entry_price))}</span>
                                    {h.purchased_at && (
                                        <span className="text-[10px] text-[var(--muted)]">{h.purchased_at}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => deleteHolding(h.id)}
                                    className="rounded-lg p-1.5 text-[var(--muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                                    aria-label="Hapus"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── TAB: News ────────────────────────────── */}
            {tab === 'news' && (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <Newspaper className="h-4 w-4 text-[var(--muted)]" /> Berita Terkait
                        </h3>
                        <span className="text-[10px] text-[var(--muted)]">Yahoo Finance</span>
                    </div>
                    {news.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                            Belum ada berita untuk aset ini.
                        </p>
                    ) : (
                        <ul className="divide-y divide-[var(--border)]">
                            {news.map((n, i) => (
                                <li key={i}>
                                    <a
                                        href={n.link ?? '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex gap-3 px-4 py-3 transition hover:bg-[var(--surface-2)]"
                                    >
                                        {n.thumbnail && (
                                            <img
                                                src={n.thumbnail}
                                                alt=""
                                                className="h-16 w-24 shrink-0 rounded-lg object-cover"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <div className="line-clamp-2 text-sm font-semibold">{n.title}</div>
                                            <div className="mt-1.5 text-[10px] text-[var(--muted)]">
                                                {n.publisher}
                                                {n.published &&
                                                    ` · ${new Date(n.published * 1000).toLocaleString('id-ID')}`}
                                            </div>
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {/* ── Note modal ───────────────────────────── */}
            {noteOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ animation: 'fade-in 0.18s ease-out' }}
                >
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={() => setNoteOpen(false)} />
                    <form
                        onSubmit={submitNote}
                        className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
                        style={{ animation: 'modal-in 0.2s ease-out' }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-bold">{editingNote ? 'Edit Catatan' : 'Catatan Baru'}</h4>
                            <button
                                type="button"
                                onClick={() => setNoteOpen(false)}
                                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <input
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="Judul (opsional)"
                            className="mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm transition focus:border-emerald-500/60 focus:outline-none"
                        />
                        <textarea
                            value={noteBody}
                            onChange={(e) => setNoteBody(e.target.value)}
                            placeholder="Tulis analisa, target harga, alasan beli/jual…"
                            rows={8}
                            required
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm transition focus:border-emerald-500/60 focus:outline-none"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setNoteOpen(false)}
                                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Holding modal ────────────────────────── */}
            {holdingOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ animation: 'fade-in 0.18s ease-out' }}
                >
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={() => setHoldingOpen(false)} />
                    <form
                        onSubmit={submitHolding}
                        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
                        style={{ animation: 'modal-in 0.2s ease-out' }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-bold">Tambah Transaksi</h4>
                            <button
                                type="button"
                                onClick={() => setHoldingOpen(false)}
                                className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setHSide('buy')}
                                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                        hSide === 'buy'
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                            : 'border-[var(--border)] text-[var(--muted)] hover:border-emerald-500/30'
                                    }`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHSide('sell')}
                                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                        hSide === 'sell'
                                            ? 'border-red-500 bg-red-500/10 text-red-300'
                                            : 'border-[var(--border)] text-[var(--muted)] hover:border-red-500/30'
                                    }`}
                                >
                                    Sell
                                </button>
                            </div>
                            <input
                                type="number"
                                step="any"
                                value={hQty}
                                onChange={(e) => setHQty(e.target.value)}
                                required
                                placeholder="Jumlah / Quantity"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm focus:border-emerald-500/60 focus:outline-none"
                            />
                            <input
                                type="number"
                                step="any"
                                value={hEntry}
                                onChange={(e) => setHEntry(e.target.value)}
                                required
                                placeholder={`Harga entry (USD)${quote ? ` — sekarang ${quote.price.toFixed(2)}` : ''}`}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm focus:border-emerald-500/60 focus:outline-none"
                            />
                            <input
                                type="date"
                                value={hDate}
                                onChange={(e) => setHDate(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm focus:border-emerald-500/60 focus:outline-none"
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setHoldingOpen(false)}
                                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AppShell>
    );
}

/* ── Sub-components ──────────────────────────────────── */

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[var(--surface)] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</div>
            <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
        </div>
    );
}

function TabBtn({
    icon: Icon,
    active,
    onClick,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                active
                    ? 'border-emerald-400 text-[var(--fg)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
        >
            <Icon className="h-4 w-4" />
            {children}
        </button>
    );
}

function Toggle({
    label,
    active,
    onClick,
    dot,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    dot: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                active
                    ? 'border-[var(--border)] bg-[var(--surface-3)] text-[var(--fg)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
        >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
            {label}
        </button>
    );
}
