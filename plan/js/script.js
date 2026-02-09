// Complete Registration & Payment Controller - Fixed Business Step Issue
class RegistrationController {
    constructor() {
        // خصائص الكنترولر
        this.currentStep = 1;
        this.formData = {};
        this.selectedPlan = null;
        this.pricingPlans = [];
        
        // API Endpoints
        this.plansApiEndpoint = 'https://admin.cashierthru.com/api/plans';
        this.paymentEndpoint = 'https://admin.cashierthru.com/api/payment';
        this.createCustomerEndpoint = 'https://admin.cashierthru.com/api/create-customer';
        this.createBusinessEndpoint = 'https://admin.cashierthru.com/api/create-business'; // تأكد من صحة الرابط
        
        this.init();
    }

    // تهيئة الكنترولر
    async init() {
        await this.loadPricingPlans();
        this.setupEventListeners();
        this.initializeForm();
        this.loadSavedData();
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // إرسال النموذج
        document.getElementById('registrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // فحص توفر النطاق الفرعي
        const subdomainField = document.getElementById('subdomain');
        if (subdomainField) {
            subdomainField.addEventListener('input', this.debounce(this.checkSubdomainAvailability.bind(this), 500));
        }

        // استمع لاختيار الخطة
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pricing-card')) {
                const card = e.target.closest('.pricing-card');
                const planId = card.dataset.planId;
                this.selectPlan(planId);
            }
        });
    }

    // تحميل خطط التسعير
    async loadPricingPlans() {
        try {
            const response = await fetch(this.plansApiEndpoint);
            const data = await response.json();
            
            if (data.status && data.plans) {
                this.pricingPlans = data.plans.map(plan => ({
                    id: plan.id,
                    name: plan.name,
                    price: parseFloat(plan.price),
                    period: this.getPeriodText(plan.duration, plan.duration_type),
                    popular: false,
                    features: plan.description.map(desc => desc.item)
                }));

                console.log("✔️ Pricing plans loaded:", this.pricingPlans);
                this.renderPricingPlans();
            } else {
                console.error("❌ Failed to load plans:", data.message);
                this.showError('فشل في تحميل خطط التسعير');
            }
        } catch (error) {
            console.error("❌ Fetch error:", error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    // تحويل المدة إلى نص قابل للعرض
    getPeriodText(duration, durationType) {
        if (parseFloat(duration) === 0) return 'مجاناً';
        switch (durationType) {
            case 'monthly': return '/شهرياً';
            case 'quarterly': return '/كل 3 أشهر';
            case 'yearly': return '/سنوياً';
            default: return `/كل ${duration} ${durationType}`;
        }
    }

    // عرض خطط التسعير
    renderPricingPlans() {
        const pricingGrid = document.getElementById('pricingPlans');
        if (!pricingGrid) return;

        pricingGrid.innerHTML = '';

        this.pricingPlans.forEach(plan => {
            const planCard = this.createPlanCard(plan);
            pricingGrid.appendChild(planCard);
        });
    }

    // إنشاء كارت الخطة
    createPlanCard(plan) {
        const card = document.createElement('div');
        card.className = `pricing-card ${plan.popular ? 'popular' : ''}`;
        card.dataset.planId = plan.id;

        const features = plan.features.map(feature => 
            `<li><i class="fas fa-check"></i> ${feature}</li>`
        ).join('');

        card.innerHTML = `
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">${plan.price === 0 ? 'مجاناً' : plan.price + ' ج.م'}</div>
            <div class="plan-period">${plan.period}</div>
            <ul class="plan-features">
                ${features}
            </ul>
        `;

        return card;
    }

    // اختيار خطة
    selectPlan(planId) {
        // إزالة التحديد السابق
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.classList.remove('selected');
        });

        // إضافة التحديد للكارت المختار
        const selectedCard = document.querySelector(`[data-plan-id="${planId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.selectedPlan = this.pricingPlans.find(plan => plan.id == planId);
        this.formData.selectedPlan = this.selectedPlan;
        this.formData.plan_id = planId;
    }

    // تهيئة النموذج
    initializeForm() {
        this.updateProgressBar();
        this.updateStepVisibility();
    }

    // الانتقال للخطوة التالية - مُحسن مع معالجة أفضل للأخطاء
    async nextStep(step) {
        console.log(`🔄 Moving from step ${step} to step ${step + 1}`);
        
        // إظهار مؤشر التحميل أثناء التحقق والإرسال
        this.showStepLoading(step);
        
        try {
            const isValid = await this.validateStep(step);
            if (!isValid) {
                console.log(`❌ Validation failed for step ${step}`);
                this.hideStepLoading();
                return;
            }

            console.log(`✔️ Step ${step} validated successfully`);
            
            // حفظ بيانات الخطوة الحالية
            this.saveStepData(step);
            
            // إرسال البيانات للـ API فقط للخطوات الأولى
            if (step === 1) {
                console.log(`📤 Submitting customer data...`);
                const success = await this.submitStepData(step);
                if (!success) {
                    this.hideStepLoading();
                    return; // لا ننتقل للخطوة التالية إذا فشل الإرسال
                }
            } else if (step === 2) {
                console.log(`📤 Submitting business data...`);
                const success = await this.submitStepData(step);
                if (!success) {
                    this.hideStepLoading();
                    return; // لا ننتقل للخطوة التالية إذا فشل الإرسال
                }
            }

            // إخفاء مؤشر التحميل
            this.hideStepLoading();

            // الانتقال للخطوة التالية
            this.currentStep++;
            this.updateProgressBar();
            this.updateStepVisibility();
            this.scrollToTop();
            
            console.log(`✔️ Successfully moved to step ${this.currentStep}`);
            
        } catch (error) {
            console.error(`❌ Error in nextStep for step ${step}:`, error);
            this.hideStepLoading();
            this.showError(`خطأ في معالجة الخطوة ${step}: ${error.message}`);
        }
    }

    // الرجوع للخطوة السابقة
    prevStep(step) {
        console.log(`🔄 Going back from step ${step} to step ${step - 1}`);
        this.currentStep--;
        this.updateProgressBar();
        this.updateStepVisibility();
        this.scrollToTop();
    }

    // التحقق من صحة الخطوة - مُحسن
    async validateStep(step) {
        console.log(`🔍 Validating step ${step}`);
        
        const stepElement = document.getElementById(`step${step}`);
        if (!stepElement) {
            console.error(`❌ Step element not found: step${step}`);
            return false;
        }

        const inputs = stepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;

        // التحقق من الحقول المطلوبة
        inputs.forEach(input => {
            const value = input.value ? input.value.trim() : '';
            if (!value) {
                console.log(`❌ Required field is empty: ${input.name || input.id}`);
                this.showFieldError(input, 'هذا الحقل مطلوب');
                isValid = false;
            } else {
                this.hideFieldError(input);
            }
        });

        // تحقق خاص بكل خطوة
        if (step === 1) {
            const email = document.getElementById('email');
            if (email && email.value && !this.isValidEmail(email.value)) {
                this.showFieldError(email, 'البريد الإلكتروني غير صحيح');
                isValid = false;
            }
        } else if (step === 2) {
            const subdomain = document.getElementById('subdomain');
            if (subdomain && subdomain.value && !this.isValidSubdomain(subdomain.value)) {
                this.showFieldError(subdomain, 'اسم النطاق الفرعي غير صالح');
                isValid = false;
            }
        } else if (step === 3) {
            // التحقق من اختيار الخطة
            if (!this.selectedPlan) {
                this.showError('يرجى اختيار خطة اشتراك');
                isValid = false;
            }

            // التحقق من الشروط والأحكام
            const agreeTerms = document.getElementById('agreeTerms');
            if (agreeTerms && !agreeTerms.checked) {
                this.showFieldError(agreeTerms, 'يجب الموافقة على الشروط والأحكام');
                isValid = false;
            }

            // التحقق من كلمات المرور
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirmPassword');
            
            if (password && password.value && password.value.length < 8) {
                this.showFieldError(password, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
                isValid = false;
            }

            if (password && confirmPassword && password.value !== confirmPassword.value) {
                this.showFieldError(confirmPassword, 'كلمة المرور وتأكيدها غير متطابقتين');
                isValid = false;
            }
        }

        console.log(`${isValid ? '✔️' : '❌'} Step ${step} validation result: ${isValid}`);
        return isValid;
    }

    // حفظ بيانات الخطوة
    saveStepData(step) {
        console.log(`💾 Saving data for step ${step}`);
        
        const stepElement = document.getElementById(`step${step}`);
        if (!stepElement) {
            console.error(`❌ Step element not found: step${step}`);
            return;
        }

        const inputs = stepElement.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            if (input.type !== 'password' && input.name && input.value !== undefined) {
                this.formData[input.name] = input.value;
                console.log(`💾 Saved ${input.name}: ${input.value}`);
            }
        });

        // حفظ كلمات المرور منفصلة
        if (step === 3) {
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirmPassword');
            
            if (password) this.formData.password = password.value;
            if (confirmPassword) this.formData.password_confirmation = confirmPassword.value;
        }

        // حفظ في localStorage للاستمرارية
        localStorage.setItem('registrationFormData', JSON.stringify(this.formData));
        console.log(`💾 Form data saved to localStorage`);
    }

    // إرسال بيانات الخطوة للـ API - مُحسن مع معالجة أفضل للأخطاء والاستجابات
    async submitStepData(stepNumber) {
        console.log(`📤 Submitting data for step ${stepNumber}`);
        
        try {
            if (stepNumber === 1) {
                return await this.createCustomer();
            } else if (stepNumber === 2) {
                return await this.createBusiness();
            }
            return true;
        } catch (err) {
            console.error(`❌ Error submitting step ${stepNumber} data:`, err);
            this.showError(`خطأ في إرسال بيانات الخطوة ${stepNumber}: ${err.message}`);
            return false;
        }
    }

    // إنشاء العميل - مُحسن
    async createCustomer() {
        console.log(`📤 Creating customer...`);
        
        const customerPayload = {
            first_name: this.formData.firstName,
            last_name: this.formData.lastName,
            email: this.formData.email,
            phone: this.formData.phone,
            country: this.formData.country,
            address: this.formData.address
        };

        console.log(`📤 Customer payload:`, customerPayload);

        try {
            const response = await fetch(this.createCustomerEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify(customerPayload)
            });

            console.log(`📤 Customer API response status: ${response.status}`);

            // قراءة الاستجابة
            const responseText = await response.text();
            console.log(`📤 Customer API raw response:`, responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`❌ Failed to parse customer API response:`, parseError);
                throw new Error('الخادم أرسل استجابة غير صالحة');
            }

            console.log(`📤 Customer API parsed response:`, data);

            // تحليل الاستجابة بمرونة أكثر
            if (this.isSuccessResponse(response.status, data)) {
                const customerId = this.extractCustomerId(data);
                
                if (customerId) {
                    this.formData.customer_id = customerId;
                    console.log(`✔️ Customer created successfully with ID: ${customerId}`);
                    return true;
                } else {
                    console.warn(`⚠️ Customer created but ID not found. Continuing...`);
                    this.formData.customer_creation_response = data;
                    return true; // نكمل حتى لو لم نحصل على ID
                }
            } else {
                const errorMessage = this.extractErrorMessage(data);
                console.error(`❌ Customer creation failed:`, errorMessage);
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error(`❌ Customer creation error:`, error);
            throw error;
        }
    }

    // إنشاء النشاط - مُحسن مع معالجة أفضل للأخطاء
    async createBusiness() {
        console.log(`📤 Creating business...`);
        
        // التحقق من وجود customer_id
        if (!this.formData.customer_id) {
            console.warn(`⚠️ No customer_id found, attempting to continue...`);
        }

        const businessPayload = {
            customer_id: this.formData.customer_id || null,
            business_name: this.formData.businessName,
            business_type: this.formData.businessType,
            business_size: this.formData.businessSize,
            subdomain: this.formData.subdomain,
            expected_revenue: this.formData.expectedRevenue || null,
            business_description: this.formData.businessDescription || null,
            branches: this.formData.branches ? parseInt(this.formData.branches) : 1
        };

        // إزالة القيم null لتجنب مشاكل API
        Object.keys(businessPayload).forEach(key => {
            if (businessPayload[key] === null || businessPayload[key] === undefined || businessPayload[key] === '') {
                delete businessPayload[key];
            }
        });

        console.log(`📤 Business payload:`, businessPayload);

        try {
            const response = await fetch(this.createBusinessEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify(businessPayload)
            });

            console.log(`📤 Business API response status: ${response.status}`);

            // قراءة الاستجابة
            const responseText = await response.text();
            console.log(`📤 Business API raw response:`, responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`❌ Failed to parse business API response:`, parseError);
                
                // إذا كانت الاستجابة فارغة أو غير JSON، قد تكون العملية نجحت
                if (response.ok && responseText.trim() === '') {
                    console.log(`✔️ Business created successfully (empty response)`);
                    return true;
                }
                
                throw new Error('الخادم أرسل استجابة غير صالحة');
            }

            console.log(`📤 Business API parsed response:`, data);

            // تحليل الاستجابة
            if (this.isSuccessResponse(response.status, data)) {
                const businessId = this.extractBusinessId(data);
                
                if (businessId) {
                    this.formData.business_id = businessId;
                }
                
                console.log(`✔️ Business created successfully`);
                return true;
            } else {
                const errorMessage = this.extractErrorMessage(data);
                console.error(`❌ Business creation failed:`, errorMessage);
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error(`❌ Business creation error:`, error);
            throw error;
        }
    }

    // تحليل ما إذا كانت الاستجابة ناجحة
    isSuccessResponse(status, data) {
        // الحالات الناجحة
        if (status >= 200 && status < 300) {
            return true;
        }
        
        // فحص رسالة النجاح في النص العربي
        if (data && data.message) {
            const message = data.message.toLowerCase();
            return message.includes('نجح') || 
                   message.includes('تم') || 
                   message.includes('success') ||
                   message.includes('created');
        }
        
        return false;
    }

    // استخراج معرف العميل من الاستجابة
    extractCustomerId(data) {
        return data.customer_id || 
               data.id || 
               data.data?.customer_id || 
               data.data?.id || 
               data.customer?.id || 
               data.user?.id ||
               null;
    }

    // استخراج معرف النشاط من الاستجابة
    extractBusinessId(data) {
        return data.business_id || 
               data.id || 
               data.data?.business_id || 
               data.data?.id || 
               data.business?.id ||
               null;
    }

    // استخراج رسالة الخطأ
    extractErrorMessage(data) {
        if (data && data.message) {
            return data.message;
        }
        
        if (data && data.errors) {
            if (typeof data.errors === 'string') {
                return data.errors;
            }
            
            if (typeof data.errors === 'object') {
                const errorMessages = Object.values(data.errors).flat();
                return errorMessages.join(', ');
            }
        }
        
        return 'حدث خطأ غير معروف';
    }

    // معالجة إرسال النموذج النهائي
    async handleFormSubmit() {
        console.log(`🚀 Handling final form submission`);
        
        const isValid = await this.validateStep(3);
        if (!isValid) {
            console.log(`❌ Final validation failed`);
            return;
        }

        this.saveStepData(3);
        this.showLoading();

        try {
            console.log(`🚀 Starting payment process...`);

            const paymentResult = await this.processPayment();
            
            if (paymentResult.status === 'success') {
                console.log(`✔️ Payment process initiated successfully`);
                this.clearSavedData();
                window.location.href = paymentResult.url;
            } else {
                console.error(`❌ Payment process failed:`, paymentResult);
                this.showError(paymentResult.message || '❌ فشل في معالجة الطلب');
            }

        } catch (error) {
            console.error('❌ Form submission error:', error);
            this.showError(`❌ حدث خطأ: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // معالجة الدفع
    async processPayment() {
        console.log(`💳 Processing payment...`);
        
        const paymentData = {
            plan_id: this.selectedPlan.id,
            first_name: this.formData.firstName,
            last_name: this.formData.lastName,
            email: this.formData.email,
            phone: this.formData.phone,
            address: this.formData.address,
            country: this.formData.country,
            business_name: this.formData.businessName,
            business_type: this.formData.businessType,
            business_size: this.formData.businessSize,
            subdomain: this.formData.subdomain,
            branches: this.formData.branches || 1,
            expected_revenue: this.formData.expectedRevenue,
            business_description: this.formData.businessDescription,
            password: this.formData.password,
            password_confirmation: this.formData.password_confirmation,
            customer_id: this.formData.customer_id,
            business_id: this.formData.business_id
        };

        console.log(`💳 Payment data:`, { ...paymentData, password: '[HIDDEN]', password_confirmation: '[HIDDEN]' });

        try {
            const response = await fetch(this.paymentEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(paymentData)
            });

            console.log(`💳 Payment API response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Payment API error response:`, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`💳 Payment API response:`, result);
            
            return result;
        } catch (error) {
            console.error('❌ Payment processing error:', error);
            return {
                status: 'error',
                message: '❌ خطأ في الاتصال بالخادم'
            };
        }
    }

    // فحص توفر النطاق الفرعي
    async checkSubdomainAvailability(event) {
        const subdomain = event.target.value.trim();
        if (subdomain.length < 3) return;

        console.log(`🔍 Checking subdomain availability: ${subdomain}`);

        // محاكاة استدعاء API
        setTimeout(() => {
            const isAvailable = Math.random() > 0.3; // 70% احتمال متوفر
            const field = event.target;
            
            if (isAvailable) {
                field.classList.remove('error');
                field.classList.add('success');
                this.hideFieldError(field);
                console.log(`✔️ Subdomain available: ${subdomain}`);
            } else {
                field.classList.remove('success');
                field.classList.add('error');
                this.showFieldError(field, 'هذا الاسم غير متاح، جرب اسماً آخر');
                console.log(`❌ Subdomain not available: ${subdomain}`);
            }
        }, 1000);
    }

    // تبديل رؤية كلمة المرور
    togglePassword(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const button = field.nextElementSibling;
        const icon = button ? button.querySelector('i') : null;
        
        if (!icon) return;

        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // تحديث شريط التقدم
    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        const steps = document.querySelectorAll('.step');
        
        const progressWidth = (this.currentStep / 3) * 100;
        if (progressFill) {
            progressFill.style.width = progressWidth + '%';
        }

        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    // تحديث رؤية الخطوات
    updateStepVisibility() {
        const steps = document.querySelectorAll('.form-step');
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    // التمرير لأعلى
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // عرض مؤشر التحميل لخطوة معينة
    showStepLoading(step) {
        const stepElement = document.getElementById(`step${step}`);
        if (stepElement) {
            const submitBtn = stepElement.querySelector('button[type="button"], .btn-next');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            }
        }
    }

    // إخفاء مؤشر التحميل للخطوة
    hideStepLoading() {
        const submitBtns = document.querySelectorAll('.btn-next');
        submitBtns.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = 'التالي <i class="fas fa-arrow-right"></i>';
        });
    }

    // عرض خطأ في حقل معين
    showFieldError(field, message) {
        const errorId = field.name ? field.name + 'Error' : field.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        field.classList.add('error');
    }

    // إخفاء خطأ الحقل
    hideFieldError(field) {
        const errorId = field.name ? field.name + 'Error' : field.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
        field.classList.remove('error');
    }

    // عرض رسالة خطأ عامة
    showError(message) {
        console.error(`❌ Showing error: ${message}`);
        
        let alertDiv = document.getElementById('error-alert');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'error-alert';
            alertDiv.className = 'alert alert-error';
            
            const formWrapper = document.querySelector('.form-wrapper');
            if (formWrapper) {
                formWrapper.insertBefore(alertDiv, formWrapper.firstChild);
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

        setTimeout(() => {
            if (alertDiv) {
                alertDiv.style.display = 'none';
            }
        }, 5000);

        this.scrollToTop();
    }

    // عرض رسالة نجاح
    showSuccess(message) {
        console.log(`✔️ Showing success: ${message}`);
        
        let alertDiv = document.getElementById('success-alert');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.id = 'success-alert';
            alertDiv.className = 'alert alert-success';
            
            const formWrapper = document.querySelector('.form-wrapper');
            if (formWrapper) {
                formWrapper.insertBefore(alertDiv, formWrapper.firstChild);
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

    // عرض مؤشر التحميل
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
    }

    // إخفاء مؤشر التحميل
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    // تحميل البيانات المحفوظة
    loadSavedData() {
        const savedData = localStorage.getItem('registrationFormData');
        if (savedData) {
            try {
                this.formData = JSON.parse(savedData);
                console.log(`💾 Loaded saved data from localStorage`);
                
                // ملء الحقول
                Object.keys(this.formData).forEach(key => {
                    const field = document.querySelector(`[name="${key}"]`);
                    if (field && key !== 'password' && key !== 'password_confirmation') {
                        field.value = this.formData[key];
                    }
                });
                
                // استعادة الخطة المختارة
                if (this.formData.selectedPlan) {
                    setTimeout(() => {
                        this.selectPlan(this.formData.selectedPlan.id);
                    }, 1000);
                }
            } catch (error) {
                console.error('❌ Error loading saved data:', error);
                localStorage.removeItem('registrationFormData');
            }
        }
    }

    // مسح البيانات المحفوظة
    clearSavedData() {
        localStorage.removeItem('registrationFormData');
        this.formData = {};
        console.log(`🗑️ Cleared saved data`);
    }

    // دالة التأخير
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // التحقق من صحة البريد الإلكتروني
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // التحقق من صحة النطاق الفرعي
    isValidSubdomain(subdomain) {
        const subdomainRegex = /^[a-zA-Z0-9-]+$/;
        return subdomainRegex.test(subdomain) && subdomain.length >= 3;
    }
}

// الدوال العامة للوصول من HTML
let registrationController;

// تهيئة الكنترولر عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Initializing Registration Controller...`);
    registrationController = new RegistrationController();
});

// دوال للاستخدام من HTML
function nextStep(step) {
    if (registrationController) {
        registrationController.nextStep(step);
    }
}

function prevStep(step) {
    if (registrationController) {
        registrationController.prevStep(step);
    }
}

function togglePassword(fieldId) {
    if (registrationController) {
        registrationController.togglePassword(fieldId);
    }
}

function selectPlan(planId) {
    if (registrationController) {
        registrationController.selectPlan(planId);
    }
}

// حفظ البيانات عند مغادرة الصفحة
window.addEventListener('beforeunload', () => {
    if (registrationController) {
        registrationController.saveStepData(registrationController.currentStep);
    }
});

// تصدير للاستخدام العام
window.RegistrationController = RegistrationController;