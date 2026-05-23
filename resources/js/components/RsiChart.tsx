import { ColorType, LineSeries, createChart, type IChartApi, type Time } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { rsi } from './indicators';
import type { Candle } from './PriceChart';

export function RsiChart({
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

        const series = chart.addSeries(LineSeries, {
            color: '#a78bfa',
            lineWidth: 2,
            priceLineVisible: false,
        });

        const closes = candles.map((c) => c.close);
        const r = rsi(closes, 14);
        const data = candles
            .map((c, i) => (r[i] != null ? { time: c.time as Time, value: r[i] as number } : null))
            .filter(Boolean) as { time: Time; value: number }[];
        series.setData(data);

        series.createPriceLine({
            price: 70,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'OB',
        });
        series.createPriceLine({
            price: 30,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'OS',
        });

        chart.timeScale().fitContent();

        return () => chart.remove();
    }, [candles, height, theme]);

    return <div ref={ref} style={{ width: '100%', height }} />;
}
