<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holdings', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // crypto | stock
            $table->string('symbol');
            $table->string('name')->nullable();
            $table->string('image')->nullable();
            $table->string('side')->default('buy'); // buy | sell
            $table->decimal('quantity', 24, 10);
            $table->decimal('entry_price', 24, 10);
            $table->string('currency', 8)->default('USD');
            $table->date('purchased_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['type', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holdings');
    }
};
