<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watchlist_items', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('symbol');
            $table->string('name')->nullable();
            $table->string('image')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
            $table->unique(['type', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('watchlist_items');
    }
};
