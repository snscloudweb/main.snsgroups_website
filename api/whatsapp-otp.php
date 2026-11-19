<?php
/**
 * WhatsApp OTP Generation, Verification & Confirmation Backend for Hostinger
 * Integrates with PayPerWA API (https://payperwa.com/api/v1/messages/send)
 *
 * Actions:
 * 1. send_otp          -> Sends template `snsgroups_adm_otp` with Variable 1 = 6-digit OTP (10 min expiry)
 * 2. verify_otp        -> Verifies the 6-digit OTP only (does NOT send confirmation message yet)
 * 3. send_confirmation -> Triggered ONLY when clicking "APPLY NOW!" -> Sends template `verification_message` with Variable 1 = Name
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

/**
 * Load environment variables from .env file in project root
 */
function loadEnv($filePath)
{
    $env = [];
    if (!file_exists($filePath)) {
        return $env;
    }
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1]);
            $value = trim($value, "\"'");
            $env[$key] = $value;
        }
    }
    return $env;
}

$env = loadEnv(dirname(__DIR__) . '/.env');

$apiKey          = $env['PAYPERWA_API_KEY'] ?? getenv('PAYPERWA_API_KEY') ?: '';
$baseUrl         = rtrim($env['PAYPERWA_BASE_URL'] ?? getenv('PAYPERWA_BASE_URL') ?: 'https://payperwa.com/api/v1', '/');
$otpTemplate     = $env['PAYPERWA_OTP_TEMPLATE'] ?? 'snsgroups_adm_otp';
$welcomeTemplate = $env['PAYPERWA_WELCOME_TEMPLATE'] ?? 'verification_message';
$expiryMinutes   = (int)($env['OTP_EXPIRY_MINUTES'] ?? 10);
$secretKey       = $env['OTP_SECRET_KEY'] ?? 'sns_institutions_otp_secret_2026';

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server configuration error: Missing PAYPERWA_API_KEY in .env']);
    exit;
}

/**
 * Normalize phone number to 91XXXXXXXXXX format
 */
function normalizePhone($rawPhone)
{
    $digits = preg_replace('/\D+/', '', (string)$rawPhone);
    if (strlen($digits) === 10) {
        return '91' . $digits;
    }
    if (strlen($digits) === 11 && strpos($digits, '0') === 0) {
        return '91' . substr($digits, 1);
    }
    if (strlen($digits) === 12 && strpos($digits, '91') === 0) {
        return $digits;
    }
    return $digits;
}

/**
 * Send WhatsApp template message via PayPerWA API
 */
function sendPayPerWaMessage($baseUrl, $apiKey, $to, $templateName, $variables = [])
{
    $url = $baseUrl . '/messages/send';
    $payload = [
        'to'            => $to,
        'template_name' => $templateName,
        'language'      => 'en',
        'variables'     => array_values(array_map('strval', $variables))
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $responseBody = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError    = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return [
            'ok'       => false,
            'status'   => 500,
            'error'    => $curlError,
            'response' => null
        ];
    }

    $decoded = json_decode($responseBody, true);
    $isSuccess = ($httpCode >= 200 && $httpCode < 300);

    return [
        'ok'       => $isSuccess,
        'status'   => $httpCode,
        'response' => $decoded ?: $responseBody
    ];
}

/**
 * File-based OTP storage helper
 */
function getOtpStorePath()
{
    return sys_get_temp_dir() . '/sns_whatsapp_otps.json';
}

function loadOtpStore()
{
    $path = getOtpStorePath();
    if (!file_exists($path)) {
        return [];
    }
    $content = @file_get_contents($path);
    $data = $content ? json_decode($content, true) : [];
    if (!is_array($data)) {
        return [];
    }
    $now = time();
    foreach ($data as $phone => $entry) {
        if (($entry['expires_at'] ?? 0) < $now) {
            unset($data[$phone]);
        }
    }
    return $data;
}

function saveOtpStore($data)
{
    $path = getOtpStorePath();
    @file_put_contents($path, json_encode($data), LOCK_EX);
}

// Parse incoming JSON request
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input)) {
    $input = $_POST;
}

$action   = trim($input['action'] ?? '');
$rawPhone = trim($input['phone'] ?? '');
$name     = trim($input['name'] ?? '');
$phone    = normalizePhone($rawPhone);

if (strlen($phone) < 12 || !preg_match('/^91[6-9]\d{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please enter a valid 10-digit WhatsApp mobile number.'
    ]);
    exit;
}

// 1. SEND OTP
if ($action === 'send_otp') {
    $otp       = (string)random_int(100000, 999999);
    $expiresAt = time() + ($expiryMinutes * 60);

    $store = loadOtpStore();
    $store[$phone] = [
        'otp'        => password_hash($otp, PASSWORD_DEFAULT),
        'expires_at' => $expiresAt,
        'verified'   => false,
        'name'       => $name
    ];
    saveOtpStore($store);

    $signature = hash_hmac('sha256', $phone . '|' . $otp . '|' . $expiresAt, $secretKey);
    $token     = $expiresAt . '.' . $signature;

    // Send OTP via PayPerWA API using template: snsgroups_adm_otp
    $sendResult = sendPayPerWaMessage($baseUrl, $apiKey, $phone, $otpTemplate, [$otp]);

    if (!$sendResult['ok']) {
        $apiMsg = is_array($sendResult['response'])
            ? ($sendResult['response']['message'] ?? $sendResult['response']['error'] ?? 'Failed to send WhatsApp OTP.')
            : 'Failed to send WhatsApp OTP.';
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'message' => $apiMsg,
            'details' => $sendResult['response']
        ]);
        exit;
    }

    echo json_encode([
        'success'    => true,
        'message'    => 'OTP sent to your WhatsApp number! Valid for ' . $expiryMinutes . ' minutes.',
        'token'      => $token,
        'expires_in' => $expiryMinutes * 60
    ]);
    exit;
}

// 2. VERIFY OTP (Only verifies the OTP; does NOT send verification_message yet)
if ($action === 'verify_otp') {
    $enteredOtp = preg_replace('/\D+/', '', (string)($input['otp'] ?? ''));
    $token      = trim($input['token'] ?? '');

    if (strlen($enteredOtp) !== 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please enter the 6-digit OTP received on WhatsApp.'
        ]);
        exit;
    }

    $now        = time();
    $isVerified = false;
    $isExpired  = false;

    // Check server-side OTP store
    $store = loadOtpStore();
    if (isset($store[$phone])) {
        $record = $store[$phone];
        if ($now > ($record['expires_at'] ?? 0)) {
            $isExpired = true;
            unset($store[$phone]);
            saveOtpStore($store);
        } elseif (password_verify($enteredOtp, $record['otp'])) {
            $isVerified = true;
            $store[$phone]['verified'] = true;
            $store[$phone]['expires_at'] = $now + 1800; // allow 30 mins to complete form submission
            if (!empty($name)) {
                $store[$phone]['name'] = $name;
            }
            saveOtpStore($store);
        }
    }

    // Fallback check against stateless HMAC token
    if (!$isVerified && !$isExpired && !empty($token) && strpos($token, '.') !== false) {
        list($expPart, $sigPart) = explode('.', $token, 2);
        $expTime = (int)$expPart;
        if ($now > $expTime) {
            $isExpired = true;
        } else {
            $expectedSig = hash_hmac('sha256', $phone . '|' . $enteredOtp . '|' . $expTime, $secretKey);
            if (hash_equals($expectedSig, $sigPart)) {
                $isVerified = true;
            }
        }
    }

    if ($isExpired) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This OTP has expired (10 minutes limit). Please request a new OTP.'
        ]);
        exit;
    }

    if (!$isVerified) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid OTP. Please check the code sent to your WhatsApp.'
        ]);
        exit;
    }

    // Generate verified_token to authorize send_confirmation when clicking APPLY NOW!
    $verifiedExp   = $now + 1800;
    $verifiedSig   = hash_hmac('sha256', 'VERIFIED|' . $phone . '|' . $verifiedExp, $secretKey);
    $verifiedToken = $verifiedExp . '.' . $verifiedSig;

    echo json_encode([
        'success'        => true,
        'verified'       => true,
        'verified_token' => $verifiedToken,
        'message'        => 'WhatsApp OTP verified successfully!'
    ]);
    exit;
}

// 3. SEND CONFIRMATION MESSAGE (Triggered ONLY when clicking APPLY NOW! button)
if ($action === 'send_confirmation') {
    $verifiedToken = trim($input['verified_token'] ?? '');
    $now           = time();
    $authorized    = false;

    $store = loadOtpStore();
    if (isset($store[$phone]) && !empty($store[$phone]['verified'])) {
        $authorized = true;
        if (empty($name) && !empty($store[$phone]['name'])) {
            $name = $store[$phone]['name'];
        }
        unset($store[$phone]);
        saveOtpStore($store);
    }

    if (!$authorized && !empty($verifiedToken) && strpos($verifiedToken, '.') !== false) {
        list($expPart, $sigPart) = explode('.', $verifiedToken, 2);
        $expTime = (int)$expPart;
        if ($now <= $expTime) {
            $expectedSig = hash_hmac('sha256', 'VERIFIED|' . $phone . '|' . $expTime, $secretKey);
            if (hash_equals($expectedSig, $sigPart)) {
                $authorized = true;
            }
        }
    }

    if (!$authorized) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Phone number is not verified. Please verify your WhatsApp OTP first.'
        ]);
        exit;
    }

    // Send Template Name: verification_message with Variable 1 = Name from the form
    $recipientName = !empty($name) ? $name : 'Student';
    $welcomeResult = sendPayPerWaMessage($baseUrl, $apiKey, $phone, $welcomeTemplate, [$recipientName]);

    echo json_encode([
        'success'              => true,
        'confirmation_sent'    => $welcomeResult['ok'],
        'message'              => 'Enquiry confirmation message sent on WhatsApp!',
        'confirmation_details' => $welcomeResult['response']
    ]);
    exit;
}

http_response_code(400);
echo json_encode([
    'success' => false,
    'message' => 'Invalid action. Supported actions: send_otp, verify_otp, send_confirmation.'
]);
