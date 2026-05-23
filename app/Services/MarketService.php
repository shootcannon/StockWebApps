<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class MarketService
{
    public function search(string $query): array
    {
        $query = trim($query);
        if ($query === '') {
            return ['crypto' => [], 'stock' => []];
        }

        return Cache::remember('search:'.strtolower($query), 60, function () use ($query) {
            return [
                'crypto' => $this->searchCrypto($query),
                'stock' => $this->searchStock($query),
            ];
        });
    }

    public function searchCrypto(string $query): array
    {
        try {
            $res = Http::timeout(10)->get('https://api.coingecko.com/api/v3/search', [
                'query' => $query,
            ]);
            if (! $res->ok()) {
                return [];
            }
            $coins = $res->json('coins') ?? [];

            return collect($coins)->take(10)->map(fn ($c) => [
                'type' => 'crypto',
                'symbol' => $c['id'],
                'ticker' => strtoupper($c['symbol'] ?? ''),
                'name' => $c['name'] ?? $c['id'],
                'image' => $c['large'] ?? $c['thumb'] ?? null,
            ])->values()->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function searchStock(string $query): array
    {
        try {
            $res = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get('https://query2.finance.yahoo.com/v1/finance/search', [
                    'q' => $query,
                    'quotesCount' => 10,
                    'newsCount' => 0,
                ]);
            if (! $res->ok()) {
                return [];
            }
            $quotes = $res->json('quotes') ?? [];

            return collect($quotes)
                ->filter(fn ($q) => ! empty($q['symbol']))
                ->take(10)
                ->map(fn ($q) => [
                    'type' => 'stock',
                    'symbol' => $q['symbol'],
                    'ticker' => $q['symbol'],
                    'name' => $q['shortname'] ?? $q['longname'] ?? $q['symbol'],
                    'image' => null,
                    'exchange' => $q['exchDisp'] ?? null,
                ])->values()->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function quote(string $type, string $symbol): ?array
    {
        return Cache::remember("quote:{$type}:{$symbol}", 30, function () use ($type, $symbol) {
            return $type === 'crypto'
                ? $this->quoteCrypto($symbol)
                : $this->quoteStock($symbol);
        });
    }

    public function quoteCrypto(string $id): ?array
    {
        // Try the shared top-250 cache first to save API calls
        foreach ($this->top250() as $r) {
            if (($r['id'] ?? null) === $id) {
                return [
                    'type' => 'crypto',
                    'symbol' => $id,
                    'ticker' => strtoupper($r['symbol'] ?? ''),
                    'name' => $r['name'] ?? $id,
                    'image' => $r['image'] ?? null,
                    'price' => (float) ($r['current_price'] ?? 0),
                    'change_24h_pct' => (float) ($r['price_change_percentage_24h'] ?? 0),
                    'market_cap' => $r['market_cap'] ?? null,
                    'volume' => $r['total_volume'] ?? null,
                    'high_24h' => $r['high_24h'] ?? null,
                    'low_24h' => $r['low_24h'] ?? null,
                    'currency' => 'USD',
                ];
            }
        }

        try {
            $res = Http::timeout(10)->get('https://api.coingecko.com/api/v3/coins/markets', [
                'vs_currency' => 'usd',
                'ids' => $id,
                'price_change_percentage' => '24h',
            ]);
            $row = $res->json(0);
            if (! $row) {
                return null;
            }

            return [
                'type' => 'crypto',
                'symbol' => $id,
                'ticker' => strtoupper($row['symbol'] ?? ''),
                'name' => $row['name'] ?? $id,
                'image' => $row['image'] ?? null,
                'price' => (float) ($row['current_price'] ?? 0),
                'change_24h_pct' => (float) ($row['price_change_percentage_24h'] ?? 0),
                'market_cap' => $row['market_cap'] ?? null,
                'volume' => $row['total_volume'] ?? null,
                'high_24h' => $row['high_24h'] ?? null,
                'low_24h' => $row['low_24h'] ?? null,
                'currency' => 'USD',
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function quoteStock(string $symbol): ?array
    {
        try {
            $res = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get('https://query1.finance.yahoo.com/v7/finance/quote', [
                    'symbols' => $symbol,
                ]);
            $row = $res->json('quoteResponse.result.0');
            if (! $row) {
                // fallback: chart endpoint gives meta even when quote is rate-limited
                return $this->quoteStockFromChart($symbol);
            }

            return [
                'type' => 'stock',
                'symbol' => $symbol,
                'ticker' => $symbol,
                'name' => $row['shortName'] ?? $row['longName'] ?? $symbol,
                'image' => null,
                'price' => (float) ($row['regularMarketPrice'] ?? 0),
                'change_24h_pct' => (float) ($row['regularMarketChangePercent'] ?? 0),
                'market_cap' => $row['marketCap'] ?? null,
                'volume' => $row['regularMarketVolume'] ?? null,
                'high_24h' => $row['regularMarketDayHigh'] ?? null,
                'low_24h' => $row['regularMarketDayLow'] ?? null,
                'currency' => $row['currency'] ?? 'USD',
                'exchange' => $row['fullExchangeName'] ?? null,
            ];
        } catch (\Throwable $e) {
            return $this->quoteStockFromChart($symbol);
        }
    }

    private function quoteStockFromChart(string $symbol): ?array
    {
        try {
            $res = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get("https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}", [
                    'range' => '5d',
                    'interval' => '1d',
                ]);
            $meta = $res->json('chart.result.0.meta');
            if (! $meta) {
                return null;
            }
            $price = (float) ($meta['regularMarketPrice'] ?? 0);
            $prev = (float) ($meta['chartPreviousClose'] ?? $meta['previousClose'] ?? $price);
            $pct = $prev > 0 ? (($price - $prev) / $prev) * 100 : 0;

            return [
                'type' => 'stock',
                'symbol' => $symbol,
                'ticker' => $symbol,
                'name' => $meta['symbol'] ?? $symbol,
                'image' => null,
                'price' => $price,
                'change_24h_pct' => $pct,
                'currency' => $meta['currency'] ?? 'USD',
                'exchange' => $meta['exchangeName'] ?? null,
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Get OHLC candles.
     * @return array<int, array{time:int, open:float, high:float, low:float, close:float, volume?:float}>
     */
    public function candles(string $type, string $symbol, string $range = '1mo', string $interval = '1d'): array
    {
        $key = "candles:{$type}:{$symbol}:{$range}:{$interval}";
        $cached = Cache::get($key);
        if (is_array($cached) && count($cached) > 0) {
            return $cached;
        }

        $data = $type === 'crypto'
            ? $this->candlesCrypto($symbol, $range)
            : $this->candlesStock($symbol, $range, $interval);

        if (count($data) > 0) {
            Cache::put($key, $data, 60);
        }

        return $data;
    }

    private function candlesCrypto(string $id, string $range): array
    {
        $days = match ($range) {
            '1d' => 1,
            '5d' => 7,
            '1mo' => 30,
            '3mo' => 90,
            '6mo' => 180,
            '1y' => 365,
            'max' => 'max',
            default => 30,
        };

        try {
            $res = Http::timeout(15)->get("https://api.coingecko.com/api/v3/coins/{$id}/ohlc", [
                'vs_currency' => 'usd',
                'days' => $days,
            ]);
            $rows = $res->json() ?? [];

            // CoinGecko returns an indexed array of [time, open, high, low, close] arrays.
            // Error responses are objects (e.g. {"status":{"error_code":429}}) — reject them.
            if (! is_array($rows) || empty($rows) || ! isset($rows[0]) || ! is_array($rows[0]) || count($rows[0]) < 5) {
                return [];
            }

            return collect($rows)->map(fn ($r) => [
                'time'  => (int) ($r[0] / 1000),
                'open'  => (float) $r[1],
                'high'  => (float) $r[2],
                'low'   => (float) $r[3],
                'close' => (float) $r[4],
            ])->values()->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function candlesStock(string $symbol, string $range, string $interval): array
    {
        try {
            $res = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get("https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}", [
                    'range' => $range,
                    'interval' => $interval,
                ]);
            $result = $res->json('chart.result.0');
            if (! $result) {
                return [];
            }
            $timestamps = $result['timestamp'] ?? [];
            $q = $result['indicators']['quote'][0] ?? [];
            $opens = $q['open'] ?? [];
            $highs = $q['high'] ?? [];
            $lows = $q['low'] ?? [];
            $closes = $q['close'] ?? [];
            $vols = $q['volume'] ?? [];

            $out = [];
            foreach ($timestamps as $i => $ts) {
                if (! isset($opens[$i], $highs[$i], $lows[$i], $closes[$i])) {
                    continue;
                }
                if ($opens[$i] === null || $closes[$i] === null) {
                    continue;
                }
                $out[] = [
                    'time' => (int) $ts,
                    'open' => (float) $opens[$i],
                    'high' => (float) $highs[$i],
                    'low' => (float) $lows[$i],
                    'close' => (float) $closes[$i],
                    'volume' => isset($vols[$i]) ? (float) $vols[$i] : null,
                ];
            }

            return $out;
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function trending(): array
    {
        return collect($this->top250())->take(10)->map(fn ($r) => [
            'type' => 'crypto',
            'symbol' => $r['id'],
            'ticker' => strtoupper($r['symbol'] ?? ''),
            'name' => $r['name'] ?? '',
            'image' => $r['image'] ?? null,
            'price' => (float) ($r['current_price'] ?? 0),
            'change_24h_pct' => (float) ($r['price_change_percentage_24h'] ?? 0),
        ])->values()->all();
    }

    public function globalStats(): array
    {
        return Cache::remember('global:stats', 300, function () {
            try {
                $res = Http::timeout(10)->get('https://api.coingecko.com/api/v3/global');
                $d = $res->json('data') ?? [];

                return [
                    'total_market_cap_usd' => $d['total_market_cap']['usd'] ?? null,
                    'total_volume_usd' => $d['total_volume']['usd'] ?? null,
                    'market_cap_change_24h_pct' => $d['market_cap_change_percentage_24h_usd'] ?? null,
                    'btc_dominance' => $d['market_cap_percentage']['btc'] ?? null,
                    'eth_dominance' => $d['market_cap_percentage']['eth'] ?? null,
                    'active_cryptocurrencies' => $d['active_cryptocurrencies'] ?? null,
                    'markets' => $d['markets'] ?? null,
                ];
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    public function topMovers(string $direction = 'gainers', int $limit = 10): array
    {
        $base = $this->top250();
        $rows = collect($base)->filter(
            fn ($r) => isset($r['price_change_percentage_24h']) && $r['price_change_percentage_24h'] !== null
        );
        $sorted = $direction === 'gainers'
            ? $rows->sortByDesc('price_change_percentage_24h')
            : $rows->sortBy('price_change_percentage_24h');

        return $sorted->take($limit)->map(fn ($r) => [
            'type' => 'crypto',
            'symbol' => $r['id'],
            'ticker' => strtoupper($r['symbol'] ?? ''),
            'name' => $r['name'] ?? '',
            'image' => $r['image'] ?? null,
            'price' => (float) ($r['current_price'] ?? 0),
            'change_24h_pct' => (float) ($r['price_change_percentage_24h'] ?? 0),
        ])->values()->all();
    }

    /**
     * Shared underlying fetch — top 250 coins. Used by trending, gainers, losers.
     */
    public function top250(): array
    {
        $key = 'coingecko:markets:top250';

        $cached = Cache::get($key);

        // Serve validated cache immediately.
        if ($this->validCoinList($cached)) {
            return $cached;
        }

        try {
            $res  = Http::timeout(15)->get('https://api.coingecko.com/api/v3/coins/markets', [
                'vs_currency'            => 'usd',
                'order'                  => 'market_cap_desc',
                'per_page'               => 250,
                'page'                   => 1,
                'price_change_percentage'=> '24h',
            ]);
            $data = $res->ok() ? ($res->json() ?? []) : [];

            if ($this->validCoinList($data)) {
                Cache::put($key, $data, 600);
                return $data;
            }
        } catch (\Throwable) {
        }

        // Cache invalid or API failed — return empty rather than bad data.
        return [];
    }

    public function marketsList(int $page = 1, int $perPage = 50, string $order = 'market_cap_desc'): array
    {
        $perPage = min(max($perPage, 10), 100);
        $page = max($page, 1);
        $key = "markets:{$page}:{$perPage}:{$order}";

        $cached = Cache::get($key);
        if (is_array($cached) && count($cached) > 0) {
            return $cached;
        }

        try {
            $res = Http::timeout(15)->get('https://api.coingecko.com/api/v3/coins/markets', [
                'vs_currency' => 'usd',
                'order' => $order,
                'per_page' => $perPage,
                'page' => $page,
                'sparkline' => 'true',
                'price_change_percentage' => '1h,24h,7d',
            ]);

            if (! $res->ok()) {
                return [];
            }

            $rows = $res->json() ?? [];

            // Guard: CoinGecko error responses are objects, not indexed arrays of coins.
            if (! $this->validCoinList($rows)) {
                return [];
            }

            $mapped = collect($rows)->map(fn ($r) => [
                'type' => 'crypto',
                'symbol' => $r['id'],
                'ticker' => strtoupper($r['symbol'] ?? ''),
                'name' => $r['name'] ?? '',
                'image' => $r['image'] ?? null,
                'price' => (float) ($r['current_price'] ?? 0),
                'change_1h_pct' => $r['price_change_percentage_1h_in_currency'] ?? null,
                'change_24h_pct' => $r['price_change_percentage_24h_in_currency'] ?? null,
                'change_7d_pct' => $r['price_change_percentage_7d_in_currency'] ?? null,
                'market_cap' => $r['market_cap'] ?? null,
                'volume' => $r['total_volume'] ?? null,
                'rank' => $r['market_cap_rank'] ?? null,
                'sparkline' => $r['sparkline_in_7d']['price'] ?? null,
            ])->values()->all();

            Cache::put($key, $mapped, 180);
            return $mapped;
        } catch (\Throwable) {
            return [];
        }
    }

    public function categories(int $limit = 20): array
    {
        // Single shared cache key so all callers share one fetch regardless of $limit.
        $key = 'categories:top30';

        $cached = Cache::get($key);
        $isGood = is_array($cached) && count($cached) > 0 && ! empty($cached[0]['name'] ?? '');

        if ($isGood) {
            return array_slice($cached, 0, $limit);
        }

        try {
            $res  = Http::timeout(15)->get('https://api.coingecko.com/api/v3/coins/categories');
            $rows = $res->ok() ? ($res->json() ?? []) : [];

            // Guard: real categories are an indexed array of objects with a non-empty 'name'.
            if (! is_array($rows) || empty($rows) || empty($rows[0]['name'] ?? '')) {
                return [];
            }

            $mapped = collect($rows)
                ->sortByDesc('market_cap')
                ->take(30)
                ->map(fn ($r) => [
                    'id'                    => $r['id'] ?? null,
                    'name'                  => $r['name'] ?? '',
                    'market_cap'            => $r['market_cap'] ?? null,
                    'market_cap_change_24h' => $r['market_cap_change_24h'] ?? null,
                    'volume'                => $r['volume_24h'] ?? null,
                    'top_coins'             => collect($r['top_3_coins'] ?? [])->take(3)->all(),
                ])->values()->all();

            Cache::put($key, $mapped, 600);
            return array_slice($mapped, 0, $limit);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * True if $data looks like a real CoinGecko coin list (indexed array of objects with 'id').
     */
    private function validCoinList(mixed $data): bool
    {
        return is_array($data) && count($data) > 0 && isset($data[0]['id']);
    }

    public function news(string $type, string $symbol, int $limit = 8): array
    {
        return Cache::remember("news:{$type}:{$symbol}:{$limit}", 600, function () use ($type, $symbol, $limit) {
            try {
                $query = $symbol;
                if ($type === 'crypto') {
                    // try map id -> ticker for a more useful search
                    $q = $this->quoteCrypto($symbol);
                    $query = $q['ticker'] ?? $symbol;
                }
                $res = Http::timeout(10)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get('https://query2.finance.yahoo.com/v1/finance/search', [
                        'q' => $query,
                        'quotesCount' => 0,
                        'newsCount' => $limit,
                    ]);
                $news = $res->json('news') ?? [];

                return collect($news)->take($limit)->map(fn ($n) => [
                    'title' => $n['title'] ?? '',
                    'publisher' => $n['publisher'] ?? '',
                    'link' => $n['link'] ?? null,
                    'published' => isset($n['providerPublishTime']) ? (int) $n['providerPublishTime'] : null,
                    'thumbnail' => $n['thumbnail']['resolutions'][0]['url'] ?? null,
                ])->values()->all();
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    /**
     * Fetch exchange rate USD -> target.
     */
    public function fxRate(string $target): float
    {
        $target = strtoupper($target);
        if ($target === 'USD') {
            return 1.0;
        }

        $cached = Cache::get("fx:usd:{$target}");
        if ($cached) {
            return (float) $cached;
        }

        try {
            $res = Http::timeout(10)->get('https://open.er-api.com/v6/latest/USD');
            $rate = $res->json("rates.{$target}");
            if ($rate) {
                Cache::put("fx:usd:{$target}", $rate, 3600 * 6);
                return (float) $rate;
            }
        } catch (\Throwable $e) {
            // fall through
        }

        // Fallback approximate rates (USD -> target) — only used when API fails.
        $fallback = [
            'IDR' => 15800, 'EUR' => 0.92, 'JPY' => 156, 'GBP' => 0.78, 'SGD' => 1.35,
        ];

        return (float) ($fallback[$target] ?? 1.0);
    }
}
