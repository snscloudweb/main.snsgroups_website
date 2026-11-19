<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$rawPhone = isset($data['phone']) ? $data['phone'] : '';
$enteredOtp = isset($data['otp']) ? trim($data['otp']) : '';

$cleanDigits = preg_replace('/[^0-9]/', '', $rawPhone);
$phone10 = (strlen($cleanDigits) >= 10) ? substr($cleanDigits, -10) : '';

if (!$phone10 || !$enteredOtp) {
    echo json_encode([
        'success' => false,
        'message' => 'Phone number and OTP code are required'
    ]);
    exit();
}

$storedCode = null;
$expiresAt = null;

// 1. Check Session
$sessionKey = 'otp_' . $phone10;
if (isset($_SESSION[$sessionKey])) {
    $storedCode = (string)$_SESSION[$sessionKey]['code'];
    $expiresAt = $_SESSION[$sessionKey]['expires'];
}

// 2. Check File cache fallback if session expired/cleared
if (!$storedCode) {
    $cacheFile = sys_get_temp_dir() . '/sns_otp/' . md5($phone10) . '.json';
    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        if ($cacheData) {
            $storedCode = (string)$cacheData['code'];
            $expiresAt = $cacheData['expires'];
        }
    }
}

if (!$storedCode) {
    echo json_encode([
        'success' => false,
        'message' => 'No OTP request found for this number or expired. Please request a new OTP.'
    ]);
    exit();
}

if (time() > $expiresAt) {
    // Clean up
    unset($_SESSION[$sessionKey]);
    @unlink(sys_get_temp_dir() . '/sns_otp/' . md5($phone10) . '.json');
    echo json_encode([
        'success' => false,
        'message' => 'OTP has expired (validity is 5 minutes). Please request a new OTP.'
    ]);
    exit();
}

if ($storedCode === $enteredOtp) {
    // Invalidate OTP after successful verification to prevent replay
    unset($_SESSION[$sessionKey]);
    @unlink(sys_get_temp_dir() . '/sns_otp/' . md5($phone10) . '.json');

    echo json_encode([
        'success' => true,
        'message' => 'Phone number successfully verified via WhatsApp OTP'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Incorrect OTP code. Please check your WhatsApp and try again.'
    ]);
}
?>
