<?php

namespace App\Http\Controllers;

use App\Models\WatchlistItem;
use Illuminate\Http\Request;

class WatchlistController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:crypto,stock',
            'symbol' => 'required|string|max:64',
            'name' => 'nullable|string|max:128',
            'image' => 'nullable|string|max:512',
        ]);

        WatchlistItem::updateOrCreate(
            ['type' => $data['type'], 'symbol' => $data['symbol']],
            ['name' => $data['name'] ?? null, 'image' => $data['image'] ?? null]
        );

        return back();
    }

    public function update(Request $request, WatchlistItem $watchlistItem)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:128',
            'position' => 'nullable|integer',
        ]);
        $watchlistItem->update($data);

        return back();
    }

    public function destroy(WatchlistItem $watchlistItem)
    {
        $watchlistItem->delete();

        return back();
    }
}
