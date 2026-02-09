<?php
// تأكد من وجود البيانات في الـ GET
if (!isset($_GET['user_data'])) {
    die('❌ لم يتم العثور على البيانات المشفرة.');
}

$user_data_encoded = $_GET['user_data'];

// فك التشفير
$user_data_json = base64_decode($user_data_encoded);
$user_data = json_decode($user_data_json, true);

// تحقق إن البيانات موجودة
if (!$user_data || !is_array($user_data)) {
    die('❌ البيانات غير صالحة.');
}

// استخراج البيانات
$customer_name = ($user_data['first_name'] ?? '') . ' ' . ($user_data['last_name'] ?? '');
$email = $user_data['email'] ?? '';
$plan_id = $user_data['plan_id'] ?? 'غير معروف';
$subdomain = $user_data['subdomain'] ?? '';
$phone = $user_data['phone'] ?? '';
$address = $user_data['address'] ?? '';
$password = $user_data['password'] ?? '';
$password_confirmation = $user_data['password_confirmation'] ?? '';

?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تم الدفع بنجاح</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<!-- Modal -->
<div class="modal fade show" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" style="display: block;" aria-modal="true" role="dialog">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-success">
      <div class="modal-header bg-success text-white">
        <h5 class="modal-title" id="successModalLabel">✅ تم الدفع بنجاح</h5>
      </div>
      <div class="modal-body text-center">
        <h4 class="text-success mb-3">شكرًا لك، <?= htmlspecialchars($customer_name) ?>!</h4>
        <p>تم تفعيل خطة الاشتراك رقم <strong><?= htmlspecialchars($plan_id) ?></strong>.</p>
        <p>يمكنك الآن الدخول إلى لوحة تحكم الأدمن.</p>
      </div>
      <div class="modal-footer">
<a href="http://<?= htmlspecialchars($subdomain) ?>.cashierthru.com/signin" class="btn btn-success">دخول لوحة التحكم</a>
      </div>
    </div>
  </div>
</div>

<script>
// إرسال طلب إنشاء الحساب مع subdomain
fetch('https://admin.cashierthru.com/api/tenant-register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({
        name: "<?= addslashes($customer_name) ?>",
        email: "<?= addslashes($email) ?>",
        phone: "<?= addslashes($phone) ?>",
        address: "<?= addslashes($address) ?>",
        password: "<?= addslashes($password) ?>",
        password_confirmation: "<?= addslashes($password_confirmation) ?>",
        plan_id: "<?= addslashes($plan_id) ?>",
        business_type: "<?= addslashes($user_data['business_type'] ?? '') ?>",
        subdomain: "<?= addslashes($subdomain) ?>"
    })
})
.then(res => res.json())
.then(data => {
    if (data.status) {
        window.location.href = 'https://' + data.subdomain;
    } else {
        alert("❌ فشل إنشاء الحساب: " + data.message);
    }
});
</script>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
