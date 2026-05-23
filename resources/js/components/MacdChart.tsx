import {
    ColorType,
    HistogramSeries,
    LineSeries,
    createChart,
    type IChartApi,
    type Time,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { macd } from './indicators';
import type { Candle } from './PriceChart';

export function MacdChart({
    candles,
    height = 140,
    theme = 'dark',
}: {
    candles: Candle[];
    height?: number;
    theme?: 'dark' | 'light';
}) {
    const ref = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        const isDark = theme === 'dark';
        const chart = createChart(ref.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#94a3b8' : '#475569',
                fontFamily: 'Instrument Sans, ui-sans-serif, system-ui',
            },
            grid: {
                vertLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)' },
                horzLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)' },
            },
            rightPriceScale: { borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.15)' },
            timeScale: { borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.15)', visible: false },
            autoSize: true,
            height,
        });
        chartRef.current = chart;

        const { macd: line, signal, hist } = macd(candles.map((c) => c.close));

        const histSeries = chart.addSeries(HistogramSeries, { priceLineVisible: false });
        histSeries.setData(
            candles
                .map((c, i) =>
                    hist[i] != null
                        ? {
                              time: c.time as Time,
                              value: hist[i] as number,
                              color: (hist[i] as number) >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)',
                          }
                        : null,
                )
                .filter(Boolean) as { time: Time; value: number; color: string }[],
        );

        const macdLine = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 1.5, priceLineVisible: false });
        macdLine.setData(
            candles
                .map((c, i) => (line[i] != null ? { time: c.time as Time, value: line[i] as number } : null))
                .filter(Boolean) as { time: Time; value: number }[],
        );

        const sigLine = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false });
        sigLine.setData(
            candles
                .map((c, i) => (signal[i] != null ? { time: c.time as Time, value: signal[i] as number } : null))
                .filter(Boolean) as { time: Time; value: number }[],
        );

        chart.timeScale().fitContent();
        return () => chart.remove();
    }, [candles, height, theme]);

    return <div ref={ref} style={{ width: '100%', height }} />;
}
