import { Link, usePage } from '@inertiajs/react';
import fufasLogo from '../logo.png';
import {
    ArrowLeftRight,
    BarChart3,
    Briefcase,
    LineChart,
    Moon,
    Search,
    Sun,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CurrencyProvider, useCurrency } from '../lib/currency';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../lib/format';
import { ThemeProvider, useTheme } from '../lib/theme';
import { AlertProvider } from './FufasAlert';
import { FufasProgress } from './FufasLoader';

type SearchResult = {
    type: 'crypto' | 'stock';
    symbol: string;
    ticker: string;
    name: string;
    image?: string | null;
    exchange?: string;
};

const navLinks = [
    { href: '/',         label: 'Dashboard', icon: LineChart       },
    { href: '/markets',  label: 'Markets',   icon: BarChart3       },
    { href: '/portfolio',label: 'Portfolio', icon: Briefcase       },
    { href: '/compare',  label: 'Compare',   icon: ArrowLeftRight  },
];

function Header() {
    const { url } = usePage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<{ crypto: SearchResult[]; stock: SearchResult[] }>({
        crypto: [],
        stock: [],
    });
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const timer = useRef<number | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { theme, toggle } = useTheme();
    const { currency, setCurrency } = useCurrency();

    useEffect(() => {
        if (!q) {
            setResults({ crypto: [], stock: [] });
            setSearching(false);
            return;
        }
        setSearching(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(async () => {
            try {
                const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
                if (r.ok) setResults(await r.json());
            } catch {
                /* ignore */
            } finally {
                setSearching(false);
            }
        }, 250);
    }, [q]);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const allResults = results.crypto.length + results.stock.length;

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">

                {/* Logo */}
                <Link
                    href="/"
                    className="group flex shrink-0 items-center gap-2 font-bold text-[var(--fg)]"
                >
                    <img
                        src={fufasLogo}
                        alt="Fufas"
                        className="h-12 w-12 object-contain drop-shadow-md transition duration-300 group-hover:scale-110 group-hover:drop-shadow-lg"
                    />
                    <span className="hidden sm:flex flex-col leading-none">
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-base font-black tracking-[0.3em] text-transparent drop-shadow-sm">
                            FUFAS
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                            Markets
                        </span>
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden gap-0.5 md:flex">
                    {navLinks.map((n) => {
                        const active =
                            (n.href === '/' && url === '/') ||
                            (n.href !== '/' && url.startsWith(n.href));
                        return (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    active
                                        ? 'bg-emerald-500/12 text-emerald-300'
                                        : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]'
                                }`}
                            >
                                <n.icon
                                    className={`h-3.5 w-3.5 ${active ? 'text-emerald-400' : ''}`}
                                />
                                {n.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Search */}
                <div className="relative flex-1" ref={boxRef}>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                        {searching && (
                            <span
                                className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-[var(--border)] border-t-emerald-400"
                                style={{ animation: 'fufas-spin 0.7s linear infinite' }}
                            />
                        )}
                        <input
                            ref={inputRef}
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="Cari aset… (⌘K)"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-9 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition focus:border-emerald-500/60 focus:bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
                        />
                    </div>

                    {open && allResults > 0 && (
                        <div className="absolute left-0 right-0 mt-1.5 max-h-96 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                            {results.crypto.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                                        Crypto
                                    </div>
                                    {results.crypto.map((r) => (
                                        <Link
                                            key={`c-${r.symbol}`}
                                            href={`/asset/${r.type}/${r.symbol}`}
                                            onClick={() => { setOpen(false); setQ(''); }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                                        >
                                            {r.image ? (
                                                <img src={r.image} alt="" className="h-6 w-6 rounded-full" />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-emerald-500/10" />
                                            )}
                                            <span className="font-semibold text-[var(--fg)]">{r.ticker}</span>
                                            <span className="text-xs text-[var(--muted)]">{r.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {results.stock.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                                        Stocks
                                    </div>
                                    {results.stock.map((r) => (
                                        <Link
                                            key={`s-${r.symbol}`}
                                            href={`/asset/${r.type}/${encodeURIComponent(r.symbol)}`}
                                            onClick={() => { setOpen(false); setQ(''); }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                                        >
                                            <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500/10 text-[10px] font-bold text-sky-400">
                                                {r.ticker.slice(0, 2)}
                                            </div>
                                            <span className="font-semibold text-[var(--fg)]">{r.ticker}</span>
                                            <span className="text-xs text-[var(--muted)]">{r.name}</span>
                                            {r.exchange && (
                                                <span className="ml-auto rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                                                    {r.exchange}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="hidden items-center gap-1.5 sm:flex">
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--fg)] transition focus:border-emerald-500/60 focus:outline-none"
                    >
                        {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                        onClick={toggle}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-emerald-500/40 hover:bg-[var(--surface-3)] hover:text-[var(--fg)]"
                        title="Toggle tema"
                    >
                        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>

            {/* Mobile nav */}
            <nav className="flex gap-0.5 overflow-x-auto border-t border-[var(--border)] px-2 py-1.5 md:hidden">
                {navLinks.map((n) => {
                    const active =
                        (n.href === '/' && url === '/') ||
                        (n.href !== '/' && url.startsWith(n.href));
                    return (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                active
                                    ? 'bg-emerald-500/12 text-emerald-300'
                                    : 'text-[var(--muted)] hover:text-[var(--fg)]'
                            }`}
                        >
                            <n.icon className="h-3.5 w-3.5" />
                            {n.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}

/* ── Shell ──────────────────────────────────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <CurrencyProvider>
                <AlertProvider>
                    <FufasProgress />
                    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
                        <Header />
                        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
                        <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-[10px] text-[var(--muted)]">
                            © {new Date().getFullYear()} Fufas Markets · Data: CoinGecko + Yahoo Finance
                        </footer>
                    </div>
                </AlertProvider>
            </CurrencyProvider>
        </ThemeProvider>
    );
}
