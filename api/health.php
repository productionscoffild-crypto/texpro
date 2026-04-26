<?php
require __DIR__ . '/bootstrap.php';
try {
    $pdo = db();
    respond(200, ['ok' => true, 'storage' => $pdo ? 'mysql' : 'file']);
} catch (Throwable $e) {
    respond(500, ['error' => $e->getMessage()]);
}
