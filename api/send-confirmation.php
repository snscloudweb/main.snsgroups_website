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

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$rawPhone = isset($data['phone']) ? $data['phone'] : '';
$cleanDigits = preg_replace('/[^0-9]/', '', $rawPhone);
$applicantName = isset($data['name']) && trim($data['name']) !== '' ? trim($data['name']) : 'Applicant';

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

// Dispatch confirmation message via PayPerWA
$apiKey = getEnvVar('PAYPERWA_API_KEY');
$baseUrl = getEnvVar('PAYPERWA_BASE_URL', 'https://payperwa.com/api/v1');
$templateName = getEnvVar('PAYPERWA_CONFIRMATION_TEMPLATE', 'verification_message');
$endpoint = rtrim($baseUrl, '/') . '/messages/send';

$payload = [
    'to' => $recipient,
    'template_name' => $templateName,
    'variables' => [$applicantName]
];

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
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$resData = json_decode($resp, true);

if ($httpCode >= 200 && $httpCode < 300 && !empty($resData['success'])) {
    echo json_encode([
        'success' => true,
        'message' => 'Enquiry acknowledgement sent to +91 ' . $phone10,
        'data' => $resData
    ]);
} else {
    $errMsg = isset($resData['error']) ? $resData['error'] : (isset($resData['message']) ? $resData['message'] : 'Failed to dispatch acknowledgement');
    echo json_encode([
        'success' => false,
        'message' => $errMsg,
        'details' => $resData,
        'http_code' => $httpCode
    ]);
}
?>
