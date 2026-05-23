<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = ['type', 'symbol', 'condition', 'price', 'triggered', 'triggered_at', 'active'];

    protected $casts = [
        'price' => 'decimal:8',
        'triggered' => 'boolean',
        'active' => 'boolean',
        'triggered_at' => 'datetime',
    ];
}
