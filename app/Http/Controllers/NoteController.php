<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:crypto,stock',
            'symbol' => 'required|string|max:64',
            'title' => 'nullable|string|max:255',
            'body' => 'required|string',
        ]);
        Note::create($data);

        return back();
    }

    public function update(Request $request, Note $note)
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'body' => 'required|string',
        ]);
        $note->update($data);

        return back();
    }

    public function destroy(Note $note)
    {
        $note->delete();

        return back();
    }
}
