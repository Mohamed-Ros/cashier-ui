// إصلاح المشاكل في كود التحقق من البيانات

class FormValidator {
    constructor() {
        this.rules = {
            firstName: [
                { rule: 'required', message: 'الاسم الأول مطلوب' },
                { rule: 'minLength', value: 2, message: 'يجب أن يكون الاسم أكثر من حرفين' },
                { rule: 'maxLength', value: 50, message: 'الاسم طويل جداً' },
                { rule: 'pattern', value: /^[\u0600-\u06FFa-zA-Z\s]+$/, message: 'يجب أن يحتوي على أحرف فقط' }
            ],
            lastName: [
                { rule: 'required', message: 'الاسم الأخير مطلوب' },
                { rule: 'minLength', value: 2, message: 'يجب أن يكون الاسم أكثر من حرفين' },
                { rule: 'maxLength', value: 50, message: 'الاسم طويل جداً' },
                { rule: 'pattern', value: /^[\u0600-\u06FFa-zA-Z\s]+$/, message: 'يجب أن يحتوي على أحرف فقط' }
            ],
            email: [
                { rule: 'required', message: 'البريد الإلكتروني مطلوب' },
                { rule: 'email', message: 'يرجى إدخال بريد إلكتروني صحيح' },
                // تم إصلاح المشكلة: ربط الدالة بالـ context الصحيح
                { rule: 'custom', validator: (value) => this.checkEmailAvailability(value), message: 'هذا البريد مستخدم بالفعل' }
            ],
            phone: [
                { rule: 'required', message: 'رقم الهاتف مطلوب' },
                { rule: 'pattern', value: /^[0-9+\-\s()]{10,}$/, message: 'يرجى إدخال رقم هاتف صحيح' },
                { rule: 'custom', validator: (value) => this.validatePhoneNumber(value), message: 'رقم الهاتف غير صحيح' }
            ],
            businessName: [
                { rule: 'required', message: 'اسم النشاط التجاري مطلوب' },
                { rule: 'minLength', value: 3, message: 'يجب أن يكون اسم النشاط أكثر من 3 أحرف' },
                { rule: 'maxLength', value: 100, message: 'اسم النشاط طويل جداً' }
            ],
            subdomain: [
                { rule: 'required', message: 'اسم النطاق الفرعي مطلوب' },
                { rule: 'minLength', value: 3, message: 'يجب أن يكون أكثر من 3 أحرف' },
                { rule: 'maxLength', value: 30, message: 'اسم النطاق طويل جداً' },
                { rule: 'pattern', value: /^[a-zA-Z0-9-]+$/, message: 'يجب أن يحتوي على أحرف إنجليزية وأرقام فقط' },
                { rule: 'custom', validator: (value) => this.checkSubdomainAvailability(value), message: 'هذا الاسم غير متاح' }
            ],
            password: [
                { rule: 'required', message: 'كلمة المرور مطلوبة' },
                { rule: 'minLength', value: 8, message: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' },
                { rule: 'custom', validator: (value) => this.validatePasswordStrength(value), message: 'كلمة المرور ضعيفة جداً' }
            ],
            confirmPassword: [
                { rule: 'required', message: 'تأكيد كلمة المرور مطلوب' },
                { rule: 'custom', validator: (value, formData) => this.validatePasswordMatch(value, formData), message: 'كلمة المرور غير متطابقة' }
            ]
        };
    }

    // Validate single field
    async validateField(fieldName, value, formData = {}) {
        const rules = this.rules[fieldName];
        if (!rules) return { isValid: true };

        // تحقق من وجود القيمة أولاً
        if (!value) value = '';

        for (const rule of rules) {
            const result = await this.applyRule(rule, value, formData);
            if (!result.isValid) {
                return result;
            }
        }

        return { isValid: true };
    }

    // Apply validation rule - تم تحسينه
    async applyRule(rule, value, formData) {
        // تحويل القيمة لنص إذا لم تكن كذلك
        const stringValue = String(value || '');
        
        switch (rule.rule) {
            case 'required':
                return {
                    isValid: stringValue.trim() !== '',
                    message: rule.message
                };

            case 'minLength':
                return {
                    isValid: stringValue.length >= rule.value,
                    message: rule.message
                };

            case 'maxLength':
                return {
                    isValid: stringValue.length <= rule.value,
                    message: rule.message
                };

            case 'pattern':
                return {
                    isValid: rule.value.test(stringValue),
                    message: rule.message
                };

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return {
                    isValid: emailRegex.test(stringValue),
                    message: rule.message
                };

            case 'custom':
                try {
                    // تم إصلاح استدعاء الدالة المخصصة
                    return await rule.validator(stringValue, formData);
                } catch (error) {
                    console.error('خطأ في التحقق المخصص:', error);
                    return {
                        isValid: false,
                        message: 'خطأ في التحقق من البيانات'
                    };
                }

            default:
                return { isValid: true };
        }
    }

    // Custom validators - تم إصلاح جميعها
    async checkEmailAvailability(email) {
        if (!email || email.trim() === '') {
            return { isValid: true, message: '' };
        }

        try {
            // محاكاة استدعاء API
            return new Promise(resolve => {
                setTimeout(() => {
                    const reservedEmails = ['admin@test.com', 'user@test.com', 'test@test.com'];
                    const isAvailable = !reservedEmails.includes(email.toLowerCase());
                    resolve({
                        isValid: isAvailable,
                        message: isAvailable ? '' : 'هذا البريد مستخدم بالفعل'
                    });
                }, 500);
            });
        } catch (error) {
            console.error('خطأ في فحص البريد الإلكتروني:', error);
            return { isValid: true, message: '' }; // في حالة الخطأ، نسمح بالمرور
        }
    }

    async checkSubdomainAvailability(subdomain) {
        if (!subdomain || subdomain.trim() === '') {
            return { isValid: true, message: '' };
        }

        try {
            return new Promise(resolve => {
                setTimeout(() => {
                    const reservedNames = ['admin', 'api', 'www', 'mail', 'ftp', 'test', 'support', 'help', 'blog'];
                    const cleanSubdomain = subdomain.toLowerCase().trim();
                    
                    // فحص الأسماء المحجوزة
                    if (reservedNames.includes(cleanSubdomain)) {
                        resolve({
                            isValid: false,
                            message: 'هذا الاسم محجوز، يرجى اختيار اسم آخر'
                        });
                        return;
                    }

                    // محاكاة فحص التوفر
                    const isAvailable = Math.random() > 0.3; // 70% احتمال متوفر
                    resolve({
                        isValid: isAvailable,
                        message: isAvailable ? '' : 'هذا الاسم غير متاح، جرب اسماً آخر'
                    });
                }, 800);
            });
        } catch (error) {
            console.error('خطأ في فحص النطاق الفرعي:', error);
            return { isValid: true, message: '' };
        }
    }

    validatePhoneNumber(phone) {
        if (!phone || phone.trim() === '') {
            return Promise.resolve({ isValid: true, message: '' });
        }

        try {
            // تنظيف رقم الهاتف
            const cleanPhone = phone.replace(/[^\d+]/g, '');
            
            // قواعد التحقق المحسنة
            let isValid = true;
            let message = '';

            if (cleanPhone.length < 10) {
                isValid = false;
                message = 'رقم الهاتف قصير جداً';
            } else if (cleanPhone.length > 15) {
                isValid = false;
                message = 'رقم الهاتف طويل جداً';
            } else if (!cleanPhone.match(/^\+?[0-9]{10,15}$/)) {
                isValid = false;
                message = 'تنسيق رقم الهاتف غير صحيح';
            }

            return Promise.resolve({
                isValid,
                message
            });
        } catch (error) {
            console.error('خطأ في التحقق من رقم الهاتف:', error);
            return Promise.resolve({ isValid: true, message: '' });
        }
    }

    validatePasswordStrength(password) {
        if (!password || password.trim() === '') {
            return Promise.resolve({ isValid: true, message: '' });
        }

        try {
            let score = 0;
            const feedback = [];
            
            // فحص الطول
            if (password.length >= 8) score++;
            else feedback.push('استخدم 8 أحرف على الأقل');
            
            if (password.length >= 12) score++;

            // فحص تنوع الأحرف
            if (/[a-z]/.test(password)) score++;
            else feedback.push('أضف أحرف صغيرة');

            if (/[A-Z]/.test(password)) score++;
            else feedback.push('أضف أحرف كبيرة');

            if (/[0-9]/.test(password)) score++;
            else feedback.push('أضف أرقام');

            if (/[^A-Za-z0-9]/.test(password)) score++;
            else feedback.push('أضف رموز خاصة');

            // فحص الأنماط المتكررة
            if (!/(.)\1{2,}/.test(password)) score++;
            else feedback.push('تجنب تكرار الأحرف');

            if (!/123|abc|qwe|password|admin/i.test(password)) score++;
            else feedback.push('تجنب الكلمات الشائعة');

            const isValid = score >= 5;
            
            return Promise.resolve({
                isValid,
                message: isValid ? '' : `كلمة المرور ضعيفة (${feedback.join('، ')})`,
                score,
                feedback
            });
        } catch (error) {
            console.error('خطأ في فحص قوة كلمة المرور:', error);
            return Promise.resolve({ isValid: true, message: '' });
        }
    }

    validatePasswordMatch(confirmPassword, formData) {
        try {
            const passwordField = document.getElementById('password');
            const password = passwordField ? passwordField.value : '';
            
            const isValid = confirmPassword === password && password.length > 0;
            
            return Promise.resolve({
                isValid,
                message: isValid ? '' : 'كلمة المرور غير متطابقة'
            });
        } catch (error) {
            console.error('خطأ في مطابقة كلمة المرور:', error);
            return Promise.resolve({ isValid: false, message: 'خطأ في التحقق' });
        }
    }

    // Validate entire step - تم تحسينه
    async validateStep(stepNumber) {
        const stepElement = document.getElementById(`step${stepNumber}`);
        if (!stepElement) {
            console.error(`خطوة غير موجودة: step${stepNumber}`);
            return { isValid: false, results: [] };
        }

        const fields = stepElement.querySelectorAll('input[name], select[name], textarea[name]');
        const results = [];
        let isStepValid = true;

        // التحقق المتوازي لتحسين الأداء
        const validationPromises = Array.from(fields).map(async field => {
            if (field.name && this.rules[field.name]) {
                try {
                    const result = await this.validateField(field.name, field.value);
                    
                    if (!result.isValid) {
                        isStepValid = false;
                        this.showFieldError(field, result.message);
                    } else {
                        this.hideFieldError(field);
                    }
                    
                    return { field: field.name, ...result };
                } catch (error) {
                    console.error(`خطأ في التحقق من الحقل ${field.name}:`, error);
                    isStepValid = false;
                    this.showFieldError(field, 'خطأ في التحقق من البيانات');
                    return { field: field.name, isValid: false, message: 'خطأ في التحقق' };
                }
            }
            return null;
        });

        const validationResults = await Promise.all(validationPromises);
        results.push(...validationResults.filter(result => result !== null));

        return { isValid: isStepValid, results };
    }

    // Show field error - تم تحسينه
    showFieldError(field, message) {
        if (!field || !message) return;

        field.classList.remove('success');
        field.classList.add('error');
        
        // البحث عن عنصر الخطأ بطرق متعددة
        let errorElement = document.getElementById(field.name + 'Error');
        if (!errorElement) {
            errorElement = document.getElementById(field.id + 'Error');
        }
        if (!errorElement) {
            // البحث في العنصر الأب
            const parent = field.closest('.form-group');
            if (parent) {
                errorElement = parent.querySelector('.error-message');
            }
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        } else {
            console.warn(`عنصر الخطأ غير موجود للحقل: ${field.name || field.id}`);
        }
    }

    // Hide field error - تم تحسينه
    hideFieldError(field) {
        if (!field) return;

        field.classList.remove('error');
        field.classList.add('success');
        
        let errorElement = document.getElementById(field.name + 'Error');
        if (!errorElement) {
            errorElement = document.getElementById(field.id + 'Error');
        }
        if (!errorElement) {
            const parent = field.closest('.form-group');
            if (parent) {
                errorElement = parent.querySelector('.error-message');
            }
        }
        
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }
}

// باقي الكود كما هو مع تحسينات طفيفة...

// Password strength indicator - تم تحسينه
class PasswordStrengthIndicator {
    constructor(passwordFieldId, indicatorId) {
        this.passwordField = document.getElementById(passwordFieldId);
        this.indicator = document.getElementById(indicatorId);
        
        if (!this.indicator && this.passwordField) {
            // إنشاء المؤشر تلقائياً إذا لم يكن موجوداً
            this.createIndicator();
        }
        
        this.init();
    }

    createIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'passwordStrength';
        indicator.className = 'password-strength';
        
        const parent = this.passwordField.closest('.form-group');
        if (parent) {
            parent.appendChild(indicator);
            this.indicator = indicator;
        }
    }

    init() {
        if (this.passwordField && this.indicator) {
            this.passwordField.addEventListener('input', (e) => {
                this.updateStrength(e.target.value);
            });
        }
    }

    updateStrength(password) {
        const strength = this.calculateStrength(password);
        this.displayStrength(strength);
    }

    calculateStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length === 0) {
            return { score: 0, level: 'none', feedback: [], color: '#e5e7eb', text: '' };
        }

        // فحوصات محسنة
        if (password.length >= 8) score += 1;
        else feedback.push('استخدم 8 أحرف على الأقل');

        if (password.length >= 12) score += 1;

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('أضف أحرف صغيرة');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('أضف أحرف كبيرة');

        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('أضف أرقام');

        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('أضف رموز خاصة');

        // تحديد المستوى بدقة أكبر
        let level, color, text;
        if (score < 2) {
            level = 'very-weak';
            color = '#dc2626';
            text = 'ضعيفة جداً';
        } else if (score < 3) {
            level = 'weak';
            color = '#ef4444';
            text = 'ضعيفة';
        } else if (score < 5) {
            level = 'medium';
            color = '#f59e0b';
            text = 'متوسطة';
        } else if (score < 6) {
            level = 'strong';
            color = '#10b981';
            text = 'قوية';
        } else {
            level = 'very-strong';
            color = '#059669';
            text = 'قوية جداً';
        }

        return { score, level, feedback, color, text };
    }

    displayStrength(strength) {
        if (!this.indicator) return;

        const percentage = Math.max(10, (strength.score / 6) * 100);

        this.indicator.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill" style="width: ${percentage}%; background: ${strength.color}; transition: all 0.3s ease;"></div>
            </div>
            <div class="strength-text" style="color: ${strength.color}; font-weight: 500; margin-top: 5px;">
                ${strength.text}
                ${strength.feedback.length > 0 ? 
                    `<div class="strength-tips" style="font-size: 0.8rem; color: #6b7280; margin-top: 3px;">
                        ${strength.feedback.join('، ')}
                    </div>` : ''}
            </div>
        `;

        this.indicator.className = `password-strength ${strength.level}`;
    }
}

// Real-time validator - تم تحسينه
class RealTimeValidator {
    constructor(validator = null) {
        this.validator = validator || new FormValidator();
        this.debounceTimers = {};
        this.validationCache = new Map();
        this.init();
    }

    init() {
        // انتظار تحميل DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupValidation());
        } else {
            this.setupValidation();
        }
    }

    setupValidation() {
        const fields = document.querySelectorAll('input[name], select[name], textarea[name]');
        
        fields.forEach(field => {
            if (field.name && this.validator.rules[field.name]) {
                // إضافة مستمعين محسنين
                field.addEventListener('input', (e) => this.handleInput(e));
                field.addEventListener('blur', (e) => this.handleBlur(e));
                field.addEventListener('focus', (e) => this.handleFocus(e));
            }
        });

        console.log(`✅ تم تفعيل التحقق الفوري لـ ${fields.length} حقل`);
    }

    handleFocus(event) {
        const field = event.target;
        // مسح رسائل الخطأ عند التركيز
        field.classList.remove('error');
    }

    handleInput(event) {
        const field = event.target;
        
        // مسح حالة الخطأ السابقة
        field.classList.remove('error', 'success');

        // إلغاء التحقق السابق
        clearTimeout(this.debounceTimers[field.name]);

        // تأخير التحقق لتحسين الأداء
        this.debounceTimers[field.name] = setTimeout(() => {
            this.validateFieldAsync(field);
        }, field.type === 'email' ? 500 : 300);
    }

    handleBlur(event) {
        const field = event.target;
        
        // التحقق الفوري عند فقدان التركيز
        clearTimeout(this.debounceTimers[field.name]);
        this.validateFieldAsync(field, true);
    }

    async validateFieldAsync(field, immediate = false) {
        const cacheKey = `${field.name}-${field.value}`;
        
        try {
            // استخدام التخزين المؤقت للتحسين
            if (!immediate && this.validationCache.has(cacheKey)) {
                const cachedResult = this.validationCache.get(cacheKey);
                this.handleValidationResult(field, cachedResult);
                return;
            }

            const result = await this.validator.validateField(field.name, field.value);
            
            // حفظ في التخزين المؤقت
            this.validationCache.set(cacheKey, result);
            
            // تنظيف التخزين المؤقت إذا أصبح كبيراً
            if (this.validationCache.size > 100) {
                this.validationCache.clear();
            }
            
            this.handleValidationResult(field, result);
            
        } catch (error) {
            console.error(`خطأ في التحقق من الحقل ${field.name}:`, error);
            this.handleValidationResult(field, { isValid: false, message: 'خطأ في التحقق' });
        }
    }

    handleValidationResult(field, result) {
        if (result.isValid) {
            this.validator.hideFieldError(field);
            
            // إضافة مؤشر النجاح فقط للحقول المهمة
            if (['email', 'subdomain', 'phone'].includes(field.name)) {
                field.classList.add('success');
            }
        } else {
            this.validator.showFieldError(field, result.message);
        }
    }

    // تنظيف الموارد
    destroy() {
        Object.keys(this.debounceTimers).forEach(key => {
            clearTimeout(this.debounceTimers[key]);
        });
        this.validationCache.clear();
    }
}

// تصدير للاستخدام العام
window.FormValidator = FormValidator;
window.PasswordStrengthIndicator = PasswordStrengthIndicator;
window.RealTimeValidator = RealTimeValidator;