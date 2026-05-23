<?php

namespace App\Http\Controllers;

use App\Models\WatchlistItem;
use App\Services\MarketService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(MarketService $market): Response
    {
        $items = WatchlistItem::orderBy('position')->orderBy('id')->get();

        $enriched = $items->map(function (WatchlistItem $i) use ($market) {
            $q = $market->quote($i->type, $i->symbol);
            return [
                'id' => $i->id,
                'type' => $i->type,
                'symbol' => $i->symbol,
                'name' => $i->name,
                'image' => $i->image,
                'price' => $q['price'] ?? null,
                'change_24h_pct' => $q['change_24h_pct'] ?? null,
                'currency' => $q['currency'] ?? 'USD',
            ];
        })->values();

        return Inertia::render('dashboard', [
            'watchlist' => $enriched,
            'trending' => $market->trending(),
            'gainers' => $market->topMovers('gainers', 10),
            'losers' => $market->topMovers('losers', 10),
            'global' => $market->globalStats(),
            'categories' => $market->categories(8),
            'featured' => [
                'btc' => $market->candles('crypto', 'bitcoin', '3mo', '1d'),
                'eth' => $market->candles('crypto', 'ethereum', '3mo', '1d'),
            ],
            'fetched_at' => now()->toIso8601String(),
        ]);
    }
}
