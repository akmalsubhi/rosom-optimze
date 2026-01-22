// ========== تحويل الأرقام الإنجليزية لعربية في الحقول ==========

/**
 * ===============================================
 * نظام إدارة الشهادات - الإصدار المُحسَّن
 * ===============================================
 */


الكود ده تمام بس فيه كام مشكلة بسبب تعديلك ده الكود القديم // ========== تحويل الأرقام الإنجليزية لعربية في الحقول ==========

let numberConversionMode = 'arabic'; // القيم الممكنة: 'arabic', 'english', 'mixed'
let originalCertificateData = null;
// ========== المتغيرات العامة للرسوم ==========
let currentPersonsCount = 10;
let currentConsultantFee = 10000;
let currentEvacuationFee = 10000;
let currentInspectionFee = 10000;
let currentArea = 318;


// ========== التحقق من الحقول الإجبارية ==========
function validateRequiredFields() {
  const errors = [];
  
  // التحقق من اسم المستخدم
  const userName = document.getElementById('inputUserName')?.value.trim();
  if (!userName) {
    errors.push('اسم المستخدم / الموظف');
  }
  
  // التحقق من عدد الأفراد
  const persons = parseInt(document.getElementById('inputPersons')?.value);
  if (!persons || persons < 1) {
    errors.push('عدد الأفراد المتدربين');
  }
  
  // التحقق من المساحة
  const area = parseInt(document.getElementById('inputArea')?.value);
  if (!area || area < 1) {
    errors.push('المساحة');
  }
  
  // التحقق من النشاط
  const activity = document.getElementById('inputActivity')?.value.trim();
  if (!activity) {
    errors.push('النشاط');
  }
  
  // التحقق من الاسم
  const name = document.getElementById('inputName')?.value.trim();
  if (!name) {
    errors.push('اسم المنشأة / الشركة');
  }
  
  // التحقق من العنوان
  const location = document.getElementById('inputLocation')?.value.trim();
  if (!location) {
    errors.push('العنوان');
  }
  
  // إذا فيه أخطاء
  if (errors.length > 0) {
    showValidationError(errors);
    return false;
  }
  
  return true;
}

// ========== عرض أخطاء التحقق ==========
function showValidationError(missingFields) {
  // إنشاء Modal للتحذير
  let modal = document.getElementById('validation-error-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'validation-error-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="validation-modal-content">
      <div class="validation-header">
        <span class="validation-icon">⚠️</span>
        <h3>حقول مطلوبة</h3>
      </div>
      
      <div class="validation-body">
        <p>برجاء ملء الحقول التالية:</p>
        <ul class="validation-list">
          ${missingFields.map(field => `<li><span class="field-bullet">•</span> ${field}</li>`).join('')}
        </ul>
      </div>
      
      <div class="validation-footer">
        <button onclick="closeValidationModal()" class="btn-ok">
          حسناً
        </button>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
  
  // تمييز الحقول الفارغة
  highlightEmptyFields(missingFields);
}

// ========== إغلاق Modal التحقق ==========
function closeValidationModal() {
  const modal = document.getElementById('validation-error-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ========== تمييز الحقول الفارغة ==========
function highlightEmptyFields(fieldNames) {
  const fieldMapping = {
    'اسم المستخدم / الموظف': 'inputUserName',
    'عدد الأفراد المتدربين': 'inputPersons',
    'المساحة': 'inputArea',
    'النشاط': 'inputActivity',
    'اسم المنشأة / الشركة': 'inputName',
    'العنوان': 'inputLocation'
  };
  
  // إزالة التمييز القديم
  document.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('field-error');
  });
  
  // إضافة التمييز للحقول الفارغة
  fieldNames.forEach(fieldName => {
    const inputId = fieldMapping[fieldName];
    if (inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        input.classList.add('field-error');
        
        // إزالة التمييز عند الكتابة
        input.addEventListener('input', function removeError() {
          this.classList.remove('field-error');
          this.removeEventListener('input', removeError);
        }, { once: true });
      }
    }
  });
  
  // التركيز على أول حقل فارغ
  const firstEmptyFieldId = fieldMapping[fieldNames[0]];
  if (firstEmptyFieldId) {
    document.getElementById(firstEmptyFieldId)?.focus();
  }
}


// أضف هذا في نهاية الملف أو في دالة منفصلة
function addValidationStyles() {
  const style = document.createElement('style');
  style.id = 'validation-styles';
  style.textContent = `
    /* ========== Modal التحقق ========== */
    .validation-modal-content {
      background: white;
      border-radius: 15px;
      width: 90%;
      max-width: 400px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: modalAppear 0.3s ease;
    }
    
    @keyframes modalAppear {
      from {
        transform: scale(0.9) translateY(-20px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    
    .validation-header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .validation-icon {
      font-size: 32px;
    }
    
    .validation-header h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .validation-body {
      padding: 20px;
      direction: rtl;
      text-align: right;
    }
    
    .validation-body p {
      margin: 0 0 15px 0;
      color: #374151;
      font-size: 14px;
    }
    
    .validation-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .validation-list li {
      padding: 10px 15px;
      background: #fef3c7;
      border-right: 4px solid #f59e0b;
      margin-bottom: 8px;
      border-radius: 0 8px 8px 0;
      color: #92400e;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .field-bullet {
      color: #d97706;
      font-weight: bold;
    }
    
    .validation-footer {
      padding: 15px 20px;
      background: #f9fafb;
      display: flex;
      justify-content: center;
    }
    
    .btn-ok {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border: none;
      padding: 12px 40px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-ok:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    
    /* ========== تمييز الحقول الفارغة ========== */
    .field-error {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
      animation: shake 0.5s ease;
    }
    
    .field-error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3) !important;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    /* ========== Modal overlay ========== */
    #validation-error-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
    }
    
    #validation-error-modal.active {
      display: flex;
    }
  `;
  
  document.head.appendChild(style);
}


// ========== معالج الأخطاء العام ==========
window.onerror = function(message, source, lineno, colno, error) {
  console.error('خطأ غير متوقع:', { message, source, lineno, colno, error });
  
  // لا تعرض للمستخدم أخطاء تقنية
  if (!message.includes('Script error')) {
    showNotification('❌ حدث خطأ غير متوقع', 'error');
  }
  
  return false;
};

// ========== معالج Promise rejections ==========
window.onunhandledrejection = function(event) {
  console.error('Promise rejection غير معالج:', event.reason);
  showNotification('❌ حدث خطأ في العملية', 'error');
};




async function checkAPIReady() {
  // انتظار قليل للتأكد من تحميل الـ API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!window.electronAPI) {
    console.warn('electronAPI غير متاح - ربما يعمل في المتصفح');
    return false;
  }
  
  if (!window.electronAPI.certificates) {
    console.error('certificates API غير متاح');
    showNotification('❌ خطأ في الاتصال بقاعدة البيانات', 'error');
    return false;
  }
  
  return true;
}




function convertToArabicNumbers(text) {
  if (!text) return text;
  const englishToArabic = {
    '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
    '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
  };
  return text.replace(/[0-9]/g, d => englishToArabic[d]);
}

function convertToEnglishNumbers(text) {
  if (!text) return text;
  const arabicToEnglish = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return text.replace(/[٠-٩]/g, d => arabicToEnglish[d]);
}

// تحويل ذكي حسب الوضع المختار
function smartConvertNumbers(text, mode = numberConversionMode) {
  // ⭐ التحقق من وجود النص
  if (!text) return text;
  
  // ⭐ التحقق من وجود الوضع
  const safeMode = mode || 'arabic';
  
  switch (safeMode) {
    case 'arabic':
      return convertToArabicNumbers(text);
    case 'english':
      return convertToEnglishNumbers(text);
    case 'mixed':
    default:
      return text; // لا تحويل - يبقى كما هو
  }
}



// ========== تطبيق التحويل على الحقول المحددة ==========
function setupArabicNumberInputs() {
  const fieldsToConvert = ['inputActivity', 'inputName', 'inputLocation'];
  
  fieldsToConvert.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    // إضافة زر تبديل وضع الأرقام
    addNumberToggleButton(input, fieldId);
    
    // تحويل عند الكتابة (حسب الوضع المختار للحقل)
    input.addEventListener('input', function(e) {
  const fieldMode = this.dataset.numberMode || 'mixed'; // تغيير الافتراضي لـ mixed
  
  // تجاهل التحويل إذا الوضع mixed
  if (fieldMode === 'mixed') return;
  
  // منع التحويل إذا المستخدم يكتب حالياً
  if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
    // لا تحول أثناء الكتابة - فقط عند الانتهاء
    return;
  }
  
  const cursorPosition = this.selectionStart;
  const originalLength = this.value.length;
  
  this.value = smartConvertNumbers(this.value, fieldMode);
  
  const newLength = this.value.length;
  const diff = newLength - originalLength;
  this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
});
    
    // تحويل عند اللصق
    input.addEventListener('paste', function(e) {
      const fieldMode = this.dataset.numberMode || 'arabic';
      if (fieldMode === 'mixed') return; // لا تتدخل
      
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const convertedText = smartConvertNumbers(pastedText, fieldMode);
      
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const before = this.value.substring(0, start);
      const after = this.value.substring(end);
      
      this.value = before + convertedText + after;
      this.setSelectionRange(start + convertedText.length, start + convertedText.length);
      
      this.dispatchEvent(new Event('input'));
    });
  });
}


function addNumberToggleButton(input, fieldId) {
  // إنشاء wrapper إذا لم يكن موجود
  let wrapper = input.closest('.input-with-number-toggle');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'input-with-number-toggle';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
  }
  
  // إنشاء زر التبديل
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'number-toggle-btn';
  toggleBtn.innerHTML = '🔢';
  toggleBtn.title = 'تبديل نوع الأرقام';
  
  // تعيين الوضع الافتراضي
  input.dataset.numberMode = 'arabic';
  updateToggleButtonState(toggleBtn, 'arabic');
  
  // عند النقر على الزر
  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const currentMode = input.dataset.numberMode || 'arabic';
    
    // التبديل بين الأوضاع
    let newMode;
    if (currentMode === 'arabic') {
      newMode = 'english';
    } else if (currentMode === 'english') {
      newMode = 'mixed';
    } else {
      newMode = 'arabic';
    }
    
    input.dataset.numberMode = newMode;
    updateToggleButtonState(toggleBtn, newMode);
    
    // تحويل المحتوى الحالي
    if (newMode !== 'mixed' && input.value) {
      input.value = smartConvertNumbers(input.value, newMode);
    }
    
    // إظهار إشعار
    const modeNames = {
      'arabic': 'أرقام عربية (١٢٣)',
      'english': 'أرقام إنجليزية (123)',
      'mixed': 'مختلط (بدون تحويل)'
    };
    showNotification(`🔢 ${modeNames[newMode]}`, 'info');
  });
  
  wrapper.appendChild(toggleBtn);
}


// تحديث شكل زر التبديل
function updateToggleButtonState(btn, mode) {
  const states = {
    'arabic': { icon: '🔢', class: 'mode-arabic', title: 'الوضع: أرقام عربية' },
    'english': { icon: '123', class: 'mode-english', title: 'الوضع: أرقام إنجليزية' },
    'mixed': { icon: '🔀', class: 'mode-mixed', title: 'الوضع: مختلط' }
  };
  
  const state = states[mode];
  btn.innerHTML = state.icon;
  btn.className = `number-toggle-btn ${state.class}`;
  btn.title = state.title;
}

// ========== دالة للتحقق من وجود أرقام إنجليزية ==========
function hasEnglishNumbers(text) {
  return /[0-9]/.test(text);
}

// ========== دالة تحذير إذا وجدت أرقام إنجليزية ==========
function validateArabicNumbers(fieldId, fieldLabel) {
  const input = document.getElementById(fieldId);
  if (input && hasEnglishNumbers(input.value)) {
    showNotification(`⚠️ يوجد أرقام إنجليزية في ${fieldLabel}، سيتم تحويلها تلقائياً`, 'warning');
    input.value = smartConvertNumbers(input.value);
    return true;
  }
  return false;
}



// ========== متغيرات عامة ==========
const AppState = {
    // بيانات الشهادة الحالية
    certificate: {
        id: null,
        personsCount: 10,
        consultantFee: 10000,
        evacuationFee: 10000,
        inspectionFee: 10000,
        area: 318,
        originalData: null
    },
    
    // تواريخ الصفحات
    pageDates: {
        governorate: null,
        training: null,
        ministry: null,
        certificate: null,
        decision: null
    },
    
    // حالة الواجهة
    ui: {
        isPrinting: false,
        isLoading: false,
        advancedSearchOpen: false,
        numberConversionMode: 'arabic'
    },
    
    // Cache
    cache: {
        suggestions: {
            activities: [],
            names: [],
            locations: [],
            lastUpdate: null
        },
        lastSearchResults: []
    },
    
    // Methods
    reset() {
        this.certificate = {
            id: null,
            personsCount: 10,
            consultantFee: 10000,
            evacuationFee: 10000,
            inspectionFee: 10000,
            area: 318,
            originalData: null
        };
    },
    
    save() {
        localStorage.setItem('appState', JSON.stringify({
            pageDates: this.pageDates,
            userName: this.certificate.userName
        }));
    },
    
    load() {
        const saved = localStorage.getItem('appState');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this.pageDates, data.pageDates || {});
        }
    }
};


// ========== نظام الإخطارات بدل Alert ==========
function showNotification(message, type = 'success') {
  let notification = document.getElementById('notification-container');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification-container';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 9999;
      max-width: 400px;
    `;
    document.body.appendChild(notification);
  }

  const notif = document.createElement('div');
  notif.style.cssText = `
    padding: 15px 20px;
    margin-bottom: 10px;
    border-radius: 8px;
    background: ${type === 'error' ? '#fee' : '#efe'};
    border: 2px solid ${type === 'error' ? '#c00' : '#090'};
    color: ${type === 'error' ? '#c00' : '#090'};
    font-weight: bold;
    animation: slideIn 0.3s ease;
  `;
  notif.textContent = message;
  notification.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

// ========== دالة ديناميكية لتقليل الخط إذا تجاوز النص العرض ==========
function adjustFieldValueFontSize() {
  const fieldValues = document.querySelectorAll('.field-value');
  
  fieldValues.forEach(field => {
    // Reset to default size first
    field.style.fontSize = '10pt';
    
    // Check if text overflows (height > 1.5 lines approximately)
    if (field.scrollHeight > field.offsetHeight || field.scrollWidth > field.offsetWidth) {
      // Reduce font size incrementally
      let fontSize = 10;
      while (fontSize > 7 && (field.scrollHeight > field.offsetHeight || field.scrollWidth > field.offsetWidth)) {
        fontSize--;
        field.style.fontSize = fontSize + 'pt';
      }
    }
  });
}

// ========== دوال التخزين المحلي ==========
function saveUserName(name) {
  localStorage.setItem('feesUserName', name);
  showSavedIndicator();
}

function loadUserName() {
  return localStorage.getItem('feesUserName') || '';
}

function showSavedIndicator() {
  const indicator = document.getElementById('savedIndicator');
  if (indicator) {
    indicator.classList.add('show');
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }
}

// ========== دوال تحويل الأرقام ==========
function toArabicNumber(num) {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNums[parseInt(d)] || d).join('');
}

// ========== دالة التاريخ التلقائي (جديدة) ==========
function updateAutoDate() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  
  // تحويل لأرقام عربية
  const arabicDay = toArabicNumber(day);
  const arabicMonth = toArabicNumber(month);
  const arabicYear = toArabicNumber(year);
  
  // الصيغة: يوم/شهر/سنة (من اليمين لليسار)
const dateString = `${arabicYear}/${arabicMonth}/${arabicDay}`;
  
  // تحديث كل عناصر التاريخ
  document.querySelectorAll('.auto-date').forEach(el => {
    el.textContent = dateString;
  });
}

// ========== تحويل الرقم لنص عربي ==========
function numberToArabicWords(num) {
    if (num === 0) return 'صفر';
    if (num < 0) return 'سالب ' + numberToArabicWords(Math.abs(num));
    
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
        'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    function getThousands(n) {
        if (n === 1) return 'ألف';
        if (n === 2) return 'ألفان';
        if (n >= 3 && n <= 10) return numberToArabicWords(n) + ' آلاف';
        return numberToArabicWords(n) + ' ألف';
    }
    
    function getMillions(n) {
        if (n === 1) return 'مليون';
        if (n === 2) return 'مليونان';
        if (n >= 3 && n <= 10) return numberToArabicWords(n) + ' ملايين';
        return numberToArabicWords(n) + ' مليون';
    }
    
    if (num < 20) return ones[num];
    
    if (num < 100) {
        const ten = Math.floor(num / 10);
        const one = num % 10;
        if (one === 0) return tens[ten];
        return ones[one] + ' و' + tens[ten];
    }
    
    if (num < 1000) {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        if (remainder === 0) return hundreds[hundred];
        return hundreds[hundred] + ' و' + numberToArabicWords(remainder);
    }
    
    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        const thousandWord = getThousands(thousands);
        if (remainder === 0) return thousandWord;
        return thousandWord + ' و' + numberToArabicWords(remainder);
    }
    
    if (num < 1000000000) {
        const millions = Math.floor(num / 1000000);
        const remainder = num % 1000000;
        const millionWord = getMillions(millions);
        if (remainder === 0) return millionWord;
        return millionWord + ' و' + numberToArabicWords(remainder);
    }
    
    return num.toLocaleString('ar-EG');
}


// ========== حساب الرسوم ==========
function calculateTrainingFee(persons) {
  const ratePerPerson = persons <= 10 ? 500 : 600;
  return persons * ratePerPerson;
}

function calculateMinistryFee(persons) {
  const ratePerPerson = persons <= 10 ? 150 : 200;
  return persons * ratePerPerson;
}

// ========== حساب رسوم المساحة ==========
function calculateAreaFee(area) {
  if (area <= 0) return 0;
  if (area <= 50) return 360;
  if (area <= 100) return 450;
  if (area <= 200) return 550;
  if (area <= 400) return 750;
  if (area <= 1000) return 950;
  if (area <= 2000) return 1500;
  if (area <= 3000) return 2500;
  if (area <= 4000) return 3500;
  if (area <= 5000) return 4000;
  if (area <= 6000) return 4500;
  if (area <= 7000) return 5500;
  if (area <= 8000) return 6000;
  if (area <= 9000) return 6500;
  if (area <= 10000) return 7500;
  
  // كل 1000 متر زيادة عن 10000 = 500 جنيه إضافية
  const extraThousands = Math.ceil((area - 10000) / 1000);
  return 7500 + (extraThousands * 500);
}


function calculateGrandTotal(persons, consultant, evacuation, inspection) {
  const trainingFee = calculateTrainingFee(persons);
  return trainingFee + consultant + evacuation + inspection;
}




// ========== معاينة الحسابات ==========
function updateCalcPreview() {
  const persons = parseInt(document.getElementById('inputPersons').value) || 0;
  const consultantStr = document.getElementById('inputConsultant').value.trim();
  const evacuationStr = document.getElementById('inputEvacuation').value.trim();
  const inspectionStr = document.getElementById('inputInspection').value.trim();
  const consultant = parseInt(consultantStr) || 0;
  const evacuation = parseInt(evacuationStr) || 0;
  const inspection = parseInt(inspectionStr) || 0;
  
  // ========== المساحة ==========
  const area = parseInt(document.getElementById('inputArea').value) || 0;
  const areaFee = calculateAreaFee(area);
  const areaPreview = document.getElementById('areaCalcPreview');
  
  if (area > 0 && areaPreview) {
    areaPreview.innerHTML = `
      <div class="preview-item">
        <span>رسوم المساحة (${toArabicNumber(area)} م²) = <strong>${toArabicNumber(areaFee)}</strong> ج</span>
      </div>
    `;
  } else if (areaPreview) {
    areaPreview.innerHTML = '';
  }
  
  const preview = document.getElementById('calcPreview');
  const totalPreview = document.getElementById('totalPreview');
  
  if (persons < 1) {
    preview.innerHTML = '';
    totalPreview.innerHTML = '';
    return;
  }
  
  const trainingFee = calculateTrainingFee(persons);
  const ministryFee = calculateMinistryFee(persons);
  const trainingRate = persons <= 10 ? 500 : 600;
  const ministryRate = persons <= 10 ? 150 : 200;
  const grandTotal = calculateGrandTotal(persons, consultant, evacuation, inspection);
  
  // ========== حساب إجمالي الوزارة ==========
  const ministryTotal = areaFee + ministryFee;
  
  preview.innerHTML = `
    <div class="preview-item">
      <span>رسوم المحافظة: ${persons} × ${trainingRate} = <strong>${toArabicNumber(trainingFee)}</strong> ج</span>
    </div>
    <div class="preview-item">
      <span>رسوم الوزارة (تدريب): ${persons} × ${ministryRate} = <strong>${toArabicNumber(ministryFee)}</strong> ج</span>
    </div>
    ${area > 0 ? `
    <div class="preview-item">
      <span>إجمالي الوزارة: ${toArabicNumber(areaFee)} + ${toArabicNumber(ministryFee)} = <strong>${toArabicNumber(ministryTotal)}</strong> ج</span>
    </div>
    ` : ''}
  `;
  
  totalPreview.innerHTML = `
    <div class="total-preview-box">
      <div class="preview-title">الإجمالي الكلي للمحافظة</div>
      <div class="preview-calc">
        تدريب: ${toArabicNumber(trainingFee)} + 
        استشاري: ${consultantStr === '' ? '٠٠٠٠' : toArabicNumber(consultant)} + 
        إخلاء: ${evacuationStr === '' ? '٠٠٠٠' : toArabicNumber(evacuation)} + 
        معاينة: ${inspectionStr === '' ? '٠٠٠٠' : toArabicNumber(inspection)}
      </div>
      <div class="preview-result">
        = <strong>${toArabicNumber(grandTotal)}</strong> جنيه
      </div>
      <div class="preview-text">(${numberToArabicWords(grandTotal)} جنيهاً لا غير)</div>
    </div>
  `;
}

// ========== تحديث اسم المستخدم في الصفحة ==========
function updateUserNameDisplay(name) {
  const displayName = name || 'اكمل...';
  document.querySelectorAll('.user-name-display').forEach(el => {
    el.textContent = displayName;
  });
}

// ========== فتح الـ Popup ==========
// ========== فتح الـ Popup ========== 
async function openFeesPopup() {
  document.getElementById('popupOverlay').classList.add('active');
  
  // تحميل اسم المستخدم المحفوظ
  const savedUserName = loadUserName();
  document.getElementById('inputUserName').value = savedUserName;
  
  // تحميل القيم الحالية
  document.getElementById('inputPersons').value = currentPersonsCount;
  document.getElementById('inputConsultant').value = currentConsultantFee;
  document.getElementById('inputEvacuation').value = currentEvacuationFee;
  document.getElementById('inputInspection').value = currentInspectionFee;
  document.getElementById('inputArea').value = currentArea;
  
  updateCalcPreview();
  
  // تحميل بيانات النشاط من الصفحة
  const firstActivity = document.querySelector('[data-field="activity"] .field-value');
  const firstName = document.querySelector('[data-field="name"] .field-value');
  const firstLocation = document.querySelector('[data-field="location"] .field-value');
  
  if (firstActivity) {
    document.getElementById('inputActivity').value = firstActivity.textContent.replace(/\.$/, '');
  }
  if (firstName) {
    document.getElementById('inputName').value = firstName.textContent.replace(/\.$/, '');
  }
  if (firstLocation) {
    document.getElementById('inputLocation').value = firstLocation.textContent.replace(/\.$/, '');
  }

  // ⭐ تحديث الاقتراحات وتفعيلها
  await loadSuggestionsCache();
  
  // تفعيل الاقتراحات على حقول الـ Popup
  if (!document.getElementById('inputActivity-suggestions')) {
    setupAutocomplete('inputActivity', 'activities');
  }
  if (!document.getElementById('inputName-suggestions')) {
    setupAutocomplete('inputName', 'names');
  }
  if (!document.getElementById('inputLocation-suggestions')) {
    setupAutocomplete('inputLocation', 'locations');
  }

  // التركيز على أول حقل
  setTimeout(() => {
    document.getElementById('inputPersons').focus();
  }, 100);
}


// ========== تنظيف الاقتراحات عند الإغلاق ==========

function cleanupAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // إزالة document click handler
  if (input._autocompleteDocumentHandler) {
    document.removeEventListener('click', input._autocompleteDocumentHandler);
    delete input._autocompleteDocumentHandler;
  }
  
  // إزالة dropdown
  const dropdown = document.getElementById(`${inputId}-suggestions`);
  if (dropdown) {
    dropdown.remove();
  }
  
  // إعادة تعيين الفلاج
  if (input.dataset) {
    input.dataset.autocompleteInitialized = 'false';
  }
}

// ========== تحديث closeFeesPopup ==========
function closeFeesPopup() {
  const overlay = document.getElementById('popupOverlay');
  if (!overlay) return;
  
  overlay.classList.remove('active');
  
  // تنظيف الاقتراحات لمنع memory leak
  cleanupAutocomplete('inputActivity');
  cleanupAutocomplete('inputName');
  cleanupAutocomplete('inputLocation');
}







function updateFeesButtonText() {
  const feesBtn = document.querySelector('.fees-btn');
  if (!feesBtn) return;
  
  if (currentCertificateId) {
    // شهادة محملة = زر تعديل
    feesBtn.textContent = '✏️ تعديل البيانات';
    feesBtn.classList.add('edit-mode');
  } else {
    // شهادة جديدة = زر رسوم جديدة
    feesBtn.textContent = '➕ رسوم جديدة';
    feesBtn.classList.remove('edit-mode');
  }
}

// ========== 2. إصلاح نظام التواريخ - كل صفحة مستقلة ==========



// ========== تطبيق التغييرات ==========
function applyChanges() {
  if (!validateRequiredFields()) {
    return;
  }
  const userName = document.getElementById('inputUserName').value.trim();
  const persons = parseInt(document.getElementById('inputPersons').value);
  const consultant = parseInt(document.getElementById('inputConsultant').value) || 0;
  const evacuation = parseInt(document.getElementById('inputEvacuation').value) || 0;
  const inspection = parseInt(document.getElementById('inputInspection').value) || 0;
  const area = parseInt(document.getElementById('inputArea').value) || 0;
  
  // تحويل الأرقام في الحقول النصية
  let activity = document.getElementById('inputActivity').value.trim();
  let name = document.getElementById('inputName').value.trim();
  let location = document.getElementById('inputLocation').value.trim();

  activity = smartConvertNumbers(activity);
  name = smartConvertNumbers(name);
  location = smartConvertNumbers(location);

  document.getElementById('inputActivity').value = activity;
  document.getElementById('inputName').value = name;
  document.getElementById('inputLocation').value = location;
  
  // التحقق من البيانات
  if (!persons || persons < 1) {
    showNotification('❌ برجاء إدخال عدد أفراد صحيح', 'error');
    return;
  }
  if (!area || area < 1) {
    showNotification('❌ برجاء إدخال مساحة صحيحة', 'error');
    return;
  }


  // ========== تتبع الحقول المتغيرة ==========
   const changedFields = [];


    const compareData = originalCertificateData || {
    activity: document.querySelector('[data-field="activity"] .field-value')?.textContent.replace(/\.$/, '').trim() || '',
    name: document.querySelector('[data-field="name"] .field-value')?.textContent.replace(/\.$/, '').trim() || '',
    location: document.querySelector('[data-field="location"] .field-value')?.textContent.replace(/\.$/, '').trim() || '',
    area: currentArea,
    persons_count: currentPersonsCount,
    consultant_fee: currentConsultantFee,
    evacuation_fee: currentEvacuationFee,
    inspection_fee: currentInspectionFee
  };
  
  // تحقق من الحقول الرقمية
   if (persons !== compareData.persons_count) changedFields.push('persons_count');
  if (consultant !== compareData.consultant_fee) changedFields.push('consultant_fee');
  if (evacuation !== compareData.evacuation_fee) changedFields.push('evacuation_fee');
  if (inspection !== compareData.inspection_fee) changedFields.push('inspection_fee');
  if (area !== compareData.area) changedFields.push('area');



  if (activity !== compareData.activity) changedFields.push('activity');
  if (name !== compareData.name) changedFields.push('name');
  if (location !== compareData.location) changedFields.push('location');

  // ========== تحديث تواريخ الصفحات المتأثرة فقط ==========
  if (changedFields.length > 0) {
    const affectedPages = updateDatesForChangedFields(changedFields);
    // console.log('الحقول المتغيرة:', changedFields);
    // console.log('الصفحات المتأثرة:', affectedPages);
  }
  
  // ========== حفظ اسم المستخدم ==========
  if (userName) {
    saveUserName(userName);
    updateUserNameDisplay(userName);
  }
  
  // ========== حفظ القيم الحالية ==========
   currentPersonsCount = persons;
  currentConsultantFee = consultant;
  currentEvacuationFee = evacuation;
  currentInspectionFee = inspection;
  currentArea = area;


  originalCertificateData = {
    activity: activity,
    name: name,
    location: location,
    area: area,
    persons_count: persons,
    consultant_fee: consultant,
    evacuation_fee: evacuation,
    inspection_fee: inspection,
    user_name: userName
  };
  
  // ========== حساب الرسوم ==========
    const trainingTotal = calculateTrainingFee(persons);
  const ministryFeeOnly = calculateMinistryFee(persons);
  const areaFee = calculateAreaFee(area);
  const ministryTotal = ministryFeeOnly + areaFee;
  const grandTotal = trainingTotal + consultant + evacuation + inspection;
  
  // ========== تحديث عدد الأفراد ==========
    document.querySelectorAll('[data-calc="persons-count"]').forEach(el => {
    el.textContent = toArabicNumber(persons);
  });
  
  document.querySelectorAll('[data-calc="training-total"]').forEach(el => {
    el.textContent = toArabicNumber(trainingTotal);
  });
  
  document.querySelectorAll('[data-calc="consultant-fee"]').forEach(el => {
    el.textContent = consultant === 0 ? '٠٠٠٠' : toArabicNumber(consultant);
  });
  
  document.querySelectorAll('[data-calc="evacuation-fee"]').forEach(el => {
    el.textContent = evacuation === 0 ? '٠٠٠٠' : toArabicNumber(evacuation);
  });
  
  document.querySelectorAll('[data-calc="inspection-fee"]').forEach(el => {
    el.textContent = inspection === 0 ? '٠٠٠٠' : toArabicNumber(inspection);
  });
  
  document.querySelectorAll('[data-calc="grand-total"]').forEach(el => {
    el.textContent = toArabicNumber(grandTotal);
  });
  
  document.querySelectorAll('[data-calc="grand-total-text"]').forEach(el => {
    el.textContent = 'فقط ' + numberToArabicWords(grandTotal) + ' جنيهاً لا غير';
  });
  
  document.querySelectorAll('[data-calc="ministry-fee"]').forEach(el => {
    el.textContent = toArabicNumber(ministryFeeOnly);
  });
  
  document.querySelectorAll('[data-calc="area-fee"]').forEach(el => {
    el.textContent = toArabicNumber(areaFee);
  });
  
  document.querySelectorAll('[data-calc="area-value"]').forEach(el => {
    el.textContent = toArabicNumber(area);
  });
  
  // ========== تحديث قيمة المساحة في الصفحة الرابعة ==========
  const areaDisplayPage4 = document.getElementById('areaValueDisplay-page4');
  const areaDisplayPage8 = document.getElementById('areaValueDisplay-page8');
  if (areaDisplayPage4) areaDisplayPage4.textContent = toArabicNumber(area);
  if (areaDisplayPage8) areaDisplayPage8.textContent = toArabicNumber(area);
  
  document.querySelectorAll('[data-calc="ministry-total"]').forEach(el => {
    el.textContent = toArabicNumber(ministryTotal);
  });
  
  document.querySelectorAll('[data-calc="ministry-total-text"]').forEach(el => {
    el.textContent = 'فقط ' + numberToArabicWords(ministryTotal) + ' جنيهاً لا غير';
  });

  closeFeesPopup(); 

  if (changedFields.length > 0) {
    showNotification(`✅ تم التطبيق! تم تحديث ${changedFields.length} حقول`);
  } else {
    showNotification('✅ تم التطبيق (لا توجد تغييرات)');
  }

  
  // ========== تحديث بيانات النشاط ==========
 const activityWithDot = activity.endsWith('.') ? activity : activity + '.';
  const nameWithDot = name.endsWith('.') ? name : name + '.';
  const locationWithDot = location.endsWith('.') ? location : location + '.';
  
  document.querySelectorAll('[data-field="activity"] .field-value').forEach(field => {
    field.textContent = activityWithDot;
  });
  
  document.querySelectorAll('[data-field="name"] .field-value').forEach(field => {
    field.textContent = nameWithDot;
  });
  
  document.querySelectorAll('[data-field="location"] .field-value').forEach(field => {
    field.textContent = locationWithDot;
  });

  adjustFieldValueFontSize();
  
  // ========== تعديل حجم الخط للحقول الطويلة الجديدة ==========
  if (changedFields.length > 0) {
    showNotification(`✅ تم التطبيق! تم تحديث تاريخ ${changedFields.length} حقول`);
  } else {
    showNotification('✅ تم تطبيق التغييرات بنجاح!');
  }
}





// ========== متغير لتخزين ID الشهادة الحالية ==========
let currentCertificateId = null;

// ========== حفظ شهادة جديدة ==========
// ========== حفظ شهادة جديدة ==========
async function saveCertificateWithSuggestions() {
  await saveCertificate();
  
  // تحديث الاقتراحات بعد الحفظ
  setTimeout(async () => {
    await loadSuggestionsCache();
  }, 500);
}

// ⭐ تحديث saveCertificate الأصلية لتتضمن التحديث
async function saveCertificate() {
  const loader = Loading.save();
  
  try {
    const data = collectCertificateData();
    
    if (!validateCertificateData(data)) {
      loader.hide();
      return;
    }
    
    if (currentCertificateId) {
      loader.updateSubtitle('يتم تعديل الشهادة...');
      const result = await window.electronAPI.certificates.update(
        currentCertificateId, 
        data,
        'تعديل البيانات',
        data.user_name
      );
      showNotification(`✅ تم تعديل الشهادة بنجاح!\nعدد التعديلات: ${result.edit_count}`);
    } else {
      loader.updateSubtitle('يتم حفظ الشهادة الجديدة...');
      const result = await window.electronAPI.certificates.add(data);
      currentCertificateId = result.id;
      showNotification('✅ تم حفظ الشهادة بنجاح!');
    }
    
    updateCertificateStatus();
    updateFeesButtonText();
    
    // ⭐ تحديث الاقتراحات بعد الحفظ
    setTimeout(async () => {
      await loadSuggestionsCache();
    }, 500);
    
  } catch (err) {
    console.error('خطأ في الحفظ:', err);
    showNotification('❌ حدث خطأ أثناء الحفظ', 'error');
  } finally {
    loader.hide();
  }
}

// ⭐ دالة مساعدة لجمع بيانات الشهادة
function collectCertificateData() {
  const personsCount = parseInt(document.getElementById('inputPersons').value) || 0;
  const area = parseInt(document.getElementById('inputArea').value) || 0;
  const consultantFee = parseInt(document.getElementById('inputConsultant').value) || 0;
  const evacuationFee = parseInt(document.getElementById('inputEvacuation').value) || 0;
  const inspectionFee = parseInt(document.getElementById('inputInspection').value) || 0;
  
  // ⭐ حساب الرسوم
  const trainingFee = calculateTrainingFee(personsCount);
  const areaFee = calculateAreaFee(area);
  const ministryFee = calculateMinistryFee(personsCount);
  
  // ⭐ حساب الإجماليات
  const grandTotal = trainingFee + consultantFee + evacuationFee + inspectionFee;
  const ministryTotal = areaFee + ministryFee;
  
  return {
    activity: document.getElementById('inputActivity').value.trim(),
    name: document.getElementById('inputName').value.trim(),
    location: document.getElementById('inputLocation').value.trim(),
    area: area,
    persons_count: personsCount,
    training_fee: trainingFee,
    consultant_fee: consultantFee,
    evacuation_fee: evacuationFee,
    inspection_fee: inspectionFee,
    area_fee: areaFee,
    ministry_fee: ministryFee,
    grand_total: grandTotal,        // ⭐ القيمة المحسوبة
    ministry_total: ministryTotal,  // ⭐ القيمة المحسوبة
    user_name: document.getElementById('inputUserName').value.trim(),
    date_governorate: pageDates.governorate,
    date_training: pageDates.training,
    date_ministry: pageDates.ministry,
    date_certificate: pageDates.certificate,
    date_decision: pageDates.decision
  };
}

// ⭐ دالة التحقق من البيانات
function validateCertificateData(data) {
  if (!data.persons_count || data.persons_count < 1) {
    showNotification('❌ برجاء إدخال عدد أفراد صحيح', 'error');
    return false;
  }
  
  if (!data.area || data.area < 1) {
    showNotification('❌ برجاء إدخال مساحة صحيحة', 'error');
    return false;
  }
  
  if (!data.activity) {
    showNotification('❌ برجاء إدخال النشاط', 'error');
    return false;
  }
  
  if (!data.name) {
    showNotification('❌ برجاء إدخال الاسم', 'error');
    return false;
  }
  
  return true;
}


// ========== تحميل شهادة للتعديل ==========
// ========== تحميل شهادة للتعديل ==========
async function loadCertificate(id) {
  try {
    const cert = await window.electronAPI.certificates.getById(id);
    if (!cert) {
      showNotification('❌ الشهادة غير موجودة', 'error');
      return;
    }
    
    currentCertificateId = cert.id;
    
    // ⭐ حفظ البيانات الأصلية للمقارنة
    originalCertificateData = {
      activity: cert.activity || '',
      name: cert.name || '',
      location: cert.location || '',
      area: cert.area || 0,
      persons_count: cert.persons_count || 0,
      consultant_fee: cert.consultant_fee || 0,
      evacuation_fee: cert.evacuation_fee || 0,
      inspection_fee: cert.inspection_fee || 0,
      user_name: cert.user_name || ''
    };
    
    // ملء الحقول
    document.getElementById('inputActivity').value = cert.activity || '';
    document.getElementById('inputName').value = cert.name || '';
    document.getElementById('inputLocation').value = cert.location || '';
    document.getElementById('inputArea').value = cert.area || '';
    document.getElementById('inputPersons').value = cert.persons_count || '';
    document.getElementById('inputConsultant').value = cert.consultant_fee || '';
    document.getElementById('inputEvacuation').value = cert.evacuation_fee || '';
    document.getElementById('inputInspection').value = cert.inspection_fee || '';
    document.getElementById('inputUserName').value = cert.user_name || '';
    
    // تحديث المتغيرات الحالية
    currentPersonsCount = cert.persons_count || 10;
    currentConsultantFee = cert.consultant_fee || 0;
    currentEvacuationFee = cert.evacuation_fee || 0;
    currentInspectionFee = cert.inspection_fee || 0;
    currentArea = cert.area || 0;
    
    // ⭐ تحميل تواريخ الصفحات من الشهادة المحفوظة
    pageDates = {
      governorate: cert.date_governorate || cert.created_at,
      training: cert.date_training || cert.created_at,
      ministry: cert.date_ministry || cert.created_at,
      certificate: cert.date_certificate || cert.created_at,
      decision: cert.date_decision || cert.created_at
    };
    
    // ⭐ عرض التواريخ المحفوظة في الصفحات
    displayPageDates();
    
    // تحديث المعاينة
    updateCalcPreview();
    
    // تحديث العرض
    updatePageDisplayWithoutDates(cert);
    
    // عرض حالة الشهادة
    updateCertificateStatus();
    
    // ⭐ عرض مقارنة التعديلات إذا كانت الشهادة معدلة
    if (cert.is_modified) {
      showModificationComparison(cert);
    }
    updateFeesButtonText();
    showNotification('✅ تم تحميل الشهادة');
    
  } catch (err) {
    console.error('خطأ في التحميل:', err);
    showNotification('❌ حدث خطأ أثناء التحميل', 'error');
  }
}

// ⭐ دالة جديدة لعرض التواريخ المحفوظة
function displayPageDates() {
  Object.keys(pageDates).forEach(pageGroup => {
    if (pageDates[pageGroup]) {
      const date = new Date(pageDates[pageGroup]);
      const dateString = formatArabicDate(date);
      document.querySelectorAll(`.auto-date[data-page-group="${pageGroup}"]`).forEach(el => {
        el.textContent = dateString;
      });
    }
  });
}



// ⭐ دالة جديدة لعرض مقارنة "قبل وبعد"
async function showModificationComparison(cert) {
  const history = await window.electronAPI.certificates.getHistory(cert.id);
  
  if (history.length === 0) return;
  
  // إنشاء أو تحديث شريط المقارنة
  let comparisonBar = document.getElementById('modification-comparison-bar');
  if (!comparisonBar) {
    comparisonBar = document.createElement('div');
    comparisonBar.id = 'modification-comparison-bar';
    comparisonBar.className = 'modification-comparison-bar';
    document.body.appendChild(comparisonBar);
  }
  
  // آخر تعديل
  const lastEdit = history[0];
  const changedFields = lastEdit.changed_fields || [];
  
  let html = `
    <div class="comparison-header">
      <span class="comparison-icon">⚠️</span>
      <span class="comparison-title">شهادة معدلة (${toArabicNumber(cert.edit_count)} ${cert.edit_count === 1 ? 'مرة' : 'مرات'})</span>
      <button onclick="toggleComparisonDetails()" class="btn-toggle-comparison">
        📋 عرض التفاصيل
      </button>
      <button onclick="hideComparisonBar()" class="btn-close-comparison">✕</button>
    </div>
    
    <div id="comparisonDetails" class="comparison-details" style="display: none;">
      <div class="comparison-info">
        <span>آخر تعديل: ${formatDate(lastEdit.edited_at)}</span>
        <span>بواسطة: ${lastEdit.edited_by || 'غير معروف'}</span>
      </div>
      
      <div class="comparison-table-container">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>الحقل</th>
              <th class="old-value-header">القيمة القديمة</th>
              <th class="arrow-header">←</th>
              <th class="new-value-header">القيمة الجديدة</th>
            </tr>
          </thead>
          <tbody>
            ${changedFields.map(field => `
              <tr>
                <td class="field-name">${getFieldLabel(field.field)}</td>
                <td class="old-value">${formatFieldValue(field.old_value)}</td>
                <td class="arrow">←</td>
                <td class="new-value">${formatFieldValue(field.new_value)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="affected-pages-info">
        <strong>الصفحات المتأثرة:</strong>
        ${getAffectedPagesFromFields(changedFields.map(f => f.field)).map(page => 
          `<span class="page-badge">${getPageLabel(page)}</span>`
        ).join('')}
      </div>
      
      <button onclick="showFullHistory(${cert.id})" class="btn-full-history">
        📜 عرض سجل التعديلات الكامل
      </button>
    </div>
  `;
  
  comparisonBar.innerHTML = html;
  comparisonBar.classList.add('active');
}

// ⭐ دوال مساعدة
function toggleComparisonDetails() {
  const details = document.getElementById('comparisonDetails');
  if (details) {
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
  }
}

function hideComparisonBar() {
  const bar = document.getElementById('modification-comparison-bar');
  if (bar) {
    bar.classList.remove('active');
  }
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') {
    return '<span class="empty-value">(فارغ)</span>';
  }
  if (typeof value === 'number') {
    return toArabicNumber(value);
  }
  return value;
}

function getAffectedPagesFromFields(fieldNames) {
  const fieldToPageMapping = {
    persons_count: ['governorate', 'training', 'ministry'],
    training_fee: ['governorate'],
    consultant_fee: ['governorate'],
    evacuation_fee: ['governorate'],
    inspection_fee: ['governorate'],
    grand_total: ['governorate'],
    area: ['ministry', 'certificate'],
    area_fee: ['ministry'],
    ministry_fee: ['ministry'],
    ministry_total: ['ministry'],
    activity: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
    name: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
    location: ['governorate', 'training', 'ministry', 'certificate', 'decision']
  };
  
  const affectedPages = new Set();
  fieldNames.forEach(fieldName => {
    const pages = fieldToPageMapping[fieldName];
    if (pages) {
      pages.forEach(page => affectedPages.add(page));
    }
  });
  
  return Array.from(affectedPages);
}

function getPageLabel(pageKey) {
  const labels = {
    governorate: 'رسوم المحافظة',
    training: 'طلب التدريب',
    ministry: 'رسوم الوزارة',
    certificate: 'الشهادة المؤمنة',
    decision: 'قرار الإدارة'
  };
  return labels[pageKey] || pageKey;
}

// ⭐ عرض السجل الكامل
async function showFullHistory(certificateId) {
  const history = await window.electronAPI.certificates.getHistory(certificateId);
  
  let modal = document.getElementById('full-history-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'full-history-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  
  let html = `
    <div class="history-modal-content">
      <div class="history-modal-header">
        <h3>📜 سجل التعديلات الكامل</h3>
        <button onclick="closeFullHistory()" class="close-btn">✕</button>
      </div>
      
      <div class="history-modal-body">
        <div class="history-timeline">
  `;
  
  history.forEach((edit, index) => {
    const changedFields = edit.changed_fields || [];
    const isLast = index === history.length - 1;
    
    html += `
      <div class="history-item ${index === 0 ? 'latest' : ''}">
        <div class="history-marker">
          <span class="marker-dot"></span>
          ${!isLast ? '<span class="marker-line"></span>' : ''}
        </div>
        
        <div class="history-content">
          <div class="history-header">
            <span class="history-number">التعديل رقم ${toArabicNumber(history.length - index)}</span>
            <span class="history-date">${formatDate(edit.edited_at)}</span>
          </div>
          
          <div class="history-meta">
            <span class="history-user">👤 ${edit.edited_by || 'غير معروف'}</span>
            ${edit.edit_reason ? `<span class="history-reason">📝 ${edit.edit_reason}</span>` : ''}
          </div>
          
          <div class="history-changes">
            <table class="mini-comparison-table">
              <thead>
                <tr>
                  <th>الحقل</th>
                  <th>قبل</th>
                  <th></th>
                  <th>بعد</th>
                </tr>
              </thead>
              <tbody>
                ${changedFields.map(field => `
                  <tr>
                    <td>${getFieldLabel(field.field)}</td>
                    <td class="old">${formatFieldValue(field.old_value)}</td>
                    <td class="arrow">→</td>
                    <td class="new">${formatFieldValue(field.new_value)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <div class="history-modal-footer">
        <button onclick="closeFullHistory()" class="btn-close">إغلاق</button>
      </div>
    </div>
  `;
  
  modal.innerHTML = html;
  modal.classList.add('active');
}

function closeFullHistory() {
  const modal = document.getElementById('full-history-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}




// ========== تحديث العرض في الصفحة بدون تغيير التواريخ ==========
function updatePageDisplayWithoutDates(cert) {
  const persons = cert.persons_count || 0;
  const consultant = cert.consultant_fee || 0;
  const evacuation = cert.evacuation_fee || 0;
  const inspection = cert.inspection_fee || 0;
  const area = cert.area || 0;
  
  // حساب الرسوم
  const trainingTotal = calculateTrainingFee(persons);
  const ministryFeeOnly = calculateMinistryFee(persons);
  const areaFee = calculateAreaFee(area);
  const ministryTotal = ministryFeeOnly + areaFee;
  const grandTotal = trainingTotal + consultant + evacuation + inspection;
  
  // تحديث عدد الأفراد
  document.querySelectorAll('[data-calc="persons-count"]').forEach(el => {
    el.textContent = toArabicNumber(persons);
  });
  
  document.querySelectorAll('[data-calc="training-total"]').forEach(el => {
    el.textContent = toArabicNumber(trainingTotal);
  });
  
  document.querySelectorAll('[data-calc="consultant-fee"]').forEach(el => {
    el.textContent = consultant === 0 ? '٠٠٠٠' : toArabicNumber(consultant);
  });
  
  document.querySelectorAll('[data-calc="evacuation-fee"]').forEach(el => {
    el.textContent = evacuation === 0 ? '٠٠٠٠' : toArabicNumber(evacuation);
  });
  
  document.querySelectorAll('[data-calc="inspection-fee"]').forEach(el => {
    el.textContent = inspection === 0 ? '٠٠٠٠' : toArabicNumber(inspection);
  });
  
  document.querySelectorAll('[data-calc="grand-total"]').forEach(el => {
    el.textContent = toArabicNumber(grandTotal);
  });
  
  document.querySelectorAll('[data-calc="grand-total-text"]').forEach(el => {
    el.textContent = 'فقط ' + numberToArabicWords(grandTotal) + ' جنيهاً لا غير';
  });
  
  document.querySelectorAll('[data-calc="ministry-fee"]').forEach(el => {
    el.textContent = toArabicNumber(ministryFeeOnly);
  });
  
  document.querySelectorAll('[data-calc="area-fee"]').forEach(el => {
    el.textContent = toArabicNumber(areaFee);
  });
  
  document.querySelectorAll('[data-calc="area-value"]').forEach(el => {
    el.textContent = toArabicNumber(area);
  });
  
  const areaDisplayPage4 = document.getElementById('areaValueDisplay-page4');
  const areaDisplayPage8 = document.getElementById('areaValueDisplay-page8');
  if (areaDisplayPage4) areaDisplayPage4.textContent = toArabicNumber(area);
  if (areaDisplayPage8) areaDisplayPage8.textContent = toArabicNumber(area);
  
  document.querySelectorAll('[data-calc="ministry-total"]').forEach(el => {
    el.textContent = toArabicNumber(ministryTotal);
  });
  
  document.querySelectorAll('[data-calc="ministry-total-text"]').forEach(el => {
    el.textContent = 'فقط ' + numberToArabicWords(ministryTotal) + ' جنيهاً لا غير';
  });
  
  // تحديث بيانات النشاط
  const activity = cert.activity || '';
  const name = cert.name || '';
  const location = cert.location || '';
  
  const activityWithDot = activity.endsWith('.') ? activity : activity + '.';
  const nameWithDot = name.endsWith('.') ? name : name + '.';
  const locationWithDot = location.endsWith('.') ? location : location + '.';
  
  document.querySelectorAll('[data-field="activity"] .field-value').forEach(field => {
    field.textContent = activityWithDot;
  });
  
  document.querySelectorAll('[data-field="name"] .field-value').forEach(field => {
    field.textContent = nameWithDot;
  });
  
  document.querySelectorAll('[data-field="location"] .field-value').forEach(field => {
    field.textContent = locationWithDot;
  });
  
  // تعديل حجم الخط للحقول الطويلة
  adjustFieldValueFontSize();
}


// ========== عرض تحذير التعديل ==========
async function showModificationWarning(cert) {
  const history = await window.electronAPI.certificates.getHistory(cert.id);
  
  let html = `<div style="direction: rtl; text-align: right; color: #e67e22;">`;
  html += `<h3>⚠️ تحذير: هذه الشهادة تم تعديلها ${cert.edit_count} مرة</h3>`;
  html += `<p>تاريخ الإنشاء: ${formatDate(cert.created_at)}</p>`;
  html += `<p>آخر تعديل: ${formatDate(cert.updated_at)}</p>`;
  
  if (history.length > 0) {
    html += `<hr>`;
    html += `<h4>آخر التعديلات:</h4>`;
    html += `<ul style="text-align: right;">`;
    history.slice(0, 3).forEach((h, i) => {
      html += `<li><strong>${formatDate(h.edited_at)}</strong> - بواسطة: ${h.edited_by || 'غير معروف'}<br>`;
      if (h.changed_fields && h.changed_fields.length > 0) {
        html += `<ul>`;
        h.changed_fields.forEach(f => {
          html += `<li>${getFieldLabel(f.field)}: ${f.old_value} ← ${f.new_value}</li>`;
        });
        html += `</ul>`;
      }
      html += `</li>`;
    });
    html += `</ul>`;
  }
  html += `</div>`;
  
  showHistoryModal(html);
}

// ========== تحديث حالة الشهادة في الواجهة ==========
async function updateCertificateStatus() {
  const statusContainer = document.getElementById('certificateStatus');
  if (!statusContainer) return;
  
  if (!currentCertificateId) {
    statusContainer.innerHTML = '<span class="status-new">🆕 شهادة جديدة</span>';
    return;
  }
  
  const cert = await window.electronAPI.certificates.getById(currentCertificateId);
  if (!cert) return;
  
  let html = `<div class="cert-status-box">`;
  html += `<div>رقم الشهادة: <strong>#${cert.id}</strong></div>`;
  html += `<div>تاريخ الإنشاء: ${formatDate(cert.created_at)}</div>`;
  
  if (cert.is_modified) {
    html += `<div class="status-modified">⚠️ معدلة (${cert.edit_count} مرات)</div>`;
    html += `<div>آخر تعديل: ${formatDate(cert.updated_at)}</div>`;
    html += `<button onclick="showHistory(${cert.id})" class="btn-history">عرض سجل التعديلات</button>`;
  } else {
    html += `<div class="status-original">✅ أصلية - لم يتم تعديلها</div>`;
  }
  
  html += `</div>`;
  statusContainer.innerHTML = html;
}

// ========== عرض سجل التعديلات ==========
async function showHistory(certificateId) {
  const history = await window.electronAPI.certificates.getHistory(certificateId);
  
  if (history.length === 0) {
    showNotification('⚠️ لا يوجد سجل تعديلات', 'error');
    return;
  }
  
  // يمكن عرضها في Popup أو Modal
  // console.log('سجل التعديلات:', history);
  
  // إنشاء HTML بدلاً من alert
  let html = '<div style="direction: rtl; text-align: right;">';
  html += '<h3>📋 سجل التعديلات</h3>';
  history.forEach((h, i) => {
    html += `<div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">`;
    html += `<strong>التعديل رقم ${history.length - i}</strong><br>`;
    html += `التاريخ: ${formatDate(h.edited_at)}<br>`;
    html += `بواسطة: ${h.edited_by || 'غير معروف'}<br>`;
    if (h.edit_reason) {
      html += `السبب: ${h.edit_reason}<br>`;
    }
    html += `<strong>التغييرات:</strong><br>`;
    if (h.changed_fields) {
      h.changed_fields.forEach(f => {
        html += `• ${getFieldLabel(f.field)}: من ${f.old_value} إلى ${f.new_value}<br>`;
      });
    }
    html += `</div>`;
  });
  html += '</div>';
  
  // عرض في Modal بدلاً من alert
  showHistoryModal(html);
}

// ========== عرض Modal السجل ==========
function showHistoryModal(html) {
  let modal = document.getElementById('history-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 10px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      " id="history-modal-content">
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const content = document.getElementById('history-modal-content');
  content.innerHTML = html + `<button onclick="document.getElementById('history-modal').style.display='none'" style="
    margin-top: 15px;
    padding: 10px 20px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    width: 100%;
  ">إغلاق</button>`;
  
  modal.style.display = 'flex';
}

// ========== عرض قائمة الشهادات ==========
async function showCertificatesList() {
  const certs = await window.electronAPI.certificates.getAll({ status: 'active' });
  
  let html = '<div class="certs-list">';
  
  if (certs.length === 0) {
    html += '<p>لا توجد شهادات محفوظة</p>';
  } else {
    certs.forEach(cert => {
      const modifiedBadge = cert.is_modified 
        ? `<span class="badge-modified">معدلة ${cert.edit_count}x</span>` 
        : '<span class="badge-original">أصلية</span>';
      
      html += `
        <div class="cert-item" onclick="loadCertificate(${cert.id})">
          <div class="cert-name">${cert.name}</div>
          <div class="cert-activity">${cert.activity}</div>
          <div class="cert-date">${formatDate(cert.created_at)}</div>
          ${modifiedBadge}
        </div>
      `;
    });
  }
  
  html += '</div>';
  
  // عرض في Modal أو Container
  document.getElementById('certsListContainer').innerHTML = html;
}

// ========== شهادة جديدة ==========
// ========== شهادة جديدة ==========
function newCertificate() {
  // مسح ID الشهادة الحالية
  currentCertificateId = null;
  
  // ⭐ مسح البيانات الأصلية
  originalCertificateData = null;
  
  // إعادة تعيين القيم الافتراضية
  currentPersonsCount = 10;
  currentConsultantFee = 10000;
  currentEvacuationFee = 10000;
  currentInspectionFee = 10000;
  currentArea = 318;
  
  // مسح الحقول في الـ Popup
  document.getElementById('inputActivity').value = '';
  document.getElementById('inputName').value = '';
  document.getElementById('inputLocation').value = '';
  document.getElementById('inputArea').value = '';
  document.getElementById('inputPersons').value = '';
  document.getElementById('inputConsultant').value = '';
  document.getElementById('inputEvacuation').value = '';
  document.getElementById('inputInspection').value = '';
  
  // إعادة تعيين القيم في الصفحة للقيم الافتراضية
  document.querySelectorAll('[data-field="activity"] .field-value').forEach(field => {
    field.textContent = '.';
  });
  document.querySelectorAll('[data-field="name"] .field-value').forEach(field => {
    field.textContent = '.';
  });
  document.querySelectorAll('[data-field="location"] .field-value').forEach(field => {
    field.textContent = '.';
  });
  
  // إعادة تعيين كل التواريخ لتاريخ اليوم
  pageDates = {
    governorate: null,
    ministry: null,
    certificate: null
  };
  initializeAllDates();
  
  // تحديث المعاينة والحالة
  updateCalcPreview();
  updateCertificateStatus();
  updateFeesButtonText();
  
  showNotification('🆕 تم إنشاء شهادة جديدة');
}


// ========== دوال مساعدة ==========
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getFieldLabel(field) {
  const labels = {
    activity: 'النشاط',
    name: 'الاسم',
    location: 'العنوان',
    area: 'المساحة',
    persons_count: 'عدد الأفراد',
    training_fee: 'رسوم التدريب',
    consultant_fee: 'رسوم الاستشاري',
    evacuation_fee: 'رسوم الإخلاء',
    inspection_fee: 'رسوم المعاينة',
    area_fee: 'رسوم المساحة',
    ministry_fee: 'رسوم الوزارة',
    grand_total: 'الإجمالي الكلي',
    ministry_total: 'إجمالي الوزارة',
    user_name: 'اسم المستخدم'
  };
  return labels[field] || field;
}

// ========== الإحصائيات ==========
// ========== الإحصائيات المفصلة ==========
async function showStats() {
  const loader = Loading.data('يتم تحميل الإحصائيات...');

  try {
    const stats = await window.electronAPI.certificates.getStats();
  
  // إنشاء Modal للإحصائيات
  let modal = document.getElementById('stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(modal);
  }
  
  // حساب النسب المئوية
  const modifiedPercent = stats.total > 0 ? ((stats.modified / stats.total) * 100).toFixed(1) : 0;
  const originalPercent = stats.total > 0 ? (((stats.total - stats.modified) / stats.total) * 100).toFixed(1) : 0;
  
  modal.innerHTML = `
    <div class="stats-modal-content">
      <div class="stats-header">
        <h2>📊 إحصائيات الشهادات</h2>
        <button onclick="closeStatsModal()" class="stats-close-btn">&times;</button>
      </div>
      
      <div class="stats-body">
        <!-- الإحصائيات الرئيسية -->
        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-icon">📋</div>
            <div class="stat-value">${toArabicNumber(stats.total)}</div>
            <div class="stat-label">إجمالي الشهادات</div>
          </div>
          
          <div class="stat-card today">
            <div class="stat-icon">📅</div>
            <div class="stat-value">${toArabicNumber(stats.today)}</div>
            <div class="stat-label">شهادات اليوم</div>
          </div>
          
          <div class="stat-card week">
            <div class="stat-icon">📆</div>
            <div class="stat-value">${toArabicNumber(stats.thisWeek || 0)}</div>
            <div class="stat-label">هذا الأسبوع</div>
          </div>
          
          <div class="stat-card month">
            <div class="stat-icon">🗓️</div>
            <div class="stat-value">${toArabicNumber(stats.thisMonth || 0)}</div>
            <div class="stat-label">هذا الشهر</div>
          </div>
        </div>
        
        <!-- إحصائيات التعديلات -->
        <div class="stats-section">
          <h3>📝 حالة التعديلات</h3>
          <div class="stats-row">
            <div class="stat-item modified">
              <span class="stat-dot modified"></span>
              <span class="stat-text">شهادات معدلة</span>
              <span class="stat-num">${toArabicNumber(stats.modified)}</span>
              <span class="stat-percent">(${toArabicNumber(modifiedPercent)}٪)</span>
            </div>
            <div class="stat-item original">
              <span class="stat-dot original"></span>
              <span class="stat-text">شهادات أصلية</span>
              <span class="stat-num">${toArabicNumber(stats.total - stats.modified)}</span>
              <span class="stat-percent">(${toArabicNumber(originalPercent)}٪)</span>
            </div>
          </div>
          
          <!-- شريط التقدم -->
          <div class="stats-progress-container">
            <div class="stats-progress-bar">
              <div class="progress-original" style="width: ${originalPercent}%"></div>
              <div class="progress-modified" style="width: ${modifiedPercent}%"></div>
            </div>
            <div class="progress-labels">
              <span>أصلية ${toArabicNumber(originalPercent)}٪</span>
              <span>معدلة ${toArabicNumber(modifiedPercent)}٪</span>
            </div>
          </div>
        </div>
        
        <!-- إحصائيات مالية -->
        <div class="stats-section">
          <h3>💰 الإحصائيات المالية</h3>
          <div class="financial-stats">
            <div class="financial-item">
              <span class="financial-label">إجمالي رسوم المحافظة</span>
              <span class="financial-value">${toArabicNumber(stats.totalGovernorate || 0)} ج</span>
            </div>
            <div class="financial-item">
              <span class="financial-label">إجمالي رسوم الوزارة</span>
              <span class="financial-value">${toArabicNumber(stats.totalMinistry || 0)} ج</span>
            </div>
            <div class="financial-item highlight">
              <span class="financial-label">الإجمالي الكلي</span>
              <span class="financial-value">${toArabicNumber(stats.grandTotal || 0)} ج</span>
            </div>
            <div class="financial-item">
              <span class="financial-label">متوسط قيمة الشهادة</span>
              <span class="financial-value">${toArabicNumber(stats.averageValue || 0)} ج</span>
            </div>
          </div>
        </div>
        
        <!-- إحصائيات التدريب -->
        <div class="stats-section">
          <h3>👥 إحصائيات التدريب</h3>
          <div class="training-stats">
            <div class="training-item">
              <span class="training-icon">👤</span>
              <span class="training-value">${toArabicNumber(stats.totalPersons || 0)}</span>
              <span class="training-label">إجمالي المتدربين</span>
            </div>
            <div class="training-item">
              <span class="training-icon">📐</span>
              <span class="training-value">${toArabicNumber(stats.totalArea || 0)}</span>
              <span class="training-label">إجمالي المساحات (م²)</span>
            </div>
            <div class="training-item">
              <span class="training-icon">📊</span>
              <span class="training-value">${toArabicNumber(stats.avgPersons || 0)}</span>
              <span class="training-label">متوسط الأفراد/شهادة</span>
            </div>
          </div>
        </div>
        
        <!-- أكثر المستخدمين نشاطاً -->
        ${stats.topUsers && stats.topUsers.length > 0 ? `
        <div class="stats-section">
          <h3>🏆 أكثر المستخدمين نشاطاً</h3>
          <div class="top-users-list">
            ${stats.topUsers.map((user, index) => `
              <div class="top-user-item">
                <span class="user-rank">${toArabicNumber(index + 1)}</span>
                <span class="user-name">${user.name || 'غير معروف'}</span>
                <span class="user-count">${toArabicNumber(user.count)} شهادة</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- آخر التعديلات -->
        ${stats.recentEdits && stats.recentEdits.length > 0 ? `
        <div class="stats-section">
          <h3>🕐 آخر التعديلات</h3>
          <div class="recent-edits-list">
            ${stats.recentEdits.map(edit => `
              <div class="recent-edit-item">
                <span class="edit-cert">#${edit.certificate_id}</span>
                <span class="edit-user">${edit.edited_by || 'غير معروف'}</span>
                <span class="edit-date">${formatDate(edit.edited_at)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="stats-footer">
        <span class="stats-update-time">آخر تحديث: ${formatDate(Date.now())}</span>
        <button onclick="refreshStats()" class="btn-refresh">🔄 تحديث</button>
        <button onclick="exportStats()" class="btn-export">📥 تصدير</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
  loader.hide();
  
  } catch (err) {
    console.error('Stats error:', err);
    showNotification('❌ حدث خطأ أثناء تحميل الإحصائيات', 'error');
    loader.hide();
  }
}
  

// ========== إغلاق Modal الإحصائيات ==========
function closeStatsModal() {
  const modal = document.getElementById('stats-modal');
  if (modal) modal.style.display = 'none';
}

// ========== تحديث الإحصائيات ==========
async function refreshStats() {
  closeStatsModal();
  await showStats();
  showNotification('✅ تم تحديث الإحصائيات');
}

// ========== تصدير الإحصائيات ==========
async function exportStats() {
  const stats = await window.electronAPI.certificates.getStats();
  
  const exportData = {
    exportDate: new Date().toISOString(),
    stats: stats
  };
  
  // إنشاء ملف للتحميل
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `احصائيات_الشهادات_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('✅ تم تصدير الإحصائيات');
}




// ========== فتح Modal الشهادات ==========
async function openCertificatesModal() {
  document.getElementById('certsModal').classList.add('active');
  await showCertificatesList();
}

// ========== إغلاق Modal الشهادات ==========
function closeCertsModal() {
  document.getElementById('certsModal').classList.remove('active');
}

// ========== البحث في الواجهة ==========
async function searchCertificatesUI() {
  const searchTerm = document.getElementById('searchCerts').value.trim();
  const loader = Loading.search();
  
  try {
    let certs;
    if (searchTerm) {
      certs = await window.electronAPI.certificates.search(searchTerm);
    } else {
      certs = await window.electronAPI.certificates.getAll({ status: 'active' });
    }
    
    renderCertificatesList(certs);
  } catch (err) {
    console.error('Search error:', err);
    showNotification('❌ حدث خطأ أثناء البحث', 'error');
  } finally {
    loader.hide();
  }
}

// ========== عرض القائمة ==========
function renderCertificatesList(certs) {
  let html = '<div class="certs-list">';
  
  if (certs.length === 0) {
    html += '<p class="no-data">لا توجد شهادات</p>';
  } else {
    certs.forEach(cert => {
      const modifiedClass = cert.is_modified ? 'modified' : 'original';
      const modifiedBadge = cert.is_modified 
        ? `<span class="badge modified">⚠️ معدلة ${cert.edit_count}x</span>` 
        : '<span class="badge original">✅ أصلية</span>';
      
      html += `
        <div class="cert-item ${modifiedClass}" onclick="loadAndClose(${cert.id})">
          <div class="cert-header">
            <span class="cert-id">#${cert.id}</span>
            ${modifiedBadge}
          </div>
          <div class="cert-name">${cert.name || 'بدون اسم'}</div>
          <div class="cert-activity">${cert.activity || '-'}</div>
          <div class="cert-footer">
            <span class="cert-date">${formatDate(cert.created_at)}</span>
            <span class="cert-total">${toArabicNumber(cert.grand_total || 0)} ج</span>
          </div>
          <div class="cert-actions">
            <button onclick="event.stopPropagation(); showHistory(${cert.id})" class="btn-sm">📜 السجل</button>
            <button onclick="event.stopPropagation(); confirmDelete(${cert.id})" class="btn-sm danger">🗑️</button>
          </div>
        </div>
      `;
    });
  }
  
  html += '</div>';
  document.getElementById('certsListContainer').innerHTML = html;
}

// ========== تحميل وإغلاق ==========
async function loadAndClose(id) {
  await loadCertificate(id);
  closeCertsModal();
 
}

// ========== تأكيد الحذف ==========
async function confirmDelete(id) {
  const cert = await window.electronAPI.certificates.getById(id);
  if (!cert) return;
  
  // استخدام Popup بدلاً من confirm
  showDeleteConfirmation(id, cert.name);
}

// ========== Popup تأكيد الحذف ==========
function showDeleteConfirmation(id, certName) {
  let modal = document.getElementById('delete-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 10px;
      padding: 30px;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      direction: rtl;
      text-align: right;
    ">
      <h3 style="color: #e74c3c; margin-bottom: 10px;">⚠️ تأكيد الحذف</h3>
      <p>هل أنت متأكد من حذف شهادة "<strong>${certName}</strong>"؟</p>
      <p style="color: #7f8c8d; font-size: 12px;">لا يمكن التراجع عن هذا الإجراء</p>
      
      <div style="display: flex; gap: 10px; justify-content: flex-start; margin-top: 20px;">
        <button onclick="document.getElementById('delete-confirm-modal').style.display='none'" style="
          padding: 10px 20px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        ">إلغاء</button>
        
        <button onclick="performDelete(${id})" style="
          padding: 10px 20px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        ">حذف</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// ========== تنفيذ الحذف ==========
async function performDelete(id) {
  const loader = Loading.delete();
  
  try {
    const userName = document.getElementById('inputUserName').value.trim();
    await window.electronAPI.certificates.delete(id, userName);
    
    document.getElementById('delete-confirm-modal').style.display = 'none';
    
    await showCertificatesList();
    
    if (currentCertificateId === id) {
      newCertificate();
    }
    
    showNotification('✅ تم حذف الشهادة بنجاح');
  } catch (err) {
    console.error('خطأ في الحذف:', err);
    showNotification('❌ حدث خطأ أثناء الحذف', 'error');
  } finally {
    loader.hide();
  }
}

// ========== تحديث showCertificatesList ==========
async function showCertificatesList() {
  const certs = await window.electronAPI.certificates.getAll({ status: 'active' });
  renderCertificatesList(certs);
}


// ========== نظام تتبع تواريخ الصفحات ==========

// تخزين تواريخ كل مجموعة صفحات
let pageDates = {
  governorate: null,   // صفحة 1 - رسوم المحافظة
  training: null,      // صفحة 2 - طلب التدريب
  ministry: null,      // صفحة 3 - رسوم الوزارة
  certificate: null,   // صفحة 4 - الشهادة المؤمنة
  decision: null       // صفحة 5 - قرار الإدارة
};


// تحديد أي حقول تؤثر على أي صفحات
const fieldToPageMapping = {
  // ⭐ عدد الأفراد يؤثر على 3 صفحات
  persons_count: ['governorate', 'training', 'ministry'],
  
  // حقول تؤثر على صفحة المحافظة فقط (1)
  training_fee: ['governorate'],
  consultant_fee: ['governorate'],
  evacuation_fee: ['governorate'],
  inspection_fee: ['governorate'],
  grand_total: ['governorate'],
  
  // حقول تؤثر على صفحة الوزارة (3)
  area: ['ministry', 'certificate'],
  area_fee: ['ministry'],
  ministry_fee: ['ministry'],
  ministry_total: ['ministry'],
  
  // حقول تؤثر على كل الصفحات
  activity: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
  name: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
  location: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
};

// ========== دالة تحديث التاريخ الذكية ==========
function updatePageDate(pageGroup) {
  const today = new Date();
  const dateString = formatArabicDate(today);
  
  // تحديث التاريخ المحفوظ
  pageDates[pageGroup] = Date.now();
  
  // تحديث العناصر في الصفحة
  document.querySelectorAll(`.auto-date[data-page-group="${pageGroup}"]`).forEach(el => {
    el.textContent = dateString;
    el.classList.add('date-updated');
    setTimeout(() => el.classList.remove('date-updated'), 2000);
  });
  
  // حفظ في localStorage
  savePageDates();
  
  // console.log(`✅ تم تحديث تاريخ صفحة: ${pageGroup}`);
}

// ========== تنسيق التاريخ بالعربي ==========
function formatArabicDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${toArabicNumber(year)}/${toArabicNumber(month)}/${toArabicNumber(day)}`;
}

// ========== حفظ وتحميل التواريخ ==========
function savePageDates() {
  localStorage.setItem('pageDates', JSON.stringify(pageDates));
}

function loadPageDates() {
  const saved = localStorage.getItem('pageDates');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      pageDates = {
        governorate: parsed.governorate || null,
        training: parsed.training || null,
        ministry: parsed.ministry || null,
        certificate: parsed.certificate || null,
        decision: parsed.decision || null
      };
    
    // تحديث عرض التواريخ
    Object.keys(pageDates).forEach(pageGroup => {
        if (pageDates[pageGroup]) {
          const date = new Date(pageDates[pageGroup]);
          const dateString = formatArabicDate(date);
          document.querySelectorAll(`.auto-date[data-page-group="${pageGroup}"]`).forEach(el => {
            el.textContent = dateString;
          });
        }
      });
    } catch (e) {
      console.error('خطأ في تحميل التواريخ:', e);
    }
  }
}

// ========== تحديث التاريخ عند التعديل ==========
function updateDatesForChangedFields(changedFields) {
  const affectedPages = new Set();
  
  changedFields.forEach(fieldName => {
    const pages = fieldToPageMapping[fieldName];
    if (pages) {
      pages.forEach(page => affectedPages.add(page));
    }
  });
  
  // تحديث تاريخ الصفحات المتأثرة فقط
  affectedPages.forEach(pageGroup => {
    updatePageDate(pageGroup);
  });
  
  return Array.from(affectedPages);
}

// ========== تهيئة التواريخ عند أول استخدام ==========
function initializeAllDates() {
  const today = Date.now();
  const dateString = formatArabicDate(new Date());
  
  // تحديث كل مجموعات الصفحات
  const allPageGroups = ['governorate', 'training', 'ministry', 'certificate', 'decision'];
  
  allPageGroups.forEach(pageGroup => {
    if (!pageDates[pageGroup]) {
      pageDates[pageGroup] = today;
    }
  });
  
  // تحديث كل عناصر التاريخ
  document.querySelectorAll('.auto-date').forEach(el => {
    const pageGroup = el.getAttribute('data-page-group');
    if (pageGroup && pageDates[pageGroup]) {
      el.textContent = formatArabicDate(new Date(pageDates[pageGroup]));
    } else {
      el.textContent = dateString;
    }
  });
  
  savePageDates();
}


// ========== متغيرات الطباعة ==========
let isPrinting = false;
let printSettings = {
  showButtons: false,
  selectedPages: 'all', // 'all', '1', '2', '3', '4', '5', 'custom'
  customPages: [],
  copies: 1,
  orientation: 'portrait'
};

// ========== دالة تحضير الصفحة للطباعة ==========
function prepareForPrint() {
  // إخفاء الأزرار والعناصر غير المطلوبة
  document.querySelectorAll('.fees-btn, .btn-certificates, .btn-new, .btn-stats, .btn-save, #certificateStatus, .popup-overlay, .modal-overlay').forEach(el => {
    el.setAttribute('data-print-hidden', 'true');
    el.style.display = 'none';
  });
  
  // إضافة class للطباعة
  document.body.classList.add('printing-mode');
}

// ========== دالة استعادة الصفحة بعد الطباعة ==========
function restoreAfterPrint() {
  // إظهار العناصر المخفية
  document.querySelectorAll('[data-print-hidden="true"]').forEach(el => {
    el.removeAttribute('data-print-hidden');
    el.style.display = '';
  });
  
  // إزالة class الطباعة
  document.body.classList.remove('printing-mode');
}

// ========== الطباعة المباشرة ==========
async function printDocument() {
  if (isPrinting) {
    showNotification('⏳ جاري الطباعة...', 'warning');
    return;
  }
  
  isPrinting = true;
  const loader = Loading.print('يتم إرسال المستند للطابعة...');
  
  try {
    prepareForPrint();
    
    if (window.electronAPI && window.electronAPI.print) {
      await window.electronAPI.print.printPage();
      showNotification('✅ تم إرسال المستند للطابعة');
    } else {
      window.print();
    }
  } catch (err) {
    console.error('Print error:', err);
    showNotification('❌ حدث خطأ أثناء الطباعة', 'error');
  } finally {
    restoreAfterPrint();
    isPrinting = false;
    loader.hide();
  }
}


// ========== طباعة صفحات محددة ==========
// ========== طباعة صفحات محددة (مُصلحة) ==========
async function printSelectedPages(pageNumbers = []) {
  if (isPrinting) return;
  
  isPrinting = true;
  const loader = Loading.print('يتم تجهيز الصفحات للطباعة...');
  
  try {
    // إخفاء الصفحات غير المطلوبة باستخدام CSS class بدل inline style
    document.querySelectorAll('.page').forEach((page, index) => {
      const pageNum = index + 1;
      if (pageNumbers.length === 0 || pageNumbers.includes(pageNum)) {
        page.classList.remove('print-hidden');
        page.style.display = '';
      } else {
        page.classList.add('print-hidden');
        page.setAttribute('data-print-hidden-page', 'true');
      }
    });
    
    prepareForPrint();
    
    // انتظار قليل للتأكد من تطبيق CSS
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (window.electronAPI && window.electronAPI.print) {
      await window.electronAPI.print.printPage({
        pageRanges: pageNumbers.length > 0 ? pageNumbers.map(p => ({from: p-1, to: p-1})) : undefined
      });
    } else {
      window.print();
    }
    
    showNotification(`✅ تم إرسال ${pageNumbers.length || 'كل'} الصفحات للطابعة`);
  } catch (err) {
    console.error('Print selected pages error:', err);
    showNotification('❌ حدث خطأ أثناء الطباعة', 'error');
  } finally {
    // استعادة كل الصفحات
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('print-hidden');
      page.removeAttribute('data-print-hidden-page');
      page.style.display = '';
    });
    restoreAfterPrint();
    isPrinting = false;
    loader.hide();
  }
}

// ========== تصدير PDF ==========
async function exportToPDF(options = {}) {
  const loader = Loading.pdf();
  
  try {
    const pageNumbers = options.pageNumbers || [];
    if (pageNumbers.length > 0) {
      document.querySelectorAll('.page').forEach((page, index) => {
        if (!pageNumbers.includes(index + 1)) {
          page.style.display = 'none';
          page.setAttribute('data-pdf-hidden-page', 'true');
        }
      });
    }
    
    prepareForPrint();
    
    const certName = document.querySelector('[data-field="name"] .field-value')?.textContent || 'شهادة';
    const cleanName = certName.replace(/\./g, '').trim() || 'شهادة';
    const fileName = options.fileName || `${cleanName}_${formatDateForFileName()}.pdf`;
    
    loader.updateSubtitle('يتم معالجة الصفحات...');
    loader.updateProgress(30);
    
    if (window.electronAPI && window.electronAPI.print) {
      loader.updateSubtitle('يتم إنشاء ملف PDF...');
      loader.updateProgress(60);
      
      const result = await window.electronAPI.print.exportPDF({ 
        fileName,
        pageNumbers: pageNumbers.length > 0 ? pageNumbers : null
      });
      
      loader.updateProgress(100);
      
      if (result.success) {
        showNotification(`✅ تم حفظ الملف: ${result.filePath}`);
      } else if (result.canceled) {
        showNotification('⚠️ تم إلغاء الحفظ', 'warning');
      }
    } else {
      await exportPDFWithLibraries(fileName, loader);
    }
  } catch (err) {
    console.error('Export PDF error:', err);
    showNotification('❌ حدث خطأ أثناء إنشاء PDF', 'error');
  } finally {
    document.querySelectorAll('[data-pdf-hidden-page="true"]').forEach(page => {
      page.style.display = '';
      page.removeAttribute('data-pdf-hidden-page');
    });
    restoreAfterPrint();
    loader.hide();
  }
}

// ========== تصدير PDF باستخدام المكتبات ==========
async function exportPDFWithLibraries(fileName, loader) {
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    loader.updateSubtitle('يتم تحميل المكتبات...');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pages = document.querySelectorAll('.page');
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const progress = ((i + 1) / pages.length) * 100;
    
    loader.updateSubtitle(`يتم معالجة الصفحة ${i + 1} من ${pages.length}...`);
    loader.updateProgress(progress);
    
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  }
  
  loader.updateSubtitle('يتم حفظ الملف...');
  pdf.save(fileName);
  showNotification('✅ تم تصدير الملف بنجاح!');
}

// ========== تحميل Script ديناميكياً ==========
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ========== تنسيق التاريخ لاسم الملف ==========
function formatDateForFileName() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ========== Popup خيارات الطباعة ==========
function showPrintOptions() {
  let modal = document.getElementById('print-options-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'print-options-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="print-modal-content">
      <div class="print-modal-header">
        <h3>🖨️ خيارات الطباعة</h3>
        <button onclick="closePrintOptions()" class="close-btn">&times;</button>
      </div>
      
      <div class="print-modal-body">
        <!-- اختيار الصفحات -->
        <div class="print-section">
          <h4>اختيار الصفحات</h4>
          <div class="print-pages-options">
            <label class="print-radio">
              <input type="radio" name="printPages" value="all" checked onchange="updatePrintPreview()">
              <span>كل الصفحات</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="1" onchange="updatePrintPreview()">
              <span>صفحة 1 - رسوم المحافظة</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="2" onchange="updatePrintPreview()">
              <span>صفحة 2 - طلب التدريب</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="3" onchange="updatePrintPreview()">
              <span>صفحة 3 - رسوم الوزارة</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="4" onchange="updatePrintPreview()">
              <span>صفحة 4 - الشهادة المؤمنة</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="5" onchange="updatePrintPreview()">
              <span>صفحة 5 - قرار الإدارة</span>
            </label>
            <label class="print-radio">
              <input type="radio" name="printPages" value="custom" onchange="updatePrintPreview()">
              <span>صفحات محددة:</span>
              <input type="text" id="customPagesInput" placeholder="مثال: 1,3,5" class="custom-pages-input">
            </label>
          </div>
        </div>
        
        <!-- خيارات إضافية -->
        <div class="print-section">
          <h4>خيارات إضافية</h4>
          <div class="print-options-grid">
            <label class="print-checkbox">
              <input type="checkbox" id="printBackground" checked>
              <span>طباعة الخلفيات والألوان</span>
            </label>
          </div>
        </div>
        
        <!-- معاينة -->
        <div class="print-preview-section">
          <h4>معاينة</h4>
          <div id="printPreviewInfo" class="print-preview-info">
            سيتم طباعة: كل الصفحات (5 صفحات)
          </div>
        </div>
      </div>
      
      <div class="print-modal-footer">
        <button onclick="closePrintOptions()" class="btn-cancel">إلغاء</button>
        <button onclick="exportFromModal()" class="btn-export-pdf">
          📄 تصدير PDF
        </button>
        <button onclick="printFromModal()" class="btn-print">
          🖨️ طباعة
        </button>
      </div>
      
      <!-- اختصارات -->
      <div class="shortcuts-hint">
        <span>Ctrl+P طباعة</span>
        <span>Ctrl+E تصدير PDF</span>
        <span>Ctrl+S حفظ</span>
        <span>Ctrl+N جديد</span>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
  updatePrintPreview();
}

// ========== إغلاق خيارات الطباعة ==========
function closePrintOptions() {
  const modal = document.getElementById('print-options-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ========== تحديث معاينة الطباعة ==========
function updatePrintPreview() {
  const selected = document.querySelector('input[name="printPages"]:checked')?.value || 'all';
  const previewEl = document.getElementById('printPreviewInfo');
  
  let text = '';
  switch (selected) {
    case 'all':
      text = 'سيتم طباعة: كل الصفحات (5 صفحات)';
      break;
    case 'custom':
      const customInput = document.getElementById('customPagesInput')?.value || '';
      text = `سيتم طباعة: الصفحات ${customInput || '(حدد الصفحات)'}`;
      break;
    default:
      const pageNames = {
        '1': 'رسوم المحافظة',
        '2': 'طلب التدريب',
        '3': 'رسوم الوزارة',
        '4': 'الشهادة المؤمنة',
        '5': 'قرار الإدارة'
      };
      text = `سيتم طباعة: صفحة ${selected} - ${pageNames[selected]}`;
  }
  
  if (previewEl) {
    previewEl.textContent = text;
  }
}

// ========== الطباعة من Modal ==========
async function printFromModal() {
  // التحقق من الحقول الإجبارية
  if (!validateRequiredFields()) {
    closePrintOptions();
    openFeesPopup(); // فتح الـ popup لملء البيانات
    return;
  }
  
  // الحفظ التلقائي قبل الطباعة
  showNotification('💾 جاري الحفظ قبل الطباعة...');
  await saveCertificate();
  
  const selected = document.querySelector('input[name="printPages"]:checked')?.value || 'all';
  
  closePrintOptions();
  
  if (selected === 'all') {
    await printDocument();
  } else if (selected === 'custom') {
    const customInput = document.getElementById('customPagesInput')?.value || '';
    const pages = customInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p >= 1 && p <= 5);
    if (pages.length === 0) {
      showNotification('⚠️ برجاء تحديد صفحات صحيحة', 'warning');
      return;
    }
    await printSelectedPages(pages);
  } else {
    await printSelectedPages([parseInt(selected)]);
  }
}

// ========== التصدير من Modal ==========
async function exportFromModal() {
  // التحقق من الحقول الإجبارية
  if (!validateRequiredFields()) {
    closePrintOptions();
    openFeesPopup(); // فتح الـ popup لملء البيانات
    return;
  }
  
  // الحفظ التلقائي قبل التصدير
  showNotification('💾 جاري الحفظ قبل التصدير...');
  await saveCertificate();
  
  const selected = document.querySelector('input[name="printPages"]:checked')?.value || 'all';
  
  closePrintOptions();
  
  if (selected === 'all') {
    await exportToPDF();
  } else if (selected === 'custom') {
    const customInput = document.getElementById('customPagesInput')?.value || '';
    const pages = customInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p >= 1 && p <= 5);
    if (pages.length === 0) {
      showNotification('⚠️ برجاء تحديد صفحات صحيحة', 'warning');
      return;
    }
    await exportToPDF({ pageNumbers: pages });
  } else {
    await exportToPDF({ pageNumbers: [parseInt(selected)] });
  }
}

// ========== الاختصارات ==========
// ========== 1. إصلاح نظام الاختصارات ==========

function setupKeyboardShortcuts() {
  // إزالة أي listener قديم أولاً
  document.removeEventListener('keydown', handleKeyboardShortcuts);
  
  // إضافة listener جديد مع capture: true للأولوية
  document.addEventListener('keydown', handleKeyboardShortcuts, { capture: true });
  
  console.log('✅ تم تفعيل اختصارات لوحة المفاتيح');
}

// ⭐ دالة منفصلة للتعامل مع الاختصارات
function handleKeyboardShortcuts(e) {
  // Ctrl+S - حفظ (يعمل دائماً)
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('🔥 Ctrl+S detected');
    saveCertificateHandler();
    showNotification('💾 جاري الحفظ... (Ctrl+S)');
    return false;
  }
  
  // Ctrl+P - طباعة
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('🔥 Ctrl+P detected');
    showPrintOptions();
    return false;
  }
  
  // Ctrl+E - تصدير PDF
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('🔥 Ctrl+E detected');
    exportToPDF();
    return false;
  }
  
  // Ctrl+N - شهادة جديدة
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
    // تجاهل إذا المستخدم في input
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    if (!isTyping) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('🔥 Ctrl+N detected');
      newCertificate();
      return false;
    }
  }
  
  // Ctrl+F - البحث
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('🔥 Ctrl+F detected');
    openCertificatesModal();
    setTimeout(() => {
      document.getElementById('searchCerts')?.focus();
    }, 100);
    return false;
  }
  
  // Escape - إغلاق أي Modal
  if (e.key === 'Escape') {
    closeAllModals();
  }
}


// ⭐ دالة مساعدة لإغلاق كل الـ Modals
function closeAllModals() {
  closePrintOptions();
  closeCertsModal();
  closeFeesPopup();
  closeStatsModal();
  closeFullHistory();
  
  const deleteModal = document.getElementById('delete-confirm-modal');
  if (deleteModal) deleteModal.style.display = 'none';
  
  const historyModal = document.getElementById('history-modal');
  if (historyModal) historyModal.style.display = 'none';
}

// ⭐ Handler منفصل للحفظ (يتجنب مشكلة الـ override)
async function saveCertificateHandler() {
  // التحقق من الحقول الإجبارية قبل الحفظ
  if (!validateRequiredFields()) {
    return;
  }
  await saveCertificate();
}


// ========== تهيئة نظام الطباعة ==========
function initPrintSystem() {
  // إضافة أزرار الطباعة والتصدير
  addPrintButtons();
  
  // تفعيل الاختصارات
  setupKeyboardShortcuts();
  
  // إضافة CSS للطباعة
  addPrintStyles();
}

// ========== إضافة أزرار الطباعة ==========
function addPrintButtons() {
  // التحقق من عدم وجود الأزرار مسبقاً
  if (document.querySelector('.btn-print-main')) return;
  
  // زر الطباعة
  const printBtn = document.createElement('button');
  printBtn.className = 'btn-print-main floating-btn';
  printBtn.innerHTML = '🖨️ طباعة';
  printBtn.onclick = showPrintOptions;
  printBtn.title = 'طباعة (Ctrl+P)';
  
  // زر تصدير PDF
  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'btn-pdf-main floating-btn';
  pdfBtn.innerHTML = '📄 PDF';
  pdfBtn.onclick = () => exportToPDF();
  pdfBtn.title = 'تصدير PDF (Ctrl+E)';
  
  // إضافة للصفحة
  document.body.appendChild(printBtn);
  document.body.appendChild(pdfBtn);
}

// ========== إضافة CSS للطباعة ==========
function addPrintStyles() {
  const style = document.createElement('style');
  style.id = 'print-styles';
  style.textContent = `
  @media print {
      .print-hidden {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
        page-break-before: avoid !important;
        page-break-after: avoid !important;
      }
      
      .page:not(.print-hidden) {
        display: block !important;
        visibility: visible !important;
      }
    }
    /* ========== أزرار الطباعة ========== */
    .btn-print-main {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .btn-print-main:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(52, 152, 219, 0.5);
    }
    
    .btn-pdf-main {
      position: fixed;
      bottom: 20px;
      left: 130px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .btn-pdf-main:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(231, 76, 60, 0.5);
    }
    
    /* ========== Modal الطباعة ========== */
    .print-modal-content {
      background: white;
      border-radius: 15px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      direction: rtl;
    }
    
    .print-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 15px 15px 0 0;
    }
    
    .print-modal-header h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .print-modal-body {
      padding: 20px;
    }
    
    .print-section {
      margin-bottom: 20px;
    }
    
    .print-section h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 14px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 5px;
    }
    
    .print-pages-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .print-radio {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .print-radio:hover {
      background: #e9ecef;
    }
    
    .print-radio input[type="radio"] {
      accent-color: #667eea;
    }
    
    .custom-pages-input {
      width: 100px;
      padding: 5px 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      margin-right: 10px;
    }
    
    .print-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .print-preview-info {
      background: #e8f4fd;
      padding: 15px;
      border-radius: 8px;
      color: #1565c0;
      font-weight: bold;
      text-align: center;
    }
    
    .print-modal-footer {
      display: flex;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #eee;
      justify-content: flex-end;
    }
    
    .print-modal-footer button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.2s;
    }
    
    .btn-cancel {
      background: #95a5a6;
      color: white;
    }
    
    .btn-cancel:hover {
      background: #7f8c8d;
    }
    
    .btn-export-pdf {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }
    
    .btn-export-pdf:hover {
      transform: translateY(-2px);
    }
    
    .btn-print {
      background: linear-gradient(135deg, #27ae60, #229954);
      color: white;
    }
    
    .btn-print:hover {
      transform: translateY(-2px);
    }
    
    .shortcuts-hint {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 0 0 15px 15px;
      font-size: 11px;
      color: #666;
    }
    
    .shortcuts-hint span {
      background: #e9ecef;
      padding: 3px 8px;
      border-radius: 4px;
    }
    
    /* ========== وضع الطباعة ========== */
    @media print {
      .printing-mode .fees-btn,
      .printing-mode .btn-certificates,
      .printing-mode .btn-new,
      .printing-mode .btn-stats,
      .printing-mode .btn-save,
      .printing-mode #certificateStatus,
      .printing-mode .popup-overlay,
      .printing-mode .modal-overlay,
      .printing-mode .btn-print-main,
      .printing-mode .btn-pdf-main,
      .printing-mode .floating-btn,
      .printing-mode #notification-container {
        display: none !important;
      }
      
      .page {
        page-break-after: always;
        margin: 0;
        padding: 0;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    /* ========== تأثير تحديث التاريخ ========== */
    .date-updated {
      animation: dateHighlight 2s ease;
    }
    
    @keyframes dateHighlight {
      0% { background-color: #fff3cd; }
      100% { background-color: transparent; }
    }
  `;
  
  document.head.appendChild(style);
}



// ========== تصدير الدوال للاستخدام الخارجي ==========
window.printDocument = printDocument;
window.exportToPDF = exportToPDF;
window.showPrintOptions = showPrintOptions;
window.closePrintOptions = closePrintOptions;
window.printFromModal = printFromModal;
window.exportFromModal = exportFromModal;
window.updatePrintPreview = updatePrintPreview;






// ========== نظام التحميل الأنيق ==========

// متغير لتتبع حالة التحميل
let loadingOverlay = null;
let loadingTimeout = null;

// ========== إنشاء عنصر التحميل ==========
function createLoadingOverlay() {
  if (loadingOverlay) return loadingOverlay;
  
  loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-container">
      <!-- الشكل الرئيسي -->
      <div class="loading-animation">
        <div class="loading-circle">
          <div class="loading-inner-circle"></div>
        </div>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <!-- النص -->
      <div class="loading-text">
        <span class="loading-title">جاري التحميل</span>
        <span class="loading-subtitle"></span>
      </div>
      
      <!-- شريط التقدم (اختياري) -->
      <div class="loading-progress-container" style="display: none;">
        <div class="loading-progress-bar">
          <div class="loading-progress-fill"></div>
        </div>
        <span class="loading-progress-text">0%</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(loadingOverlay);
  return loadingOverlay;
}

// ========== إظهار التحميل ==========
function showLoading(options = {}) {
  const {
    title = 'جاري التحميل',
    subtitle = '',
    showProgress = false,
    progress = 0,
    type = 'default', // 'default', 'print', 'pdf', 'save', 'search', 'delete'
    timeout = 30000 // الحد الأقصى للانتظار
  } = options;
  
  const overlay = createLoadingOverlay();
  
  // تحديث النصوص
  const titleEl = overlay.querySelector('.loading-title');
  const subtitleEl = overlay.querySelector('.loading-subtitle');
  const progressContainer = overlay.querySelector('.loading-progress-container');
  const container = overlay.querySelector('.loading-container');
  
  // إعداد النوع
  container.className = 'loading-container';
  container.classList.add(`loading-type-${type}`);
  
  // تحديث الأيقونة حسب النوع
  updateLoadingIcon(type);
  
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  
  // إظهار/إخفاء شريط التقدم
  progressContainer.style.display = showProgress ? 'block' : 'none';
  if (showProgress) {
    updateLoadingProgress(progress);
  }
  
  // إظهار الـ overlay
  overlay.classList.add('active');
  document.body.classList.add('loading-active');
  
  // Timeout للأمان
  if (loadingTimeout) clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    hideLoading();
    showNotification('⚠️ انتهت مهلة الانتظار', 'warning');
  }, timeout);
  
  return {
    updateTitle: (text) => { titleEl.textContent = text; },
    updateSubtitle: (text) => { subtitleEl.textContent = text; },
    updateProgress: (value) => updateLoadingProgress(value),
    hide: () => hideLoading()
  };
}

// ========== تحديث أيقونة التحميل ==========
function updateLoadingIcon(type) {
  const animation = loadingOverlay.querySelector('.loading-animation');
  
  const icons = {
    default: `
      <div class="loading-circle">
        <div class="loading-inner-circle"></div>
      </div>
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `,
    print: `
      <div class="loading-icon-container">
        <svg class="loading-icon print-icon" viewBox="0 0 24 24">
          <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
        </svg>
        <div class="loading-pulse"></div>
      </div>
    `,
    pdf: `
      <div class="loading-icon-container">
        <svg class="loading-icon pdf-icon" viewBox="0 0 24 24">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
        </svg>
        <div class="loading-pulse pdf-pulse"></div>
      </div>
    `,
    save: `
      <div class="loading-icon-container">
        <svg class="loading-icon save-icon" viewBox="0 0 24 24">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
        <div class="loading-checkmark">
          <svg viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      </div>
    `,
    search: `
      <div class="loading-icon-container">
        <svg class="loading-icon search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <div class="loading-radar"></div>
      </div>
    `,
    delete: `
      <div class="loading-icon-container">
        <svg class="loading-icon delete-icon" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <div class="loading-shake"></div>
      </div>
    `
  };
  
  animation.innerHTML = icons[type] || icons.default;
}

// ========== تحديث شريط التقدم ==========
function updateLoadingProgress(value) {
  if (!loadingOverlay) return;
  
  const fill = loadingOverlay.querySelector('.loading-progress-fill');
  const text = loadingOverlay.querySelector('.loading-progress-text');
  
  const percentage = Math.min(100, Math.max(0, value));
  
  if (fill) fill.style.width = `${percentage}%`;
  if (text) text.textContent = `${Math.round(percentage)}%`;
}

// ========== إخفاء التحميل ==========
function hideLoading() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  
  if (loadingOverlay) {
    loadingOverlay.classList.add('hiding');
    loadingOverlay.classList.remove('active');
    
    setTimeout(() => {
      loadingOverlay.classList.remove('hiding');
      document.body.classList.remove('loading-active');
    }, 300);
  }
}

// ========== دوال مساعدة للاستخدام السريع ==========
const Loading = {
  show: showLoading,
  hide: hideLoading,
  
  // طباعة
  print: (subtitle = '') => showLoading({
    title: 'جاري الطباعة',
    subtitle: subtitle || 'يرجى الانتظار...',
    type: 'print'
  }),
  
  // تصدير PDF
  pdf: (subtitle = '') => showLoading({
    title: 'جاري إنشاء PDF',
    subtitle: subtitle || 'يتم تجهيز الملف...',
    type: 'pdf',
    showProgress: true
  }),
  
  // حفظ
  save: (subtitle = '') => showLoading({
    title: 'جاري الحفظ',
    subtitle: subtitle || 'يتم حفظ البيانات...',
    type: 'save'
  }),
  
  // بحث
  search: (subtitle = '') => showLoading({
    title: 'جاري البحث',
    subtitle: subtitle || 'يتم البحث في الشهادات...',
    type: 'search'
  }),
  
  // حذف
  delete: (subtitle = '') => showLoading({
    title: 'جاري الحذف',
    subtitle: subtitle || 'يتم حذف البيانات...',
    type: 'delete'
  }),
  
  // تحميل بيانات
  data: (subtitle = '') => showLoading({
    title: 'جاري تحميل البيانات',
    subtitle: subtitle || 'يرجى الانتظار...',
    type: 'default'
  })
};

// ========== CSS للتحميل ==========
function addLoadingStyles() {
  const style = document.createElement('style');
  style.id = 'loading-styles';
  style.textContent = `
    /* ========== Overlay ========== */
    #loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    
    #loading-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    #loading-overlay.hiding {
      opacity: 0;
    }
    
    body.loading-active {
      overflow: hidden;
    }
    
    /* ========== Container ========== */
    .loading-container {
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 24px;
      padding: 40px 60px;
      text-align: center;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      animation: containerAppear 0.4s ease;
      direction: rtl;
      min-width: 300px;
    }
    
    @keyframes containerAppear {
      from {
        transform: scale(0.9) translateY(20px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    
    /* ========== Animation Container ========== */
    .loading-animation {
      margin-bottom: 24px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* ========== Default Circle Animation ========== */
    .loading-circle {
      width: 60px;
      height: 60px;
      border: 4px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      position: relative;
    }
    
    .loading-inner-circle {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      bottom: 8px;
      border: 3px solid #e2e8f0;
      border-bottom-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite reverse;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* ========== Dots Animation ========== */
    .loading-dots {
      position: absolute;
      display: flex;
      gap: 6px;
    }
    
    .loading-dots span {
      width: 8px;
      height: 8px;
      background: #6366f1;
      border-radius: 50%;
      animation: dotPulse 1.4s ease-in-out infinite;
    }
    
    .loading-dots span:nth-child(1) { animation-delay: 0s; }
    .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes dotPulse {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* ========== Icon Container ========== */
    .loading-icon-container {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .loading-icon {
      width: 48px;
      height: 48px;
      fill: #6366f1;
      animation: iconBounce 2s ease-in-out infinite;
      z-index: 2;
    }
    
    @keyframes iconBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    /* ========== Pulse Effect ========== */
    .loading-pulse {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.2);
      animation: pulse 1.5s ease-out infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        transform: scale(1.8);
        opacity: 0;
      }
    }
    
    /* ========== PDF Specific ========== */
    .loading-type-pdf .loading-icon {
      fill: #ef4444;
    }
    
    .pdf-pulse {
      background: rgba(239, 68, 68, 0.2);
    }
    
    /* ========== Print Specific ========== */
    .loading-type-print .loading-icon {
      fill: #3b82f6;
      animation: printAnimation 1.5s ease-in-out infinite;
    }
    
    @keyframes printAnimation {
      0%, 100% { transform: translateY(0); }
      25% { transform: translateY(-5px); }
      50% { transform: translateY(0); }
      75% { transform: translateY(5px); }
    }
    
    /* ========== Save Specific ========== */
    .loading-type-save .loading-icon {
      fill: #10b981;
    }
    
    .loading-checkmark {
      position: absolute;
      width: 24px;
      height: 24px;
      bottom: 5px;
      right: 5px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0);
      animation: checkAppear 2s ease-in-out infinite;
    }
    
    .loading-checkmark svg {
      width: 14px;
      height: 14px;
      fill: white;
    }
    
    @keyframes checkAppear {
      0%, 60% { opacity: 0; transform: scale(0); }
      70% { opacity: 1; transform: scale(1.2); }
      80%, 100% { opacity: 1; transform: scale(1); }
    }
    
    /* ========== Search Specific ========== */
    .loading-type-search .loading-icon {
      fill: #8b5cf6;
      animation: searchMove 2s ease-in-out infinite;
    }
    
    @keyframes searchMove {
      0%, 100% { transform: translateX(0) translateY(0); }
      25% { transform: translateX(5px) translateY(-5px); }
      50% { transform: translateX(-5px) translateY(5px); }
      75% { transform: translateX(5px) translateY(5px); }
    }
    
    .loading-radar {
      position: absolute;
      width: 70px;
      height: 70px;
      border: 2px solid rgba(139, 92, 246, 0.3);
      border-radius: 50%;
      animation: radar 1.5s ease-out infinite;
    }
    
    @keyframes radar {
      0% {
        transform: scale(0.5);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
    
    /* ========== Delete Specific ========== */
    .loading-type-delete .loading-icon {
      fill: #f43f5e;
      animation: shake 0.5s ease-in-out infinite;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-3px) rotate(-3deg); }
      75% { transform: translateX(3px) rotate(3deg); }
    }
    
    /* ========== Text ========== */
    .loading-text {
      margin-bottom: 20px;
    }
    
    .loading-title {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
      font-family: 'Cairo', 'Segoe UI', sans-serif;
    }
    
    .loading-subtitle {
      display: block;
      font-size: 14px;
      color: #64748b;
      font-family: 'Cairo', 'Segoe UI', sans-serif;
    }
    
    /* ========== Progress Bar ========== */
    .loading-progress-container {
      margin-top: 16px;
    }
    
    .loading-progress-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .loading-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7);
      background-size: 200% 100%;
      border-radius: 10px;
      transition: width 0.3s ease;
      animation: progressShine 2s ease-in-out infinite;
    }
    
    @keyframes progressShine {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .loading-progress-text {
      font-size: 12px;
      color: #6366f1;
      font-weight: 600;
    }
    
    /* ========== Type Colors ========== */
    .loading-type-print .loading-circle { border-top-color: #3b82f6; }
    .loading-type-print .loading-inner-circle { border-bottom-color: #60a5fa; }
    .loading-type-print .loading-dots span { background: #3b82f6; }
    
    .loading-type-pdf .loading-circle { border-top-color: #ef4444; }
    .loading-type-pdf .loading-inner-circle { border-bottom-color: #f87171; }
    .loading-type-pdf .loading-dots span { background: #ef4444; }
    .loading-type-pdf .loading-progress-fill { background: linear-gradient(90deg, #ef4444, #f87171, #fca5a5); }
    
    .loading-type-save .loading-circle { border-top-color: #10b981; }
    .loading-type-save .loading-inner-circle { border-bottom-color: #34d399; }
    .loading-type-save .loading-dots span { background: #10b981; }
    
    .loading-type-search .loading-circle { border-top-color: #8b5cf6; }
    .loading-type-search .loading-inner-circle { border-bottom-color: #a78bfa; }
    .loading-type-search .loading-dots span { background: #8b5cf6; }
    
    .loading-type-delete .loading-circle { border-top-color: #f43f5e; }
    .loading-type-delete .loading-inner-circle { border-bottom-color: #fb7185; }
    .loading-type-delete .loading-dots span { background: #f43f5e; }
    
    /* ========== Responsive ========== */
    @media (max-width: 480px) {
      .loading-container {
        padding: 30px 40px;
        margin: 20px;
        min-width: auto;
      }
      
      .loading-icon {
        width: 40px;
        height: 40px;
      }
      
      .loading-title {
        font-size: 18px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// ========== تهيئة النظام ==========
function initLoadingSystem() {
  addLoadingStyles();
  createLoadingOverlay();
}


// ========== تصدير للاستخدام العام ==========
window.Loading = Loading;
window.showLoading = showLoading;
window.hideLoading = hideLoading;



// ========== البحث المتقدم ==========

let advancedSearchOpen = false;
let lastSearchResults = [];

// ========== فتح/إغلاق البحث المتقدم ==========
function toggleAdvancedSearch() {
  advancedSearchOpen = !advancedSearchOpen;
  const panel = document.getElementById('advancedSearchPanel');
  const btn = document.getElementById('btnToggleAdvanced');
  
  if (advancedSearchOpen) {
    panel.classList.add('active');
    btn.textContent = '⬆️ إخفاء البحث المتقدم';
  } else {
    panel.classList.remove('active');
    btn.textContent = '⚙️ بحث متقدم';
  }
}

// ========== تنفيذ البحث المتقدم ==========
async function performAdvancedSearch() {
  const loader = Loading.search();
  
  try {
    // جمع معايير البحث
    const criteria = {
      quickSearch: document.getElementById('searchCerts')?.value.trim(),
      activity: document.getElementById('searchActivity')?.value.trim(),
      name: document.getElementById('searchName')?.value.trim(),
      location: document.getElementById('searchLocation')?.value.trim(),
      fromDate: document.getElementById('searchFromDate')?.value,
      toDate: document.getElementById('searchToDate')?.value,
      minAmount: parseInt(document.getElementById('searchMinAmount')?.value) || null,
      maxAmount: parseInt(document.getElementById('searchMaxAmount')?.value) || null,
      modifiedStatus: document.getElementById('searchModifiedStatus')?.value,
      userName: document.getElementById('searchUserName')?.value.trim()
    };
    
    // جلب كل الشهادات
    let certs = await window.electronAPI.certificates.getAll({ status: 'active' });
    
    // تطبيق الفلاتر
    certs = filterCertificates(certs, criteria);
    
    // حفظ النتائج
    lastSearchResults = certs;
    
    // عرض النتائج
    renderCertificatesList(certs);
    
    // عرض ملخص البحث
    showSearchSummary(certs.length, criteria);
    
  } catch (err) {
    console.error('خطأ في البحث:', err);
    showNotification('❌ حدث خطأ أثناء البحث', 'error');
  } finally {
    loader.hide();
  }
}

// ========== فلترة الشهادات ==========
function filterCertificates(certs, criteria) {
  return certs.filter(cert => {
    // البحث السريع
    if (criteria.quickSearch) {
      const searchLower = criteria.quickSearch.toLowerCase();
      const matchQuick = 
        (cert.name?.toLowerCase().includes(searchLower)) ||
        (cert.activity?.toLowerCase().includes(searchLower)) ||
        (cert.location?.toLowerCase().includes(searchLower));
      if (!matchQuick) return false;
    }
    
    // البحث بالنشاط
    if (criteria.activity) {
      if (!cert.activity?.toLowerCase().includes(criteria.activity.toLowerCase())) {
        return false;
      }
    }
    
    // البحث بالاسم
    if (criteria.name) {
      if (!cert.name?.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
    }
    
    // البحث بالعنوان
    if (criteria.location) {
      if (!cert.location?.toLowerCase().includes(criteria.location.toLowerCase())) {
        return false;
      }
    }
    
    // الفترة الزمنية
    if (criteria.fromDate) {
      const fromTimestamp = new Date(criteria.fromDate).setHours(0, 0, 0, 0);
      if (cert.created_at < fromTimestamp) return false;
    }
    
    if (criteria.toDate) {
      const toTimestamp = new Date(criteria.toDate).setHours(23, 59, 59, 999);
      if (cert.created_at > toTimestamp) return false;
    }
    
    // نطاق المبلغ
    if (criteria.minAmount !== null) {
      if ((cert.grand_total || 0) < criteria.minAmount) return false;
    }
    
    if (criteria.maxAmount !== null) {
      if ((cert.grand_total || 0) > criteria.maxAmount) return false;
    }
    
    // حالة التعديل
    if (criteria.modifiedStatus === 'original') {
      if (cert.is_modified) return false;
    } else if (criteria.modifiedStatus === 'modified') {
      if (!cert.is_modified) return false;
    }
    
    // المستخدم
    if (criteria.userName) {
      if (!cert.user_name?.toLowerCase().includes(criteria.userName.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

// ========== عرض ملخص البحث ==========
function showSearchSummary(count, criteria) {
  const summary = document.getElementById('searchSummary');
  if (!summary) return;
  
  // بناء قائمة الفلاتر النشطة
  const activeFilters = [];
  
  if (criteria.quickSearch) activeFilters.push(`بحث: "${criteria.quickSearch}"`);
  if (criteria.activity) activeFilters.push(`النشاط: ${criteria.activity}`);
  if (criteria.name) activeFilters.push(`الاسم: ${criteria.name}`);
  if (criteria.location) activeFilters.push(`العنوان: ${criteria.location}`);
  if (criteria.fromDate) activeFilters.push(`من: ${criteria.fromDate}`);
  if (criteria.toDate) activeFilters.push(`إلى: ${criteria.toDate}`);
  if (criteria.minAmount) activeFilters.push(`الحد الأدنى: ${toArabicNumber(criteria.minAmount)} ج`);
  if (criteria.maxAmount) activeFilters.push(`الحد الأقصى: ${toArabicNumber(criteria.maxAmount)} ج`);
  if (criteria.modifiedStatus === 'original') activeFilters.push('أصلية فقط');
  if (criteria.modifiedStatus === 'modified') activeFilters.push('معدلة فقط');
  if (criteria.userName) activeFilters.push(`المستخدم: ${criteria.userName}`);
  
  if (activeFilters.length === 0) {
    summary.innerHTML = `<span class="summary-count">📊 عدد النتائج: ${toArabicNumber(count)} شهادة</span>`;
  } else {
    summary.innerHTML = `
      <span class="summary-count">📊 عدد النتائج: ${toArabicNumber(count)} شهادة</span>
      <span class="summary-filters">الفلاتر: ${activeFilters.join(' • ')}</span>
    `;
  }
  
  summary.style.display = 'block';
}

// ========== مسح الفلاتر ==========
async function clearAdvancedSearch() {
  // مسح كل الحقول
  document.getElementById('searchCerts').value = '';
  document.getElementById('searchActivity').value = '';
  document.getElementById('searchName').value = '';
  document.getElementById('searchLocation').value = '';
  document.getElementById('searchFromDate').value = '';
  document.getElementById('searchToDate').value = '';
  document.getElementById('searchMinAmount').value = '';
  document.getElementById('searchMaxAmount').value = '';
  document.getElementById('searchModifiedStatus').value = '';
  document.getElementById('searchUserName').value = '';
  
  // إخفاء الملخص
  const summary = document.getElementById('searchSummary');
  if (summary) summary.style.display = 'none';
  
  // إعادة تحميل كل الشهادات
  await showCertificatesList();
  
  showNotification('✅ تم مسح الفلاتر');
}

// ========== تصدير نتائج البحث ==========
async function exportSearchResults() {
  if (lastSearchResults.length === 0) {
    showNotification('⚠️ لا توجد نتائج للتصدير', 'warning');
    return;
  }
  
  const loader = Loading.data('يتم تجهيز التصدير...');
  
  try {
    // تحويل البيانات لـ CSV
    const headers = ['#', 'النشاط', 'الاسم', 'العنوان', 'عدد الأفراد', 'المساحة', 'إجمالي المحافظة', 'إجمالي الوزارة', 'الحالة', 'تاريخ الإنشاء', 'المستخدم'];
    
    let csv = '\ufeff'; // BOM for UTF-8
    csv += headers.join(',') + '\n';
    
    lastSearchResults.forEach((cert, index) => {
      const row = [
        index + 1,
        `"${cert.activity || ''}"`,
        `"${cert.name || ''}"`,
        `"${cert.location || ''}"`,
        cert.persons_count || 0,
        cert.area || 0,
        cert.grand_total || 0,
        cert.ministry_total || 0,
        cert.is_modified ? 'معدلة' : 'أصلية',
        `"${formatDate(cert.created_at)}"`,
        `"${cert.user_name || ''}"`
      ];
      csv += row.join(',') + '\n';
    });
    
    // تحميل الملف
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نتائج_البحث_${formatDateForFileName()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`✅ تم تصدير ${toArabicNumber(lastSearchResults.length)} شهادة`);
  } catch (err) {
    console.error('Export error:', err);
    showNotification('❌ حدث خطأ أثناء التصدير', 'error');
  } finally {
    loader.hide();
  }
}

// ========== تحديث searchCertificatesUI لدعم البحث السريع ==========
async function searchCertificatesUI() {
  const searchTerm = document.getElementById('searchCerts').value.trim();
  
  // إذا البحث المتقدم مفتوح، استخدم performAdvancedSearch
  if (advancedSearchOpen) {
    await performAdvancedSearch();
    return;
  }
  
  const loader = Loading.search();
  
  try {
    let certs;
    if (searchTerm) {
      certs = await window.electronAPI.certificates.search(searchTerm);
    } else {
      certs = await window.electronAPI.certificates.getAll({ status: 'active' });
    }
    
    lastSearchResults = certs;
    renderCertificatesList(certs);
    
    // عرض ملخص بسيط
    const summary = document.getElementById('searchSummary');
    if (summary) {
      if (searchTerm) {
        summary.innerHTML = `<span class="summary-count">📊 نتائج البحث عن "${searchTerm}": ${toArabicNumber(certs.length)} شهادة</span>`;
        summary.style.display = 'block';
      } else {
        summary.style.display = 'none';
      }
    }
    
  } catch (err) {
    console.error('Search error:', err);
    showNotification('❌ حدث خطأ أثناء البحث', 'error');
  } finally {
    loader.hide();
  }
}



// ========== نظام الاقتراحات التلقائية (Autocomplete) ==========


let suggestionsCache = {
  activities: [],
  names: [],
  locations: [],
  lastUpdate: null
};

// ========== تحميل الاقتراحات من قاعدة البيانات ==========
async function loadSuggestionsCache() {
  try {
    const certs = await window.electronAPI.certificates.getAll({ status: 'active' });
    
    // استخراج القيم الفريدة
    const activitiesSet = new Set();
    const namesSet = new Set();
    const locationsSet = new Set();
    
    certs.forEach(cert => {
      if (cert.activity) activitiesSet.add(cert.activity.replace(/\.$/, '').trim());
      if (cert.name) namesSet.add(cert.name.replace(/\.$/, '').trim());
      if (cert.location) locationsSet.add(cert.location.replace(/\.$/, '').trim());
    });
    
    suggestionsCache = {
      activities: Array.from(activitiesSet).sort(),
      names: Array.from(namesSet).sort(),
      locations: Array.from(locationsSet).sort(),
      lastUpdate: Date.now()
    };
    
    // console.log('تم تحميل الاقتراحات:', {
    //   activities: suggestionsCache.activities.length,
    //   names: suggestionsCache.names.length,
    //   locations: suggestionsCache.locations.length
    // });
    
  } catch (err) {
    console.error('خطأ في تحميل الاقتراحات:', err);
  }
}

// ========== تحويل الأرقام للمقارنة (موحد) ==========
function normalizeNumbers(text) {
  if (!text) return '';
  
  // تحويل الأرقام العربية لإنجليزية للمقارنة
  const arabicToEnglish = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  return text.replace(/[٠-٩]/g, d => arabicToEnglish[d]);
}

// ========== البحث في الاقتراحات ==========
function searchSuggestions(query, type) {
  if (!query || query.length < 2) return [];
  
  const list = suggestionsCache[type] || [];
  const normalizedQuery = normalizeNumbers(query.toLowerCase());
  
  // البحث مع تطبيع الأرقام
  const matches = list.filter(item => {
    const normalizedItem = normalizeNumbers(item.toLowerCase());
    return normalizedItem.includes(normalizedQuery);
  });
  
  // ترتيب النتائج - الأكثر تطابقاً أولاً
  matches.sort((a, b) => {
    const aLower = normalizeNumbers(a.toLowerCase());
    const bLower = normalizeNumbers(b.toLowerCase());
    
    // الأولوية للي بيبدأ بالنص
    const aStarts = aLower.startsWith(normalizedQuery);
    const bStarts = bLower.startsWith(normalizedQuery);
    
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    return a.length - b.length; // الأقصر أولاً
  });
  
  return matches.slice(0, 8); // أقصى 8 اقتراحات
}

// ========== إنشاء عنصر الاقتراحات ==========
function createSuggestionsDropdown(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // التحقق من عدم وجود dropdown مسبقاً
  let dropdown = document.getElementById(`${inputId}-suggestions`);
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = `${inputId}-suggestions`;
    dropdown.className = 'suggestions-dropdown';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(dropdown);
  }
  
  return dropdown;
}

// ========== عرض الاقتراحات ==========
function showSuggestions(inputId, suggestions) {
  const dropdown = document.getElementById(`${inputId}-suggestions`);
  if (!dropdown) return;
  
  if (suggestions.length === 0) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
    return;
  }
  
  const input = document.getElementById(inputId);
  const currentValue = input.value.toLowerCase();
  
  dropdown.innerHTML = suggestions.map((item, index) => {
    // تمييز النص المطابق
    const normalizedItem = normalizeNumbers(item.toLowerCase());
    const normalizedQuery = normalizeNumbers(currentValue);
    const matchIndex = normalizedItem.indexOf(normalizedQuery);
    
    let highlightedText = item;
    if (matchIndex !== -1) {
      const before = item.substring(0, matchIndex);
      const match = item.substring(matchIndex, matchIndex + currentValue.length);
      const after = item.substring(matchIndex + currentValue.length);
      highlightedText = `${before}<mark>${match}</mark>${after}`;
    }
    
    return `<div class="suggestion-item" data-index="${index}" data-value="${item}">${highlightedText}</div>`;
  }).join('');
  
  dropdown.classList.add('active');
}

// ========== إخفاء الاقتراحات ==========
function hideSuggestions(inputId) {
  const dropdown = document.getElementById(`${inputId}-suggestions`);
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

// ========== تفعيل الاقتراحات على حقل ==========
function setupAutocomplete(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // ⭐ منع التهيئة المتكررة
  if (input.dataset.autocompleteInitialized === 'true') {
    return;
  }
  input.dataset.autocompleteInitialized = 'true';
  
  const dropdown = createSuggestionsDropdown(inputId);
  if (!dropdown) return;
  
  let selectedIndex = -1;

  // Document click handler
  const documentClickHandler = function(e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      hideSuggestions(inputId);
      selectedIndex = -1;
    }
  };
  
  // حفظ الـ handler للإزالة عند الحاجة
  input._autocompleteDocumentHandler = documentClickHandler;
  document.addEventListener('click', documentClickHandler);
  
  // Debounced search
  const debouncedSearch = debounce(function(query) {
    const suggestions = searchSuggestions(query, type);
    showSuggestions(inputId, suggestions);
  }, 150);
  
  // عند الكتابة
  input.addEventListener('input', function() {
    selectedIndex = -1;
    const query = this.value.trim();
    
    if (query.length < 2) {
      hideSuggestions(inputId);
      return;
    }
    
    debouncedSearch(query);
  });
  
  // عند التركيز
  input.addEventListener('focus', function() {
    const query = this.value.trim();
    if (query.length >= 2) {
      const suggestions = searchSuggestions(query, type);
      showSuggestions(inputId, suggestions);
    }
  });
  
  // التنقل بالأسهم
  input.addEventListener('keydown', function(e) {
    if (!dropdown.classList.contains('active')) return;
    
    const items = dropdown.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items, selectedIndex);
        break;
        
      case 'Enter':
        if (selectedIndex >= 0 && items[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          selectSuggestion(inputId, items[selectedIndex].dataset.value);
          selectedIndex = -1;
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        hideSuggestions(inputId);
        selectedIndex = -1;
        break;
        
      case 'Tab':
        hideSuggestions(inputId);
        selectedIndex = -1;
        break;
    }
  });
  
  // النقر على اقتراح
  dropdown.addEventListener('click', function(e) {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      selectSuggestion(inputId, item.dataset.value);
      selectedIndex = -1;
    }
  });
}

// ⭐ دالة debounce (إذا غير موجودة)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };


// استخدام
const debouncedSearch = debounce(function(inputId, query, type) {
    const currentSuggestions = searchSuggestions(query, type);
    showSuggestions(inputId, currentSuggestions);
}, 150);

input.addEventListener('input', function() {
    const query = this.value.trim();
    if (query.length < 2) {
        hideSuggestions(inputId);
        return;
    }
    debouncedSearch(inputId, query, type);
});

  
  // عند التركيز
  input.addEventListener('focus', function() {
    if (this.value.trim().length >= 2) {
      currentSuggestions = searchSuggestions(this.value.trim(), type);
      showSuggestions(inputId, currentSuggestions);
    }
  });
  
  // التنقل بالأسهم
  input.addEventListener('keydown', function(e) {
    const dropdown = document.getElementById(`${inputId}-suggestions`);
    if (!dropdown || !dropdown.classList.contains('active')) return;
    
    const items = dropdown.querySelectorAll('.suggestion-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items, selectedIndex);
        break;
        
      case 'Enter':
        if (selectedIndex >= 0 && items[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(inputId, items[selectedIndex].dataset.value);
        }
        break;
        
      case 'Escape':
        hideSuggestions(inputId);
        selectedIndex = -1;
        break;
    }
  });


 
  
  // النقر على اقتراح
  const dropdown = document.getElementById(`${inputId}-suggestions`);
  dropdown.addEventListener('click', function(e) {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      selectSuggestion(inputId, item.dataset.value);
    }
  });
  
  // إخفاء عند النقر خارج
  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      hideSuggestions(inputId);
    }
  });
}

// ========== تحديث التحديد ==========
function updateSelection(items, index) {
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
  
  // التمرير للعنصر المحدد
  if (index >= 0 && items[index]) {
    items[index].scrollIntoView({ block: 'nearest' });
  }
}

// ========== اختيار اقتراح ==========
function selectSuggestion(inputId, value) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
    input.dispatchEvent(new Event('input')); // تفعيل تحويل الأرقام
    hideSuggestions(inputId);
    input.focus();
  }
}

// ========== تحديث البحث المتقدم ليدعم الأرقام ==========
function filterCertificates(certs, criteria) {
  return certs.filter(cert => {
    // البحث السريع - مع تطبيع الأرقام
    if (criteria.quickSearch) {
      const searchNormalized = normalizeNumbers(criteria.quickSearch.toLowerCase());
      const matchQuick = 
        normalizeNumbers(cert.name?.toLowerCase() || '').includes(searchNormalized) ||
        normalizeNumbers(cert.activity?.toLowerCase() || '').includes(searchNormalized) ||
        normalizeNumbers(cert.location?.toLowerCase() || '').includes(searchNormalized);
      if (!matchQuick) return false;
    }
    
    // البحث بالنشاط - مع تطبيع الأرقام
    if (criteria.activity) {
      const activityNormalized = normalizeNumbers(criteria.activity.toLowerCase());
      if (!normalizeNumbers(cert.activity?.toLowerCase() || '').includes(activityNormalized)) {
        return false;
      }
    }
    
    // البحث بالاسم - مع تطبيع الأرقام
    if (criteria.name) {
      const nameNormalized = normalizeNumbers(criteria.name.toLowerCase());
      if (!normalizeNumbers(cert.name?.toLowerCase() || '').includes(nameNormalized)) {
        return false;
      }
    }
    
    // البحث بالعنوان - مع تطبيع الأرقام ⭐ هنا الحل
    if (criteria.location) {
      const locationNormalized = normalizeNumbers(criteria.location.toLowerCase());
      if (!normalizeNumbers(cert.location?.toLowerCase() || '').includes(locationNormalized)) {
        return false;
      }
    }
    
    // الفترة الزمنية
    if (criteria.fromDate) {
      const fromTimestamp = new Date(criteria.fromDate).setHours(0, 0, 0, 0);
      if (cert.created_at < fromTimestamp) return false;
    }
    
    if (criteria.toDate) {
      const toTimestamp = new Date(criteria.toDate).setHours(23, 59, 59, 999);
      if (cert.created_at > toTimestamp) return false;
    }
    
    // نطاق المبلغ
    if (criteria.minAmount !== null) {
      if ((cert.grand_total || 0) < criteria.minAmount) return false;
    }
    
    if (criteria.maxAmount !== null) {
      if ((cert.grand_total || 0) > criteria.maxAmount) return false;
    }
    
    // حالة التعديل
    if (criteria.modifiedStatus === 'original') {
      if (cert.is_modified) return false;
    } else if (criteria.modifiedStatus === 'modified') {
      if (!cert.is_modified) return false;
    }
    
    // المستخدم
    if (criteria.userName) {
      if (!cert.user_name?.toLowerCase().includes(criteria.userName.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

// ========== تحديث searchCertificates في db.js أيضاً ==========
// هذا يحتاج تعديل في ملف db.js - أضف هذه الدالة
function searchCertificatesNormalized(searchTerm) {
  // تحويل الأرقام الإنجليزية لعربية والعكس للبحث
  const normalizedTerm = normalizeNumbers(searchTerm.toLowerCase());
  
  // البحث في كل الحقول
  const stmt = db.prepare(`
    SELECT * FROM certificates 
    WHERE status = 'active'
    AND (
      LOWER(activity) LIKE ? OR
      LOWER(name) LIKE ? OR
      LOWER(location) LIKE ?
    )
    ORDER BY created_at DESC
  `);
  
  const pattern = `%${searchTerm}%`;
  return stmt.all(pattern, pattern, pattern);
}

// ========== CSS للاقتراحات ==========
function addAutocompleteStyles() {
  const style = document.createElement('style');
  style.id = 'autocomplete-styles';
  style.textContent = `
    /* ========== Suggestions Dropdown ========== */
    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #667eea;
      border-top: none;
      border-radius: 0 0 10px 10px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
      display: none;
    }
    
    .suggestions-dropdown.active {
      display: block;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .suggestion-item {
      padding: 12px 15px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      transition: all 0.15s ease;
      direction: rtl;
      text-align: right;
    }
    
    .suggestion-item:last-child {
      border-bottom: none;
    }
    
    .suggestion-item:hover,
    .suggestion-item.selected {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    }
    
    .suggestion-item.selected {
      background: linear-gradient(135deg, #667eea25 0%, #764ba225 100%);
      border-right: 3px solid #667eea;
    }
    
    .suggestion-item mark {
      background: #fef08a;
      color: inherit;
      padding: 0 2px;
      border-radius: 3px;
    }
    
    /* ========== تحسين حقول الإدخال ========== */
    .input-with-suggestions {
      position: relative;
    }
    
    .input-with-suggestions input {
      width: 100%;
    }
    
    /* ========== أيقونة البحث في الحقل ========== */
    .input-with-icon {
      position: relative;
    }
    
    .input-with-icon::after {
      content: '🔍';
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.5;
      pointer-events: none;
    }
    
    /* ========== تلميح الاقتراحات ========== */
    .suggestions-hint {
      padding: 8px 15px;
      background: #f8f9fa;
      color: #666;
      font-size: 12px;
      text-align: center;
      border-bottom: 1px solid #eee;
    }
    
    /* ========== Scrollbar للاقتراحات ========== */
    .suggestions-dropdown::-webkit-scrollbar {
      width: 6px;
    }
    
    .suggestions-dropdown::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .suggestions-dropdown::-webkit-scrollbar-thumb {
      background: #667eea;
      border-radius: 3px;
    }
    
    .suggestions-dropdown::-webkit-scrollbar-thumb:hover {
      background: #764ba2;
    }
  `;
  
  document.head.appendChild(style);
}


// ========== تهيئة النظام ==========
async function initAutocompleteSystem() {
  // إضافة الـ CSS
  addAutocompleteStyles();
  
  // تحميل الاقتراحات
  await loadSuggestionsCache();
  
  
  // تفعيل الاقتراحات على حقول البحث المتقدم
  setupAutocomplete('searchActivity', 'activities');
  setupAutocomplete('searchName', 'names');
  setupAutocomplete('searchLocation', 'locations');
}

// ========== تحديث الاقتراحات بعد حفظ شهادة ==========
async function refreshSuggestionsAfterSave() {
  // تحديث الـ cache بعد 500ms
  setTimeout(async () => {
    await loadSuggestionsCache();
  }, 500);
}

// ========== تحديث saveCertificate لتحديث الاقتراحات ==========
async function saveCertificateWithSuggestions() {
  await saveCertificate();
  
  // تحديث الاقتراحات بعد الحفظ
  setTimeout(async () => {
    await loadSuggestionsCache();
  }, 500);
}



// ========== التهيئة الرئيسية ==========
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 0. التحقق من الـ API
    const apiReady = await checkAPIReady();
    if (!apiReady) {
      console.warn('التطبيق يعمل بدون قاعدة بيانات');
    }
    
    // 1. تهيئة نظام التحميل أولاً
    initLoadingSystem();
    
    // 2. تحميل التواريخ
    loadPageDates();
    updateFeesButtonText();

    const hasAnyDate = Object.values(pageDates).some(d => d !== null);
    if (!hasAnyDate) {
      initializeAllDates();
    }

    
    
    // 3. تحويل الأرقام العربية
    setupArabicNumberInputs();
    
    // 4. تعديل حجم الخط
    adjustFieldValueFontSize();
  window.addEventListener('resize', adjustFieldValueFontSize);
    
    // 5. تحميل اسم المستخدم
    const savedUserName = loadUserName();
    if (savedUserName) {
      updateUserNameDisplay(savedUserName);
    }
    
    // 6. حفظ اسم المستخدم تلقائياً
    const userNameInput = document.getElementById('inputUserName');
    if (userNameInput) {
      userNameInput.addEventListener('input', debounce(function() {
        const name = this.value.trim();
        if (name) saveUserName(name);
      }, 500));
    }
    
    // 7. معاينة لحظية
    const calcFields = ['inputPersons', 'inputConsultant', 'inputEvacuation', 'inputInspection', 'inputArea'];
    calcFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', debounce(updateCalcPreview, 100));
      }
    });
    
    // 8. إغلاق بالضغط خارج الـ Popup
    setupPopupHandlers();
    
    // 9. تهيئة نظام الطباعة
    initPrintSystem();
    
    // 10. تهيئة نظام الاقتراحات
    if (apiReady) {
      await initAutocompleteSystem();
    }
    addValidationStyles();
    // 11. تفعيل الاختصارات (الأهم!)
    setupKeyboardShortcuts();

    console.log('✅ تم تهيئة التطبيق بنجاح');
    console.log('📌 الاختصارات: Ctrl+S (حفظ), Ctrl+N (جديد), Ctrl+P (طباعة), Ctrl+E (PDF), Ctrl+F (بحث)');
    
    console.log('✅ تم تهيئة التطبيق بنجاح');
    
  } catch (err) {
    console.error('خطأ في تهيئة التطبيق:', err);
    showNotification('❌ حدث خطأ أثناء تهيئة التطبيق', 'error');
  }
});


function setupPopupHandlers() {
  const popupOverlay = document.getElementById('popupOverlay');
  if (!popupOverlay) return;
  
  popupOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeFeesPopup();
  });
  
  popupOverlay.addEventListener('keydown', function(e) {
    if (!popupOverlay.classList.contains('active')) return;
    
    // تجاهل Enter إذا كان هناك اقتراح مفتوح
    const activeSuggestion = document.querySelector('.suggestions-dropdown.active');
    if (activeSuggestion && e.key === 'Enter') return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== 'BUTTON') {
        e.preventDefault();
        applyChanges();
      }
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      closeFeesPopup();
    }
  });
}

// ========== تحسينات إضافية ==========

// 1. إضافة مؤشر للاختصارات النشطة
function showShortcutsHint() {
  const hint = document.createElement('div');
  hint.className = 'shortcuts-floating-hint';
  hint.innerHTML = `
    <div class="shortcut-item">Ctrl+S حفظ</div>
    <div class="shortcut-item">Ctrl+N جديد</div>
    <div class="shortcut-item">Ctrl+P طباعة</div>
    <div class="shortcut-item">Ctrl+F بحث</div>
  `;
  document.body.appendChild(hint);
  
  // إخفاء بعد 5 ثواني
  setTimeout(() => hint.classList.add('fade-out'), 5000);
  setTimeout(() => hint.remove(), 5500);
}

// 2. تحسين الأداء - تجنب Memory Leaks
function cleanupOnUnload() {
  window.addEventListener('beforeunload', () => {
    // إزالة كل الـ event listeners
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    
    // تنظيف الاقتراحات
    ['inputActivity', 'inputName', 'inputLocation', 
     'searchActivity', 'searchName', 'searchLocation'].forEach(id => {
      cleanupAutocomplete(id);
    });
  });
}

// 3. التحقق من الأخطاء بشكل أفضل
function safeExecute(fn, fallbackMessage = 'حدث خطأ') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      console.error(`Error in ${fn.name}:`, err);
      showNotification(`❌ ${fallbackMessage}`, 'error');
    }
  };
}

// استخدام:
// saveCertificate = safeExecute(saveCertificate, 'حدث خطأ أثناء الحفظ');



async function saveCertificateWithRefresh() {
    await saveCertificate();
    await refreshSuggestionsAfterSave();
}


// ========== تصدير الدوال ==========
window.loadSuggestionsCache = loadSuggestionsCache;
window.normalizeNumbers = normalizeNumbers;





