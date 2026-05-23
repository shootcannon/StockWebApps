<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WatchlistItem extends Model
{
    protected $fillable = ['type', 'symbol', 'name', 'image', 'position'];
}
