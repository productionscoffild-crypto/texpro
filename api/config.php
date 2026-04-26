<?php
// Server-side database config. This file is executed only by PHP on the hosting.
// Fill these values in the hosting panel. Do not put this data into frontend code.
return [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'database' => getenv('DB_NAME') ?: 'YOUR_DATABASE_NAME',
    'user' => getenv('DB_USER') ?: 'YOUR_DATABASE_USER',
    'password' => getenv('DB_PASSWORD') ?: 'YOUR_DATABASE_PASSWORD',
];
