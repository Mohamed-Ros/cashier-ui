// Payment Controller Class - نفس سيناريو PHP
class PaymentController {
    constructor() {
        this.selectedPlan = null;
        this.paymentEndpoint = 'https://admin.cashierthru.com/api/payment'; // أو Laravel route
        this.plansApiEndpoint = 'https://admin.cashierthru.com/api/plans';
        this.init();
    }

    // تهيئة الكنترولر
    init() {
        this.setupEventListeners();
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // استمع لإرسال النموذج
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'registrationForm' || e.target.classList.contains('registration-form')) {
                e.preventDefault();
                this.handlePayment(e.target);
            }
        });

        // استمع لاختيار الخطة
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-plan') || e.target.closest('.select-plan')) {
                const planElement = e.target.closest('.plan-card');
                if (planElement) {
                    this.setSelectedPlan(planElement.dataset.planId);
                }
            }
        });
    }

    // تعيين الخطة المختارة
    setSelectedPlan(planId) {
        this.selectedPlan = { id: planId };
        // يمكن إضافة المزيد من المعلومات حسب الحاجة
    }

    // معالجة الدفع - نفس طريقة PHP
    async handlePayment(form) {
        try {
            // إظهار مؤشر التحميل
            this.showLoading(true);

            // جمع بيانات النموذج
            const formData = this.collectFormData(form);

            // التحقق من صحة البيانات
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                this.showError(validation.message);
                return;
            }

            // جلب بيانات الخطط
            const plansData = await this.fetchPlans();
            if (!plansData || !plansData.plans) {
                this.showError('❌ فشل في جلب بيانات الخطط من API.');
                return;
            }

            // البحث عن الخطة المطلوبة
            const selectedPlan = this.findPlan(plansData.plans, formData.plan_id);
            if (!selectedPlan) {
                this.showError('❌ الخطة غير موجودة');
                return;
            }

            // حفظ بيانات المستخدم في sessionStorage
            this.saveUserData(formData, selectedPlan);

            // التحقق إذا كانت الخطة مجانية
            if (parseFloat(selectedPlan.price) === 0) {
                window.location.href = `https://cashierthru.com/payment-success.php?free_plan=1&plan_id=${selectedPlan.id}`;
                return;
            }

            // إنشاء الفاتورة
            const invoiceResult = await this.createInvoice(formData, selectedPlan);
            
            if (invoiceResult.status === 'success') {
                // تحويل المستخدم لصفحة الدفع
                window.location.href = invoiceResult.url;
            } else {
                this.showError(invoiceResult.message || '❌ فشل في إنشاء الفاتورة');
            }

        } catch (error) {
            console.error('Payment error:', error);
            this.showError('❌ حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.');
        } finally {
            this.showLoading(false);
        }
    }

    // جمع بيانات النموذج
    collectFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        // الحقول المطلوبة
        const requiredFields = [
            'plan_id', 'first_name', 'last_name', 'email', 
            'phone', 'address', 'business_type', 'subdomain',
            'password', 'password_confirmation'
        ];

        requiredFields.forEach(field => {
            data[field] = formData.get(field) || '';
        });

        return data;
    }

    // التحقق من صحة البيانات
    validateFormData(data) {
        const required = [
            'plan_id', 'first_name', 'last_name', 'email',
            'phone', 'address', 'business_type', 'subdomain',
            'password', 'password_confirmation'
        ];

        // التحقق من الحقول المطلوبة
        for (const field of required) {
            if (!data[field] || data[field].trim() === '') {
                return {
                    isValid: false,
                    message: `❌ الحقل مطلوب: ${field}`
                };
            }
        }

        // التحقق من صحة subdomain
        if (!/^[a-zA-Z0-9-]+$/.test(data.subdomain)) {
            return {
                isValid: false,
                message: '❌ اسم النطاق الفرعي غير صالح. استخدم حروف إنجليزية، أرقام، أو شرطات فقط.'
            };
        }

        // التحقق من تطابق كلمة المرور
        if (data.password !== data.password_confirmation) {
            return {
                isValid: false,
                message: '❌ كلمة المرور وتأكيدها غير متطابقتين'
            };
        }

        return { isValid: true };
    }

    // جلب بيانات الخطط
    async fetchPlans() {
        try {
            const response = await fetch(this.plansApiEndpoint);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching plans:', error);
            return null;
        }
    }

    // البحث عن الخطة
    findPlan(plans, planId) {
        return plans.find(plan => plan.id == planId) || null;
    }

    // حفظ بيانات المستخدم
    saveUserData(formData, selectedPlan) {
        const userData = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            business_type: formData.business_type,
            subdomain: formData.subdomain,
            plan_id: selectedPlan.id,
            password: formData.password,
            password_confirmation: formData.password_confirmation
        };

        // حفظ في sessionStorage بدلاً من localStorage
        sessionStorage.setItem('user_data', JSON.stringify(userData));
    }

    // إنشاء الفاتورة
    async createInvoice(formData, selectedPlan) {
        const invoiceData = {
            plan_id: formData.plan_id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            business_type: formData.business_type,
            subdomain: formData.subdomain,
            password: formData.password,
            password_confirmation: formData.password_confirmation
        };

        try {
            const response = await fetch(this.paymentEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(invoiceData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Invoice creation error:', error);
            return {
                status: 'error',
                message: '❌ خطأ في الاتصال بالخادم'
            };
        }
    }

    // إظهار مؤشر التحميل
    showLoading(show) {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                جاري المعالجة...
            `;
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <i class="fas fa-credit-card"></i>
                إتمام عملية التسجيل والدفع
            `;
        }
    }

    // إظهار رسالة خطأ
    showError(message) {
        // إنشاء عنصر التنبيه إذا لم يكن موجوداً
        let alertDiv = document.getElementById('error-alert');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'error-alert';
            alertDiv.className = 'alert alert-error';
            
            // إدراج التنبيه في بداية النموذج
            const form = document.querySelector('form');
            if (form) {
                form.insertBefore(alertDiv, form.firstChild);
            }
        }

        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button type="button" class="alert-close" onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        alertDiv.style.display = 'block';

        // إخفاء التنبيه تلقائياً بعد 5 ثواني
        setTimeout(() => {
            if (alertDiv) {
                alertDiv.style.display = 'none';
            }
        }, 5000);

        // التمرير إلى أعلى الصفحة لإظهار الخطأ
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // إظهار رسالة نجاح
    showSuccess(message) {
        let alertDiv = document.getElementById('success-alert');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'success-alert';
            alertDiv.className = 'alert alert-success';
            
            const form = document.querySelector('form');
            if (form) {
                form.insertBefore(alertDiv, form.firstChild);
            }
        }

        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        alertDiv.style.display = 'block';
    }

    // الحصول على CSRF Token (إذا كان مطلوب)
    getCSRFToken() {
        const tokenElement = document.querySelector('meta[name="csrf-token"]');
        return tokenElement ? tokenElement.getAttribute('content') : null;
    }
}

// تهيئة الكنترولر عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.paymentController = new PaymentController();
});

// تصدير للاستخدام العام
window.PaymentController = PaymentController;