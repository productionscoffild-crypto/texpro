<?php
require __DIR__ . '/bootstrap.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);

    $body = read_json_body();
    $email = mb_strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');
    $state = get_state();

    $user = null;
    foreach ($state['users'] as $candidate) {
        if (($candidate['email'] ?? '') === $email) {
            $user = $candidate;
            break;
        }
    }

    if (!$user) respond(404, ['error' => 'Пользователь не найден']);
    if (!($user['active'] ?? true)) respond(403, ['error' => 'Доступ сотрудника отключён']);
    if (($user['passwordHash'] ?? '') !== $password) respond(401, ['error' => 'Неверный пароль']);

    respond(200, ['user' => $user, 'state' => $state]);
} catch (Throwable $e) {
    respond(500, ['error' => $e->getMessage()]);
}
