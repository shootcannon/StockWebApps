<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Holding;
use App\Models\Note;
use App\Models\WatchlistItem;
use App\Services\ForecastService;
use App\Services\MarketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    public function show(string $type, string $symbol, MarketService $market, ForecastService $forecaster): Response
    {
        abort_unless(in_array($type, ['crypto', 'stock']), 404);

        $quote = $market->quote($type, $symbol);
        $candles = $market->candles($type, $symbol, '3mo', '1d');
        $forecast = $forecaster->forecast($candles, 30);

        $notes = Note::where('type', $type)->where('symbol', $symbol)->latest()->get();
        $alerts = Alert::where('type', $type)->where('symbol', $symbol)->latest()->get();
        $holdings = Holding::where('type', $type)->where('symbol', $symbol)->orderBy('id', 'desc')->get();
        $inWatchlist = WatchlistItem::where('type', $type)->where('symbol', $symbol)->exists();
        $news = $market->news($type, $symbol, 8);

        return Inertia::render('asset', [
            'type' => $type,
            'symbol' => $symbol,
            'quote' => $quote,
            'candles' => $candles,
            'forecast' => $forecast,
            'notes' => $notes,
            'alerts' => $alerts,
            'holdings' => $holdings,
            'inWatchlist' => $inWatchlist,
            'news' => $news,
            'fetched_at' => now()->toIso8601String(),
        ]);
    }

    public function candles(string $type, string $symbol, Request $request, MarketService $market, ForecastService $forecaster)
    {
        abort_unless(in_array($type, ['crypto', 'stock']), 404);
        $range = $request->query('range', '3mo');
        $interval = $request->query('interval', '1d');
        $candles = $market->candles($type, $symbol, $range, $interval);

        // Always use 3mo daily candles for forecast — short ranges don't have enough data points
        $forecastCandles = ($range === '3mo' && $interval === '1d')
            ? $candles
            : $market->candles($type, $symbol, '3mo', '1d');

        return response()->json([
            'candles' => $candles,
            'forecast' => $forecaster->forecast($forecastCandles, (int) $request->query('horizon', 30)),
        ]);
    }

    public function refresh(string $type, string $symbol, MarketService $market)
    {
        abort_unless(in_array($type, ['crypto', 'stock']), 404);
        // Bust this asset's caches
        Cache::forget("quote:{$type}:{$symbol}");
        foreach (['1d', '5d', '1mo', '3mo', '6mo', '1y', 'max'] as $r) {
            foreach (['5m', '15m', '1d', '1wk', '1mo'] as $i) {
                Cache::forget("candles:{$type}:{$symbol}:{$r}:{$i}");
            }
        }
        if ($type === 'crypto') {
            Cache::forget('coingecko:markets:top250');
        }

        return response()->json([
            'quote' => $market->quote($type, $symbol),
            'fetched_at' => now()->toIso8601String(),
        ]);
    }

    public function search(Request $request, MarketService $market)
    {
        $q = (string) $request->query('q', '');

        return response()->json($market->search($q));
    }

    public function fx(string $target, MarketService $market)
    {
        $rate = $market->fxRate(strtoupper($target));

        return response()->json([
            'target' => strtoupper($target),
            'rate' => $rate,
        ]);
    }
}
