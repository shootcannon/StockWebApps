export type CurrencyCode = 'USD' | 'IDR' | 'EUR' | 'JPY' | 'GBP' | 'SGD';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'IDR', 'EUR', 'JPY', 'GBP', 'SGD'];

export function fmtCurrency(n: number | null | undefined, currency: string = 'USD', maxFrac?: number): string {
    if (n == null || Number.isNaN(n)) return '—';
    const abs = Math.abs(n);
    const frac = maxFrac ?? (abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8);
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: frac,
            minimumFractionDigits: abs >= 1 ? 2 : 0,
        }).format(n);
    } catch {
        return n.toFixed(frac);
    }
}

export function fmtBig(n: number | null | undefined, prefix = '$'): string {
    if (n == null) return '—';
    const sign = n < 0 ? '-' : '';
    const v = Math.abs(n);
    if (v >= 1e12) return `${sign}${prefix}${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${sign}${prefix}${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${sign}${prefix}${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${sign}${prefix}${(v / 1e3).toFixed(2)}K`;
    return `${sign}${prefix}${v.toFixed(2)}`;
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
    if (n == null || Number.isNaN(n)) return '—';
    const s = n >= 0 ? '+' : '';
    return `${s}${n.toFixed(digits)}%`;
}

export function fmtQty(n: number | null | undefined): string {
    if (n == null) return '—';
    const abs = Math.abs(n);
    const frac = abs >= 100 ? 2 : abs >= 1 ? 4 : 8;
    return n.toLocaleString('en-US', { maximumFractionDigits: frac });
}
