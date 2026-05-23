<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('symbol');
            $table->string('title')->nullable();
            $table->text('body');
            $table->timestamps();
            $table->index(['type', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
