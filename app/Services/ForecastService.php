<?php

namespace App\Services;

class ForecastService
{
    /**
     * Build a forecast bundle for the given OHLC candles.
     *
     * @param  array<int, array{time:int, open:float, high:float, low:float, close:float, volume?:float|null}>  $candles
     * @return array{
     *   projection: array,
     *   signals: array,
     *   sentiment: array,
     *   levels: array,
     *   summary: array
     * }
     */
    public function forecast(array $candles, int $horizon = 30): array
    {
        if (count($candles) < 14) {
            return $this->empty();
        }

        $closes = array_map(fn ($c) => (float) $c['close'], $candles);
        $highs = array_map(fn ($c) => (float) $c['high'], $candles);
        $lows = array_map(fn ($c) => (float) $c['low'], $candles);
        $times = array_map(fn ($c) => (int) $c['time'], $candles);

        // Approximate sampling interval (in seconds)
        $intervals = [];
        for ($i = 1; $i < count($times); $i++) {
            $intervals[] = $times[$i] - $times[$i - 1];
        }
        sort($intervals);
        $interval = $intervals[(int) (count($intervals) / 2)]; // median

        $logCloses = array_map('log', $closes);

        // Linear regression on log prices
        [$slope, $intercept] = $this->linreg($logCloses);

        // Residual stdev
        $resid = [];
        foreach ($logCloses as $i => $y) {
            $pred = $intercept + $slope * $i;
            $resid[] = $y - $pred;
        }
        $sigma = $this->stdev($resid);

        $lastIdx = count($closes) - 1;
        $lastTime = $times[$lastIdx];
        $lastPrice = $closes[$lastIdx];

        $projection = [];
        for ($i = 1; $i <= $horizon; $i++) {
            $idx = $lastIdx + $i;
            $logPred = $intercept + $slope * $idx;
            $z = 1.645; // 90% CI
            $widen = $sigma * sqrt($i);
            $price = exp($logPred);
            $lower = exp($logPred - $z * $widen);
            $upper = exp($logPred + $z * $widen);
            $projection[] = [
                'time' => $lastTime + $i * $interval,
                'price' => $price,
                'lower' => $lower,
                'upper' => $upper,
            ];
        }

        // Signals
        $signals = $this->signals($closes);
        $levels = $this->levels($highs, $lows, $closes);

        $expectedReturnPct = ($projection ? ($projection[count($projection) - 1]['price'] / $lastPrice - 1) * 100 : 0);
        $annualizedVol = $this->dailyReturnVolatility($closes) * sqrt(365) * 100;

        $sentiment = $this->sentiment($signals, $slope, $expectedReturnPct);

        return [
            'projection' => $projection,
            'signals' => $signals,
            'sentiment' => $sentiment,
            'levels' => $levels,
            'summary' => [
                'horizon_steps' => $horizon,
                'expected_return_pct' => $expectedReturnPct,
                'annualized_volatility_pct' => $annualizedVol,
                'last_price' => $lastPrice,
                'projected_low_90' => $projection[count($projection) - 1]['lower'] ?? null,
                'projected_high_90' => $projection[count($projection) - 1]['upper'] ?? null,
                'projected_central' => $projection[count($projection) - 1]['price'] ?? null,
                'trend_slope_per_step' => $slope,
            ],
        ];
    }

    private function linreg(array $y): array
    {
        $n = count($y);
        $sumX = $sumY = $sumXY = $sumX2 = 0;
        for ($i = 0; $i < $n; $i++) {
            $sumX += $i;
            $sumY += $y[$i];
            $sumXY += $i * $y[$i];
            $sumX2 += $i * $i;
        }
        $denom = ($n * $sumX2 - $sumX * $sumX);
        $slope = $denom != 0 ? ($n * $sumXY - $sumX * $sumY) / $denom : 0;
        $intercept = ($sumY - $slope * $sumX) / $n;

        return [$slope, $intercept];
    }

    private function stdev(array $v): float
    {
        $n = count($v);
        if ($n < 2) {
            return 0;
        }
        $mean = array_sum($v) / $n;
        $var = 0;
        foreach ($v as $x) {
            $var += ($x - $mean) ** 2;
        }

        return sqrt($var / ($n - 1));
    }

    private function dailyReturnVolatility(array $closes): float
    {
        $rets = [];
        for ($i = 1; $i < count($closes); $i++) {
            if ($closes[$i - 1] > 0) {
                $rets[] = log($closes[$i] / $closes[$i - 1]);
            }
        }

        return $this->stdev($rets);
    }

    private function sma(array $values, int $period): array
    {
        $out = [];
        $sum = 0;
        for ($i = 0; $i < count($values); $i++) {
            $sum += $values[$i];
            if ($i >= $period) {
                $sum -= $values[$i - $period];
            }
            $out[$i] = $i >= $period - 1 ? $sum / $period : null;
        }

        return $out;
    }

    private function ema(array $values, int $period): array
    {
        $out = array_fill(0, count($values), null);
        if (count($values) < $period) {
            return $out;
        }
        $k = 2 / ($period + 1);
        $seed = array_sum(array_slice($values, 0, $period)) / $period;
        $out[$period - 1] = $seed;
        $prev = $seed;
        for ($i = $period; $i < count($values); $i++) {
            $v = $values[$i] * $k + $prev * (1 - $k);
            $out[$i] = $v;
            $prev = $v;
        }

        return $out;
    }

    private function rsi(array $values, int $period = 14): array
    {
        $out = array_fill(0, count($values), null);
        if (count($values) <= $period) {
            return $out;
        }
        $gain = 0;
        $loss = 0;
        for ($i = 1; $i <= $period; $i++) {
            $diff = $values[$i] - $values[$i - 1];
            if ($diff >= 0) {
                $gain += $diff;
            } else {
                $loss -= $diff;
            }
        }
        $avgG = $gain / $period;
        $avgL = $loss / $period;
        $out[$period] = $avgL == 0 ? 100 : 100 - 100 / (1 + $avgG / $avgL);
        for ($i = $period + 1; $i < count($values); $i++) {
            $diff = $values[$i] - $values[$i - 1];
            $g = $diff > 0 ? $diff : 0;
            $l = $diff < 0 ? -$diff : 0;
            $avgG = ($avgG * ($period - 1) + $g) / $period;
            $avgL = ($avgL * ($period - 1) + $l) / $period;
            $out[$i] = $avgL == 0 ? 100 : 100 - 100 / (1 + $avgG / $avgL);
        }

        return $out;
    }

    private function macd(array $values, int $fast = 12, int $slow = 26, int $signalPeriod = 9): array
    {
        $emaFast = $this->ema($values, $fast);
        $emaSlow = $this->ema($values, $slow);
        $macd = [];
        foreach ($values as $i => $_v) {
            $macd[$i] = ($emaFast[$i] !== null && $emaSlow[$i] !== null) ? $emaFast[$i] - $emaSlow[$i] : null;
        }
        $macdValid = array_map(fn ($v) => $v ?? 0, $macd);
        $signal = $this->ema($macdValid, $signalPeriod);
        foreach ($signal as $i => $_) {
            if ($macd[$i] === null) {
                $signal[$i] = null;
            }
        }
        $hist = [];
        foreach ($macd as $i => $m) {
            $hist[$i] = ($m !== null && $signal[$i] !== null) ? $m - $signal[$i] : null;
        }

        return ['macd' => $macd, 'signal' => $signal, 'hist' => $hist];
    }

    private function signals(array $closes): array
    {
        $last = $closes[count($closes) - 1];
        $rsi = $this->rsi($closes, 14);
        $rsiNow = $rsi[count($rsi) - 1];
        $ma20 = $this->sma($closes, 20);
        $ma50 = $this->sma($closes, 50);
        $ma20Now = $ma20[count($ma20) - 1];
        $ma50Now = $ma50[count($ma50) - 1];
        $ma20Prev = $ma20[count($ma20) - 2] ?? null;
        $ma50Prev = $ma50[count($ma50) - 2] ?? null;
        $macd = $this->macd($closes);
        $hist = $macd['hist'];
        $histNow = $hist[count($hist) - 1] ?? null;
        $histPrev = $hist[count($hist) - 2] ?? null;

        // Cross detection
        $cross = null;
        if ($ma20Prev !== null && $ma50Prev !== null && $ma20Now !== null && $ma50Now !== null) {
            if ($ma20Prev <= $ma50Prev && $ma20Now > $ma50Now) {
                $cross = 'golden';
            } elseif ($ma20Prev >= $ma50Prev && $ma20Now < $ma50Now) {
                $cross = 'death';
            }
        }

        $signals = [];

        // RSI
        if ($rsiNow !== null) {
            if ($rsiNow >= 70) {
                $signals[] = ['name' => 'RSI', 'value' => round($rsiNow, 1), 'verdict' => 'bearish', 'reason' => 'Overbought (≥70)'];
            } elseif ($rsiNow <= 30) {
                $signals[] = ['name' => 'RSI', 'value' => round($rsiNow, 1), 'verdict' => 'bullish', 'reason' => 'Oversold (≤30)'];
            } else {
                $signals[] = ['name' => 'RSI', 'value' => round($rsiNow, 1), 'verdict' => 'neutral', 'reason' => 'Netral 30–70'];
            }
        }

        // MA50 trend
        if ($ma50Now !== null) {
            $diff = ($last - $ma50Now) / $ma50Now * 100;
            $signals[] = [
                'name' => 'Harga vs MA50',
                'value' => round($diff, 2).'%',
                'verdict' => $diff > 0 ? 'bullish' : 'bearish',
                'reason' => $diff > 0 ? 'Harga di atas MA50 (uptrend)' : 'Harga di bawah MA50 (downtrend)',
            ];
        }

        // MA20 vs MA50
        if ($ma20Now !== null && $ma50Now !== null) {
            $diff = ($ma20Now - $ma50Now) / $ma50Now * 100;
            $signals[] = [
                'name' => 'MA20 vs MA50',
                'value' => round($diff, 2).'%',
                'verdict' => $diff > 0 ? 'bullish' : 'bearish',
                'reason' => $cross === 'golden'
                    ? 'Golden Cross (baru)'
                    : ($cross === 'death'
                        ? 'Death Cross (baru)'
                        : ($diff > 0 ? 'MA20 di atas MA50' : 'MA20 di bawah MA50')),
            ];
        }

        // MACD
        if ($histNow !== null) {
            $verdict = $histNow > 0 ? 'bullish' : 'bearish';
            $note = $histPrev !== null && $histPrev <= 0 && $histNow > 0
                ? 'Crossover bullish (baru)'
                : ($histPrev !== null && $histPrev >= 0 && $histNow < 0
                    ? 'Crossover bearish (baru)'
                    : ($histNow > 0 ? 'Momentum positif' : 'Momentum negatif'));
            $signals[] = [
                'name' => 'MACD',
                'value' => round($histNow, 4),
                'verdict' => $verdict,
                'reason' => $note,
            ];
        }

        return $signals;
    }

    private function levels(array $highs, array $lows, array $closes): array
    {
        $n = count($closes);
        $window = min(60, $n);
        $hSlice = array_slice($highs, -$window);
        $lSlice = array_slice($lows, -$window);
        $cSlice = array_slice($closes, -$window);

        $maxH = max($hSlice);
        $minL = min($lSlice);

        // Classic pivot points based on last bar
        $h = end($hSlice);
        $l = end($lSlice);
        $c = end($cSlice);
        $p = ($h + $l + $c) / 3;
        $r1 = 2 * $p - $l;
        $s1 = 2 * $p - $h;
        $r2 = $p + ($h - $l);
        $s2 = $p - ($h - $l);

        return [
            'period_high' => $maxH,
            'period_low' => $minL,
            'pivot' => $p,
            'r1' => $r1,
            'r2' => $r2,
            's1' => $s1,
            's2' => $s2,
        ];
    }

    private function sentiment(array $signals, float $slope, float $expReturn): array
    {
        $bull = 0;
        $bear = 0;
        foreach ($signals as $s) {
            if ($s['verdict'] === 'bullish') {
                $bull++;
            } elseif ($s['verdict'] === 'bearish') {
                $bear++;
            }
        }
        if ($slope > 0) {
            $bull++;
        } elseif ($slope < 0) {
            $bear++;
        }
        if ($expReturn > 2) {
            $bull++;
        } elseif ($expReturn < -2) {
            $bear++;
        }

        $total = $bull + $bear;
        $score = $total > 0 ? (($bull - $bear) / $total) * 100 : 0;

        if ($score >= 40) {
            $label = 'Strong Buy';
        } elseif ($score >= 15) {
            $label = 'Buy';
        } elseif ($score <= -40) {
            $label = 'Strong Sell';
        } elseif ($score <= -15) {
            $label = 'Sell';
        } else {
            $label = 'Hold';
        }

        return [
            'score' => round($score, 1),
            'label' => $label,
            'bullish_count' => $bull,
            'bearish_count' => $bear,
        ];
    }

    private function empty(): array
    {
        return [
            'projection' => [],
            'signals' => [],
            'sentiment' => ['score' => 0, 'label' => 'Insufficient Data', 'bullish_count' => 0, 'bearish_count' => 0],
            'levels' => [],
            'summary' => [
                'horizon_steps' => 0,
                'expected_return_pct' => null,
                'annualized_volatility_pct' => null,
                'last_price' => null,
                'projected_low_90' => null,
                'projected_high_90' => null,
                'projected_central' => null,
                'trend_slope_per_step' => null,
            ],
        ];
    }
}
