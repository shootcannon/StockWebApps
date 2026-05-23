<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:crypto,stock',
            'symbol' => 'required|string|max:64',
            'condition' => 'required|in:above,below',
            'price' => 'required|numeric|min:0',
        ]);
        Alert::create($data + ['active' => true]);

        return back();
    }

    public function update(Request $request, Alert $alert)
    {
        $data = $request->validate([
            'condition' => 'sometimes|in:above,below',
            'price' => 'sometimes|numeric|min:0',
            'active' => 'sometimes|boolean',
        ]);
        $alert->update($data);

        return back();
    }

    public function destroy(Alert $alert)
    {
        $alert->delete();

        return back();
    }
}
