<?php

use App\Http\Controllers\AlertController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\CompareController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HoldingController;
use App\Http\Controllers\MarketsController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\WatchlistController;
use Illuminate\Support\Facades\Route;

Route::get('/', DashboardController::class)->name('dashboard');

Route::get('/markets', [MarketsController::class, 'index'])->name('markets');
Route::get('/portfolio', [HoldingController::class, 'index'])->name('portfolio');
Route::get('/compare', [CompareController::class, 'index'])->name('compare');

Route::get('/asset/{type}/{symbol}', [AssetController::class, 'show'])
    ->where('symbol', '[A-Za-z0-9._\-\^=]+')
    ->name('asset.show');

Route::get('/api/search', [AssetController::class, 'search'])->name('api.search');
Route::get('/api/candles/{type}/{symbol}', [AssetController::class, 'candles'])
    ->where('symbol', '[A-Za-z0-9._\-\^=]+')
    ->name('api.candles');
Route::post('/api/refresh/{type}/{symbol}', [AssetController::class, 'refresh'])
    ->where('symbol', '[A-Za-z0-9._\-\^=]+')
    ->name('api.refresh');
Route::get('/api/fx/{target}', [AssetController::class, 'fx'])
    ->where('target', '[A-Za-z]{3}')
    ->name('api.fx');

Route::post('/watchlist', [WatchlistController::class, 'store'])->name('watchlist.store');
Route::patch('/watchlist/{watchlistItem}', [WatchlistController::class, 'update'])->name('watchlist.update');
Route::delete('/watchlist/{watchlistItem}', [WatchlistController::class, 'destroy'])->name('watchlist.destroy');

Route::post('/notes', [NoteController::class, 'store'])->name('notes.store');
Route::patch('/notes/{note}', [NoteController::class, 'update'])->name('notes.update');
Route::delete('/notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');

Route::post('/alerts', [AlertController::class, 'store'])->name('alerts.store');
Route::patch('/alerts/{alert}', [AlertController::class, 'update'])->name('alerts.update');
Route::delete('/alerts/{alert}', [AlertController::class, 'destroy'])->name('alerts.destroy');

Route::post('/holdings', [HoldingController::class, 'store'])->name('holdings.store');
Route::patch('/holdings/{holding}', [HoldingController::class, 'update'])->name('holdings.update');
Route::delete('/holdings/{holding}', [HoldingController::class, 'destroy'])->name('holdings.destroy');
