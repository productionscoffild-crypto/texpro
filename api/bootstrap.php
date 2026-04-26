<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

const FILE_DB_DIR = __DIR__ . '/data';
const FILE_DB_PATH = FILE_DB_DIR . '/app_state.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode(['ok' => true]);
    exit;
}

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['error' => 'Invalid JSON']);
    return $data;
}

function default_owner(): array
{
    return [
        'id' => 'owner-root',
        'name' => 'Владелец',
        'phone' => '',
        'position' => 'Руководитель',
        'email' => 'owner@textilepro.local',
        'passwordHash' => 'owner12345',
        'role' => 'owner',
        'active' => true,
        'createdAt' => date('c'),
    ];
}

function normalize_user(array $user): array
{
    $role = $user['role'] ?? 'employee';
    $user['email'] = mb_strtolower(trim((string)($user['email'] ?? '')));
    $user['role'] = $role;
    $user['active'] = $user['active'] ?? true;
    $user['phone'] = $user['phone'] ?? '';
    $user['position'] = $user['position'] ?? ($role === 'owner' ? 'Руководитель' : 'Менеджер');
    return $user;
}

function unique_users(array $users): array
{
    $map = [];
    foreach ($users as $user) {
        if (!is_array($user)) continue;
        $normalized = normalize_user($user);
        if ($normalized['email'] !== '') $map[$normalized['email']] = $normalized;
    }
    return array_values($map);
}

function normalize_state(array $state): array
{
    $products = array_map(function ($product) {
        if (!is_array($product)) return [];
        $product['composition'] = $product['composition'] ?? '';
        return $product;
    }, $state['products'] ?? []);

    $messages = array_map(function ($message) {
        if (!is_array($message)) return [];
        $message['kind'] = $message['kind'] ?? 'text';
        $message['text'] = $message['text'] ?? '';
        return $message;
    }, $state['chatMessages'] ?? []);

    return [
        'users' => unique_users(array_merge([default_owner()], $state['users'] ?? [])),
        'products' => array_values(array_filter($products)),
        'invoices' => $state['invoices'] ?? [],
        'chatMessages' => array_values(array_filter($messages)),
        'notificationReadAtByUser' => $state['notificationReadAtByUser'] ?? new stdClass(),
    ];
}

function can_use_mysql(): bool
{
    $config = require __DIR__ . '/config.php';
    return !empty($config['database'])
        && !str_starts_with((string)$config['database'], 'YOUR_')
        && !empty($config['user'])
        && !str_starts_with((string)$config['user'], 'YOUR_');
}

function db(): ?PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!can_use_mysql()) return null;

    $config = require __DIR__ . '/config.php';
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['database']);
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS textile_app_state (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            state_json LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    return $pdo;
}

function get_file_state(): array
{
    if (!is_dir(FILE_DB_DIR)) mkdir(FILE_DB_DIR, 0755, true);
    if (!file_exists(FILE_DB_PATH)) {
        $state = normalize_state([]);
        save_file_state($state);
        return $state;
    }
    $raw = file_get_contents(FILE_DB_PATH);
    $decoded = json_decode((string)$raw, true);
    return normalize_state(is_array($decoded) ? $decoded : []);
}

function save_file_state(array $state): void
{
    if (!is_dir(FILE_DB_DIR)) mkdir(FILE_DB_DIR, 0755, true);
    file_put_contents(FILE_DB_PATH, json_encode(normalize_state($state), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function get_state(): array
{
    $pdo = db();
    if (!$pdo) return get_file_state();
    $stmt = $pdo->prepare('SELECT state_json FROM textile_app_state WHERE id = 1');
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        $state = normalize_state([]);
        save_state($state);
        return $state;
    }
    $decoded = json_decode($row['state_json'], true);
    return normalize_state(is_array($decoded) ? $decoded : []);
}

function save_state(array $state): void
{
    $state = normalize_state($state);
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    $pdo = db();
    if (!$pdo) {
        save_file_state($state);
        return;
    }
    $stmt = $pdo->prepare(
        'INSERT INTO textile_app_state (id, state_json) VALUES (1, :json)
         ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)'
    );
    $stmt->execute(['json' => $json]);
}
