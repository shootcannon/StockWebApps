import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SUPPORTED_CURRENCIES, type CurrencyCode, fmtCurrency } from './format';

type CurrencyContextValue = {
    currency: CurrencyCode;
    setCurrency: (c: CurrencyCode) => void;
    rate: number; // USD -> currency
    convert: (usdValue: number | null | undefined) => number | null;
    format: (usdValue: number | null | undefined, maxFrac?: number) => string;
};

const Ctx = createContext<CurrencyContextValue>({
    currency: 'USD',
    setCurrency: () => {},
    rate: 1,
    convert: (v) => (v == null ? null : v),
    format: (v) => fmtCurrency(v, 'USD'),
});

const STORAGE = 'fufas:currency';

function readInitial(): CurrencyCode {
    if (typeof window === 'undefined') return 'USD';
    const v = window.localStorage.getItem(STORAGE) as CurrencyCode | null;
    return v && SUPPORTED_CURRENCIES.includes(v) ? v : 'USD';
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyCode>(readInitial);
    const [rate, setRate] = useState<number>(1);

    const setCurrency = useCallback((c: CurrencyCode) => {
        setCurrencyState(c);
        try {
            window.localStorage.setItem(STORAGE, c);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (currency === 'USD') {
            setRate(1);
            return;
        }
        fetch(`/api/fx/${currency}`)
            .then((r) => r.json())
            .then((d) => {
                if (!cancelled && typeof d.rate === 'number') setRate(d.rate);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [currency]);

    const value = useMemo<CurrencyContextValue>(() => {
        const convert = (v: number | null | undefined) => (v == null ? null : v * rate);
        const format = (v: number | null | undefined, maxFrac?: number) =>
            fmtCurrency(convert(v), currency, maxFrac);
        return { currency, setCurrency, rate, convert, format };
    }, [currency, rate, setCurrency]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
    return useContext(Ctx);
}
