<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holding extends Model
{
    protected $fillable = [
        'type', 'symbol', 'name', 'image', 'side',
        'quantity', 'entry_price', 'currency', 'purchased_at', 'note',
    ];

    protected $casts = [
        'quantity' => 'decimal:10',
        'entry_price' => 'decimal:10',
        'purchased_at' => 'date',
    ];
}
