import {
    AreaSeries,
    BarSeries,
    CandlestickSeries,
    ColorType,
    HistogramSeries,
    LineSeries,
    createChart,
    type IChartApi,
    type ISeriesApi,
    type Time,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { bollinger, ema, sma } from './indicators';

export type Candle = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number | null;
};

export type ChartType = 'candles' | 'line' | 'area' | 'bars';

export type IndicatorState = {
    ma20?: boolean;
    ma50?: boolean;
    ema12?: boolean;
    ema26?: boolean;
    bollinger?: boolean;
    volume?: boolean;
};

export type ForecastPoint = { time: number; price: number; lower: number; upper: number };

type Props = {
    candles: Candle[];
    chartType?: ChartType;
    indicators?: IndicatorState;
    overlay?: { name?: string; candles: Candle[] };
    forecast?: ForecastPoint[];
    theme?: 'dark' | 'light';
    height?: number;
    className?: string;
};

export function PriceChart({
    candles,
    chartType = 'candles',
    indicators,
    overlay,
    forecast,
    theme = 'dark',
    height = 460,
    className,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const priceRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Bar'> | null>(null);
    const overlayRef = useRef<ISeriesApi<'Line'> | null>(null);
    const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const ma20Ref = useRef<ISeriesApi<'Line'> | null>(null);
    const ma50Ref = useRef<ISeriesApi<'Line'> | null>(null);
    const ema12Ref = useRef<ISeriesApi<'Line'> | null>(null);
    const ema26Ref = useRef<ISeriesApi<'Line'> | null>(null);
    const bbUpRef = useRef<ISeriesApi<'Line'> | null>(null);
    const bbMidRef = useRef<ISeriesApi<'Line'> | null>(null);
    const bbDnRef = useRef<ISeriesApi<'Line'> | null>(null);
    const fcLineRef = useRef<ISeriesApi<'Line'> | null>(null);
    const fcUpRef = useRef<ISeriesApi<'Line'> | null>(null);
    const fcDnRef = useRef<ISeriesApi<'Line'> | null>(null);

    // Create / destroy chart — runs on mount and when theme or height changes
    useEffect(() => {
        if (!containerRef.current) return;

        const isDark = theme === 'dark';
        const chart = createChart(containerRef.current, {
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
            timeScale: {
                borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.15)',
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: { mode: 1 },
            autoSize: true,
        });
        chartRef.current = chart;

        const ro = new ResizeObserver(() => chart.applyOptions({}));
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            priceRef.current = null;
            overlayRef.current = null;
            volRef.current = null;
            ma20Ref.current = null;
            ma50Ref.current = null;
            ema12Ref.current = null;
            ema26Ref.current = null;
            bbUpRef.current = null;
            bbMidRef.current = null;
            bbDnRef.current = null;
            fcLineRef.current = null;
            fcUpRef.current = null;
            fcDnRef.current = null;
        };
    }, [theme, height]);

    // (Re)build price series when chart or chartType changes
    // Must include theme+height so it re-fires whenever the chart is recreated
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        if (priceRef.current) {
            chart.removeSeries(priceRef.current);
            priceRef.current = null;
        }
        switch (chartType) {
            case 'candles':
                priceRef.current = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderUpColor: '#10b981',
                    borderDownColor: '#ef4444',
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });
                break;
            case 'bars':
                priceRef.current = chart.addSeries(BarSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                });
                break;
            case 'area':
                priceRef.current = chart.addSeries(AreaSeries, {
                    lineColor: '#10b981',
                    topColor: 'rgba(16,185,129,0.25)',
                    bottomColor: 'rgba(16,185,129,0.0)',
                    lineWidth: 2,
                });
                break;
            case 'line':
            default:
                priceRef.current = chart.addSeries(LineSeries, {
                    color: '#10b981',
                    lineWidth: 2,
                });
                break;
        }
    }, [chartType, theme, height]);

    // Load data into price series
    useEffect(() => {
        const series = priceRef.current;
        if (!series || candles.length === 0) return;

        if (chartType === 'candles' || chartType === 'bars') {
            const data = candles.map((c) => ({
                time: c.time as Time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));
            (series as ISeriesApi<'Candlestick'>).setData(data);
        } else {
            const data = candles.map((c) => ({ time: c.time as Time, value: c.close }));
            (series as ISeriesApi<'Line'>).setData(data);
        }

        chartRef.current?.timeScale().fitContent();
    }, [candles, chartType, theme, height]);

    // Volume bars
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const hasVol = candles.some((c) => c.volume != null);
        if (indicators?.volume && hasVol) {
            if (!volRef.current) {
                volRef.current = chart.addSeries(HistogramSeries, {
                    priceFormat: { type: 'volume' },
                    priceScaleId: '',
                    color: '#475569',
                });
                volRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            }
            volRef.current.setData(
                candles.map((c) => ({
                    time: c.time as Time,
                    value: (c.volume ?? 0) as number,
                    color: c.close >= c.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
                })),
            );
        } else if (volRef.current) {
            chart.removeSeries(volRef.current);
            volRef.current = null;
        }
    }, [indicators?.volume, candles, theme, height]);

    // Overlay series (compare mode)
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        if (overlayRef.current) {
            chart.removeSeries(overlayRef.current);
            overlayRef.current = null;
        }
        if (!overlay || overlay.candles.length === 0) return;

        overlayRef.current = chart.addSeries(LineSeries, {
            color: '#f59e0b',
            lineWidth: 2,
            priceScaleId: 'left',
            title: overlay.name ?? 'B',
        });
        chart.priceScale('left').applyOptions({ visible: true });
        overlayRef.current.setData(
            overlay.candles.map((c) => ({ time: c.time as Time, value: c.close })),
        );
    }, [overlay, candles, theme, height]);

    // Moving averages, EMA, Bollinger
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const closes = candles.map((c) => c.close);

        function setLine(
            ref: React.RefObject<ISeriesApi<'Line'> | null>,
            enabled: boolean | undefined,
            values: (number | null)[],
            color: string,
            title?: string,
        ) {
            if (enabled) {
                if (!ref.current) {
                    ref.current = chart!.addSeries(LineSeries, {
                        color,
                        lineWidth: 1,
                        priceLineVisible: false,
                        lastValueVisible: false,
                        title,
                    });
                }
                ref.current.setData(
                    candles
                        .map((c, i) => (values[i] != null ? { time: c.time as Time, value: values[i] as number } : null))
                        .filter(Boolean) as { time: Time; value: number }[],
                );
            } else if (ref.current) {
                chart!.removeSeries(ref.current);
                ref.current = null;
            }
        }

        setLine(ma20Ref, indicators?.ma20, sma(closes, 20), '#60a5fa', 'MA 20');
        setLine(ma50Ref, indicators?.ma50, sma(closes, 50), '#f59e0b', 'MA 50');
        setLine(ema12Ref, indicators?.ema12, ema(closes, 12), '#22d3ee', 'EMA 12');
        setLine(ema26Ref, indicators?.ema26, ema(closes, 26), '#a78bfa', 'EMA 26');

        if (indicators?.bollinger) {
            const bb = bollinger(closes, 20, 2);
            setLine(bbUpRef, true, bb.upper, 'rgba(244,114,182,0.7)', 'BB Up');
            setLine(bbMidRef, true, bb.mid, 'rgba(244,114,182,0.4)', 'BB Mid');
            setLine(bbDnRef, true, bb.lower, 'rgba(244,114,182,0.7)', 'BB Low');
        } else {
            setLine(bbUpRef, false, [], '');
            setLine(bbMidRef, false, [], '');
            setLine(bbDnRef, false, [], '');
        }
    }, [
        indicators?.ma20,
        indicators?.ma50,
        indicators?.ema12,
        indicators?.ema26,
        indicators?.bollinger,
        candles,
        theme,
        height,
    ]);

    // Forecast overlay
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        if (fcLineRef.current) { chart.removeSeries(fcLineRef.current); fcLineRef.current = null; }
        if (fcUpRef.current)   { chart.removeSeries(fcUpRef.current);   fcUpRef.current = null;   }
        if (fcDnRef.current)   { chart.removeSeries(fcDnRef.current);   fcDnRef.current = null;   }

        if (!forecast || forecast.length === 0 || candles.length === 0) return;

        const lastPrice = candles[candles.length - 1].close;
        const lastTime  = candles[candles.length - 1].time;
        const head = { time: lastTime as Time, value: lastPrice };

        fcLineRef.current = chart.addSeries(LineSeries, {
            color: '#a78bfa',
            lineWidth: 2,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            title: 'Forecast',
        });
        fcLineRef.current.setData([head, ...forecast.map((p) => ({ time: p.time as Time, value: p.price }))]);

        fcUpRef.current = chart.addSeries(LineSeries, {
            color: 'rgba(167,139,250,0.55)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        fcUpRef.current.setData([head, ...forecast.map((p) => ({ time: p.time as Time, value: p.upper }))]);

        fcDnRef.current = chart.addSeries(LineSeries, {
            color: 'rgba(167,139,250,0.55)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        fcDnRef.current.setData([head, ...forecast.map((p) => ({ time: p.time as Time, value: p.lower }))]);
    }, [forecast, candles, theme, height]);

    const containerStyle = className ? { width: '100%' } : { width: '100%', height };

    return <div ref={containerRef} className={className} style={containerStyle} />;
}
