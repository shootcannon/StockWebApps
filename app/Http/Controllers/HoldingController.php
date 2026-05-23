<?php

namespace App\Http\Controllers;

use App\Models\Holding;
use App\Services\MarketService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HoldingController extends Controller
{
    public function index(MarketService $market): Response
    {
        $holdings = Holding::orderBy('purchased_at', 'desc')->orderBy('id', 'desc')->get();

        // group by asset to also compute net position and live value
        $assets = $holdings->groupBy(fn ($h) => $h->type.':'.$h->symbol);

        $enriched = $assets->map(function ($rows, $key) use ($market) {
            [$type, $symbol] = explode(':', $key, 2);
            $q = $market->quote($type, $symbol);
            $price = $q['price'] ?? null;

            $qty = 0;
            $cost = 0;
            foreach ($rows as $r) {
                $sign = $r->side === 'sell' ? -1 : 1;
                $qty += $sign * (float) $r->quantity;
                $cost += $sign * (float) $r->quantity * (float) $r->entry_price;
            }
            $avg = $qty != 0 ? $cost / $qty : 0;
            $value = $price ? $qty * $price : null;
            $pnl = $value !== null ? $value - $cost : null;
            $pnlPct = $cost > 0 && $pnl !== null ? ($pnl / $cost) * 100 : null;

            return [
                'type' => $type,
                'symbol' => $symbol,
                'name' => $rows->first()->name ?? ($q['name'] ?? $symbol),
                'image' => $rows->first()->image ?? ($q['image'] ?? null),
                'quantity' => $qty,
                'avg_price' => $avg,
                'current_price' => $price,
                'value' => $value,
                'cost' => $cost,
                'pnl' => $pnl,
                'pnl_pct' => $pnlPct,
                'transactions' => $rows->map(fn ($r) => [
                    'id' => $r->id,
                    'side' => $r->side,
                    'quantity' => (float) $r->quantity,
                    'entry_price' => (float) $r->entry_price,
                    'currency' => $r->currency,
                    'purchased_at' => $r->purchased_at?->toDateString(),
                    'note' => $r->note,
                ])->values()->all(),
            ];
        })->values();

        $totalValue = $enriched->sum(fn ($a) => $a['value'] ?? 0);
        $totalCost = $enriched->sum(fn ($a) => $a['cost'] ?? 0);
        $totalPnl = $totalValue - $totalCost;
        $totalPnlPct = $totalCost > 0 ? ($totalPnl / $totalCost) * 100 : 0;

        return Inertia::render('portfolio', [
            'assets' => $enriched,
            'totals' => [
                'value' => $totalValue,
                'cost' => $totalCost,
                'pnl' => $totalPnl,
                'pnl_pct' => $totalPnlPct,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:crypto,stock',
            'symbol' => 'required|string|max:64',
            'name' => 'nullable|string|max:128',
            'image' => 'nullable|string|max:512',
            'side' => 'required|in:buy,sell',
            'quantity' => 'required|numeric|min:0',
            'entry_price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:8',
            'purchased_at' => 'nullable|date',
            'note' => 'nullable|string',
        ]);

        Holding::create($data + ['currency' => $data['currency'] ?? 'USD']);

        return back();
    }

    public function update(Request $request, Holding $holding)
    {
        $data = $request->validate([
            'side' => 'sometimes|in:buy,sell',
            'quantity' => 'sometimes|numeric|min:0',
            'entry_price' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|max:8',
            'purchased_at' => 'sometimes|date|nullable',
            'note' => 'sometimes|string|nullable',
        ]);

        $holding->update($data);

        return back();
    }

    public function destroy(Holding $holding)
    {
        $holding->delete();

        return back();
    }
}
