<?php

namespace App\Http\Controllers;

use App\Services\MarketService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketsController extends Controller
{
    public function index(Request $request, MarketService $market): Response
    {
        $page = (int) $request->query('page', 1);
        $order = (string) $request->query('order', 'market_cap_desc');
        $perPage = 50;

        $rows = $market->marketsList($page, $perPage, $order);

        return Inertia::render('markets', [
            'rows' => $rows,
            'page' => $page,
            'order' => $order,
            'categories' => $market->categories(20),
        ]);
    }
}
