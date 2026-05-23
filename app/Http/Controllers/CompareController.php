<?php

namespace App\Http\Controllers;

use App\Services\MarketService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompareController extends Controller
{
    public function index(Request $request, MarketService $market): Response
    {
        $aType = (string) $request->query('a_type', 'crypto');
        $a = (string) $request->query('a', 'bitcoin');
        $bType = (string) $request->query('b_type', 'crypto');
        $b = (string) $request->query('b', 'ethereum');
        $range = (string) $request->query('range', '3mo');

        return Inertia::render('compare', [
            'a' => [
                'type' => $aType,
                'symbol' => $a,
                'quote' => $market->quote($aType, $a),
                'candles' => $market->candles($aType, $a, $range, '1d'),
            ],
            'b' => [
                'type' => $bType,
                'symbol' => $b,
                'quote' => $market->quote($bType, $b),
                'candles' => $market->candles($bType, $b, $range, '1d'),
            ],
            'range' => $range,
        ]);
    }
}
