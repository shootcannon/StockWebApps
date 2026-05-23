<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('symbol');
            $table->string('condition'); // 'above' | 'below'
            $table->decimal('price', 24, 8);
            $table->boolean('triggered')->default(false);
            $table->timestamp('triggered_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['type', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
