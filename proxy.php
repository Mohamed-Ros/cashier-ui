<?php
// proxy.php on your frontend domain
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url = 'https://admin.cashierthru.com/plans';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

if ($error) {
    echo json_encode([
        'status' => false,
        'message' => '❌ Proxy Error: ' . $error
    ]);
} elseif ($httpCode !== 200) {
    echo json_encode([
        'status' => false,
        'message' => '❌ HTTP Error: ' . $httpCode
    ]);
} else {
    echo $response;
}
