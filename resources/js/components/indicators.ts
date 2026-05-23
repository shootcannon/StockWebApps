export function sma(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        out.push(i >= period - 1 ? sum / period : null);
    }
    return out;
}

export function ema(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        const v = values[i] * k + prev * (1 - k);
        out[i] = v;
        prev = v;
    }
    return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length <= period) return out;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = values[i] - values[i - 1];
        if (diff >= 0) gain += diff;
        else loss -= diff;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        const g = diff > 0 ? diff : 0;
        const l = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + g) / period;
        avgLoss = (avgLoss * (period - 1) + l) / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return out;
}

export function stdev(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    const ma = sma(values, period);
    for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const m = ma[i] as number;
        const variance = slice.reduce((a, b) => a + (b - m) ** 2, 0) / period;
        out[i] = Math.sqrt(variance);
    }
    return out;
}

export function bollinger(values: number[], period = 20, mult = 2) {
    const mid = sma(values, period);
    const sd = stdev(values, period);
    const upper: (number | null)[] = mid.map((m, i) => (m != null && sd[i] != null ? m + mult * (sd[i] as number) : null));
    const lower: (number | null)[] = mid.map((m, i) => (m != null && sd[i] != null ? m - mult * (sd[i] as number) : null));
    return { upper, mid, lower };
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
    const emaFast = ema(values, fast);
    const emaSlow = ema(values, slow);
    const macdLine = values.map((_, i) => {
        if (emaFast[i] == null || emaSlow[i] == null) return null;
        return (emaFast[i] as number) - (emaSlow[i] as number);
    });
    const macdValid = macdLine.map((v) => (v == null ? 0 : v));
    const sig = ema(macdValid, signal).map((v, i) => (macdLine[i] == null ? null : v));
    const hist = macdLine.map((m, i) => (m == null || sig[i] == null ? null : (m as number) - (sig[i] as number)));
    return { macd: macdLine, signal: sig, hist };
}
