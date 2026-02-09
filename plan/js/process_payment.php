<?php
session_start(); // ✅ بدأ السيشن في أول الملف
header('Content-Type: application/json');

// التحقق من أن الطلب هو POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => '❌ طريقة الطلب غير صحيحة']);
    exit;
}

// قراءة بيانات JSON القادمة من الـ fetch
$input = json_decode(file_get_contents('php://input'), true);

// الحقول المطلوبة مع business_type و subdomain
$required = ['plan_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'business_type', 'subdomain' ,'password', 'password_confirmation'];
foreach ($required as $field) {
    if (!isset($input[$field]) || trim($input[$field]) === '') {
        echo json_encode(['status' => 'error', 'message' => "❌ الحقل مطلوب: {$field}"]);
        exit;
    }
}

// تحقق من صحة subdomain
if (!preg_match('/^[a-zA-Z0-9-]+$/', $input['subdomain'])) {
    echo json_encode(['status' => 'error', 'message' => '❌ اسم النطاق الفرعي غير صالح. استخدم حروف إنجليزية، أرقام، أو شرطات فقط.']);
    exit;
}

// جلب بيانات الخطط من API
$plans_api = file_get_contents('https://cashierthru.com/proxy.php');
$plans_data = json_decode($plans_api, true);

if (!$plans_data || !isset($plans_data['plans'])) {
    echo json_encode(['status' => 'error', 'message' => '❌ فشل في جلب بيانات الخطط من API.']);
    exit;
}

// البحث عن الخطة المطلوبة
$selected_plan = null;
foreach ($plans_data['plans'] as $plan) {
    if ($plan['id'] == $input['plan_id']) {
        $selected_plan = $plan;
        break;
    }
}

if (!$selected_plan) {
    echo json_encode(['status' => 'error', 'message' => '❌ الخطة غير موجودة']);
    exit;
}

// ✅ تخزين بيانات المستخدم في الـ Session لاستخدامها لاحقًا
$_SESSION['user_data'] = [
    'first_name'    => $input['first_name'],
    'last_name'     => $input['last_name'],
    'email'         => $input['email'],
    'phone'         => $input['phone'],
    'address'       => $input['address'],
    'business_type' => $input['business_type'],
    'subdomain'     => $input['subdomain'],
    'plan_id'       => $selected_plan['id'],
    'subdomain' => $input['subdomain'],
    'password' => $input['password'],
    'password_confirmation' => $input['password_confirmation']
];

// التعامل مع الخطة المجانية (سعر = 0)
if (floatval($selected_plan['price']) == 0) {
    echo json_encode([
        'status' => 'success',
        'url' => 'https://cashierthru.com/payment-success.php?free_plan=1&plan_id=' . $selected_plan['id']
    ]);
    exit;
}

// إعداد بيانات الفاتورة
$invoice_data = [
    "payment_method_id" => 2, // Visa
    "cartTotal" => $selected_plan['price'],
    "currency" => "EGP",
    "invoice_number" => uniqid("INV_"),
    "customer" => [
        "first_name"    => $input['first_name'],
        "last_name"     => $input['last_name'],
        "email"         => $input['email'],
        "phone"         => $input['phone'],
        "address"       => $input['address'],
        "business_type" => $input['business_type'],
        "subdomain"     => $input['subdomain'],
    ],
    "redirectionUrls" => [
        "successUrl" => "https://cashierthru.com/payment-success.php",
        "failUrl"    => "https://cashierthru.com/payment-fail.php"
    ],
    "cartItems" => [
        [
            "name"     => $selected_plan['name'],
            "price"    => $selected_plan['price'],
            "quantity" => 1
        ]
    ]
];

// إرسال الطلب لـ Fawaterk
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'https://staging.fawaterk.com/api/v2/invoiceInitPay',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($invoice_data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer 3e3dccdee79e985969a12f35c5260893a9e3cb0a22fe3f6a68'
    ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
    echo json_encode(['status' => 'error', 'message' => '❌ خطأ أثناء الاتصال بـ Fawaterk: ' . $err]);
    exit;
}

$result = json_decode($response, true);

if ($result && isset($result['status']) && $result['status'] === 'success') {
    echo json_encode([
        'status' => 'success',
        'url'    => $result['data']['payment_data']['redirectTo']
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => '❌ فشل في إنشاء الفاتورة',
        'details' => $result
    ]);
}
?>
