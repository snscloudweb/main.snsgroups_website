<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';

session_start();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$rawPhone = isset($data['phone']) ? $data['phone'] : '';
$cleanDigits = preg_replace('/[^0-9]/', '', $rawPhone);

// Validate 10-digit Indian phone number
if (strlen($cleanDigits) >= 10) {
    $phone10 = substr($cleanDigits, -10);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Please provide a valid 10-digit mobile number'
    ]);
    exit();
}

$recipient = '91' . $phone10;

// 1. Generate 6-digit random OTP
$otp = (string)rand(100000, 999999);

// 2. Store in Session (valid for 10 minutes)
$_SESSION['otp_' . $phone10] = [
    'code' => $otp,
    'expires' => time() + 600
];

// Fallback file cache for stateless hosting
$cacheDir = sys_get_temp_dir() . '/sns_otp';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}
@file_put_contents($cacheDir . '/' . md5($phone10) . '.json', json_encode([
    'code' => $otp,
    'expires' => time() + 600
]));

// 3. Dispatch via PayPerWA WhatsApp Cloud API
$apiKey = getEnvVar('PAYPERWA_API_KEY');
$baseUrl = getEnvVar('PAYPERWA_BASE_URL', 'https://payperwa.com/api/v1');
$templateName = getEnvVar('PAYPERWA_OTP_TEMPLATE', 'snsgroups_adm_otp');
$endpoint = rtrim($baseUrl, '/') . '/messages/send';

// Helper function to send PayPerWA request
function callPayPerWA($endpoint, $apiKey, $payload) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($resp, true), 'raw' => $resp];
}

// First try with OTP variable (for templates with {{1}} placeholder)
$payload = [
    'to' => $recipient,
    'template_name' => $templateName,
    'variables' => [$otp]
];

$res = callPayPerWA($endpoint, $apiKey, $payload);

// If template has 0 parameters, send without variables
if ($res['code'] >= 400 && isset($res['data']['details']['error']['message']) && strpos($res['data']['details']['error']['message'], 'localizable_params') !== false) {
    $payloadNoVars = [
        'to' => $recipient,
        'template_name' => $templateName
    ];
    $res = callPayPerWA($endpoint, $apiKey, $payloadNoVars);
}

if ($res['code'] >= 200 && $res['code'] < 300 && !empty($res['data']['success'])) {
    echo json_encode([
        'success' => true,
        'message' => 'WhatsApp verification sent to +91 ' . $phone10,
        'to' => $recipient,
        'data' => $res['data']
    ]);
} else {
    $errMsg = isset($res['data']['error']) ? $res['data']['error'] : (isset($res['data']['message']) ? $res['data']['message'] : 'WhatsApp dispatch failed');
    echo json_encode([
        'success' => false,
        'message' => $errMsg,
        'gateway_response' => $res['data'],
        'http_code' => $res['code']
    ]);
}
?>
