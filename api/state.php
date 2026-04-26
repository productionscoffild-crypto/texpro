<?php
require __DIR__ . '/bootstrap.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        respond(200, get_state());
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {
        $state = read_json_body();
        save_state($state);
        respond(200, ['ok' => true]);
    }

    respond(405, ['error' => 'Method not allowed']);
} catch (Throwable $e) {
    respond(500, ['error' => $e->getMessage()]);
}
