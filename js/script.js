"use strict";

// ========== التكوين العام ==========
const CONFIG = Object.freeze({
  DEBOUNCE_DELAY: 150,
  NOTIFICATION_DURATION: 4000,
  LOADING_TIMEOUT: 30000,
  MAX_SUGGESTIONS: 8,
  MIN_SEARCH_LENGTH: 2,
  AUTO_SAVE_DELAY: 500,

  // رسوم التدريب
  TRAINING_RATE_SMALL: 500, // <= 10 أفراد
  TRAINING_RATE_LARGE: 600, // > 10 أفراد

  // رسوم الوزارة
  MINISTRY_RATE_SMALL: 150,
  MINISTRY_RATE_LARGE: 200,

  // الحد الفاصل لعدد الأفراد
  PERSONS_THRESHOLD: 10,
});

// ========== حالة التطبيق المركزية ==========
const AppState = {
  // بيانات الشهادة الحالية
  certificate: {
    id: null,
    personsCount: 10,
    consultantFee: 10000,
    evacuationFee: 10000,
    inspectionFee: 10000,
    area: 318,
  },

  // البيانات الأصلية للمقارنة
  originalData: null,

  // تواريخ الصفحات
  pageDates: {
    governorate: null,
    training: null,
    ministry: null,
    certificate: null,
    decision: null,
  },

  // حالة الواجهة
  ui: {
    isPrinting: false,
    isLoading: false,
    advancedSearchOpen: false,
    numberConversionMode: "arabic",
  },

  // Cache
  cache: {
    suggestions: {
      activities: [],
      names: [],
      locations: [],
      lastUpdate: null,
    },
    lastSearchResults: [],
  },

  // تتبع الـ Event Listeners للتنظيف
  eventListeners: new Map(),

  // Methods
  reset() {
    this.certificate = {
      id: null,
      personsCount: 10,
      consultantFee: 10000,
      evacuationFee: 10000,
      inspectionFee: 10000,
      area: 318,
    };
    this.originalData = null;
  },

  save() {
    try {
      localStorage.setItem(
        "appState",
        JSON.stringify({
          pageDates: this.pageDates,
          userName: this.certificate.userName,
        })
      );
    } catch (e) {
      console.error("Failed to save app state:", e);
    }
  },

  load() {
    try {
      const saved = localStorage.getItem("appState");
      if (saved) {
        const data = JSON.parse(saved);
        Object.assign(this.pageDates, data.pageDates || {});
      }
    } catch (e) {
      console.error("Failed to load app state:", e);
    }
  },
};

// ========== نظام التراجع والإعادة (Undo/Redo) ==========
const UndoRedoSystem = {
  undoStack: [],
  redoStack: [],
  maxHistory: 50, // الحد الأقصى للسجل
  isPerformingAction: false, // منع التكرار أثناء الـ undo/redo

  // حفظ الحالة الحالية
  saveState(state, actionName = '') {
    if (this.isPerformingAction) return;

    // إنشاء نسخة عميقة من الحالة
    const stateCopy = JSON.parse(JSON.stringify(state));
    stateCopy._actionName = actionName;
    stateCopy._timestamp = Date.now();

    this.undoStack.push(stateCopy);

    // حذف القديم إذا تجاوزنا الحد
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // مسح الـ redo stack عند إضافة حالة جديدة
    this.redoStack = [];

    this.updateUI();
  },

  // التراجع
  undo(getCurrentState, applyState) {
    if (!this.canUndo()) return null;

    this.isPerformingAction = true;

    // حفظ الحالة الحالية في redo
    const currentState = getCurrentState();
    this.redoStack.push(JSON.parse(JSON.stringify(currentState)));

    // استرجاع الحالة السابقة
    const previousState = this.undoStack.pop();
    applyState(previousState);

    this.isPerformingAction = false;
    this.updateUI();

    return previousState;
  },

  // الإعادة
  redo(getCurrentState, applyState) {
    if (!this.canRedo()) return null;

    this.isPerformingAction = true;

    // حفظ الحالة الحالية في undo
    const currentState = getCurrentState();
    this.undoStack.push(JSON.parse(JSON.stringify(currentState)));

    // استرجاع الحالة من redo
    const nextState = this.redoStack.pop();
    applyState(nextState);

    this.isPerformingAction = false;
    this.updateUI();

    return nextState;
  },

  canUndo() {
    return this.undoStack.length > 0;
  },

  canRedo() {
    return this.redoStack.length > 0;
  },

  // مسح السجل
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUI();
  },

  // تحديث واجهة الأزرار
  updateUI() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
      undoBtn.title = this.canUndo()
        ? `تراجع (${this.undoStack.length})`
        : 'لا يوجد ما يمكن التراجع عنه';
    }

    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
      redoBtn.title = this.canRedo()
        ? `إعادة (${this.redoStack.length})`
        : 'لا يوجد ما يمكن إعادته';
    }
  },

  // عدد العمليات
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }
};

// ========== سجل البحث ==========
const SearchHistory = {
  storageKey: 'searchHistory',
  maxItems: 10,

  // جلب السجل
  getAll() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading search history:', e);
      return [];
    }
  },

  // إضافة بحث جديد
  add(term, type = 'general') {
    if (!term || term.trim().length < 2) return;

    const history = this.getAll();
    const normalizedTerm = term.trim();

    // إزالة البحث إذا كان موجوداً بالفعل (لتجنب التكرار)
    const filtered = history.filter(item =>
      !(item.term === normalizedTerm && item.type === type)
    );

    // إضافة في البداية
    filtered.unshift({
      term: normalizedTerm,
      type,
      timestamp: Date.now()
    });

    // الاحتفاظ بآخر N عنصر
    const trimmed = filtered.slice(0, this.maxItems);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving search history:', e);
    }

    return trimmed;
  },

  // جلب بحث حسب النوع
  getByType(type) {
    return this.getAll().filter(item => item.type === type);
  },

  // حذف عنصر
  remove(term, type) {
    const history = this.getAll();
    const filtered = history.filter(item =>
      !(item.term === term && item.type === type)
    );

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error removing from search history:', e);
    }

    return filtered;
  },

  // مسح السجل
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Error clearing search history:', e);
    }
  },

  // عرض السجل في dropdown
  renderDropdown(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const history = this.getAll();

    if (history.length === 0) {
      container.innerHTML = '<div class="search-history-empty">لا يوجد سجل بحث</div>';
      return;
    }

    container.innerHTML = `
      <div class="search-history-header">
        <span>البحث الأخير</span>
        <button onclick="SearchHistory.clear(); SearchHistory.renderDropdown('${containerId}')" class="btn-clear-history">مسح</button>
      </div>
      <div class="search-history-list">
        ${history.map(item => `
          <div class="search-history-item" data-term="${item.term}" data-type="${item.type}">
            <span class="history-icon">🕐</span>
            <span class="history-term">${item.term}</span>
            <button class="btn-remove-history" onclick="event.stopPropagation(); SearchHistory.remove('${item.term}', '${item.type}'); SearchHistory.renderDropdown('${containerId}')">×</button>
          </div>
        `).join('')}
      </div>
    `;

    // إضافة event listeners للنقر
    container.querySelectorAll('.search-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const term = el.dataset.term;
        if (onSelect) onSelect(term, el.dataset.type);
      });
    });
  }
};

// ========== تحسينات الواجهة (منع التجمد) ==========
const UIOptimizer = {
  // تنفيذ مهمة في وقت الفراغ (لا يجمد الواجهة)
  scheduleTask(callback, options = {}) {
    const { priority = 'normal', timeout = 1000 } = options;

    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback, { timeout });
    } else {
      // Fallback للمتصفحات القديمة
      return setTimeout(callback, priority === 'high' ? 0 : 16);
    }
  },

  // إلغاء مهمة مجدولة
  cancelTask(taskId) {
    if ('cancelIdleCallback' in window) {
      cancelIdleCallback(taskId);
    } else {
      clearTimeout(taskId);
    }
  },

  // تقسيم مصفوفة كبيرة لمعالجة تدريجية (لا يجمد الواجهة)
  async processInChunks(items, processor, chunkSize = 100) {
    const results = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      // معالجة الـ chunk
      for (const item of chunk) {
        results.push(await processor(item));
      }

      // إعطاء الواجهة فرصة للتحديث
      if (i + chunkSize < items.length) {
        await this.yieldToMain();
      }
    }

    return results;
  },

  // إعطاء فرصة للواجهة للتحديث
  yieldToMain() {
    return new Promise(resolve => {
      if ('scheduler' in window && 'yield' in window.scheduler) {
        window.scheduler.yield().then(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  },

  // تحسين الـ scroll (منع جلب البيانات الزائد)
  createVirtualScroller(container, items, renderItem, itemHeight = 50) {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
    let scrollTop = 0;

    const render = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount, items.length);

      const visibleItems = items.slice(startIndex, endIndex);
      const paddingTop = startIndex * itemHeight;
      const totalHeight = items.length * itemHeight;

      container.innerHTML = `
        <div style="height: ${totalHeight}px; padding-top: ${paddingTop}px;">
          ${visibleItems.map(renderItem).join('')}
        </div>
      `;
    };

    container.addEventListener('scroll', Utils.throttle(() => {
      scrollTop = container.scrollTop;
      render();
    }, 50));

    render();

    return { render, update: (newItems) => { items = newItems; render(); } };
  },

  // مراقبة استخدام الذاكرة
  monitorMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        usedJS: Math.round(memory.usedJSHeapSize / 1048576), // MB
        totalJS: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }
};

// ========== دوال المساعدة (Utilities) ==========
const Utils = {
  /**
   * Debounce function - تأخير تنفيذ الدالة
   */
  debounce(func, wait = CONFIG.DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function - تحديد معدل التنفيذ
   */
  throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Safe JSON parse
   */
  safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Check if element exists
   */
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Safe element getter with optional fallback
   */
  getElement(id, logWarning = true) {
    const el = document.getElementById(id);
    if (!el && logWarning) {
      console.warn(`Element not found: #${id}`);
    }
    return el;
  },

  /**
   * Add event listener with tracking for cleanup
   */
  addTrackedListener(element, event, handler, options = {}) {
    if (!element) return null;

    const id = Utils.generateId();
    element.addEventListener(event, handler, options);

    AppState.eventListeners.set(id, {
      element,
      event,
      handler,
      options,
    });

    return id;
  },

  /**
   * Remove tracked event listener
   */
  removeTrackedListener(id) {
    const listener = AppState.eventListeners.get(id);
    if (listener) {
      listener.element.removeEventListener(
        listener.event,
        listener.handler,
        listener.options
      );
      AppState.eventListeners.delete(id);
    }
  },

  /**
   * Clean up all tracked listeners
   */
  cleanupAllListeners() {
    AppState.eventListeners.forEach((listener, id) => {
      Utils.removeTrackedListener(id);
    });
  },
};

// ========== نظام تحويل الأرقام ==========
const NumberConverter = {
  arabicDigits: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
  englishDigits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],



  toArabic(text) {
    if (!text) return text;
    return String(text).replace(
      /[0-9]/g,
      (d) => this.arabicDigits[parseInt(d)]
    );
  },

  toEnglish(text) {
    if (!text) return text;
    const arabicToEnglish = {
      "٠": "0",
      "١": "1",
      "٢": "2",
      "٣": "3",
      "٤": "4",
      "٥": "5",
      "٦": "6",
      "٧": "7",
      "٨": "8",
      "٩": "9",
    };
    return String(text).replace(/[٠-٩]/g, (d) => arabicToEnglish[d]);
  },

  /**
   * تحويل ذكي حسب الوضع المختار
   */
  smart(text, mode = AppState.ui.numberConversionMode) {
    if (!text) return text;

    switch (mode) {
      case "arabic":
        return this.toArabic(text);
      case "english":
        return this.toEnglish(text);
      case "mixed":
      default:
        return text;
    }
  },

  /**
   * تطبيع الأرقام للمقارنة
   */
  normalize(text) {
    return this.toEnglish(text || "").toLowerCase();
  },

  /**
   * التحقق من وجود أرقام إنجليزية
   */
  hasEnglishNumbers(text) {
    return /[0-9]/.test(text);
  },



  /**
   * تحويل رقم لنص عربي
   */
  toWords(num) {
    if (num === 0) return "صفر";
    if (num < 0) return "سالب " + this.toWords(Math.abs(num));

    const ones = [
      "",
      "واحد",
      "اثنان",
      "ثلاثة",
      "أربعة",
      "خمسة",
      "ستة",
      "سبعة",
      "ثمانية",
      "تسعة",
      "عشرة",
      "أحد عشر",
      "اثنا عشر",
      "ثلاثة عشر",
      "أربعة عشر",
      "خمسة عشر",
      "ستة عشر",
      "سبعة عشر",
      "ثمانية عشر",
      "تسعة عشر",
    ];
    const tens = [
      "",
      "",
      "عشرون",
      "ثلاثون",
      "أربعون",
      "خمسون",
      "ستون",
      "سبعون",
      "ثمانون",
      "تسعون",
    ];
    const hundreds = [
      "",
      "مائة",
      "مائتان",
      "ثلاثمائة",
      "أربعمائة",
      "خمسمائة",
      "ستمائة",
      "سبعمائة",
      "ثمانمائة",
      "تسعمائة",
    ];

    const getThousands = (n) => {
      if (n === 1) return "ألف";
      if (n === 2) return "ألفان";
      if (n >= 3 && n <= 10) return this.toWords(n) + " آلاف";
      return this.toWords(n) + " ألف";
    };



    const getMillions = (n) => {
      if (n === 1) return "مليون";
      if (n === 2) return "مليونان";
      if (n >= 3 && n <= 10) return this.toWords(n) + " ملايين";
      return this.toWords(n) + " مليون";
    };



    if (num < 20) return ones[num];

    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (one === 0) return tens[ten];
      return ones[one] + " و" + tens[ten];
    }

    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      if (remainder === 0) return hundreds[hundred];
      return hundreds[hundred] + " و" + this.toWords(remainder);
    }

    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      const thousandWord = getThousands(thousands);
      if (remainder === 0) return thousandWord;
      return thousandWord + " و" + this.toWords(remainder);
    }

    if (num < 1000000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      const millionWord = getMillions(millions);
      if (remainder === 0) return millionWord;
      return millionWord + " و" + this.toWords(remainder);
    }

    return num.toLocaleString("ar-EG");
  },

  formatWithCommas(num) {
    if (!num && num !== 0) return '٠';

    // تحويل لرقم إذا كان string
    const number = typeof num === 'string' ? parseInt(num) : num;

    // تنسيق بالفواصل (باستخدام locale إنجليزي للحصول على الفواصل الصحيحة)
    const formatted = number.toLocaleString('en-US');

    // تحويل للأرقام العربية
    return this.toArabic(formatted);
  },

};

// Aliases للتوافق مع الكود القديم
const toArabicNumber = (num) => NumberConverter.toArabic(num);
const convertToArabicNumbers = (text) => NumberConverter.toArabic(text);
const convertToEnglishNumbers = (text) => NumberConverter.toEnglish(text);
const smartConvertNumbers = (text, mode) => NumberConverter.smart(text, mode);
const numberToArabicWords = (num) => NumberConverter.toWords(num);
const normalizeNumbers = (text) => NumberConverter.normalize(text);
const formatNumberWithCommas = (num) => NumberConverter.formatWithCommas(num);


// ========== نظام الإخطارات ==========
const NotificationSystem = {
  container: null,
  queue: [],
  maxNotifications: 5,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 99999;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  },

  show(message, type = "success", duration = CONFIG.NOTIFICATION_DURATION) {
    this.init();

    // إزالة الإخطارات القديمة إذا تجاوزت الحد
    while (this.container.children.length >= this.maxNotifications) {
      this.container.firstChild?.remove();
    }

    const colors = {
      success: { bg: "#d4edda", border: "#28a745", text: "#155724" },
      error: { bg: "#f8d7da", border: "#dc3545", text: "#721c24" },
      warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404" },
      info: { bg: "#cce5ff", border: "#0d6efd", text: "#004085" },
    };

    const color = colors[type] || colors.success;

    const notif = document.createElement("div");
    notif.className = "notification-item";
    notif.style.cssText = `
      padding: 15px 20px;
      border-radius: 8px;
      background: ${color.bg};
      border: 2px solid ${color.border};
      color: ${color.text};
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInNotification 0.3s ease;
      cursor: pointer;
      direction: rtl;
    `;
    notif.textContent = message;

    // إغلاق عند النقر
    notif.addEventListener("click", () => this.dismiss(notif));

    this.container.appendChild(notif);

    // إزالة تلقائية
    const timeoutId = setTimeout(() => {
      this.dismiss(notif);
    }, duration);

    notif.dataset.timeoutId = timeoutId;

    return notif;
  },

  dismiss(notif) {
    if (!notif || !notif.parentNode) return;

    clearTimeout(parseInt(notif.dataset.timeoutId));
    notif.style.animation = "slideOutNotification 0.3s ease";
    setTimeout(() => notif.remove(), 300);
  },

  clear() {
    while (this.container?.firstChild) {
      this.container.firstChild.remove();
    }
  },
};

// Alias للتوافق
function showNotification(message, type = "success") {
  return NotificationSystem.show(message, type);
}

// ========== نظام التحقق من الحقول ==========
const ValidationSystem = {
  fieldMapping: {
    "اسم المستخدم / الموظف": "inputUserName",
    "عدد الأفراد المتدربين": "inputPersons",
    المساحة: "inputArea",
    النشاط: "inputActivity",
    "اسم المنشأة / الشركة": "inputName",
    العنوان: "inputLocation",
  },

  rules: {
    inputUserName: {
      required: true,
      label: "اسم المستخدم / الموظف",
    },
    inputPersons: {
      required: true,
      min: 1,
      type: "number",
      label: "عدد الأفراد المتدربين",
    },
    inputArea: {
      required: true,
      min: 1,
      type: "number",
      label: "المساحة",
    },
    inputActivity: {
      required: true,
      label: "النشاط",
    },
    inputName: {
      required: true,
      label: "اسم المنشأة / الشركة",
    },
    inputLocation: {
      required: true,
      label: "العنوان",
    },
  },

  validate() {
    const errors = [];

    Object.entries(this.rules).forEach(([fieldId, rule]) => {
      const input = Utils.getElement(fieldId, false);
      if (!input) return;

      const value = input.value.trim();

      if (rule.required && !value) {
        errors.push(rule.label);
        return;
      }

      if (rule.type === "number") {
        const numValue = parseInt(value);
        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(rule.label);
        }
      }
    });

    if (errors.length > 0) {
      this.showErrors(errors);
      return false;
    }

    return true;
  },

  showErrors(missingFields) {
    let modal = Utils.getElement("validation-error-modal", false);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "validation-error-modal";
      modal.className = "modal-overlay";
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
            ${missingFields
        .map(
          (field) =>
            `<li><span class="field-bullet">•</span> ${field}</li>`
        )
        .join("")}
          </ul>
        </div>
        
        <div class="validation-footer">
          <button onclick="ValidationSystem.closeModal()" class="btn-ok">
            حسناً
          </button>
        </div>
      </div>
    `;

    modal.classList.add("active");
    this.highlightFields(missingFields);
  },

  closeModal() {
    const modal = Utils.getElement("validation-error-modal", false);
    if (modal) modal.classList.remove("active");
  },

  highlightFields(fieldNames) {
    // إزالة التمييز القديم
    Utils.$$(".field-error").forEach((el) =>
      el.classList.remove("field-error")
    );

    // إضافة التمييز للحقول الفارغة
    fieldNames.forEach((fieldName) => {
      const inputId = this.fieldMapping[fieldName];
      if (!inputId) return;

      const input = Utils.getElement(inputId, false);
      if (!input) return;

      input.classList.add("field-error");

      // إزالة التمييز عند الكتابة
      const removeError = function () {
        this.classList.remove("field-error");
        this.removeEventListener("input", removeError);
      };
      input.addEventListener("input", removeError, { once: true });
    });

    // التركيز على أول حقل فارغ
    const firstEmptyFieldId = this.fieldMapping[fieldNames[0]];
    if (firstEmptyFieldId) {
      Utils.getElement(firstEmptyFieldId, false)?.focus();
    }
  },
};

// Alias للتوافق
const validateRequiredFields = () => ValidationSystem.validate();
const closeValidationModal = () => ValidationSystem.closeModal();

// ========== حاسبة الرسوم ==========
const FeesCalculator = {
  // جدول رسوم المساحة
  areaFeeTable: [
    { max: 50, fee: 360 },
    { max: 100, fee: 450 },
    { max: 200, fee: 550 },
    { max: 400, fee: 750 },
    { max: 1000, fee: 950 },
    { max: 2000, fee: 1500 },
    { max: 3000, fee: 2500 },
    { max: 4000, fee: 3500 },
    { max: 5000, fee: 4000 },
    { max: 6000, fee: 4500 },
    { max: 7000, fee: 5500 },
    { max: 8000, fee: 6000 },
    { max: 9000, fee: 6500 },
    { max: 10000, fee: 7500 },
  ],


  /**
   * حساب رسوم التدريب
   */
  calculateTrainingFee(persons) {
    if (!persons || persons < 1) return 0;
    const rate =
      persons <= CONFIG.PERSONS_THRESHOLD
        ? CONFIG.TRAINING_RATE_SMALL
        : CONFIG.TRAINING_RATE_LARGE;
    return persons * rate;
  },

  /**
   * حساب رسوم الوزارة
   */
  calculateMinistryFee(persons) {
    if (!persons || persons < 1) return 0;
    const rate =
      persons <= CONFIG.PERSONS_THRESHOLD
        ? CONFIG.MINISTRY_RATE_SMALL
        : CONFIG.MINISTRY_RATE_LARGE;
    return persons * rate;
  },

  /**
   * حساب رسوم المساحة
   */
  calculateAreaFee(area) {
    if (!area || area <= 0) return 0;

    // البحث في الجدول
    for (const tier of this.areaFeeTable) {
      if (area <= tier.max) return tier.fee;
    }

    // أكثر من 10000 متر
    const extraThousands = Math.ceil((area - 10000) / 1000);
    return 7500 + extraThousands * 500;
  },

  /**
   * حساب الإجمالي الكلي للمحافظة
   */
  calculateGrandTotal(persons, consultant, evacuation, inspection) {
    const trainingFee = this.calculateTrainingFee(persons);
    return (
      trainingFee + (consultant || 0) + (evacuation || 0) + (inspection || 0)
    );
  },

  /**
   * حساب إجمالي الوزارة
   */
  calculateMinistryTotal(persons, area) {
    const ministryFee = this.calculateMinistryFee(persons);
    const areaFee = this.calculateAreaFee(area);
    return ministryFee + areaFee;
  },

  /**
   * جمع كل الحسابات
   */
  calculateAll(data) {
    const { persons, consultant, evacuation, inspection, area } = data;

    const trainingFee = this.calculateTrainingFee(persons);
    const ministryFee = this.calculateMinistryFee(persons);
    const areaFee = this.calculateAreaFee(area);
    const grandTotal =
      trainingFee + (consultant || 0) + (evacuation || 0) + (inspection || 0);
    const ministryTotal = ministryFee + areaFee;

    return {
      trainingFee,
      ministryFee,
      areaFee,
      grandTotal,
      ministryTotal,
      trainingRate:
        persons <= CONFIG.PERSONS_THRESHOLD
          ? CONFIG.TRAINING_RATE_SMALL
          : CONFIG.TRAINING_RATE_LARGE,
      ministryRate:
        persons <= CONFIG.PERSONS_THRESHOLD
          ? CONFIG.MINISTRY_RATE_SMALL
          : CONFIG.MINISTRY_RATE_LARGE,
    };
  },
};




// ========== تحديث عرض الشهادة المؤمنة ==========
function updateProtectionDisplay(protectionFee) {
  // البحث عن العناصر باستخدام data-calc
  const feeElements = document.querySelectorAll('[data-calc="protection-fee"]');
  const textElements = document.querySelectorAll('[data-calc="protection-fee-text"]');

  // البحث عن العناصر الأب (payment-request-four)
  const paymentRequestElements = document.querySelectorAll('.payment-request-four');

  if (protectionFee && protectionFee > 0) {
    // ========== فيه رقم - اعرضه بالشكل العادي ==========
    paymentRequestElements.forEach(el => {
      el.innerHTML = `
        برجاء سداد مبلغ وقدره (
        <strong>${toArabicNumber(protectionFee)}</strong>
        ) جنيه (
        <span class="red-text-four">${numberToArabicWords(protectionFee)} جنيهاً لا غير</span>
        )
      `;
    });
  } else {
    // ========== مفيش رقم - اعرض الفراغات ==========
    paymentRequestElements.forEach(el => {
      el.innerHTML = `
        برجاء سداد مبلغ وقدره (
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        ) جنيه (
        <span class="red-text-four">فقط</span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        جنيهاً لا غير )
      `;
    });
  }
}


// Aliases للتوافق
const calculateProtectionFee = (a) => FeesCalculator.calculateProtectionFee(a);
const calculateTrainingFee = (p) => FeesCalculator.calculateTrainingFee(p);
const calculateMinistryFee = (p) => FeesCalculator.calculateMinistryFee(p);
const calculateAreaFee = (a) => FeesCalculator.calculateAreaFee(a);
const calculateGrandTotal = (p, c, e, i) =>
  FeesCalculator.calculateGrandTotal(p, c, e, i);

// ========== نظام التواريخ ==========
const DateSystem = {
  fieldToPageMapping: {
    persons_count: ["governorate", "training", "ministry"],
    training_fee: ["governorate"],
    consultant_fee: ["governorate"],
    evacuation_fee: ["governorate"],
    inspection_fee: ["governorate"],
    grand_total: ["governorate"],
    area: ["ministry", "certificate"],
    area_fee: ["ministry"],
    ministry_fee: ["ministry"],
    ministry_total: ["ministry"],
    protection_fee: ["certificate"], // إضافة جديدة
    activity: [
      "governorate",
      "training",
      "ministry",
      "certificate",
      "decision",
    ],
    name: ["governorate", "training", "ministry", "certificate", "decision"],
    location: [
      "governorate",
      "training",
      "ministry",
      "certificate",
      "decision",
    ],
  },

  /**
   * تنسيق التاريخ بالعربية
   */
  formatArabic(date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${toArabicNumber(year)}/${toArabicNumber(month)}/${toArabicNumber(
      day
    )}`;
  },

  /**
   * تنسيق للملفات
   */
  formatForFileName(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  },

  /**
   * تنسيق كامل مع الوقت
   */
  formatFull(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  /**
   * تحديث تاريخ صفحة معينة
   */
  updatePageDate(pageGroup) {
    const today = new Date();
    const dateString = this.formatArabic(today);

    AppState.pageDates[pageGroup] = Date.now();

    Utils.$$(`.auto-date[data-page-group="${pageGroup}"]`).forEach((el) => {
      el.textContent = dateString;
      el.classList.add("date-updated");
      setTimeout(() => el.classList.remove("date-updated"), 2000);
    });

    this.save();
  },

  /**
   * تحديث التواريخ للحقول المتغيرة
   */
  updateForChangedFields(changedFields) {
    const affectedPages = new Set();

    changedFields.forEach((fieldName) => {
      const pages = this.fieldToPageMapping[fieldName];
      if (pages) {
        pages.forEach((page) => affectedPages.add(page));
      }
    });

    affectedPages.forEach((pageGroup) => this.updatePageDate(pageGroup));

    return Array.from(affectedPages);
  },

  /**
   * تهيئة كل التواريخ
   */
  initializeAll() {
    const today = Date.now();
    const dateString = this.formatArabic(new Date());

    const allPageGroups = [
      "governorate",
      "training",
      "ministry",
      "certificate",
      "decision",
    ];

    allPageGroups.forEach((pageGroup) => {
      if (!AppState.pageDates[pageGroup]) {
        AppState.pageDates[pageGroup] = today;
      }
    });

    Utils.$$(".auto-date").forEach((el) => {
      const pageGroup = el.getAttribute("data-page-group");
      if (pageGroup && AppState.pageDates[pageGroup]) {
        el.textContent = this.formatArabic(
          new Date(AppState.pageDates[pageGroup])
        );
      } else {
        el.textContent = dateString;
      }
    });

    this.save();
  },

  /**
   * حفظ التواريخ
   */
  save() {
    try {
      localStorage.setItem("pageDates", JSON.stringify(AppState.pageDates));
    } catch (e) {
      console.error("Failed to save dates:", e);
    }
  },

  /**
   * تحميل التواريخ
   */
  load() {
    try {
      const saved = localStorage.getItem("pageDates");
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(AppState.pageDates, parsed);

        Object.keys(AppState.pageDates).forEach((pageGroup) => {
          if (AppState.pageDates[pageGroup]) {
            const date = new Date(AppState.pageDates[pageGroup]);
            const dateString = this.formatArabic(date);
            Utils.$$(`.auto-date[data-page-group="${pageGroup}"]`).forEach(
              (el) => {
                el.textContent = dateString;
              }
            );
          }
        });
      }
    } catch (e) {
      console.error("Failed to load dates:", e);
    }
  },
};

// Aliases للتوافق
const formatDate = (ts) => DateSystem.formatFull(ts);
const formatArabicDate = (d) => DateSystem.formatArabic(d);
const formatDateForFileName = () => DateSystem.formatForFileName();
const updatePageDate = (p) => DateSystem.updatePageDate(p);
const updateDatesForChangedFields = (f) => DateSystem.updateForChangedFields(f);
const initializeAllDates = () => DateSystem.initializeAll();
const savePageDates = () => DateSystem.save();
const loadPageDates = () => DateSystem.load();

// متغير للتوافق
let pageDates = AppState.pageDates;

// ========== نظام التخزين المحلي ==========
const Storage = {
  keys: {
    userName: "feesUserName",
    appState: "appState",
    pageDates: "pageDates",
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Storage set error for ${key}:`, e);
      return false;
    }
  },

  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      console.error(`Storage get error for ${key}:`, e);
      return fallback;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Storage remove error for ${key}:`, e);
      return false;
    }
  },

  saveUserName(name) {
    this.set(this.keys.userName, name);
    showSavedIndicator();
  },

  loadUserName() {
    return this.get(this.keys.userName, "") || "";
  },
};

// Aliases للتوافق
const saveUserName = (n) => Storage.saveUserName(n);
const loadUserName = () => Storage.loadUserName();

function showSavedIndicator() {
  const indicator = Utils.getElement("savedIndicator", false);
  if (indicator) {
    indicator.classList.add("show");
    setTimeout(() => indicator.classList.remove("show"), 2000);
  }
}

// ========== نظام التحميل (Loading) ==========
const LoadingSystem = {
  overlay: null,
  timeout: null,

  icons: {
    default: `
      <div class="loading-circle">
        <div class="loading-inner-circle"></div>
      </div>
      <div class="loading-dots">
        <span></span><span></span><span></span>
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
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
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
    `,
  },

  create() {
    if (this.overlay) return this.overlay;

    this.overlay = document.createElement("div");
    this.overlay.id = "loading-overlay";
    this.overlay.innerHTML = `
      <div class="loading-container">
        <div class="loading-animation"></div>
        <div class="loading-text">
          <span class="loading-title">جاري التحميل</span>
          <span class="loading-subtitle"></span>
        </div>
        <div class="loading-progress-container" style="display: none;">
          <div class="loading-progress-bar">
            <div class="loading-progress-fill"></div>
          </div>
          <span class="loading-progress-text">0%</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    return this.overlay;
  },

  show(options = {}) {
    const {
      title = "جاري التحميل",
      subtitle = "",
      showProgress = false,
      progress = 0,
      type = "default",
      timeout = CONFIG.LOADING_TIMEOUT,
    } = options;

    const overlay = this.create();

    const titleEl = overlay.querySelector(".loading-title");
    const subtitleEl = overlay.querySelector(".loading-subtitle");
    const progressContainer = overlay.querySelector(
      ".loading-progress-container"
    );
    const container = overlay.querySelector(".loading-container");
    const animation = overlay.querySelector(".loading-animation");

    container.className = `loading-container loading-type-${type}`;
    animation.innerHTML = this.icons[type] || this.icons.default;

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle;

    progressContainer.style.display = showProgress ? "block" : "none";
    if (showProgress) this.updateProgress(progress);

    overlay.classList.add("active");
    document.body.classList.add("loading-active");
    AppState.ui.isLoading = true;

    // Timeout للأمان
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.hide();
      showNotification("⚠️ انتهت مهلة الانتظار", "warning");
    }, timeout);

    return {
      updateTitle: (text) => {
        titleEl.textContent = text;
      },
      updateSubtitle: (text) => {
        subtitleEl.textContent = text;
      },
      updateProgress: (value) => this.updateProgress(value),
      hide: () => this.hide(),
    };
  },

  updateProgress(value) {
    if (!this.overlay) return;

    const fill = this.overlay.querySelector(".loading-progress-fill");
    const text = this.overlay.querySelector(".loading-progress-text");
    const percentage = Math.min(100, Math.max(0, value));

    if (fill) fill.style.width = `${percentage}%`;
    if (text) text.textContent = `${Math.round(percentage)}%`;
  },

  hide() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.overlay) {
      this.overlay.classList.add("hiding");
      this.overlay.classList.remove("active");

      setTimeout(() => {
        this.overlay?.classList.remove("hiding");
        document.body.classList.remove("loading-active");
        AppState.ui.isLoading = false;
      }, 300);
    }
  },
};

// دوال مساعدة للتحميل
const Loading = {
  show: (opts) => LoadingSystem.show(opts),
  hide: () => LoadingSystem.hide(),
  print: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري الطباعة",
      subtitle: subtitle || "يرجى الانتظار...",
      type: "print",
    }),
  pdf: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري إنشاء PDF",
      subtitle: subtitle || "يتم تجهيز الملف...",
      type: "pdf",
      showProgress: true,
    }),
  save: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري الحفظ",
      subtitle: subtitle || "يتم حفظ البيانات...",
      type: "save",
    }),
  search: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري البحث",
      subtitle: subtitle || "يتم البحث في الشهادات...",
      type: "search",
    }),
  delete: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري الحذف",
      subtitle: subtitle || "يتم حذف البيانات...",
      type: "delete",
    }),
  data: (subtitle = "") =>
    LoadingSystem.show({
      title: "جاري تحميل البيانات",
      subtitle: subtitle || "يرجى الانتظار...",
      type: "default",
    }),
};

// Aliases
const showLoading = (opts) => LoadingSystem.show(opts);
const hideLoading = () => LoadingSystem.hide();

// ========== نظام الـ API ==========
const API = {
  ready: false,

  async check() {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!window.electronAPI) {
      console.warn("electronAPI غير متاح - ربما يعمل في المتصفح");
      return false;
    }

    if (!window.electronAPI.certificates) {
      console.error("certificates API غير متاح");
      showNotification("❌ خطأ في الاتصال بقاعدة البيانات", "error");
      return false;
    }

    this.ready = true;
    return true;
  },

  get certificates() {
    return window.electronAPI?.certificates || null;
  },

  get print() {
    return window.electronAPI?.print || null;
  },
};

// Alias للتوافق
const checkAPIReady = () => API.check();

// ========== متغيرات الشهادة الحالية ==========
let currentCertificateId = null;
let currentPersonsCount = 0;
let currentConsultantFee = 0;
let currentEvacuationFee = 0;
let currentInspectionFee = 0;
let currentArea = 0;
let currentProtectionFee = 0; // رسوم الحماية المدنية (الشهادة المؤمنة)
let originalCertificateData = null;

// ========== دالة تحديث المعاينة ==========
function updateCalcPreview() {
  const persons = parseInt(Utils.getElement("inputPersons", false)?.value) || 0;
  const consultant =
    parseInt(Utils.getElement("inputConsultant", false)?.value) || 0;
  const evacuation =
    parseInt(Utils.getElement("inputEvacuation", false)?.value) || 0;
  const inspection =
    parseInt(Utils.getElement("inputInspection", false)?.value) || 0;
  const area = parseFloat(Utils.getElement("inputArea", false)?.value) || 0;
  const protectionFeeInput =
    parseInt(Utils.getElement("inputProtectionFee", false)?.value) || 0;

  const preview = Utils.getElement("calcPreview", false);
  const totalPreview = Utils.getElement("totalPreview", false);
  const areaPreview = Utils.getElement("areaCalcPreview", false);

  // معاينة المساحة
  if (area > 0 && areaPreview) {
    const areaFee = FeesCalculator.calculateAreaFee(area);
    areaPreview.innerHTML = `
      <div class="preview-item">
        <span>رسوم المساحة (${toArabicNumber(
      area
    )} م²) = <strong>${toArabicNumber(areaFee)}</strong> ج</span>
      </div>
    `;
  } else if (areaPreview) {
    areaPreview.innerHTML = "";
  }

  // تم حذف جزء معاينة رسوم الحماية المدنية من هنا

  if (persons < 1) {
    if (preview) preview.innerHTML = "";
    if (totalPreview) totalPreview.innerHTML = "";
    return;
  }

  const calc = FeesCalculator.calculateAll({
    persons,
    consultant,
    evacuation,
    inspection,
    area,
  });
  const ministryTotal = calc.ministryFee + calc.areaFee;

  if (preview) {
    preview.innerHTML = `
      <div class="preview-item">
        <span>رسوم المحافظة: ${persons} × ${calc.trainingRate
      } = <strong>${toArabicNumber(calc.trainingFee)}</strong> ج</span>
      </div>
      <div class="preview-item">
        <span>رسوم الوزارة (تدريب): ${persons} × ${calc.ministryRate
      } = <strong>${toArabicNumber(calc.ministryFee)}</strong> ج</span>
      </div>
      ${area > 0
        ? `
      <div class="preview-item">
        <span>إجمالي الوزارة: ${toArabicNumber(
          calc.areaFee
        )} + ${toArabicNumber(calc.ministryFee)} = <strong>${toArabicNumber(
          ministryTotal
        )}</strong> ج</span>
      </div>
      `
        : ""
      }
    `;
  }

  if (totalPreview) {
    const consultantStr = Utils.getElement(
      "inputConsultant",
      false
    )?.value.trim();
    const evacuationStr = Utils.getElement(
      "inputEvacuation",
      false
    )?.value.trim();
    const inspectionStr = Utils.getElement(
      "inputInspection",
      false
    )?.value.trim();

    totalPreview.innerHTML = `
      <div class="total-preview-box">
        <div class="preview-title">الإجمالي الكلي للمحافظة</div>
        <div class="preview-calc">
          تدريب: ${toArabicNumber(calc.trainingFee)} + 
          استشاري: ${consultantStr === "" ? "٠٠٠٠" : toArabicNumber(consultant)
      } + 
          إخلاء: ${evacuationStr === "" ? "٠٠٠٠" : toArabicNumber(evacuation)
      } + 
          معاينة: ${inspectionStr === "" ? "٠٠٠٠" : toArabicNumber(inspection)}
        </div>
        <div class="preview-result">
          = <strong>${toArabicNumber(calc.grandTotal)}</strong> جنيه
        </div>
        <div class="preview-text">(${numberToArabicWords(
        calc.grandTotal
      )} جنيهاً لا غير)</div>
      </div>
    `;
  }
}

// ========== تحديث اسم المستخدم ==========
function updateUserNameDisplay(name) {
  const displayName = name || "اكمل...";
  Utils.$$(".user-name-display").forEach((el) => {
    el.textContent = displayName;
  });
}

// ========== تعديل حجم الخط للحقول الطويلة ==========
function adjustFieldValueFontSize() {
  Utils.$$(".field-value").forEach((field) => {
    field.style.fontSize = "10pt";

    if (
      field.scrollHeight > field.offsetHeight ||
      field.scrollWidth > field.offsetWidth
    ) {
      let fontSize = 10;
      while (
        fontSize > 7 &&
        (field.scrollHeight > field.offsetHeight ||
          field.scrollWidth > field.offsetWidth)
      ) {
        fontSize--;
        field.style.fontSize = fontSize + "pt";
      }
    }
  });
}

// ========== فتح Popup الرسوم ==========
async function openFeesPopup() {
  const overlay = Utils.getElement("popupOverlay", false);
  if (!overlay) return;

  overlay.classList.add("active");
  document.body.classList.add("modal-open"); // منع scroll الشاشة أثناء فتح الـ popup

  // تحميل القيم
  const savedUserName = Storage.loadUserName();
  const userNameInput = Utils.getElement("inputUserName", false);
  if (userNameInput) userNameInput.value = savedUserName;

  const inputs = {
    inputPersons: currentPersonsCount || "",
    inputConsultant: currentConsultantFee || "",
    inputEvacuation: currentEvacuationFee || "",
    inputInspection: currentInspectionFee || "",
    inputArea: currentArea || "",
    inputProtectionFee: currentProtectionFee || "", // إضافة جديدة
  };

  Object.entries(inputs).forEach(([id, value]) => {
    const input = Utils.getElement(id, false);
    if (input) input.value = value;
  });

  // تحميل بيانات النشاط من الصفحة
  const fields = ["activity", "name", "location"];
  fields.forEach((field) => {
    const pageField = Utils.$(`[data-field="${field}"] .field-value`);
    const input = Utils.getElement(
      `input${field.charAt(0).toUpperCase() + field.slice(1)}`,
      false
    );
    if (pageField && input) {
      input.value = pageField.textContent.replace(/\.$/, "");
    }
  });

  updateCalcPreview();

  // تحميل الاقتراحات
  if (API.ready) {
    await AutocompleteSystem.loadCache();

    ["inputActivity", "inputName", "inputLocation"].forEach((id, index) => {
      const types = ["activities", "names", "locations"];
      if (!Utils.getElement(`${id}-suggestions`, false)) {
        AutocompleteSystem.setup(id, types[index]);
      }
    });
  }

  setTimeout(() => {
    Utils.getElement("inputPersons", false)?.focus();
  }, 100);
}

// ========== إغلاق Popup ==========
function closeFeesPopup() {
  const overlay = Utils.getElement("popupOverlay", false);
  if (!overlay) return;

  overlay.classList.remove("active");
  document.body.classList.remove("modal-open"); // إعادة scroll الشاشة

  // تنظيف الاقتراحات
  ["inputActivity", "inputName", "inputLocation"].forEach((id) => {
    AutocompleteSystem.cleanup(id);
  });
}

// ========== تحديث زر الرسوم ==========
function updateFeesButtonText() {
  const feesBtn = Utils.$(".fees-btn");
  if (!feesBtn) return;

  if (currentCertificateId) {
    feesBtn.textContent = "✏️ تعديل البيانات";
    feesBtn.classList.add("edit-mode");
  } else {
    feesBtn.textContent = "➕ رسوم جديدة";
    feesBtn.classList.remove("edit-mode");
  }
}

// ========== تطبيق التغييرات ==========
function applyChanges() {
  if (!ValidationSystem.validate()) return;

  const userName = Utils.getElement("inputUserName", false)?.value.trim();
  const persons = parseInt(Utils.getElement("inputPersons", false)?.value) || 0;
  const consultant =
    parseInt(Utils.getElement("inputConsultant", false)?.value) || 0;
  const evacuation =
    parseInt(Utils.getElement("inputEvacuation", false)?.value) || 0;
  const inspection =
    parseInt(Utils.getElement("inputInspection", false)?.value) || 0;
  const area = parseFloat(Utils.getElement("inputArea", false)?.value) || 0;
  const protectionFeeInput =
    parseInt(Utils.getElement("inputProtectionFee", false)?.value) || 0;

  // تحويل الأرقام حسب اختيار المستخدم (احترام الـ numberMode)
  const activityInput = Utils.getElement("inputActivity", false);
  const nameInput = Utils.getElement("inputName", false);
  const locationInput = Utils.getElement("inputLocation", false);

  // قراءة الـ mode اللي المستخدم اختاره لكل حقل
  const activityMode = activityInput?.dataset.numberMode || "mixed";
  const nameMode = nameInput?.dataset.numberMode || "mixed";
  const locationMode = locationInput?.dataset.numberMode || "mixed";

  // تحويل الأرقام فقط إذا كان الـ mode مش "mixed"
  let activity = activityInput?.value.trim() || "";
  let name = nameInput?.value.trim() || "";
  let location = locationInput?.value.trim() || "";

  // تطبيق التحويل فقط إذا المستخدم اختار mode معين
  if (activityMode !== "mixed") {
    activity = NumberConverter.smart(activity, activityMode);
  }
  if (nameMode !== "mixed") {
    name = NumberConverter.smart(name, nameMode);
  }
  if (locationMode !== "mixed") {
    location = NumberConverter.smart(location, locationMode);
  }

  // ========== إضافة "- الجيزة" تلقائياً للعنوان ==========
  location = ensureGizaSuffix(location);

  // تحديث الحقول
  if (activityInput) activityInput.value = activity;
  if (nameInput) nameInput.value = name;
  if (locationInput) locationInput.value = location;

  // التحقق
  if (!persons || persons < 1) {
    showNotification("❌ برجاء إدخال عدد أفراد صحيح", "error");
    return;
  }
  if (!area || area < 1) {
    showNotification("❌ برجاء إدخال مساحة صحيحة", "error");
    return;
  }

  // تتبع الحقول المتغيرة
  const changedFields = [];
  const compareData = originalCertificateData || {
    activity:
      Utils.$('[data-field="activity"] .field-value')
        ?.textContent.replace(/\.$/, "")
        .trim() || "",
    name:
      Utils.$('[data-field="name"] .field-value')
        ?.textContent.replace(/\.$/, "")
        .trim() || "",
    location:
      Utils.$('[data-field="location"] .field-value')
        ?.textContent.replace(/\.$/, "")
        .trim() || "",
    area: currentArea,
    persons_count: currentPersonsCount,
    consultant_fee: currentConsultantFee,
    evacuation_fee: currentEvacuationFee,
    inspection_fee: currentInspectionFee,
    protection_fee: currentProtectionFee,
  };

  // مقارنة الحقول
  const fieldsToCompare = [
    ["persons_count", persons, compareData.persons_count],
    ["consultant_fee", consultant, compareData.consultant_fee],
    ["evacuation_fee", evacuation, compareData.evacuation_fee],
    ["inspection_fee", inspection, compareData.inspection_fee],
    ["protection_fee", protectionFeeInput, compareData.protection_fee],
    ["area", area, compareData.area],
    ["activity", activity, compareData.activity],
    ["name", name, compareData.name],
    ["location", location, compareData.location],
  ];

  fieldsToCompare.forEach(([field, newVal, oldVal]) => {
    if (newVal !== oldVal) changedFields.push(field);
  });

  // تحديث التواريخ للصفحات المتأثرة
  if (changedFields.length > 0) {
    DateSystem.updateForChangedFields(changedFields);
  }

  // حفظ اسم المستخدم
  if (userName) {
    Storage.saveUserName(userName);
    updateUserNameDisplay(userName);
  }

  // تحديث المتغيرات
  currentPersonsCount = persons;
  currentConsultantFee = consultant;
  currentEvacuationFee = evacuation;
  currentInspectionFee = inspection;
  currentArea = area;
  currentProtectionFee = protectionFeeInput;

  originalCertificateData = {
    activity,
    name,
    location,
    area,
    persons_count: persons,
    consultant_fee: consultant,
    evacuation_fee: evacuation,
    inspection_fee: inspection,
    protection_fee: protectionFeeInput,
    user_name: userName,
  };

  // حساب الرسوم
  const calc = FeesCalculator.calculateAll({
    persons,
    consultant,
    evacuation,
    inspection,
    area,
  });
  const ministryTotal = calc.ministryFee + calc.areaFee;

  // استخدام رسوم الحماية المدخلة أو المحسوبة
  const protectionFee = protectionFeeInput > 0 ? protectionFeeInput : 0;


  // تحديث العرض
  const updates = [
    ["persons-count", toArabicNumber(persons)],
    ["training-total", toArabicNumber(calc.trainingFee)],
    ["consultant-fee", consultant === 0 ? "٠٠٠٠" : toArabicNumber(consultant)],
    ["evacuation-fee", evacuation === 0 ? "٠٠٠٠" : toArabicNumber(evacuation)],
    ["inspection-fee", inspection === 0 ? "٠٠٠٠" : toArabicNumber(inspection)],
    ["grand-total", toArabicNumber(calc.grandTotal)],
    [
      "grand-total-text",
      "فقط " + numberToArabicWords(calc.grandTotal) + " جنيهاً لا غير",
    ],
    ["ministry-fee", toArabicNumber(calc.ministryFee)],
    ["area-fee", toArabicNumber(calc.areaFee)],
    ["area-value", toArabicNumber(area)],
    ["ministry-total", toArabicNumber(ministryTotal)],
    [
      "ministry-total-text",
      "فقط " + numberToArabicWords(ministryTotal) + " جنيهاً لا غير",
    ],
    // رسوم الحماية المدنية - جديد
    ["protection-fee", toArabicNumber(protectionFee)],
    [
      "protection-fee-text",
      "فقط " + numberToArabicWords(protectionFee) + " جنيهاً لا غير",
    ],
  ];

  updates.forEach(([key, value]) => {
    Utils.$$(`[data-calc="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  });

  updateProtectionDisplay(protectionFeeInput);

  // تحديث عرض المساحة
  ["areaValueDisplay-page4", "areaValueDisplay-page8"].forEach((id) => {
    const el = Utils.getElement(id, false);
    if (el) el.textContent = toArabicNumber(area);
  });

  // تحديث بيانات النشاط
  const fieldsWithDot = [
    ["activity", activity],
    ["name", name],
    ["location", location],
  ];

  fieldsWithDot.forEach(([field, value]) => {
    const valueWithDot = value.endsWith(".") ? value : value + ".";
    Utils.$$(`[data-field="${field}"] .field-value`).forEach((el) => {
      el.textContent = valueWithDot;
    });
  });

  adjustFieldValueFontSize();
  closeFeesPopup();

  if (changedFields.length > 0) {
    showNotification(`✅ تم التطبيق! تم تحديث ${changedFields.length} حقول`);
  } else {
    showNotification("✅ تم التطبيق (لا توجد تغييرات)");
  }
}

// ========== جمع بيانات الشهادة ==========
function collectCertificateData() {
  const personsCount =
    parseInt(Utils.getElement("inputPersons", false)?.value) || 0;
  const area = parseFloat(Utils.getElement("inputArea", false)?.value) || 0;
  const consultantFee =
    parseInt(Utils.getElement("inputConsultant", false)?.value) || 0;
  const evacuationFee =
    parseInt(Utils.getElement("inputEvacuation", false)?.value) || 0;
  const inspectionFee =
    parseInt(Utils.getElement("inputInspection", false)?.value) || 0;
  const protectionFeeInput =
    parseInt(Utils.getElement("inputProtectionFee", false)?.value) || 0;

  const calc = FeesCalculator.calculateAll({
    persons: personsCount,
    consultant: consultantFee,
    evacuation: evacuationFee,
    inspection: inspectionFee,
    area,
  });

  const protectionFee = protectionFeeInput > 0 ? protectionFeeInput : 0;

  // ========== إضافة "- الجيزة" تلقائياً ==========
  const rawLocation = Utils.getElement("inputLocation", false)?.value.trim() || "";
  const locationWithGiza = ensureGizaSuffix(rawLocation);

  return {
    activity: Utils.getElement("inputActivity", false)?.value.trim() || "",
    name: Utils.getElement("inputName", false)?.value.trim() || "",
    location: locationWithGiza,  // ← استخدام العنوان المعدل
    area,
    persons_count: personsCount,
    training_fee: calc.trainingFee,
    consultant_fee: consultantFee,
    evacuation_fee: evacuationFee,
    inspection_fee: inspectionFee,
    area_fee: calc.areaFee,
    ministry_fee: calc.ministryFee,
    grand_total: calc.grandTotal,
    protection_fee: protectionFee,
    ministry_total: calc.ministryFee + calc.areaFee,
    user_name: Utils.getElement("inputUserName", false)?.value.trim() || "",
    date_governorate: AppState.pageDates.governorate,
    date_training: AppState.pageDates.training,
    date_ministry: AppState.pageDates.ministry,
    date_certificate: AppState.pageDates.certificate,
    date_decision: AppState.pageDates.decision,
  };
}

// ========== دالة إضافة "- الجيزة" للعنوان تلقائياً ==========
/**
 * التحقق من وجود "الجيزة" في نهاية العنوان وإضافتها إذا لم تكن موجودة
 * @param {string} location - العنوان المدخل
 * @returns {string} - العنوان مع "- الجيزة" في النهاية
 */

// ========== دالة إضافة "- الجيزة" للعنوان ==========
function ensureGizaSuffix(location) {
  if (!location || typeof location !== 'string') return location;

  const trimmedLocation = location.trim();
  if (!trimmedLocation) return trimmedLocation;

  // أنماط مختلفة للتحقق من وجود "الجيزة" في النهاية
  const gizaPatterns = [
    /[-–—]\s*الجيزة\s*\.?$/i,      // - الجيزة أو – الجيزة أو — الجيزة
    /الجيزة\s*\.?$/i,              // الجيزة في النهاية بدون شرطة
    /[-–—]\s*جيزة\s*\.?$/i,        // - جيزة
    /جيزة\s*\.?$/i                 // جيزة في النهاية
  ];

  // التحقق إذا كان العنوان ينتهي بالجيزة بأي شكل
  const hasGiza = gizaPatterns.some(pattern => pattern.test(trimmedLocation));

  if (hasGiza) {
    return trimmedLocation; // موجودة بالفعل
  }

  // إزالة النقطة من النهاية إذا وجدت قبل إضافة الجيزة
  let cleanLocation = trimmedLocation.replace(/\.\s*$/, '').trim();

  // إضافة "- الجيزة"
  return cleanLocation + ' - الجيزة';
}


// ========== التحقق من بيانات الشهادة ==========
function validateCertificateData(data) {
  const errors = [];

  if (!data.persons_count || data.persons_count < 1) {
    errors.push("عدد الأفراد");
  }
  if (!data.area || data.area < 1) {
    errors.push("المساحة");
  }
  if (!data.activity) {
    errors.push("النشاط");
  }
  if (!data.name) {
    errors.push("الاسم");
  }

  if (errors.length > 0) {
    showNotification(`❌ برجاء إدخال: ${errors.join("، ")}`, "error");
    return false;
  }

  return true;
}

// ========== حفظ الشهادة ==========
async function saveCertificate() {
  const loader = Loading.save();

  try {
    const data = collectCertificateData();

    if (!validateCertificateData(data)) {
      loader.hide();
      return;
    }

    if (currentCertificateId) {
      // ========== التحقق من وجود تغييرات فعلية ==========
      const hasChanges = checkForActualChanges(data);

      if (!hasChanges) {
        loader.hide();
        showNotification("ℹ️ لا توجد تغييرات للحفظ", "info");
        return;
      }
      // ========== نهاية التحقق ==========

      loader.updateSubtitle("يتم تعديل الشهادة...");
      const result = await API.certificates.update(
        currentCertificateId,
        data,
        "تعديل البيانات",
        data.user_name
      );
      showNotification(
        `✅ تم تعديل الشهادة بنجاح!\nعدد التعديلات: ${result.edit_count}`
      );
    } else {
      loader.updateSubtitle("يتم حفظ الشهادة الجديدة...");
      const result = await API.certificates.add(data);
      currentCertificateId = result.id;
      showNotification("✅ تم حفظ الشهادة بنجاح!");
    }

    updateCertificateStatus();
    updateFeesButtonText();

    // تحديث البيانات الأصلية بعد الحفظ الناجح
    originalCertificateData = { ...data };

    setTimeout(async () => {
      await AutocompleteSystem.loadCache();
    }, CONFIG.AUTO_SAVE_DELAY);
  } catch (err) {
    console.error("خطأ في الحفظ:", err);
    showNotification("❌ حدث خطأ أثناء الحفظ", "error");
  } finally {
    loader.hide();
  }
}


// ========== دالة جديدة للتحقق من التغييرات ==========
function checkForActualChanges(newData) {
  if (!originalCertificateData) return true; // شهادة جديدة

  const fieldsToCompare = [
    'activity',
    'name',
    'location',
    'area',
    'persons_count',
    'training_fee',
    'consultant_fee',
    'evacuation_fee',
    'inspection_fee',
    'area_fee',
    'ministry_fee',
    'grand_total',
    'ministry_total',
    'protection_fee',
    'user_name'
  ];

  for (const field of fieldsToCompare) {
    const oldValue = originalCertificateData[field];
    const newValue = newData[field];

    // تطبيع القيم للمقارنة
    const normalizedOld = normalizeValue(oldValue);
    const normalizedNew = normalizeValue(newValue);

    if (normalizedOld !== normalizedNew) {
      console.log(`تغيير في الحقل "${field}": "${oldValue}" → "${newValue}"`);
      return true;
    }
  }

  return false;
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return String(value);
}

// ========== تحميل شهادة ==========
async function loadCertificate(id) {
  const loader = Loading.data("يتم تحميل الشهادة...");

  try {
    const cert = await API.certificates.getById(id);
    if (!cert) {
      showNotification("❌ الشهادة غير موجودة", "error");
      return;
    }

    currentCertificateId = cert.id;

    // حفظ البيانات الأصلية
    originalCertificateData = {
      activity: cert.activity || "",
      name: cert.name || "",
      location: cert.location || "",
      area: cert.area || 0,
      persons_count: cert.persons_count || 0,
      consultant_fee: cert.consultant_fee || 0,
      evacuation_fee: cert.evacuation_fee || 0,
      inspection_fee: cert.inspection_fee || 0,
      protection_fee: cert.protection_fee || 0, // إضافة جديدة
      user_name: cert.user_name || "",
    };

    // ملء الحقول
    const fieldMappings = {
      inputActivity: cert.activity,
      inputName: cert.name,
      inputLocation: cert.location,
      inputArea: cert.area,
      inputPersons: cert.persons_count,
      inputConsultant: cert.consultant_fee,
      inputEvacuation: cert.evacuation_fee,
      inputInspection: cert.inspection_fee,
      inputProtectionFee: cert.protection_fee, // إضافة جديدة
      inputUserName: cert.user_name,
    };

    Object.entries(fieldMappings).forEach(([id, value]) => {
      const input = Utils.getElement(id, false);
      if (input) input.value = value || "";
    });

    // تحديث المتغيرات
    currentPersonsCount = cert.persons_count || 0;
    currentConsultantFee = cert.consultant_fee || 0;
    currentEvacuationFee = cert.evacuation_fee || 0;
    currentInspectionFee = cert.inspection_fee || 0;
    currentArea = cert.area || 0;
    currentProtectionFee = cert.protection_fee || 0;

    // تحميل التواريخ
    AppState.pageDates = {
      governorate: cert.date_governorate || cert.created_at,
      training: cert.date_training || cert.created_at,
      ministry: cert.date_ministry || cert.created_at,
      certificate: cert.date_certificate || cert.created_at,
      decision: cert.date_decision || cert.created_at,
    };
    pageDates = AppState.pageDates;

    displayPageDates();
    updateCalcPreview();
    updatePageDisplayWithoutDates(cert);
    updateCertificateStatus();

    if (cert.is_modified) {
      showModificationComparison(cert);
    }

    updateFeesButtonText();
    showNotification("✅ تم تحميل الشهادة");
  } catch (err) {
    console.error("خطأ في التحميل:", err);
    showNotification("❌ حدث خطأ أثناء التحميل", "error");
  } finally {
    loader.hide();
  }
}

// ========== عرض التواريخ المحفوظة ==========
function displayPageDates() {
  Object.keys(AppState.pageDates).forEach((pageGroup) => {
    if (AppState.pageDates[pageGroup]) {
      const date = new Date(AppState.pageDates[pageGroup]);
      const dateString = DateSystem.formatArabic(date);
      Utils.$$(`.auto-date[data-page-group="${pageGroup}"]`).forEach((el) => {
        el.textContent = dateString;
      });
    }
  });
}

// ========== تحديث العرض بدون تواريخ ==========
function updatePageDisplayWithoutDates(cert) {
  const persons = cert.persons_count || 0;
  const consultant = cert.consultant_fee || 0;
  const evacuation = cert.evacuation_fee || 0;
  const inspection = cert.inspection_fee || 0;
  const area = cert.area || 0;

  const calc = FeesCalculator.calculateAll({
    persons,
    consultant,
    evacuation,
    inspection,
    area,
  });
  const ministryTotal = calc.ministryFee + calc.areaFee;



  const updates = [
    ["persons-count", persons > 0 ? toArabicNumber(persons) : ""],
    ["training-total", persons > 0 ? toArabicNumber(calc.trainingFee) : ""],
    ["consultant-fee", consultant > 0 ? toArabicNumber(consultant) : ""],
    ["evacuation-fee", evacuation > 0 ? toArabicNumber(evacuation) : ""],
    ["inspection-fee", inspection > 0 ? toArabicNumber(inspection) : ""],
    ["grand-total", calc.grandTotal > 0 ? toArabicNumber(calc.grandTotal) : ""],
    [
      "grand-total-text",
      calc.grandTotal > 0
        ? "فقط " + numberToArabicWords(calc.grandTotal) + " جنيهاً لا غير"
        : "",
    ],
    ["ministry-fee", persons > 0 ? toArabicNumber(calc.ministryFee) : ""],
    ["area-fee", area > 0 ? toArabicNumber(calc.areaFee) : ""],
    ["area-value", area > 0 ? toArabicNumber(area) : ""],
    ["ministry-total", ministryTotal > 0 ? toArabicNumber(ministryTotal) : ""],
    [
      "ministry-total-text",
      ministryTotal > 0
        ? "فقط " + numberToArabicWords(ministryTotal) + " جنيهاً لا غير"
        : "",
    ],
    // لاحظ: شلنا السطرين بتوع protection-fee من هنا
  ];

  updates.forEach(([key, value]) => {
    Utils.$$(`[data-calc="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  });

  // تحديث عرض الشهادة المؤمنة (الحماية المدنية)
  updateProtectionDisplay(cert.protection_fee || 0);

  // تحديث عرض المساحة
  ["areaValueDisplay-page4", "areaValueDisplay-page8"].forEach((id) => {
    const el = Utils.getElement(id, false);
    if (el) el.textContent = area > 0 ? toArabicNumber(area) : "";
  });

  // تحديث حقول البيانات
  const fields = [
    ["activity", cert.activity],
    ["name", cert.name],
    ["location", cert.location],
  ];

  fields.forEach(([field, value]) => {
    const valueWithDot = value
      ? value.endsWith(".")
        ? value
        : value + "."
      : ".";
    Utils.$$(`[data-field="${field}"] .field-value`).forEach((el) => {
      el.textContent = valueWithDot;
    });
  });

  adjustFieldValueFontSize();
}

// ========== شهادة جديدة ==========
function newCertificate() {
  currentCertificateId = null;
  originalCertificateData = null;

  currentPersonsCount = 0;
  currentConsultantFee = 0;
  currentEvacuationFee = 0;
  currentInspectionFee = 0;
  currentArea = 0;
  currentProtectionFee = 0; // إضافة جديدة

  // مسح الحقول
  const fieldsToClear = [
    "inputActivity",
    "inputName",
    "inputLocation",
    "inputArea",
    "inputPersons",
    "inputConsultant",
    "inputEvacuation",
    "inputInspection",
    "inputProtectionFee", // إضافة جديدة
  ];

  fieldsToClear.forEach((id) => {
    const input = Utils.getElement(id, false);
    if (input) input.value = "";
  });

  // إعادة تعيين الصفحة
  ["activity", "name", "location"].forEach((field) => {
    Utils.$$(`[data-field="${field}"] .field-value`).forEach((el) => {
      el.textContent = ".";
    });
  });

  AppState.pageDates = {
    governorate: null,
    training: null,
    ministry: null,
    certificate: null,
    decision: null,
  };
  pageDates = AppState.pageDates;

  DateSystem.initializeAll();
  updateCalcPreview();
  updateCertificateStatus();
  updateFeesButtonText();
  hideComparisonBar();

  showNotification("🆕 تم إنشاء شهادة جديدة");
}

// ========== تحديث حالة الشهادة ==========
async function updateCertificateStatus() {
  const statusContainer = Utils.getElement("certificateStatus", false);
  if (!statusContainer) return;

  if (!currentCertificateId) {
    statusContainer.innerHTML =
      '<span class="status-new">🆕 شهادة جديدة</span>';
    return;
  }

  try {
    const cert = await API.certificates.getById(currentCertificateId);
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
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

// ========== عرض مقارنة التعديلات ==========
async function showModificationComparison(cert) {
  try {
    const history = await API.certificates.getHistory(cert.id);
    if (!history || history.length === 0) return;

    let comparisonBar = Utils.getElement("modification-comparison-bar", false);
    if (!comparisonBar) {
      comparisonBar = document.createElement("div");
      comparisonBar.id = "modification-comparison-bar";
      comparisonBar.className = "modification-comparison-bar";
      document.body.appendChild(comparisonBar);
    }

    const lastEdit = history[0];
    const changedFields = lastEdit.changed_fields || [];

    comparisonBar.innerHTML = `
      <div class="comparison-header">
        <span class="comparison-icon">⚠️</span>
        <span class="comparison-title">شهادة معدلة (${toArabicNumber(
      cert.edit_count
    )} ${cert.edit_count === 1 ? "مرة" : "مرات"})</span>
        <button onclick="toggleComparisonDetails()" class="btn-toggle-comparison">📋 عرض التفاصيل</button>
        <button onclick="hideComparisonBar()" class="btn-close-comparison">✕</button>
      </div>
      
      <div id="comparisonDetails" class="comparison-details" style="display: none;">
        <div class="comparison-info">
          <span>آخر تعديل: ${formatDate(lastEdit.edited_at)}</span>
          <span>بواسطة: ${lastEdit.edited_by || "غير معروف"}</span>
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
              ${changedFields
        .map(
          (field) => `
                <tr>
                  <td class="field-name">${getFieldLabel(field.field)}</td>
                  <td class="old-value">${formatFieldValue(
            field.old_value
          )}</td>
                  <td class="arrow">←</td>
                  <td class="new-value">${formatFieldValue(
            field.new_value
          )}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>
        </div>
        
        <button onclick="showFullHistory(${cert.id
      })" class="btn-full-history">📜 عرض سجل التعديلات الكامل</button>
      </div>
    `;

    comparisonBar.classList.add("active");
  } catch (err) {
    console.error("Error showing comparison:", err);
  }
}

function toggleComparisonDetails() {
  const details = Utils.getElement("comparisonDetails", false);
  if (details) {
    details.style.display = details.style.display === "none" ? "block" : "none";
  }
}

function hideComparisonBar() {
  const bar = Utils.getElement("modification-comparison-bar", false);
  if (bar) bar.classList.remove("active");
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") {
    return '<span class="empty-value">(فارغ)</span>';
  }
  if (typeof value === "number") {
    return toArabicNumber(value);
  }
  return value;
}

function getFieldLabel(field) {
  const labels = {
    activity: "النشاط",
    name: "الاسم",
    location: "العنوان",
    area: "المساحة",
    persons_count: "عدد الأفراد",
    training_fee: "رسوم التدريب",
    consultant_fee: "رسوم الاستشاري",
    evacuation_fee: "رسوم الإخلاء",
    inspection_fee: "رسوم المعاينة",
    area_fee: "رسوم المساحة",
    ministry_fee: "رسوم الوزارة",
    grand_total: "الإجمالي الكلي",
    ministry_total: "إجمالي الوزارة",
    protection_fee: "رسوم الشهادة المؤمنة", // إضافة جديدة
    user_name: "اسم المستخدم",
  };
  return labels[field] || field;
}

function getPageLabel(pageKey) {
  const labels = {
    governorate: "رسوم المحافظة",
    training: "طلب التدريب",
    ministry: "رسوم الوزارة",
    certificate: "الشهادة المؤمنة",
    decision: "قرار الإدارة",
  };
  return labels[pageKey] || pageKey;
}

// ========== عرض سجل التعديلات ==========
async function showHistory(certificateId) {
  try {
    const history = await API.certificates.getHistory(certificateId);

    if (!history || history.length === 0) {
      showNotification("⚠️ لا يوجد سجل تعديلات", "warning");
      return;
    }

    let html = `
      <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-height: 90vh; display: flex; flex-direction: column;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; color: white; position: relative; flex-shrink: 0;">
          <button onclick="closeHistoryModal()" style="
            position: absolute;
            left: 15px;
            top: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.5);
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            padding: 0;
          " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='rotate(90deg)';" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='rotate(0deg)';">
            ×
          </button>
          
          <h2 style="margin: 0; font-size: 24px;">
            <i style="font-style: normal;">📋</i> سجل التعديلات
          </h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">
            عدد التعديلات: ${history.length}
          </p>
        </div>
        
        <div style="flex: 1; overflow-y: auto; padding: 20px; background: #f8f9fa;">
    `;

    history.forEach((h, i) => {
      const editNumber = history.length - i;
      const isRecent = i === 0;

      html += `
        <div style="
          background: white;
          border-right: 4px solid ${isRecent ? "#667eea" : "#e0e0e0"};
          padding: 15px 20px;
          margin-bottom: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        " onmouseover="this.style.transform='translateX(-5px)'" onmouseout="this.style.transform='translateX(0)'">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="
              background: ${isRecent
          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "#6c757d"
        };
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 14px;
            ">
              التعديل رقم ${editNumber}
            </div>
            ${isRecent
          ? '<span style="background: #28a745; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">الأحدث</span>'
          : ""
        }
          </div>
          
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="color: #6c757d; font-size: 14px;">
              <div style="margin-bottom: 5px;">📅 <strong>التاريخ:</strong></div>
              <div style="margin-bottom: 5px;">👤 <strong>المستخدم:</strong></div>
              ${h.edit_reason ? "<div>📝 <strong>السبب:</strong></div>" : ""}
            </div>
            <div style="font-size: 14px;">
              <div style="margin-bottom: 5px;">${formatDate(h.edited_at)}</div>
              <div style="margin-bottom: 5px; color: #667eea; font-weight: 600;">${h.edited_by || "غير معروف"
        }</div>
              ${h.edit_reason
          ? `<div style="background: #fff3cd; padding: 5px 10px; border-radius: 5px; border-right: 3px solid #ffc107;">${h.edit_reason}</div>`
          : ""
        }
            </div>
          </div>
          
          ${h.changed_fields && h.changed_fields.length > 0
          ? `
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #495057; font-size: 15px;">
                🔄 التغييرات:
              </div>
              ${h.changed_fields
            .map(
              (f) => `
                <div style="
                  background: white;
                  padding: 8px 12px;
                  margin-bottom: 6px;
                  border-radius: 5px;
                  font-size: 13px;
                  border-right: 3px solid #17a2b8;
                ">
                  <strong style="color: #495057;">${getFieldLabel(
                f.field
              )}:</strong>
                  <div style="margin-top: 4px;">
                    <span style="background: #f8d7da; color: #721c24; padding: 2px 8px; border-radius: 3px; text-decoration: line-through;">${f.old_value
                }</span>
                    <span style="margin: 0 8px; color: #6c757d;">→</span>
                    <span style="background: #d4edda; color: #155724; padding: 2px 8px; border-radius: 3px; font-weight: 600;">${f.new_value
                }</span>
                  </div>
                </div>
              `
            )
            .join("")}
            </div>
          `
          : ""
        }
        </div>
      `;
    });

    html += `
        </div>
        
        <div style="padding: 15px; background: white; border-radius: 0 0 10px 10px; text-align: center; border-top: 1px solid #e9ecef; flex-shrink: 0;">
          <button onclick="closeHistoryModal()" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)';">
            ✓ إغلاق
          </button>
        </div>
      </div>
    `;

    showHistoryModal(html);
  } catch (err) {
    console.error("Error showing history:", err);
    showNotification("❌ حدث خطأ في عرض السجل", "error");
  }
}

async function showFullHistory(certificateId) {
  const loader = Loading.data("يتم تحميل السجل...");

  try {
    const history = await window.electronAPI.certificates.getHistory(
      certificateId
    );

    if (!history || history.length === 0) {
      loader.hide();
      showNotification("⚠️ لا يوجد سجل تعديلات", "warning");
      return;
    }

    let modal = document.getElementById("full-history-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "full-history-modal";
      modal.className = "modal-overlay";
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
        <div class="history-item ${index === 0 ? "latest" : ""}">
          <div class="history-marker">
            <span class="marker-dot"></span>
            ${!isLast ? '<span class="marker-line"></span>' : ""}
          </div>
          
          <div class="history-content">
            <div class="history-header">
              <span class="history-number">التعديل رقم ${toArabicNumber(
        history.length - index
      )}</span>
              <span class="history-date">${formatDate(edit.edited_at)}</span>
            </div>
            
            <div class="history-meta">
              <span class="history-user">👤 ${edit.edited_by || "غير معروف"
        }</span>
              ${edit.edit_reason
          ? `<span class="history-reason">📝 ${edit.edit_reason}</span>`
          : ""
        }
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
                  ${changedFields
          .map(
            (field) => `
                    <tr>
                      <td>${getFieldLabel(field.field)}</td>
                      <td class="old">${formatFieldValue(field.old_value)}</td>
                      <td class="arrow">→</td>
                      <td class="new">${formatFieldValue(field.new_value)}</td>
                    </tr>
                  `
          )
          .join("")}
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
    modal.classList.add("active");
  } catch (err) {
    console.error("Error loading history:", err);
    showNotification("❌ حدث خطأ أثناء تحميل السجل", "error");
  } finally {
    loader.hide();
  }
}

function showHistoryModal(html) {
  let modal = Utils.getElement("history-modal", false);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "history-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `<div id="history-modal-content" class="history-modal-content"></div>`;
    document.body.appendChild(modal);
  }

  const content = Utils.getElement("history-modal-content", false);
  if (content) {
    content.innerHTML =
      html +
      `
      <button onclick="closeHistoryModal()" class="btn-close-modal">إغلاق</button>
    `;
  }

  modal.classList.add("active");
}

function closeHistoryModal() {
  const modal = Utils.getElement("history-modal", false);
  if (modal) modal.classList.remove("active");
}

function closeFullHistory() {
  const modal = document.getElementById("full-history-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// أضف هذه الدالة وقم باستدعائها في addAllStyles()
function addHistoryStyles() {
  if (document.getElementById("history-styles")) return;

  const style = document.createElement("style");
  style.id = "history-styles";
  style.textContent = `
    /* ========== Modal السجل الكامل ========== */
    #full-history-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
    }
    
    #full-history-modal.active {
      display: flex;
    }
    
    .history-modal-content {
      background: white;
      border-radius: 20px;
      width: 90%;
      max-width: 700px;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
      direction: rtl;
    }
    
    @keyframes modalSlideIn {
      from {
        transform: translateY(-30px) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    
    .history-modal-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .history-modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    
    .history-modal-header .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .history-modal-header .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }
    
    .history-modal-body {
      padding: 25px;
      max-height: calc(85vh - 150px);
      overflow-y: auto;
    }
    
    /* ========== Timeline ========== */
    .history-timeline {
      position: relative;
    }
    
    .history-item {
      display: flex;
      gap: 20px;
      margin-bottom: 25px;
      position: relative;
    }
    
    .history-item:last-child {
      margin-bottom: 0;
    }
    
    .history-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    
    .marker-dot {
      width: 16px;
      height: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      z-index: 2;
      flex-shrink: 0;
    }
    
    .history-item.latest .marker-dot {
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 2px 12px rgba(245, 158, 11, 0.5);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 2px 12px rgba(245, 158, 11, 0.5);
      }
      50% {
        box-shadow: 0 2px 20px rgba(245, 158, 11, 0.8);
      }
    }
    
    .marker-line {
      width: 3px;
      flex: 1;
      background: linear-gradient(to bottom, #667eea, #e2e8f0);
      margin-top: 5px;
      border-radius: 2px;
      min-height: 30px;
    }
    
    .history-content {
      flex: 1;
      background: #f8fafc;
      border-radius: 12px;
      padding: 18px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    
    .history-item.latest .history-content {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-color: #f59e0b;
    }
    
    .history-content:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateX(-3px);
    }
    
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #cbd5e1;
    }
    
    .history-number {
      font-weight: 700;
      color: #1e293b;
      font-size: 15px;
    }
    
    .history-item.latest .history-number {
      color: #92400e;
    }
    
    .history-date {
      color: #64748b;
      font-size: 13px;
      background: white;
      padding: 4px 10px;
      border-radius: 20px;
    }
    
    .history-meta {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    
    .history-user,
    .history-reason {
      font-size: 13px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .history-changes {
      margin-top: 10px;
    }
    
    /* ========== جدول المقارنة المصغر ========== */
    .mini-comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .mini-comparison-table thead {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    }
    
    .mini-comparison-table th {
      padding: 10px 12px;
      text-align: right;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .mini-comparison-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    
    .mini-comparison-table tr:last-child td {
      border-bottom: none;
    }
    
    .mini-comparison-table tr:hover {
      background: #f8fafc;
    }
    
    .mini-comparison-table .old {
      color: #dc2626;
      background: #fef2f2;
      font-weight: 500;
      border-radius: 4px;
      padding: 4px 8px;
    }
    
    .mini-comparison-table .new {
      color: #16a34a;
      background: #f0fdf4;
      font-weight: 500;
      border-radius: 4px;
      padding: 4px 8px;
    }
    
    .mini-comparison-table .arrow {
      color: #94a3b8;
      text-align: center;
      font-weight: bold;
    }
    
    .empty-value {
      color: #94a3b8;
      font-style: italic;
    }
    
    /* ========== Footer ========== */
    .history-modal-footer {
      padding: 15px 25px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: center;
    }
    
    .history-modal-footer .btn-close {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 40px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .history-modal-footer .btn-close:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    /* ========== Scrollbar ========== */
    .history-modal-body::-webkit-scrollbar {
      width: 8px;
    }
    
    .history-modal-body::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    
    .history-modal-body::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 4px;
    }
    
    .history-modal-body::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #5a67d8, #6b46c1);
    }
    
    /* ========== شريط المقارنة (Comparison Bar) ========== */
    .modification-comparison-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-bottom: 3px solid #f59e0b;
      padding: 0;
      z-index: 9999;
      display: none;
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
    }
    
    .modification-comparison-bar.active {
      display: block;
      animation: slideDown 0.3s ease;
    }
    
    .comparison-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 20px;
      direction: rtl;
    }
    
    .comparison-icon {
      font-size: 24px;
    }
    
    .comparison-title {
      font-weight: 700;
      color: #92400e;
      font-size: 15px;
    }
    
    .btn-toggle-comparison {
      background: white;
      border: 2px solid #f59e0b;
      color: #92400e;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: auto;
    }
    
    .btn-toggle-comparison:hover {
      background: #f59e0b;
      color: white;
    }
    
    .btn-close-comparison {
      background: transparent;
      border: none;
      color: #92400e;
      font-size: 20px;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 5px;
      transition: all 0.2s;
    }
    
    .btn-close-comparison:hover {
      background: rgba(146, 64, 14, 0.1);
    }
    
    .comparison-details {
      background: white;
      padding: 20px;
      border-top: 1px solid #fcd34d;
      direction: rtl;
    }
    
    .comparison-info {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      color: #78716c;
      font-size: 13px;
    }
    
    .comparison-table-container {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 15px;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    .comparison-table th {
      background: #f8fafc;
      padding: 12px;
      text-align: right;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .comparison-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .comparison-table .field-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    .comparison-table .old-value {
      color: #dc2626;
      background: #fef2f2;
      padding: 5px 10px;
      border-radius: 5px;
    }
    
    .comparison-table .new-value {
      color: #16a34a;
      background: #f0fdf4;
      padding: 5px 10px;
      border-radius: 5px;
    }
    
    .comparison-table .arrow {
      color: #94a3b8;
      text-align: center;
    }
    
    .btn-full-history {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: block;
      margin: 0 auto;
    }
    
    .btn-full-history:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
  `;

  document.head.appendChild(style);
}

// ========== نظام الفهرسة المتقدمة (Trie) ==========
// يعمل في الذاكرة فقط - لا يمس قاعدة البيانات
class TrieNode {
  constructor() {
    this.children = new Map();
    this.items = new Set(); // العناصر الكاملة التي تحتوي هذا الـ prefix
    this.isEndOfWord = false;
  }
}

class TrieIndex {
  constructor() {
    this.root = new TrieNode();
    this.allItems = [];
  }

  // تطبيع النص للبحث
  normalize(text) {
    return NumberConverter.normalize(text || "").toLowerCase();
  }

  // إضافة عنصر للفهرس
  insert(originalItem) {
    if (!originalItem) return;

    const normalized = this.normalize(originalItem);
    this.allItems.push(originalItem);

    // فهرسة كل الـ substrings للبحث في أي مكان
    for (let startPos = 0; startPos < normalized.length; startPos++) {
      let node = this.root;

      for (let i = startPos; i < normalized.length; i++) {
        const char = normalized[i];

        if (!node.children.has(char)) {
          node.children.set(char, new TrieNode());
        }

        node = node.children.get(char);
        node.items.add(originalItem);
      }

      node.isEndOfWord = true;
    }
  }

  // البحث السريع
  search(query, maxResults = 8) {
    if (!query) return [];

    const normalized = this.normalize(query);
    let node = this.root;

    // التنقل في الـ Trie
    for (const char of normalized) {
      if (!node.children.has(char)) {
        return []; // لا توجد نتائج
      }
      node = node.children.get(char);
    }

    // الحصول على النتائج
    const results = Array.from(node.items);

    // ترتيب: الأقصر والذي يبدأ بالنص أولاً
    results.sort((a, b) => {
      const aNorm = this.normalize(a);
      const bNorm = this.normalize(b);
      const aStarts = aNorm.startsWith(normalized);
      const bStarts = bNorm.startsWith(normalized);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.length - b.length;
    });

    return results.slice(0, maxResults);
  }

  // مسح الفهرس
  clear() {
    this.root = new TrieNode();
    this.allItems = [];
  }

  // عدد العناصر المفهرسة
  get size() {
    return this.allItems.length;
  }
}

// ========== نظام الاقتراحات ==========
const AutocompleteSystem = {
  cache: {
    activities: [],
    names: [],
    locations: [],
    lastUpdate: null,
  },

  // فهارس Trie للبحث السريع
  indexes: {
    activities: new TrieIndex(),
    names: new TrieIndex(),
    locations: new TrieIndex(),
  },

  // منع إعادة ظهور الاقتراحات بعد الاختيار
  isSelecting: false,

  async loadCache() {
    try {
      if (!API.ready) return;

      // ⭐ استخدام getUniqueValues مباشرة من SQL - أسرع بكثير!
      // بدلاً من تحميل كل الشهادات ثم استخراج القيم الفريدة
      const [activities, names, locations] = await Promise.all([
        API.certificates.getUniqueValues('activity', { status: 'active' }),
        API.certificates.getUniqueValues('name', { status: 'active' }),
        API.certificates.getUniqueValues('location', { status: 'active' })
      ]);

      this.cache = {
        activities: activities || [],
        names: names || [],
        locations: locations || [],
        lastUpdate: Date.now(),
      };

      // بناء فهارس Trie للبحث السريع
      this.buildIndexes();

      // تحديث الـ cache العام
      AppState.cache.suggestions = this.cache;

      console.log(`✅ تم بناء فهارس البحث: ${this.indexes.activities.size} نشاط، ${this.indexes.names.size} اسم، ${this.indexes.locations.size} عنوان`);
    } catch (err) {
      console.error("Error loading suggestions cache:", err);
    }
  },

  // بناء فهارس Trie من الـ cache
  buildIndexes() {
    // مسح الفهارس القديمة
    this.indexes.activities.clear();
    this.indexes.names.clear();
    this.indexes.locations.clear();

    // بناء فهارس جديدة
    this.cache.activities.forEach(item => this.indexes.activities.insert(item));
    this.cache.names.forEach(item => this.indexes.names.insert(item));
    this.cache.locations.forEach(item => this.indexes.locations.insert(item));
  },

  search(query, type) {
    if (!query || query.length < CONFIG.MIN_SEARCH_LENGTH) return [];

    // استخدام فهرس Trie للبحث السريع
    const index = this.indexes[type];
    if (index && index.size > 0) {
      return index.search(query, CONFIG.MAX_SUGGESTIONS);
    }

    // fallback للبحث العادي لو الفهرس فاضي
    const list = this.cache[type] || [];
    const normalizedQuery = NumberConverter.normalize(query);
    const maxResults = CONFIG.MAX_SUGGESTIONS;

    const startsWithMatches = [];
    const containsMatches = [];

    for (let i = 0; i < list.length; i++) {
      if (startsWithMatches.length >= maxResults) break;

      const item = list[i];
      const normalizedItem = NumberConverter.normalize(item);

      if (normalizedItem.startsWith(normalizedQuery)) {
        startsWithMatches.push(item);
      } else if (normalizedItem.includes(normalizedQuery)) {
        if (startsWithMatches.length + containsMatches.length < maxResults) {
          containsMatches.push(item);
        }
      }
    }

    const results = [...startsWithMatches, ...containsMatches];
    results.sort((a, b) => a.length - b.length);
    return results.slice(0, maxResults);
  },

  setup(inputId, type) {
    const input = Utils.getElement(inputId, false);
    if (!input || input.dataset.autocompleteInitialized === "true") return;

    input.dataset.autocompleteInitialized = "true";

    // إنشاء dropdown
    let dropdown = Utils.getElement(`${inputId}-suggestions`, false);
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = `${inputId}-suggestions`;
      dropdown.className = "suggestions-dropdown";
      input.parentNode.style.position = "relative";
      input.parentNode.appendChild(dropdown);
    }

    let selectedIndex = -1;

    const debouncedSearch = Utils.debounce((query) => {
      const suggestions = this.search(query, type);
      this.showSuggestions(inputId, suggestions);
    }, CONFIG.DEBOUNCE_DELAY);

    // Input handler
    const inputHandler = () => {
      // تجاهل الـ input event بعد اختيار اقتراح
      if (AutocompleteSystem.isSelecting) {
        return;
      }

      selectedIndex = -1;
      const query = input.value.trim();

      if (query.length < CONFIG.MIN_SEARCH_LENGTH) {
        this.hideSuggestions(inputId);
        return;
      }

      debouncedSearch(query);
    };

    // Focus handler
    const focusHandler = () => {
      // تجاهل الـ focus بعد اختيار اقتراح
      if (AutocompleteSystem.isSelecting) {
        return;
      }

      const query = input.value.trim();
      if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
        const suggestions = this.search(query, type);
        this.showSuggestions(inputId, suggestions);
      }
    };

    // Keydown handler
    const keydownHandler = (e) => {
      if (!dropdown.classList.contains("active")) return;

      const items = dropdown.querySelectorAll(".suggestion-item");
      if (items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          this.updateSelection(items, selectedIndex);
          break;

        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          this.updateSelection(items, selectedIndex);
          break;

        case "Enter":
          if (selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            e.stopPropagation();
            this.selectSuggestion(inputId, items[selectedIndex].dataset.value);
            selectedIndex = -1;
          }
          break;

        case "Escape":
          e.preventDefault();
          this.hideSuggestions(inputId);
          selectedIndex = -1;
          break;

        case "Tab":
          this.hideSuggestions(inputId);
          selectedIndex = -1;
          break;
      }
    };

    // Document click handler
    const documentClickHandler = (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        this.hideSuggestions(inputId);
        selectedIndex = -1;
      }
    };

    // Dropdown click handler
    const dropdownClickHandler = (e) => {
      const item = e.target.closest(".suggestion-item");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(inputId, item.dataset.value);
        selectedIndex = -1;
      }
    };

    // إضافة الـ listeners
    input.addEventListener("input", inputHandler);
    input.addEventListener("focus", focusHandler);
    input.addEventListener("keydown", keydownHandler);
    dropdown.addEventListener("click", dropdownClickHandler);
    document.addEventListener("click", documentClickHandler);

    // حفظ للتنظيف
    input._autocompleteHandlers = {
      inputHandler,
      focusHandler,
      keydownHandler,
      dropdownClickHandler,
      documentClickHandler,
    };
  },

  showSuggestions(inputId, suggestions) {
    const dropdown = Utils.getElement(`${inputId}-suggestions`, false);
    if (!dropdown) return;

    if (suggestions.length === 0) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    const input = Utils.getElement(inputId, false);
    const currentValue = input?.value.toLowerCase() || "";

    dropdown.innerHTML = suggestions
      .map((item, index) => {
        const normalizedItem = NumberConverter.normalize(item);
        const normalizedQuery = NumberConverter.normalize(currentValue);
        const matchIndex = normalizedItem.indexOf(normalizedQuery);

        let highlightedText = item;
        if (matchIndex !== -1) {
          const before = item.substring(0, matchIndex);
          const match = item.substring(
            matchIndex,
            matchIndex + currentValue.length
          );
          const after = item.substring(matchIndex + currentValue.length);
          highlightedText = `${before}<mark>${match}</mark>${after}`;
        }

        return `<div class="suggestion-item" data-index="${index}" data-value="${item}">${highlightedText}</div>`;
      })
      .join("");

    dropdown.classList.add("active");
  },

  hideSuggestions(inputId) {
    const dropdown = Utils.getElement(`${inputId}-suggestions`, false);
    if (dropdown) dropdown.classList.remove("active");
  },

  updateSelection(items, index) {
    items.forEach((item, i) => {
      item.classList.toggle("selected", i === index);
    });

    if (index >= 0 && items[index]) {
      items[index].scrollIntoView({ block: "nearest" });
    }
  },

  selectSuggestion(inputId, value) {
    const input = Utils.getElement(inputId, false);
    if (input) {
      // تفعيل الـ flag لمنع إعادة ظهور الاقتراحات
      this.isSelecting = true;

      // إخفاء الاقتراحات أولاً
      this.hideSuggestions(inputId);

      // تعيين القيمة وإرسال الـ event
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();

      // إعادة تعيين الـ flag بعد فترة قصيرة
      setTimeout(() => {
        this.isSelecting = false;
      }, 100);
    }
  },

  cleanup(inputId) {
    const input = Utils.getElement(inputId, false);
    if (!input) return;

    const handlers = input._autocompleteHandlers;
    if (handlers) {
      input.removeEventListener("input", handlers.inputHandler);
      input.removeEventListener("focus", handlers.focusHandler);
      input.removeEventListener("keydown", handlers.keydownHandler);
      document.removeEventListener("click", handlers.documentClickHandler);

      const dropdown = Utils.getElement(`${inputId}-suggestions`, false);
      if (dropdown) {
        dropdown.removeEventListener("click", handlers.dropdownClickHandler);
        dropdown.remove();
      }

      delete input._autocompleteHandlers;
    }

    input.dataset.autocompleteInitialized = "false";
  },
};

// Aliases
const loadSuggestionsCache = () => AutocompleteSystem.loadCache();
const setupAutocomplete = (id, type) => AutocompleteSystem.setup(id, type);
const cleanupAutocomplete = (id) => AutocompleteSystem.cleanup(id);

// تحديث الـ cache العالمي
let suggestionsCache = AutocompleteSystem.cache;

// ========== نظام الطباعة ==========
const PrintSystem = {
  isPrinting: false,

  prepare() {
    Utils.$$(
      ".fees-btn, .btn-certificates, .btn-new, .btn-stats, .btn-save, #certificateStatus, .popup-overlay, .modal-overlay"
    ).forEach((el) => {
      el.setAttribute("data-print-hidden", "true");
      el.style.display = "none";
    });

    document.body.classList.add("printing-mode");
  },

  restore() {
    Utils.$$('[data-print-hidden="true"]').forEach((el) => {
      el.removeAttribute("data-print-hidden");
      el.style.display = "";
    });

    document.body.classList.remove("printing-mode");
  },

  async print() {
    if (this.isPrinting) {
      showNotification("⏳ جاري الطباعة...", "warning");
      return;
    }

    this.isPrinting = true;
    const loader = Loading.print("يتم إرسال المستند للطابعة...");

    try {
      this.prepare();

      if (API.print) {
        await API.print.printPage();
        showNotification("✅ تم إرسال المستند للطابعة");
      } else {
        window.print();
      }
    } catch (err) {
      console.error("Print error:", err);
      showNotification("❌ حدث خطأ أثناء الطباعة", "error");
    } finally {
      this.restore();
      this.isPrinting = false;
      loader.hide();
    }
  },

  async printPages(pageNumbers = []) {
    if (this.isPrinting) return;

    this.isPrinting = true;
    const loader = Loading.print("يتم تجهيز الصفحات للطباعة...");

    // حفظ حالة الصفحات الأصلية
    const originalStyles = new Map();

    try {
      // إخفاء الصفحات غير المطلوبة بشكل قوي
      Utils.$$(".page").forEach((page, index) => {
        const pageNum = index + 1;

        // حفظ الحالة الأصلية
        originalStyles.set(page, {
          display: page.style.display,
          visibility: page.style.visibility,
          height: page.style.height,
          overflow: page.style.overflow,
          position: page.style.position,
        });

        if (pageNumbers.length === 0 || pageNumbers.includes(pageNum)) {
          // الصفحات المطلوبة - تأكد من ظهورها
          page.style.display = "block";
          page.style.visibility = "visible";
          page.classList.remove("print-hidden");
        } else {
          // الصفحات غير المطلوبة - إخفاء تام
          page.style.display = "none !important";
          page.style.visibility = "hidden";
          page.style.height = "0";
          page.style.overflow = "hidden";
          page.style.position = "absolute";
          page.classList.add("print-hidden");
          page.setAttribute("data-print-hidden-page", "true");
        }
      });

      // إضافة CSS مؤقت للطباعة
      const tempStyle = document.createElement("style");
      tempStyle.id = "temp-print-style";
      tempStyle.textContent = `
      @media print {
        .print-hidden,
        [data-print-hidden-page="true"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          left: -9999px !important;
          page-break-before: avoid !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        
        .page:not(.print-hidden):not([data-print-hidden-page="true"]) {
          display: block !important;
          visibility: visible !important;
          page-break-after: always;
        }
      }
    `;
      document.head.appendChild(tempStyle);

      this.prepare();

      // انتظار أطول للتأكد من تطبيق التغييرات
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (API.print) {
        await API.print.printPage();
      } else {
        window.print();
      }

      showNotification(
        `✅ تم إرسال ${pageNumbers.length || "كل"} الصفحات للطابعة`
      );
    } catch (err) {
      console.error("Print selected pages error:", err);
      showNotification("❌ حدث خطأ أثناء الطباعة", "error");
    } finally {
      // إزالة CSS المؤقت
      const tempStyle = document.getElementById("temp-print-style");
      if (tempStyle) tempStyle.remove();

      // استعادة الحالة الأصلية لكل الصفحات
      Utils.$$(".page").forEach((page) => {
        const original = originalStyles.get(page);
        if (original) {
          page.style.display = original.display;
          page.style.visibility = original.visibility;
          page.style.height = original.height;
          page.style.overflow = original.overflow;
          page.style.position = original.position;
        }
        page.classList.remove("print-hidden");
        page.removeAttribute("data-print-hidden-page");
      });

      this.restore();
      this.isPrinting = false;
      loader.hide();
    }
  },

  async exportPDF(options = {}) {
    if (this.isPrinting) {
      showNotification("⏳ جاري التصدير...", "warning");
      return;
    }

    this.isPrinting = true;
    const loader = Loading.pdf("يتم تجهيز الملف...");

    const pageNumbers = options.pageNumbers || [];
    const originalStyles = new Map();

    try {
      // إخفاء الصفحات غير المطلوبة
      Utils.$$(".page").forEach((page, index) => {
        const pageNum = index + 1;

        // حفظ الحالة الأصلية
        originalStyles.set(page, {
          display: page.style.display,
          visibility: page.style.visibility,
          height: page.style.height,
          overflow: page.style.overflow,
          position: page.style.position,
        });

        if (pageNumbers.length === 0 || pageNumbers.includes(pageNum)) {
          page.style.display = "block";
          page.style.visibility = "visible";
          page.classList.remove("print-hidden");
        } else {
          page.style.display = "none";
          page.style.visibility = "hidden";
          page.style.height = "0";
          page.style.overflow = "hidden";
          page.classList.add("print-hidden");
          page.setAttribute("data-print-hidden-page", "true");
        }
      });

      // إضافة CSS مؤقت
      const tempStyle = document.createElement("style");
      tempStyle.id = "temp-pdf-style";
      tempStyle.textContent = `
      .print-hidden,
      [data-print-hidden-page="true"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }
    `;
      document.head.appendChild(tempStyle);

      this.prepare();

      await new Promise((resolve) => setTimeout(resolve, 300));

      // تحديد اسم الملف
      const activity =
        Utils.$('[data-field="activity"] .field-value')
          ?.textContent?.replace(/\.$/, "")
          .trim() || "";
      const name =
        Utils.$('[data-field="name"] .field-value')
          ?.textContent?.replace(/\.$/, "")
          .trim() || "";
      const dateStr = DateSystem.formatForFileName();

      let fileName = "شهادة";
      if (name) fileName = name;
      else if (activity) fileName = activity;

      if (pageNumbers.length > 0 && pageNumbers.length < 5) {
        fileName += `_صفحات_${pageNumbers.join("-")}`;
      }
      fileName += `_${dateStr}.pdf`;

      loader.updateSubtitle("يتم إنشاء ملف PDF...");

      if (
        window.electronAPI &&
        window.electronAPI.print &&
        window.electronAPI.print.exportPDF
      ) {
        // استخدام Electron API
        const result = await window.electronAPI.print.exportPDF({ fileName });

        if (result.success) {
          showNotification("✅ تم تصدير PDF بنجاح!");
        } else if (!result.canceled) {
          throw new Error("فشل التصدير");
        }
      } else {
        // Fallback - استخدام المكتبات
        await this.exportPDFWithLibraries(fileName, loader, pageNumbers);
      }
    } catch (err) {
      console.error("Export PDF error:", err);
      showNotification("❌ حدث خطأ أثناء التصدير", "error");
    } finally {
      // إزالة CSS المؤقت
      const tempStyle = document.getElementById("temp-pdf-style");
      if (tempStyle) tempStyle.remove();

      // استعادة الحالة الأصلية
      Utils.$$(".page").forEach((page) => {
        const original = originalStyles.get(page);
        if (original) {
          page.style.display = original.display;
          page.style.visibility = original.visibility;
          page.style.height = original.height;
          page.style.overflow = original.overflow;
          page.style.position = original.position;
        }
        page.classList.remove("print-hidden");
        page.removeAttribute("data-print-hidden-page");
      });

      this.restore();
      this.isPrinting = false;
      loader.hide();
    }
  },

  async exportPDFWithLibraries(fileName, loader, pageNumbers = []) {
    // تحميل المكتبات إذا لزم الأمر
    if (typeof html2canvas === "undefined") {
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
      );
    }
    if (typeof jspdf === "undefined") {
      await this.loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      );
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const allPages = Utils.$$(".page");

    // تصفية الصفحات المطلوبة فقط
    const pagesToExport = [];
    allPages.forEach((page, index) => {
      const pageNum = index + 1;
      // إذا لم يتم تحديد صفحات، أو إذا كانت الصفحة في القائمة المطلوبة
      if (pageNumbers.length === 0 || pageNumbers.includes(pageNum)) {
        // تأكد من أن الصفحة ليست مخفية
        if (
          !page.classList.contains("print-hidden") &&
          page.getAttribute("data-print-hidden-page") !== "true"
        ) {
          pagesToExport.push({ page, pageNum });
        }
      }
    });

    if (pagesToExport.length === 0) {
      showNotification("⚠️ لا توجد صفحات للتصدير", "warning");
      return;
    }

    let isFirstPage = true;

    for (let i = 0; i < pagesToExport.length; i++) {
      const { page, pageNum } = pagesToExport[i];
      const progress = ((i + 1) / pagesToExport.length) * 100;

      loader.updateSubtitle(
        `يتم معالجة الصفحة ${pageNum} (${i + 1} من ${pagesToExport.length})...`
      );
      loader.updateProgress(progress);

      // تأكد من ظهور الصفحة قبل التقاطها
      const originalDisplay = page.style.display;
      const originalVisibility = page.style.visibility;
      page.style.display = "block";
      page.style.visibility = "visible";

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
      });

      // استعادة الحالة
      page.style.display = originalDisplay;
      page.style.visibility = originalVisibility;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    loader.updateSubtitle("يتم حفظ الملف...");
    pdf.save(fileName);
    showNotification(`✅ تم تصدير ${pagesToExport.length} صفحة بنجاح!`);
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },
};

// Aliases
const printDocument = () => PrintSystem.print();
const printSelectedPages = (pages) => PrintSystem.printPages(pages);
const exportToPDF = (opts) => PrintSystem.exportPDF(opts);

// ========== خيارات الطباعة ==========
function showPrintOptions() {
  let modal = Utils.getElement("print-options-modal", false);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "print-options-modal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="print-modal-content">
      <div class="print-modal-header">
        <h3>🖨️ خيارات الطباعة</h3>
        <button onclick="closePrintOptions()" class="close-btn">&times;</button>
      </div>
      
      <div class="print-modal-body">
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
        
        <div class="print-section">
          <h4>خيارات إضافية</h4>
          <div class="print-options-grid">
            <label class="print-checkbox">
              <input type="checkbox" id="printBackground" checked>
              <span>طباعة الخلفيات والألوان</span>
            </label>
          </div>
        </div>
        
        <div class="print-preview-section">
          <h4>معاينة</h4>
          <div id="printPreviewInfo" class="print-preview-info">
            سيتم طباعة: كل الصفحات (5 صفحات)
          </div>
        </div>
      </div>
      
      <div class="print-modal-footer">
        <button onclick="closePrintOptions()" class="btn-cancel">إلغاء</button>
        <button onclick="exportFromModal()" class="btn-export-pdf">📄 تصدير PDF</button>
        <button onclick="printFromModal()" class="btn-print">🖨️ طباعة</button>
      </div>
      
      <div class="shortcuts-hint">
        <span>Ctrl+P طباعة</span>
        <span>Ctrl+E تصدير PDF</span>
        <span>Ctrl+S حفظ</span>
        <span>Ctrl+N جديد</span>
      </div>
    </div>
  `;

  modal.classList.add("active");
  updatePrintPreview();
}

function closePrintOptions() {
  const modal = Utils.getElement("print-options-modal", false);
  if (modal) modal.classList.remove("active");
}

function updatePrintPreview() {
  const selected = Utils.$('input[name="printPages"]:checked')?.value || "all";
  const previewEl = Utils.getElement("printPreviewInfo", false);

  if (!previewEl) return;

  const pageNames = {
    1: "رسوم المحافظة",
    2: "طلب التدريب",
    3: "رسوم الوزارة",
    4: "الشهادة المؤمنة",
    5: "قرار الإدارة",
  };

  let text = "";
  switch (selected) {
    case "all":
      text = "سيتم طباعة: كل الصفحات (5 صفحات)";
      break;
    case "custom":
      const customInput =
        Utils.getElement("customPagesInput", false)?.value || "";
      text = `سيتم طباعة: الصفحات ${customInput || "(حدد الصفحات)"}`;
      break;
    default:
      text = `سيتم طباعة: صفحة ${selected} - ${pageNames[selected]}`;
  }

  previewEl.textContent = text;
}

async function printFromModal() {
  if (!ValidationSystem.validate()) {
    closePrintOptions();
    openFeesPopup();
    return;
  }

  showNotification("💾 جاري الحفظ قبل الطباعة...");
  await saveCertificate();

  const selected = Utils.$('input[name="printPages"]:checked')?.value || "all";
  closePrintOptions();

  if (selected === "all") {
    await PrintSystem.print();
  } else if (selected === "custom") {
    const customInput =
      Utils.getElement("customPagesInput", false)?.value || "";
    const pages = customInput
      .split(",")
      .map((p) => parseInt(p.trim()))
      .filter((p) => !isNaN(p) && p >= 1 && p <= 5);

    if (pages.length === 0) {
      showNotification("⚠️ برجاء تحديد صفحات صحيحة", "warning");
      return;
    }
    await PrintSystem.printPages(pages);
  } else {
    await PrintSystem.printPages([parseInt(selected)]);
  }
}

async function exportFromModal() {
  if (!ValidationSystem.validate()) {
    closePrintOptions();
    openFeesPopup();
    return;
  }

  showNotification("💾 جاري الحفظ قبل التصدير...");
  await saveCertificate();

  const selected = Utils.$('input[name="printPages"]:checked')?.value || "all";
  closePrintOptions();

  if (selected === "all") {
    await PrintSystem.exportPDF();
  } else if (selected === "custom") {
    const customInput =
      Utils.getElement("customPagesInput", false)?.value || "";
    const pages = customInput
      .split(",")
      .map((p) => parseInt(p.trim()))
      .filter((p) => !isNaN(p) && p >= 1 && p <= 5);

    if (pages.length === 0) {
      showNotification("⚠️ برجاء تحديد صفحات صحيحة", "warning");
      return;
    }
    await PrintSystem.exportPDF({ pageNumbers: pages });
  } else {
    await PrintSystem.exportPDF({ pageNumbers: [parseInt(selected)] });
  }
}

// ========== نظام الاختصارات ==========
const KeyboardShortcuts = {
  handlers: new Map(),

  init() {
    document.removeEventListener("keydown", this.handleKeydown);
    document.addEventListener("keydown", this.handleKeydown.bind(this), {
      capture: true,
    });
    console.log("✅ تم تفعيل اختصارات لوحة المفاتيح");
  },

  handleKeydown(e) {
    // Ctrl + Key shortcuts
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();

      const shortcuts = {
        s: async () => {
          if (ValidationSystem.validate()) {
            showNotification("💾 جاري الحفظ... (Ctrl+S)");
            await saveCertificate();
          }
        },
        p: () => showPrintOptions(),
        e: () => exportToPDF(),
        n: () => {
          const activeElement = document.activeElement;
          const isTyping =
            activeElement &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" ||
              activeElement.isContentEditable);
          if (!isTyping) newCertificate();
          else return false;
        },
        f: () => {
          openCertificatesModal();
          setTimeout(() => {
            Utils.getElement("searchCerts", false)?.focus();
          }, 100);
        },
      };

      if (shortcuts[key]) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const result = shortcuts[key]();
        if (result === false) return;
        return false;
      }
    }

    // Escape - إغلاق الـ modals
    if (e.key === "Escape") {
      closeAllModals();
    }
  },

  cleanup() {
    document.removeEventListener("keydown", this.handleKeydown);
  },
};

function setupKeyboardShortcuts() {
  KeyboardShortcuts.init();

  // استقبال اختصارات لوحة المفاتيح من Electron
  if (window.electronAPI && window.electronAPI.onShortcut) {
    window.electronAPI.onShortcut('shortcut-save', async () => {
      console.log('📌 Ctrl+S من Electron');
      if (ValidationSystem.validate()) {
        showNotification("💾 جاري الحفظ... (Ctrl+S)");
        await saveCertificate();
      }
    });

    window.electronAPI.onShortcut('shortcut-print', () => {
      console.log('📌 Ctrl+P من Electron');
      showPrintOptions();
    });

    window.electronAPI.onShortcut('shortcut-export-pdf', () => {
      console.log('📌 Ctrl+E من Electron');
      exportToPDF();
    });

    window.electronAPI.onShortcut('shortcut-new', () => {
      console.log('📌 Ctrl+N من Electron');
      const activeElement = document.activeElement;
      const isTyping = activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);
      if (!isTyping) {
        newCertificate();
      }
    });

    window.electronAPI.onShortcut('shortcut-search', () => {
      console.log('📌 Ctrl+F من Electron');
      openCertificatesModal();
      setTimeout(() => {
        Utils.getElement("searchCerts", false)?.focus();
      }, 100);
    });

    console.log('✅ تم ربط اختصارات Electron');
  }
}

function closeAllModals() {
  closePrintOptions();
  closeCertsModal();
  closeFeesPopup();
  closeStatsModal();
  closeFullHistory();
  closeHistoryModal();
  ValidationSystem.closeModal();

  const modals = ["delete-confirm-modal", "history-modal"];
  modals.forEach((id) => {
    const modal = Utils.getElement(id, false);
    if (modal) modal.style.display = "none";
  });
}

// ========== قائمة الشهادات مع Pagination ==========
const CertificatesListState = {
  currentPage: 0,
  pageSize: 50,           // عدد الشهادات في كل صفحة
  totalCount: 0,
  loadedCerts: [],
  isLoading: false,
  hasMore: true,
  searchMode: false,
  lastSearchTerm: ''
};

async function openCertificatesModal() {
  const modal = Utils.getElement("certsModal", false);
  if (modal) modal.classList.add("active");
  document.body.classList.add("modal-open");

  // إعادة تعيين الحالة عند فتح النافذة
  CertificatesListState.currentPage = 0;
  CertificatesListState.loadedCerts = [];
  CertificatesListState.hasMore = true;
  CertificatesListState.searchMode = false;
  CertificatesListState.lastSearchTerm = '';

  await showCertificatesList();
}

function closeCertsModal() {
  const modal = Utils.getElement("certsModal", false);
  if (modal) modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function showCertificatesList(append = false) {
  if (CertificatesListState.isLoading) return;

  const container = Utils.getElement("certsListContainer", false);
  if (!container) return;

  // عرض مؤشر التحميل
  if (!append) {
    container.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل الشهادات...</div>';
  }

  CertificatesListState.isLoading = true;

  try {
    // جلب العدد الإجمالي أولاً (مرة واحدة فقط)
    if (!append) {
      CertificatesListState.totalCount = await API.certificates.getCount({ status: "active" });
    }

    // جلب صفحة واحدة فقط من الشهادات
    const certs = await API.certificates.getAll({
      status: "active",
      limit: CertificatesListState.pageSize,
      offset: CertificatesListState.currentPage * CertificatesListState.pageSize
    });

    // تحديث الحالة
    if (append) {
      CertificatesListState.loadedCerts = [...CertificatesListState.loadedCerts, ...certs];
    } else {
      CertificatesListState.loadedCerts = certs;
    }

    CertificatesListState.hasMore = certs.length === CertificatesListState.pageSize;

    renderCertificatesList(CertificatesListState.loadedCerts, !append);

  } catch (err) {
    console.error("Error loading certificates:", err);
    showNotification("❌ حدث خطأ أثناء تحميل الشهادات", "error");
  } finally {
    CertificatesListState.isLoading = false;
  }
}

async function loadMoreCertificates() {
  if (!CertificatesListState.hasMore || CertificatesListState.isLoading) return;

  CertificatesListState.currentPage++;
  await showCertificatesList(true);
}

function renderCertificatesList(certs, resetScroll = true) {
  const container = Utils.getElement("certsListContainer", false);
  if (!container) return;

  if (!certs || certs.length === 0) {
    container.innerHTML = '<p class="no-data">لا توجد شهادات</p>';
    return;
  }

  let html = '<div class="certs-list">';

  certs.forEach((cert) => {
    const modifiedClass = cert.is_modified ? "modified" : "original";
    const modifiedBadge = cert.is_modified
      ? `<span class="badge modified">⚠️ معدلة ${cert.edit_count}x</span>`
      : '<span class="badge original">✅ أصلية</span>';

    html += `
      <div class="cert-item ${modifiedClass}" onclick="loadAndClose(${cert.id})">
        <div class="cert-header">
          <span class="cert-id">#${cert.id}</span>
          ${modifiedBadge}
        </div>
        <div class="cert-name">${cert.name || "بدون اسم"}</div>
        <div class="cert-activity">${cert.activity || "-"}</div>
        <div class="cert-footer">
          <span class="cert-date">${formatDate(cert.created_at)}</span>
          <span class="cert-total">${toArabicNumber(cert.grand_total || 0)} ج</span>
        </div>
        <div class="cert-actions">
          <button onclick="event.stopPropagation(); showHistory(${cert.id})" class="btn-sm">📜 السجل</button>
          <button onclick="event.stopPropagation(); openNonPaymentModal(${cert.id})" class="btn-sm warning" title="تحويل لعدم دفع رسوم">
            ${cert.has_non_payment ? '📋 عدم دفع ✓' : '⚠️ عدم دفع'}
          </button>
          <button onclick="event.stopPropagation(); confirmDelete(${cert.id})" class="btn-sm danger">🗑️</button>
        </div>
      </div>
    `;
  });

  html += "</div>";

  // Loading indicator for infinite scroll
  if (CertificatesListState.hasMore) {
    html += '<div class="infinite-scroll-loader" id="infiniteScrollLoader">⏳ جاري تحميل المزيد...</div>';
  }

  container.innerHTML = html;

  // إعادة التمرير لأعلى عند التحميل الأول
  if (resetScroll) {
    container.scrollTop = 0;
  }

  // Setup infinite scroll listener
  setupInfiniteScroll();

  // تحديث آخر نتائج البحث
  AppState.cache.lastSearchResults = certs;
}

// إعداد infinite scroll
function setupInfiniteScroll() {
  const container = Utils.getElement("certsListContainer", false);
  if (!container) return;

  // إزالة المستمع القديم إن وجد
  container.removeEventListener('scroll', handleInfiniteScroll);
  // إضافة المستمع الجديد
  container.addEventListener('scroll', handleInfiniteScroll);
}

// معالجة حدث التمرير للـ infinite scroll
function handleInfiniteScroll() {
  const container = Utils.getElement("certsListContainer", false);
  if (!container) return;

  // التحقق من أننا وصلنا لنهاية القائمة (قبل 100 بكسل)
  const scrollPosition = container.scrollTop + container.clientHeight;
  const scrollHeight = container.scrollHeight;

  if (scrollPosition >= scrollHeight - 100) {
    // وصلنا للنهاية، تحميل المزيد
    loadMoreCertificates();
  }
}

async function loadAndClose(id) {
  await loadCertificate(id);
  closeCertsModal();
}

// ========== البحث ==========
let advancedSearchOpen = false;
let lastSearchResults = [];

function toggleAdvancedSearch() {
  advancedSearchOpen = !advancedSearchOpen;
  const panel = Utils.getElement("advancedSearchPanel", false);
  const btn = Utils.getElement("btnToggleAdvanced", false);

  if (panel) panel.classList.toggle("active", advancedSearchOpen);
  if (btn)
    btn.textContent = advancedSearchOpen
      ? "⬆️ إخفاء البحث المتقدم"
      : "⚙️ بحث متقدم";
}

async function searchCertificatesUI() {
  const searchTerm = Utils.getElement("searchCerts", false)?.value.trim();

  if (advancedSearchOpen) {
    await performAdvancedSearch();
    return;
  }

  const loader = Loading.search();

  try {
    let certs;
    if (searchTerm) {
      certs = await API.certificates.search(searchTerm);
    } else {
      // ⭐ FIX: If search is cleared, don't fetch everything!
      // Revert to paginated list
      loader.hide();

      CertificatesListState.currentPage = 0;
      CertificatesListState.loadedCerts = [];
      CertificatesListState.hasMore = true;
      CertificatesListState.searchMode = false;

      // Hide summary
      const summary = Utils.getElement("searchSummary", false);
      if (summary) summary.style.display = "none";

      await showCertificatesList();
      return;
    }

    lastSearchResults = certs;
    renderCertificatesList(certs);

    const summary = Utils.getElement("searchSummary", false);
    if (summary) {
      if (searchTerm) {
        summary.innerHTML = `<span class="summary-count">📊 نتائج البحث عن "${searchTerm}": ${toArabicNumber(
          certs.length
        )} شهادة</span>`;
        summary.style.display = "block";
      } else {
        summary.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Search error:", err);
    showNotification("❌ حدث خطأ أثناء البحث", "error");
  } finally {
    loader.hide();
  }
}

async function performAdvancedSearch() {
  const loader = Loading.search();

  try {
    const criteria = {
      quickSearch: Utils.getElement("searchCerts", false)?.value.trim(),
      activity: Utils.getElement("searchActivity", false)?.value.trim(),
      name: Utils.getElement("searchName", false)?.value.trim(),
      location: Utils.getElement("searchLocation", false)?.value.trim(),
      fromDate: Utils.getElement("searchFromDate", false)?.value,
      toDate: Utils.getElement("searchToDate", false)?.value,
      minAmount:
        parseInt(Utils.getElement("searchMinAmount", false)?.value) || null,
      maxAmount:
        parseInt(Utils.getElement("searchMaxAmount", false)?.value) || null,
      modifiedStatus: Utils.getElement("searchModifiedStatus", false)?.value,
      userName: Utils.getElement("searchUserName", false)?.value.trim(),
    };

    let certs = await API.certificates.getAll({ status: "active" });
    certs = filterCertificates(certs, criteria);

    lastSearchResults = certs;
    renderCertificatesList(certs);
    showSearchSummary(certs.length, criteria);

    // إخفاء البحث المتقدم بعد البحث لعرض النتائج بشكل أفضل
    if (advancedSearchOpen) {
      advancedSearchOpen = false;
      const panel = Utils.getElement("advancedSearchPanel", false);
      const btn = Utils.getElement("btnToggleAdvanced", false);
      if (panel) panel.classList.remove("active");
      if (btn) btn.textContent = "⚙️ بحث متقدم";
    }
  } catch (err) {
    console.error("Advanced search error:", err);
    showNotification("❌ حدث خطأ أثناء البحث", "error");
  } finally {
    loader.hide();
  }
}

function filterCertificates(certs, criteria) {
  return certs.filter((cert) => {
    // البحث السريع
    if (criteria.quickSearch) {
      const searchNormalized = NumberConverter.normalize(criteria.quickSearch);
      const matchQuick =
        NumberConverter.normalize(cert.name || "").includes(searchNormalized) ||
        NumberConverter.normalize(cert.activity || "").includes(
          searchNormalized
        ) ||
        NumberConverter.normalize(cert.location || "").includes(
          searchNormalized
        );
      if (!matchQuick) return false;
    }

    // البحث بالنشاط
    if (criteria.activity) {
      const activityNormalized = NumberConverter.normalize(criteria.activity);
      if (
        !NumberConverter.normalize(cert.activity || "").includes(
          activityNormalized
        )
      ) {
        return false;
      }
    }

    // البحث بالاسم
    if (criteria.name) {
      const nameNormalized = NumberConverter.normalize(criteria.name);
      if (
        !NumberConverter.normalize(cert.name || "").includes(nameNormalized)
      ) {
        return false;
      }
    }

    // البحث بالعنوان
    if (criteria.location) {
      const locationNormalized = NumberConverter.normalize(criteria.location);
      if (
        !NumberConverter.normalize(cert.location || "").includes(
          locationNormalized
        )
      ) {
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
    if (criteria.modifiedStatus === "original" && cert.is_modified)
      return false;
    if (criteria.modifiedStatus === "modified" && !cert.is_modified)
      return false;

    // المستخدم
    if (criteria.userName) {
      if (
        !(cert.user_name || "")
          .toLowerCase()
          .includes(criteria.userName.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  });
}

function showSearchSummary(count, criteria) {
  const summary = Utils.getElement("searchSummary", false);
  if (!summary) return;

  const activeFilters = [];
  if (criteria.minAmount)
    activeFilters.push(`الحد الأدنى: ${toArabicNumber(criteria.minAmount)} ج`);
  if (criteria.maxAmount)
    activeFilters.push(`الحد الأقصى: ${toArabicNumber(criteria.maxAmount)} ج`);
  if (criteria.modifiedStatus === "original") activeFilters.push("أصلية فقط");
  if (criteria.modifiedStatus === "modified") activeFilters.push("معدلة فقط");
  if (criteria.userName) activeFilters.push(`المستخدم: ${criteria.userName}`);

  if (activeFilters.length === 0) {
    summary.innerHTML = `<span class="summary-count">📊 عدد النتائج: ${toArabicNumber(
      count
    )} شهادة</span>`;
  } else {
    summary.innerHTML = `
      <span class="summary-count">📊 عدد النتائج: ${toArabicNumber(
      count
    )} شهادة</span>
      <span class="summary-filters">الفلاتر: ${activeFilters.join(" • ")}</span>
    `;
  }

  summary.style.display = "block";
}

async function clearAdvancedSearch() {
  const fieldsToClear = [
    "searchCerts",
    "searchActivity",
    "searchName",
    "searchLocation",
    "searchFromDate",
    "searchToDate",
    "searchMinAmount",
    "searchMaxAmount",
    "searchModifiedStatus",
    "searchUserName",
  ];

  fieldsToClear.forEach((id) => {
    const el = Utils.getElement(id, false);
    if (el) el.value = "";
  });

  const summary = Utils.getElement("searchSummary", false);
  if (summary) summary.style.display = "none";

  await showCertificatesList();
  showNotification("✅ تم مسح الفلاتر");
}

async function exportSearchResults() {
  if (lastSearchResults.length === 0) {
    showNotification("⚠️ لا توجد نتائج للتصدير", "warning");
    return;
  }

  const loader = Loading.data("يتم تجهيز التصدير...");

  try {
    const headers = [
      "#",
      "النشاط",
      "الاسم",
      "العنوان",
      "عدد الأفراد",
      "المساحة",
      "إجمالي المحافظة",
      "إجمالي الوزارة",
      "الحالة",
      "تاريخ الإنشاء",
      "المستخدم",
    ];

    let csv = "\ufeff"; // BOM for UTF-8
    csv += headers.join(",") + "\n";

    lastSearchResults.forEach((cert, index) => {
      const row = [
        index + 1,
        `"${cert.activity || ""}"`,
        `"${cert.name || ""}"`,
        `"${cert.location || ""}"`,
        cert.persons_count || 0,
        cert.area || 0,
        cert.grand_total || 0,
        cert.ministry_total || 0,
        cert.is_modified ? "معدلة" : "أصلية",
        `"${formatDate(cert.created_at)}"`,
        `"${cert.user_name || ""}"`,
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `نتائج_البحث_${formatDateForFileName()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification(
      `✅ تم تصدير ${toArabicNumber(lastSearchResults.length)} شهادة`
    );
  } catch (err) {
    console.error("Export error:", err);
    showNotification("❌ حدث خطأ أثناء التصدير", "error");
  } finally {
    loader.hide();
  }
}

// ========== الحذف ==========
async function confirmDelete(id) {
  try {
    const cert = await API.certificates.getById(id);
    if (!cert) return;

    showDeleteConfirmation(id, cert.name);
  } catch (err) {
    console.error("Error getting certificate:", err);
  }
}

function showDeleteConfirmation(id, certName) {
  let modal = Utils.getElement("delete-confirm-modal", false);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "delete-confirm-modal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `    <div class="delete-modal-content">      <h3>⚠️ تأكيد الحذف</h3>      <p>هل أنت متأكد من حذف شهادة "<strong>${certName || "بدون اسم"
    }</strong>"؟</p>      <p class="warning-text">لا يمكن التراجع عن هذا الإجراء</p>            <div class="delete-modal-actions">        <button onclick="closeDeleteModal()" class="btn-cancel">إلغاء</button>        <button onclick="performDelete(${id})" class="btn-delete">حذف</button>      </div>    </div>  `;
  modal.classList.add("active");
}

function closeDeleteModal() {
  const modal = Utils.getElement("delete-confirm-modal", false);
  if (modal) modal.classList.remove("active");
}

async function performDelete(id) {
  const loader = Loading.delete();

  try {
    const userName = Utils.getElement("inputUserName", false)?.value.trim();
    await API.certificates.delete(id, userName);

    closeDeleteModal();
    await showCertificatesList();

    if (currentCertificateId === id) {
      newCertificate();
    }

    showNotification("✅ تم حذف الشهادة بنجاح");
  } catch (err) {
    console.error("Delete error:", err);
    showNotification("❌ حدث خطأ أثناء الحذف", "error");
  } finally {
    loader.hide();
  }
}

// ========== الإحصائيات ==========
// متغيرات للشهر المختار
let selectedStatsMonth = new Date().getMonth();
let selectedStatsYear = new Date().getFullYear();

async function showStats(options = {}) {
  const loader = Loading.data("يتم تحميل الإحصائيات...");

  // استخدام القيم الممررة أو القيم المحفوظة
  const month = options.month !== undefined ? options.month : selectedStatsMonth;
  const year = options.year !== undefined ? options.year : selectedStatsYear;

  // حفظ القيم الجديدة
  selectedStatsMonth = month;
  selectedStatsYear = year;

  try {
    const stats = await API.certificates.getStats({ month, year });

    let modal = Utils.getElement("stats-modal", false);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "stats-modal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const modifiedPercent =
      stats.total > 0 ? ((stats.modified / stats.total) * 100).toFixed(1) : 0;
    const originalPercent =
      stats.total > 0
        ? (((stats.total - stats.modified) / stats.total) * 100).toFixed(1)
        : 0;

    // إنشاء خيارات الشهور
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      yearOptions.push(`<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`);
    }

    const monthOptions = arabicMonths.map((name, idx) =>
      `<option value="${idx}" ${idx === month ? 'selected' : ''}>${name}</option>`
    ).join('');

    // تحديد class للأرقام الكبيرة
    const getValueClass = (num) => {
      if (num >= 100000) return 'stat-value very-large-number';
      if (num >= 10000) return 'stat-value large-number';
      return 'stat-value';
    };

    modal.innerHTML = `
      <div class="stats-modal-content">
        <div class="stats-header">
          <h2>📊 إحصائيات الشهادات</h2>
          <button onclick="closeStatsModal()" class="stats-close-btn">&times;</button>
        </div>
        
        <div class="stats-body">
          <!-- الإحصائيات الأساسية -->
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
          
          <!-- حالة التعديلات -->
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
          
          <!-- ========== الإحصائيات الشهرية المعدلة ========== -->
          <div class="stats-section monthly-section" id="monthlyStatsSection">
            <div class="monthly-header">
              <h3>📅 إجمالي المبالغ المحصلة</h3>
              <div class="month-selector">
                <select id="statsMonthSelect" onchange="changeStatsMonth()">
                  ${monthOptions}
                </select>
                <select id="statsYearSelect" onchange="changeStatsMonth()">
                  ${yearOptions.join('')}
                </select>
              </div>
            </div>
            <p class="monthly-note">* لا تشمل شهادات عدم دفع الرسوم (${toArabicNumber(stats.nonPaymentCount)} شهادة) - شهادات هذا الشهر: ${toArabicNumber(stats.monthly.count)}</p>
            
            <div class="monthly-stats-container">
              <!-- رسوم المحافظة -->
              <div class="monthly-category">
                <h4>🏛️ رسوم المحافظة</h4>
                <table class="monthly-table">
                  <tbody>
                    <tr>
                      <td>رسوم التدريب</td>
<td class="amount">${formatNumberWithCommas(stats.monthly.trainingFee)} ج</td>                    </tr>
                    <tr>
                      <td>التقرير الاستشاري</td>
                      <td class="amount">${toArabicNumber(stats.monthly.consultantFee)} ج</td>
                    </tr>
                    <tr>
                      <td>خطة الإخلاء</td>
                      <td class="amount">${toArabicNumber(stats.monthly.evacuationFee)} ج</td>
                    </tr>
                    <tr>
                      <td>المعاينة / الانتقال</td>
                      <td class="amount">${toArabicNumber(stats.monthly.inspectionFee)} ج</td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>إجمالي المحافظة</strong></td>
                      <td class="amount total"><strong>${toArabicNumber(stats.monthly.governorateTotal)} ج</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- رسوم الوزارة -->
              <div class="monthly-category">
                <h4>🏢 رسوم الوزارة</h4>
                <table class="monthly-table">
                  <tbody>
                    <tr>
                      <td>رسوم الأفراد</td>
                      <td class="amount">${toArabicNumber(stats.monthly.ministryPersonsFee)} ج</td>
                    </tr>
                    <tr>
                      <td>رسوم المساحة</td>
                      <td class="amount">${toArabicNumber(stats.monthly.areaFee)} ج</td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>إجمالي الوزارة</strong></td>
                      <td class="amount total"><strong>${toArabicNumber(stats.monthly.ministryTotal)} ج</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- معلومات إضافية فقط - بدون الإجمالي الكلي -->
              <div class="monthly-info">
                <span>عدد الشهادات: ${toArabicNumber(stats.monthly.count)}</span>
                <span>إجمالي الأفراد: ${toArabicNumber(stats.monthly.personsCount)}</span>
              </div>
            </div>
          </div>
          
          ${stats.topUsers && stats.topUsers.length > 0 ? `
          <div class="stats-section">
            <h3>🏆 أكثر المستخدمين نشاطاً</h3>
            <div class="top-users-list">
              ${stats.topUsers.map((user, index) => `
                <div class="top-user-item">
                  <span class="user-rank">${toArabicNumber(index + 1)}</span>
                  <span class="user-name">${user.name || "غير معروف"}</span>
                  <span class="user-count">${toArabicNumber(user.count)} شهادة</span>
                </div>
              `).join("")}
            </div>
          </div>
          ` : ""}
        </div>
        
        <div class="stats-footer">
          <span class="stats-update-time">آخر تحديث: ${formatDate(Date.now())}</span>
          <button onclick="refreshStats()" class="btn-refresh">🔄 تحديث</button>
          <button onclick="printMonthlyStats()" class="btn-print-stats">🖨️ طباعة الإحصائية الشهرية</button>
          <button onclick="exportStats()" class="btn-export">📥 تصدير</button>
        </div>
      </div>
    `;

    modal.classList.add("active");
  } catch (err) {
    console.error("Stats error:", err);
    showNotification("❌ حدث خطأ أثناء تحميل الإحصائيات", "error");
  } finally {
    loader.hide();
  }
}

function addSearchFixStyles() {
  if (Utils.getElement("search-fix-styles", false)) return;

  const style = document.createElement("style");
  style.id = "search-fix-styles";
  style.textContent = `
    /* ========== إصلاح اهتزاز البحث ========== */
    .certs-modal-large {
      width: 95%;
      max-width: 900px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .certs-modal-large .modal-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .advanced-search-container {
      flex-shrink: 0;
    }

    #certsListContainer {
      flex: 1;
      overflow-y: scroll !important;
      scrollbar-gutter: stable; /* حجز مكان الـ scrollbar لمنع الاهتزاز */
      min-height: 250px;
      max-height: calc(85vh - 300px);
      padding-left: 10px;
      margin-left: -10px;
    }

    /* تثبيت عرض الـ scrollbar */
    #certsListContainer::-webkit-scrollbar {
      width: 10px;
    }

    #certsListContainer::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 5px;
    }

    #certsListContainer::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 5px;
      border: 2px solid #f1f5f9;
    }

    #certsListContainer::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #5a67d8, #6b46c1);
    }

    /* منع تغير الحجم أثناء البحث */
    .certs-list {
      min-height: 200px;
      width: 100%;
    }

    .cert-item {
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    /* رسالة "لا توجد شهادات" */
    .no-data {
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 16px;
    }
  `;

  document.head.appendChild(style);
}

// ========== دالة طباعة الإحصائية الشهرية ==========
// ========== دالة طباعة الإحصائية الشهرية المعدلة ==========
async function printMonthlyStats() {
  const loader = Loading.print("يتم تجهيز الإحصائية الشهرية للطباعة...");

  try {
    // استخدام الشهر والسنة المختارين بدل الشهر الحالي
    const stats = await API.certificates.getStats({
      month: selectedStatsMonth,
      year: selectedStatsYear
    });

    // حساب الإجمالي الكلي
    const grandTotal = stats.monthly.governorateTotal + stats.monthly.ministryTotal;

    // إنشاء صفحة طباعة منفصلة
    const printContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إحصائية المبالغ المحصلة عن شهر ${stats.monthly.monthName} ${stats.monthly.year}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            padding: 20px;
            direction: rtl;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px double #333;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            padding: 8px;
            background: #f0f0f0;
            border-right: 4px solid #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            padding: 10px 15px;
            border: 1px solid #ddd;
            text-align: right;
          }
          th {
            background: #f8f8f8;
          }
          .amount {
            text-align: left;
            font-weight: bold;
          }
          .total-row {
            background: #e8f5e9;
            font-weight: bold;
          }
          .grand-total {
            text-align: center;
            font-size: 20px;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            margin-top: 20px;
          }
          .grand-total .month-name {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 5px;
          }
          .grand-total .total-value {
            font-size: 28px;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          .note {
            color: #666;
            font-size: 12px;
            margin-bottom: 15px;
          }
          @media print {
            body { padding: 0; }
            .grand-total {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>إحصائية المبالغ المحصله عن ${stats.monthly.monthName} ${stats.monthly.year}</h1>
          <p>الإدارة العامة للحماية المدنية بالجيزة - إدارة الوقاية</p>
        </div>
        
        <p class="note">*  إجمالي الأفراد المتدربين: ${formatNumberWithCommas(stats.monthly.personsCount)} فرد</p>
        
        <div class="section">
          <h2>🏛️ رسوم المحافظة</h2>
          <table>
            <thead>
              <tr>
                <th>بند الرسوم المحصلة</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>رسوم التدريب</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.trainingFee)} جنيه</td>
              </tr>
              <tr>
                <td>التقرير الاستشاري</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.consultantFee)} جنيه</td>
              </tr>
              <tr>
                <td>خطة الإخلاء</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.evacuationFee)} جنيه</td>
              </tr>
              <tr>
                <td>المعاينة / الانتقال</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.inspectionFee)} جنيه</td>
              </tr>
              <tr class="total-row">
                <td><strong>إجمالي رسوم المحافظة</strong></td>
                <td class="amount"><strong>${formatNumberWithCommas(stats.monthly.governorateTotal)} جنيه</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>🏢 رسوم الوزارة</h2>
          <table>
            <thead>
              <tr>
                <th>البند</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>رسوم الأفراد بالفيزا</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.ministryPersonsFee)} جنيه</td>
              </tr>
              <tr>
                <td>رسوم المساحة</td>
                <td class="amount">${formatNumberWithCommas(stats.monthly.areaFee)} جنيه</td>
              </tr>
              <tr class="total-row">
                <td><strong>إجمالي رسوم الوزارة</strong></td>
                <td class="amount"><strong>${formatNumberWithCommas(stats.monthly.ministryTotal)} جنيه</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="grand-total">
  <div class="month-name">الإجمالي الكلي لشهر ${stats.monthly.monthName} ${stats.monthly.year}</div>
  <div class="total-value">${formatNumberWithCommas(grandTotal)} جنيه</div>
</div>
        
        <div class="footer">
          تم الطباعة بتاريخ: ${formatDate(Date.now())}
        </div>
      </body>
      </html>
    `;

    // فتح نافذة طباعة
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);

    showNotification("✅ تم تجهيز الإحصائية للطباعة");
  } catch (err) {
    console.error("Print monthly stats error:", err);
    showNotification("❌ حدث خطأ", "error");
  } finally {
    loader.hide();
  }
}



// ========== إلغاء عدم دفع الرسوم ==========
async function cancelNonPayment(certificateId) {
  if (!confirm("هل أنت متأكد من إلغاء حالة عدم دفع الرسوم؟\nسيتم احتساب هذه الشهادة في الإحصائيات.")) {
    return;
  }

  const loader = Loading.save("يتم إلغاء حالة عدم دفع الرسوم...");

  try {
    await window.electronAPI.nonPayment.cancel(certificateId);

    showNotification("✅ تم إلغاء حالة عدم دفع الرسوم - الشهادة ستُحتسب في الإحصائيات الآن");

    // تحديث القائمة
    if (Utils.getElement("certsModal", false)?.classList.contains("active")) {
      await showCertificatesList();
    }

    // إغلاق modal عدم الدفع الموجود
    closeExistingNonPaymentModal();

  } catch (err) {
    console.error("Error canceling non-payment:", err);
    showNotification("❌ حدث خطأ", "error");
  } finally {
    loader.hide();
  }
}


function closeStatsModal() {
  const modal = Utils.getElement("stats-modal", false);
  if (modal) modal.classList.remove("active");
}

// ========== تغيير شهر الإحصائيات ==========
async function changeStatsMonth() {
  const monthSelect = Utils.getElement("statsMonthSelect", false);
  const yearSelect = Utils.getElement("statsYearSelect", false);

  if (!monthSelect || !yearSelect) return;

  const month = parseInt(monthSelect.value);
  const year = parseInt(yearSelect.value);

  await showStats({ month, year });
}

async function refreshStats() {
  closeStatsModal();
  await showStats();
  showNotification("✅ تم تحديث الإحصائيات");
}

async function exportStats() {
  try {
    const stats = await API.certificates.getStats();

    const exportData = {
      exportDate: new Date().toISOString(),
      stats: stats,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `احصائيات_الشهادات_${formatDateForFileName()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification("✅ تم تصدير الإحصائيات");
  } catch (err) {
    console.error("Export stats error:", err);
    showNotification("❌ حدث خطأ", "error");
  }
}

// ========== إعداد تحويل الأرقام العربية ==========
function setupArabicNumberInputs() {
  const fieldsToConvert = ["inputActivity", "inputName", "inputLocation"];

  fieldsToConvert.forEach((fieldId) => {
    const input = Utils.getElement(fieldId, false);
    if (!input) return;

    addNumberToggleButton(input, fieldId);

    input.addEventListener("input", function (e) {
      const fieldMode = this.dataset.numberMode || "mixed";

      if (fieldMode === "mixed") return;

      if (
        e.inputType === "insertText" ||
        e.inputType === "insertCompositionText"
      ) {
        return;
      }

      const cursorPosition = this.selectionStart;
      const originalLength = this.value.length;

      this.value = NumberConverter.smart(this.value, fieldMode);

      const newLength = this.value.length;
      const diff = newLength - originalLength;
      this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
    });

    input.addEventListener("paste", function (e) {
      const fieldMode = this.dataset.numberMode || "arabic";
      if (fieldMode === "mixed") return;

      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
        "text"
      );
      const convertedText = NumberConverter.smart(pastedText, fieldMode);

      const start = this.selectionStart;
      const end = this.selectionEnd;
      const before = this.value.substring(0, start);
      const after = this.value.substring(end);

      this.value = before + convertedText + after;
      this.setSelectionRange(
        start + convertedText.length,
        start + convertedText.length
      );

      this.dispatchEvent(new Event("input"));
    });
  });
}

function addNumberToggleButton(input, fieldId) {
  let wrapper = input.closest(".input-with-number-toggle");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "input-with-number-toggle";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
  }

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "number-toggle-btn";
  toggleBtn.innerHTML = "🔢";
  toggleBtn.title = "تبديل نوع الأرقام";

  input.dataset.numberMode = "mixed";
  updateToggleButtonState(toggleBtn, "mixed");

  toggleBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const currentMode = input.dataset.numberMode || "mixed";

    let newMode;
    if (currentMode === "arabic") {
      newMode = "english";
    } else if (currentMode === "english") {
      newMode = "mixed";
    } else {
      newMode = "arabic";
    }

    input.dataset.numberMode = newMode;
    updateToggleButtonState(toggleBtn, newMode);

    if (newMode !== "mixed" && input.value) {
      input.value = NumberConverter.smart(input.value, newMode);
    }

    const modeNames = {
      arabic: "أرقام عربية (١٢٣)",
      english: "أرقام إنجليزية (123)",
      mixed: "مختلط (بدون تحويل)",
    };
    showNotification(`🔢 ${modeNames[newMode]}`, "info");
  });

  wrapper.appendChild(toggleBtn);
}

function updateToggleButtonState(btn, mode) {
  const states = {
    arabic: { icon: "🔢", class: "mode-arabic", title: "الوضع: أرقام عربية" },
    english: {
      icon: "123",
      class: "mode-english",
      title: "الوضع: أرقام إنجليزية",
    },
    mixed: { icon: "🔀", class: "mode-mixed", title: "الوضع: مختلط" },
  };

  const state = states[mode];
  btn.innerHTML = state.icon;
  btn.className = `number-toggle-btn ${state.class}`;
  btn.title = state.title;
}

// ========== إعداد Popup Handlers ==========
function setupPopupHandlers() {
  const popupOverlay = Utils.getElement("popupOverlay", false);
  if (!popupOverlay) return;

  popupOverlay.addEventListener("click", function (e) {
    if (e.target === this) closeFeesPopup();
  });

  popupOverlay.addEventListener("keydown", function (e) {
    if (!popupOverlay.classList.contains("active")) return;

    const activeSuggestion = Utils.$(".suggestions-dropdown.active");
    if (activeSuggestion && e.key === "Enter") return;

    if (e.key === "Enter" && !e.shiftKey) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== "BUTTON") {
        e.preventDefault();
        applyChanges();
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeFeesPopup();
    }
  });
}

// ========== معالجة الأخطاء العامة ==========
function setupErrorHandlers() {
  window.onerror = function (message, source, lineno, colno, error) {
    console.error("خطأ غير متوقع:", { message, source, lineno, colno, error });

    if (!message.includes("Script error")) {
      showNotification("❌ حدث خطأ غير متوقع", "error");
    }

    return false;
  };

  window.onunhandledrejection = function (event) {
    console.error("Promise rejection غير معالج:", event.reason);
    showNotification("❌ حدث خطأ في العملية", "error");
  };
}

function addProtectionStyles() {
  if (Utils.getElement("protection-styles", false)) return;

  const style = document.createElement("style");
  style.id = "protection-styles";
  style.textContent = `
    /* قسم رسوم الشهادة المؤمنة */
    .protection-section {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #22c55e;
      border-radius: 12px;
      margin-top: 15px;
    }
    
    .protection-section .section-title-popup {
      color: #166534;
      border-bottom-color: #22c55e;
    }
    
    .protection-section .section-icon {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .optional-badge {
      margin-right: auto;
      font-size: 0.7rem;
      color: #6b7280;
      background: rgba(107, 114, 128, 0.1);
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: normal;
    }
    
    .field-hint {
      display: block;
      margin-top: 5px;
      color: #6b7280;
      font-size: 11px;
    }
  `;

  document.head.appendChild(style);
}

// ========== إضافة CSS ==========
function addAllStyles() {
  // Validation styles
  addValidationStyles();

  // Loading styles
  addLoadingStyles();

  // Print styles
  addPrintStyles();

  // Autocomplete styles
  addAutocompleteStyles();

  // Notification styles
  addNotificationStyles();
  addHistoryStyles();
  addProtectionStyles();
  addMonthlyStatsStyles();
  addSearchFixStyles();
}

function addValidationStyles() {
  if (Utils.getElement("validation-styles", false)) return;

  const style = document.createElement("style");
  style.id = "validation-styles";
  style.textContent = `
    .modal-overlay {
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
    
    .modal-overlay.active {
      display: flex;
    }
    
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
  `;

  document.head.appendChild(style);
}

function addLoadingStyles() {
  if (Utils.getElement("loading-styles", false)) return;

  const style = document.createElement("style");
  style.id = "loading-styles";
  style.textContent = `
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
    
    .loading-container {
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 24px;
      padding: 40px 60px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
    
    .loading-animation {
      margin-bottom: 24px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
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
    
    .loading-text {
      margin-bottom: 20px;
    }
    
    .loading-title {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .loading-subtitle {
      display: block;
      font-size: 14px;
      color: #64748b;
    }
    
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
    
    .loading-type-print .loading-icon { fill: #3b82f6; }
    .loading-type-pdf .loading-icon { fill: #ef4444; }
    .loading-type-save .loading-icon { fill: #10b981; }
    .loading-type-search .loading-icon { fill: #8b5cf6; }
    .loading-type-delete .loading-icon { fill: #f43f5e; }
  `;

  document.head.appendChild(style);
}

function addPrintStyles() {
  if (Utils.getElement("print-styles", false)) return;

  const style = document.createElement("style");
  style.id = "print-styles";
  style.textContent = `
    @media print {
      .print-hidden,
  [data-print-hidden-page="true"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
    top: -9999px !important;
    page-break-before: avoid !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
  }
      
      .page:not(.print-hidden) {
        display: block !important;
        visibility: visible !important;
      }

      .page:not(.print-hidden):not([data-print-hidden-page="true"]) {
    display: block !important;
    visibility: visible !important;
    page-break-after: always;
    position: relative !important;
  }
  
  .page:not(.print-hidden):not([data-print-hidden-page="true"]):last-of-type {
    page-break-after: auto;
  }
      
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

// إكمال addAutocompleteStyles
function addAutocompleteStyles() {
  if (Utils.getElement("autocomplete-styles", false)) return;

  const style = document.createElement("style");
  style.id = "autocomplete-styles";
  style.textContent = `
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
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    }
    
    .suggestion-item.selected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
      border-right: 3px solid #667eea;
    }
    
    .suggestion-item mark {
      background: #fef08a;
      color: inherit;
      padding: 0 2px;
      border-radius: 3px;
    }
    
    .input-with-suggestions {
      position: relative;
    }
    
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
    
    /* Number Toggle Button */
    .input-with-number-toggle {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .input-with-number-toggle input {
      flex: 1;
      padding-left: 40px;
    }
    
    .number-toggle-btn {
      position: absolute;
      left: 5px;
      top: 50%;
      transform: translateY(-50%);
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 5px 8px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .number-toggle-btn:hover {
      background: #e0e0e0;
    }
    
    .number-toggle-btn.mode-arabic {
      background: #e8f5e9;
      border-color: #4caf50;
    }
    
    .number-toggle-btn.mode-english {
      background: #e3f2fd;
      border-color: #2196f3;
    }
    
    .number-toggle-btn.mode-mixed {
      background: #fff3e0;
      border-color: #ff9800;
    }
  `;

  document.head.appendChild(style);
}

function addNotificationStyles() {
  if (Utils.getElement("notification-styles", false)) return;

  const style = document.createElement("style");
  style.id = "notification-styles";
  style.textContent = `
    @keyframes slideInNotification {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutNotification {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(-100%);
        opacity: 0;
      }
    }
    
    .notification-item {
      direction: rtl;
      font-family: 'Cairo', 'Segoe UI', sans-serif;
    }
  `;

  document.head.appendChild(style);
}

// ========== إضافة أزرار الطباعة ==========
function addPrintButtons() {
  if (Utils.$(".btn-print-main")) return;

  const printBtn = document.createElement("button");
  printBtn.className = "btn-print-main floating-btn";
  printBtn.innerHTML = "🖨️ طباعة";
  printBtn.onclick = showPrintOptions;
  printBtn.title = "طباعة (Ctrl+P)";

  const pdfBtn = document.createElement("button");
  pdfBtn.className = "btn-pdf-main floating-btn";
  pdfBtn.innerHTML = "📄 PDF";
  pdfBtn.onclick = () => exportToPDF();
  pdfBtn.title = "تصدير PDF (Ctrl+E)";

  document.body.appendChild(printBtn);
  document.body.appendChild(pdfBtn);
}

// ========== تنظيف عند إغلاق الصفحة ==========
function setupCleanup() {
  window.addEventListener("beforeunload", () => {
    // تنظيف الـ event listeners
    KeyboardShortcuts.cleanup();
    Utils.cleanupAllListeners();

    // تنظيف الاقتراحات
    [
      "inputActivity",
      "inputName",
      "inputLocation",
      "searchActivity",
      "searchName",
      "searchLocation",
    ].forEach((id) => {
      AutocompleteSystem.cleanup(id);
    });

    // حفظ الحالة
    AppState.save();
    DateSystem.save();
  });
}

// ========== تحميل آخر شهادة أو البدء فارغاً ==========
async function loadLastCertificateOrStartEmpty(apiReady) {
  if (!apiReady) {
    // لا يوجد قاعدة بيانات - ابدأ فارغاً
    startWithEmptyForm();
    return;
  }

  try {
    // محاولة جلب آخر شهادة
    const certs = await API.certificates.getAll({
      status: "active",
      limit: 1,
      orderBy: "created_at DESC",
    });

    if (certs && certs.length > 0) {
      // تحميل آخر شهادة
      await loadCertificateSilent(certs[0].id);
      console.log("✅ تم تحميل آخر شهادة:", certs[0].id);
    } else {
      // لا توجد شهادات - ابدأ فارغاً
      startWithEmptyForm();
      console.log("📝 لا توجد شهادات سابقة - بدء فارغ");
    }
  } catch (err) {
    console.error("خطأ في تحميل آخر شهادة:", err);
    startWithEmptyForm();
  }
}

// ========== البدء بنموذج فارغ ==========
function startWithEmptyForm() {
  currentCertificateId = null;
  originalCertificateData = null;

  currentPersonsCount = 0;
  currentConsultantFee = 0;
  currentEvacuationFee = 0;
  currentInspectionFee = 0;
  currentArea = 0;
  currentProtectionFee = 0;

  // تحديث العرض بقيم فارغة
  const emptyUpdates = [
    ["persons-count", ""],
    ["training-total", ""],
    ["consultant-fee", ""],
    ["evacuation-fee", ""],
    ["inspection-fee", ""],
    ["grand-total", ""],
    ["grand-total-text", ""],
    ["ministry-fee", ""],
    ["area-fee", ""],
    ["area-value", ""],
    ["ministry-total", ""],
    ["ministry-total-text", ""],
    ["protection-fee", ""],
    ["protection-fee-text", ""],
  ];

  emptyUpdates.forEach(([key, value]) => {
    Utils.$$(`[data-calc="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  });

  // إفراغ حقول النشاط والاسم والعنوان
  ["activity", "name", "location"].forEach((field) => {
    Utils.$$(`[data-field="${field}"] .field-value`).forEach((el) => {
      el.textContent = ".";
    });
  });

  // تحديث عرض المساحة
  ["areaValueDisplay-page4", "areaValueDisplay-page8"].forEach((id) => {
    const el = Utils.getElement(id, false);
    if (el) el.textContent = "";
  });

  updateCertificateStatus();
}

// ========== تحميل شهادة بدون إشعارات (للتهيئة) ==========
async function loadCertificateSilent(id) {
  try {
    const cert = await API.certificates.getById(id);
    if (!cert) return false;

    currentCertificateId = cert.id;

    // حفظ البيانات الأصلية
    originalCertificateData = {
      activity: cert.activity || "",
      name: cert.name || "",
      location: cert.location || "",
      area: cert.area || 0,
      persons_count: cert.persons_count || 0,
      consultant_fee: cert.consultant_fee || 0,
      evacuation_fee: cert.evacuation_fee || 0,
      inspection_fee: cert.inspection_fee || 0,
      protection_fee: cert.protection_fee || 0,
      user_name: cert.user_name || "",
    };

    // تحديث المتغيرات
    currentPersonsCount = cert.persons_count || 0;
    currentConsultantFee = cert.consultant_fee || 0;
    currentEvacuationFee = cert.evacuation_fee || 0;
    currentInspectionFee = cert.inspection_fee || 0;
    currentArea = cert.area || 0;
    currentProtectionFee = cert.protection_fee || 0;

    // تحميل التواريخ
    AppState.pageDates = {
      governorate: cert.date_governorate || cert.created_at,
      training: cert.date_training || cert.created_at,
      ministry: cert.date_ministry || cert.created_at,
      certificate: cert.date_certificate || cert.created_at,
      decision: cert.date_decision || cert.created_at,
    };
    pageDates = AppState.pageDates;

    displayPageDates();
    updatePageDisplayWithoutDates(cert);
    updateCertificateStatus();
    updateFeesButtonText();

    return true;
  } catch (err) {
    console.error("خطأ في التحميل الصامت:", err);
    return false;
  }
}

// ========== نظام عدم دفع الرسوم ==========

/**
 * فتح نافذة تحويل لعدم دفع رسوم
 */
async function openNonPaymentModal(certificateId) {
  try {
    const cert = await API.certificates.getById(certificateId);
    if (!cert) {
      showNotification("❌ الشهادة غير موجودة", "error");
      return;
    }

    // التحقق إذا كان لديها سجل عدم دفع مسبق
    const existingRecord = await window.electronAPI.nonPayment.getByCertificate(certificateId);
    if (existingRecord) {
      showNotification("⚠️ هذه الشهادة لديها سجل عدم دفع رسوم بالفعل", "warning");
      showExistingNonPayment(existingRecord, cert);
      return;
    }

    // إنشاء Modal
    let modal = Utils.getElement("non-payment-modal", false);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "non-payment-modal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const todayFormatted = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div class="non-payment-modal-content">
        <div class="non-payment-header">
          <h3>📋 تحويل لعدم دفع رسوم</h3>
          <button onclick="closeNonPaymentModal()" class="close-btn">&times;</button>
        </div>
        
        <div class="non-payment-body">
          <div class="non-payment-info">
            <p><strong>الشهادة رقم:</strong> #${cert.id}</p>
            <p><strong>النشاط:</strong> ${cert.activity || '-'}</p>
          </div>
          
          <div class="non-payment-form">
            <div class="form-section">
              <h4>بيانات الخطاب الوارد</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label>رقم الوارد <span class="required">*</span></label>
                  <input type="text" id="npIncomingNumber" placeholder="مثال: 343" required>
                </div>
                <div class="form-group">
                  <label>تاريخ الوارد <span class="required">*</span></label>
                  <input type="date" id="npIncomingDate" value="${todayFormatted}" required>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>بيانات المرسل إليه</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label>اللقب (مثل: السيد / السيد العقيد)</label>
                  <input type="text" id="npRecipientTitle" placeholder="السيد /" value="السيد /">
                </div>
                <div class="form-group">
                  <label>الاسم / المنصب <span class="required">*</span></label>
                  <input type="text" id="npRecipientName" placeholder="مثال: رئيس حي الدقي" required>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>بيانات المنشأة (من الشهادة - للعرض فقط)</h4>
              
              <div class="form-group readonly-field">
                <label>النشاط</label>
                <input type="text" value="${cert.activity || ''}" readonly>
              </div>
              
              <div class="form-group readonly-field">
                <label>باسم / اسم المالك</label>
                <input type="text" value="${cert.name || ''}" readonly>
              </div>
              
              <div class="form-group readonly-field">
                <label>الكائن (العنوان)</label>
                <input type="text" value="${cert.location || ''}" readonly>
              </div>
            </div>
          </div>
        </div>
        
        <div class="non-payment-footer">
          <button onclick="closeNonPaymentModal()" class="btn-cancel">إلغاء</button>
          <button onclick="submitNonPayment(${certificateId})" class="btn-submit">
            ✓ تأكيد التحويل
          </button>
        </div>
      </div>
    `;

    modal.classList.add("active");

    setTimeout(() => {
      Utils.getElement("npIncomingNumber", false)?.focus();
    }, 100);

  } catch (err) {
    console.error("Error opening non-payment modal:", err);
    showNotification("❌ حدث خطأ", "error");
  }
}

/**
 * إرسال طلب عدم دفع الرسوم
 */
async function submitNonPayment(certificateId) {
  const incomingNumber = Utils.getElement("npIncomingNumber", false)?.value.trim();
  const incomingDateStr = Utils.getElement("npIncomingDate", false)?.value;
  const recipientTitle = Utils.getElement("npRecipientTitle", false)?.value.trim() || "السيد /";
  const recipientName = Utils.getElement("npRecipientName", false)?.value.trim();

  // التحقق من البيانات المطلوبة
  if (!incomingNumber) {
    showNotification("❌ برجاء إدخال رقم الوارد", "error");
    Utils.getElement("npIncomingNumber", false)?.focus();
    return;
  }

  if (!incomingDateStr) {
    showNotification("❌ برجاء إدخال تاريخ الوارد", "error");
    Utils.getElement("npIncomingDate", false)?.focus();
    return;
  }

  if (!recipientName) {
    showNotification("❌ برجاء إدخال اسم المرسل إليه", "error");
    Utils.getElement("npRecipientName", false)?.focus();
    return;
  }

  const loader = Loading.save("يتم إنشاء سجل عدم دفع الرسوم...");

  try {
    const incomingDate = new Date(incomingDateStr).getTime();
    const userName = Storage.loadUserName() || '';

    const result = await window.electronAPI.nonPayment.create(certificateId, {
      incoming_number: incomingNumber,
      incoming_date: incomingDate,
      recipient_title: recipientTitle,
      recipient_name: recipientName,
      created_by: userName
    });

    closeNonPaymentModal();

    showNotification("✅ تم إنشاء سجل عدم دفع الرسوم بنجاح!");

    // تحديث قائمة الشهادات إذا كانت مفتوحة
    if (Utils.getElement("certsModal", false)?.classList.contains("active")) {
      await showCertificatesList();
    }

    // عرض صفحة عدم الدفع وطباعتها
    await showNonPaymentPage(result.id);

  } catch (err) {
    console.error("Error submitting non-payment:", err);
    showNotification("❌ حدث خطأ أثناء الحفظ", "error");
  } finally {
    loader.hide();
  }
}

/**
 * إغلاق نافذة عدم الدفع
 */
function closeNonPaymentModal() {
  const modal = Utils.getElement("non-payment-modal", false);
  if (modal) modal.classList.remove("active");
}

/**
 * عرض صفحة عدم الدفع للطباعة
 */
async function showNonPaymentPage(nonPaymentId) {
  try {
    const record = await window.electronAPI.nonPayment.get(nonPaymentId);
    if (!record) {
      showNotification("❌ السجل غير موجود", "error");
      return;
    }

    // فتح نافذة طباعة منفصلة (مثل الإحصائية الشهرية)
    printNonPaymentInNewWindow(record);

  } catch (err) {
    console.error("Error showing non-payment page:", err);
    showNotification("❌ حدث خطأ", "error");
  }
}

function printNonPaymentInNewWindow(record) {
  // تنسيق التاريخ
  const formatDateArabic = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const day = toArabicNumber(date.getDate());
    const month = toArabicNumber(date.getMonth() + 1);
    const year = toArabicNumber(date.getFullYear());
    return `${year}/${month}/${day}`;
  };

  // تاريخ اليوم
  const todayFormatted = formatDateArabic(Date.now());

  // تاريخ الوارد
  const incomingDateFormatted = formatDateArabic(record.incoming_date);

  // اسم المستخدم المحفوظ
  const userName = Storage.loadUserName() || 'اكمل,,,';

  // إنشاء محتوى الصفحة بنفس تصميم page-five الأصلي
  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>عدم دفع رسوم - ${record.activity || ''}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }

        @font-face {
          font-family: "Sultan";
          src: url("./assets/fonts/Sultan-bold.ttf") format("truetype");
          font-weight: bold;
        }

        @font-face {
          font-family: "Khalid";
          src: url("./assets/fonts/Khalid-Art-bold.ttf") format("truetype");
          font-weight: bold;
        }

        @font-face {
          font-family: "PTBOLD";
          src: url("./assets/fonts/PT-BOLD.ttf") format("truetype");
          font-weight: bold;
        }

        @font-face {
          font-family: "Typesetting";
          src: url("./assets/fonts/type_setting.ttf") format("truetype");
          font-weight: bold;
        }

        @font-face {
          font-family: "Times";
          src: url("./assets/fonts/Times.ttf") format("truetype");
          font-weight: bold;
        }

        @font-face {
          font-family: "DTPN";
          src: url("./assets/fonts/DTPN.ttf") format("truetype");
          font-weight: bold;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Arial", "Tahoma", sans-serif;
          background-color: #f0f0f0;
          direction: rtl;
          font-size: 11px;
          line-height: 1.4;
        }

        .page {
          width: 240mm;
          height: 297mm;
          margin: 10px auto;
          background: white;
          padding: 2mm 12mm;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
          position: relative;
          overflow: hidden;
        }

        .document-page-five {
          padding: 15px 30px;
        }

        /* Header Image */
        .header-page-five {
          text-align: center;
          margin-bottom: -21px;
        }

        .header-image-five {
          width: 100%;
          margin-right: -37px;
          max-width: 700px;
          height: auto;
        }

        .info-item::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #000;
          margin-left: -3px;
          vertical-align: middle;
        }

        /* المحتوى */
        .content-page-five {
          font-family: "Sultan", "serif";
          font-size: 20pt;
          font-weight: bold;
        }

        /* المرسل إليه */
        .recipient-section {
          margin-bottom: -25px;
        }

        .recipient-row {
          font-family: "PTBOLD", serif;
          font-size: 20pt;
          margin-top: 35px;
          margin-right: 63px;
          margin-bottom: 5px;
        }

        .greeting-five {
          font-family: "Typesetting", "serif";
          font-size: 26pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 29px;
          margin-top: 8px;
          font-style: italic;
        }

        /* بيانات الطلب */
        .request-info {
          margin: -19px 0;
        }

        .request-info .info-item {
          margin: 2px 0;
          padding-right: 10px;
        }

        .bullet-five {
          color: #000;
          margin-left: 5px;
          font-weight: bold;
        }

        /* قرار الإدارة */
        .decision-box {
          text-align: center;
          margin: 5px 0;
        }

        .decision-title {
          font-family: "Times", "serif";
          font-size: 36pt;
          font-weight: bold;
          color: #000;
          display: inline-block;
          padding: 5px 20px;
        }

        /* نص القرار */
        .decision-text {
          text-align: justify;
          line-height: 1.6;
          margin: 5px 0;
        }

        .decision-text p {
          font-family: "PTBOLD", "serif";
          font-weight: bold;
          font-style: italic;
          font-size: 15pt;
          margin: 3px 0;
          text-indent: 20px;
        }

        /* الخاتمة */
        .closing-five {
          font-family: "DTPN", "serif";
          text-align: center;
          margin: 8px 0;
          font-size: 20pt;
        }

        /* التوقيعات */
        .signature-section-page-five {
          display: flex;
          justify-content: space-evenly;
          align-items: flex-start;
          margin-top: 10px;
          padding: 0 10px;
        }

        .signature-page-five {
          text-align: center;
          font-family: "Sultan", serif;
          font-size: 14pt;
          font-weight: bold;
        }

        .signature-title-page-two {
          font-weight: bold;
          margin-left: 149px;
        }

        .signature-name {
          margin-bottom: 3px;
          margin-left: 34px;
        }

        .signature-position-five {
          font-size: 14pt;
          margin-left: 32px;
        }

        /* التاريخ */
        .date-section {
          font-family: "Arial", "serif";
          text-decoration: underline;
          font-style: italic;
          font-weight: 600;
          margin-right: -14px;
          margin-bottom: 37px;
          text-align: left;
          font-size: 6pt;
        }

        .user-name-display {
          text-decoration: none;
          display: inline-block;
        }

        .date-extra {
          font-size: 6pt;
          margin-left: 49px;
        }

        /* الاعتماد */
        .approval-section-five {
          margin-top: 10px;
          padding-top: 5px;
        }

        .approval-title-five {
          text-align: center;
          font-family: "Typesetting", "serif";
          font-size: 24pt;
          font-weight: bold;
          font-style: italic;
          margin-bottom: 5px;
          margin-top: -6px;
        }

        .approval-signature {
          text-align: right;
          margin-right: 50px;
        }

        .approval-rank {
          font-family: "Sultan", "serif";
          font-style: italic;
          font-weight: bold;
          margin-top: 29px;
          margin-right: 304px;
          font-size: 20pt;
        }

        .approval-name {
          font-family: "Sultan", "serif";
          font-style: italic;
          font-weight: bold;
          font-size: 20pt;
          margin: 5px;
          margin-right: 370px;
        }

        .approval-position {
          font-family: "Sultan", "serif";
          font-style: italic;
          font-weight: bold;
          font-size: 16pt;
          letter-spacing: -0.5px;
          margin-right: 248px;
        }

        .approval-dept {
          font-size: 12px;
          color: #333;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }

        .signatures-container {
          display: flex;
          gap: 60px;
          margin-top: 20px;
        }

        .bank-row {
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
        }

        .bank-row::before {
          content: "";
          display: inline-block;
          width: 4px;
          height: 4px;
          background: #000;
          margin-left: 9px;
          vertical-align: middle;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .field-value {
          font-family: "Khalid", "serif";
          font-size: 16pt;
          display: inline-block;
          margin-right: 10px;
        }

        /* زر الطباعة */
        .print-btn-container {
          text-align: center;
          margin: 20px auto;
          padding: 15px;
          background: #f0f0f0;
          border-radius: 8px;
          max-width: 210mm;
        }

        .print-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 15px 40px;
          font-size: 18px;
          font-weight: bold;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .print-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        @media print {
          body {
            background: white;
          }
          
          .print-btn-container {
            display: none !important;
          }
          
          .page {
            margin: 0;
            box-shadow: none;
            width: 210mm;
            height: 297mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-container">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة الصفحة</button>
      </div>

      <div class="page">
        <div class="document-page-five">
          <!-- Header -->
          <div class="header-page-five">
            <img
              src="./assets/img/tarwesa.png"
              alt="ترويسة وزارة الداخلية"
              class="header-image-five"
            />
          </div>

          <!-- المحتوى -->
          <div class="content-page-five">
            <!-- المرسل إليه -->
            <div class="recipient-section">
              <div class="recipient-row">
                <strong>${record.recipient_title || 'السيد /'}</strong>
                <span>${record.recipient_name || ''}</span>
              </div>
              <div class="greeting-five">تحية طيبة ... وبعد ,,,</div>
            </div>

            <!-- بيانات الطلب -->
            <div class="request-info">
              <div class="info-item">
                <span class="bullet-five"></span>
                <span>إيماء لكتاب سيادتكم الوارد برقم (
                  <strong>${toArabicNumber(record.incoming_number) || ''}</strong> ) بتاريخ
                  <strong>${incomingDateFormatted}</strong> بطلب إجراء معاينة
                  نشاط / ${record.activity || ''}</span>
              </div>
             
              <div class="bank-row">
                <strong>باسم /</strong>
                <span class="field-value">${record.owner_name || ''}.</span>
              </div>
              <div class="bank-row">
                <strong>الكائن /</strong>
                <span class="field-value">${record.location || ''}.</span>
              </div>
              <div class="bank-row">
                <strong>اسم المالك / المسئول /</strong>
                <span class="field-value">${record.owner_name || ''}.</span>
              </div>
            </div>

            <!-- قرار الإدارة -->
            <div class="decision-box">
              <div class="decision-title">(( فالإدارة لا توافق ))</div>
            </div>

            <!-- نص القرار -->
            <div class="decision-text">
              <p>
                على السير في إجراءات الترخيص أو التشغيل من وجهة نظر أمن الحريق
                نظراً لعدم التزام المسئول عن النشاط باستكمال إجراءات تأمين
                العاملين بالمنشأة ضد أخطار الحريق بالمخالفة للقوانين المنظمة له.
              </p>
              <p>
                -وللجهة الإدارية المانحة للترخيص و المشرفة على النشاط سرعة إتخاذ
                الإجراءات اللازمة إتجاه النشاط و غلقه لما يمثله حالياً من خطورة
                داهمة على الأرواح والممتلكات العامة والخاصة ومجاوراته مع اعلان
                المسئول عن النشاط بذلك .
              </p>
            </div>

            <!-- الخاتمة -->
            <div class="closing-five">
              <p>,,, وتفضلوا بقبول وافر الاحترام ,,,</p>
            </div>
          </div>

          <!-- التوقيعات -->
          <div class="signature-section-page-five">
            <div class="date-section">
              تحريراً في: ${todayFormatted}
              <div class="date-extra">
                <span class="user-name-display">${userName}</span>
              </div>
            </div>

            <div class="signatures-container">
             <div class="signature-page-five">
                <div class="signature-title-page-two">عقيد /</div>
                <div class="signature-name">ياسر يسري</div>
                <div class="signature-position-five">مدير إدارة الوقاية</div>
              </div>

              <div class="signature-page-five">
                <div class="signature-title-page-two">عقيد /</div>
                <div class="signature-name">احمد عاطف</div>
                <div class="signature-position-five">مدير إدارة الإطفاء</div>
              </div>
            </div>
          </div>

          <!-- الاعتماد -->
          <div class="approval-section-five">
            <div class="approval-title-five">يعتمد ويبلغ للجهات ....</div>
            <div class="approval-signature">
              <div class="approval-rank">لواء/</div>
              <div class="approval-name">( محمد عدلي )</div>
              <div class="approval-position">مدير الإدارة العامة للحماية المدنية بالجيزة</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // فتح نافذة جديدة
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(printContent);
  printWindow.document.close();

  showNotification("✅ تم فتح صفحة عدم دفع الرسوم");
}








/**
 * عرض سجل عدم دفع موجود
 */
function showExistingNonPayment(record, cert) {
  let modal = Utils.getElement("existing-non-payment-modal", false);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "existing-non-payment-modal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  const date = new Date(record.incoming_date);
  const formattedDate = `${toArabicNumber(date.getDate())}/${toArabicNumber(date.getMonth() + 1)}/${toArabicNumber(date.getFullYear())}`;

  modal.innerHTML = `
    <div class="existing-np-content">
      <div class="existing-np-header">
        <h3>📋 سجل عدم دفع رسوم موجود</h3>
        <button onclick="closeExistingNonPaymentModal()" class="close-btn">&times;</button>
      </div>
      
      <div class="existing-np-body">
        <div class="np-info-grid">
          <div class="np-info-item">
            <span class="np-label">رقم الوارد:</span>
            <span class="np-value">${toArabicNumber(record.incoming_number)}</span>
          </div>
          <div class="np-info-item">
            <span class="np-label">تاريخ الوارد:</span>
            <span class="np-value">${formattedDate}</span>
          </div>
          <div class="np-info-item">
            <span class="np-label">المرسل إليه:</span>
            <span class="np-value">${record.recipient_title || ''} ${record.recipient_name || '-'}</span>
          </div>
          <div class="np-info-item">
            <span class="np-label">النشاط:</span>
            <span class="np-value">${record.activity || '-'}</span>
          </div>
          <div class="np-info-item">
            <span class="np-label">المالك:</span>
            <span class="np-value">${record.owner_name || '-'}</span>
          </div>
          <div class="np-info-item full-width">
            <span class="np-label">العنوان:</span>
            <span class="np-value">${record.location || '-'}</span>
          </div>
        </div>
        
        <div class="np-warning-box">
          <p>⚠️ هذه الشهادة لا تُحتسب في الإحصائيات الشهرية</p>
        </div>
      </div>
      
      <div class="existing-np-footer">
        <button onclick="closeExistingNonPaymentModal()" class="btn-cancel">إغلاق</button>
        <button onclick="cancelNonPayment(${cert.id})" class="btn-cancel-np">
          ✓ تم الدفع - إلغاء عدم الدفع
        </button>
        <button onclick="printExistingNonPayment(${record.id})" class="btn-print">
          🖨️ طباعة
        </button>
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function addMonthlyStatsStyles() {
  if (Utils.getElement("monthly-stats-styles", false)) return;

  const style = document.createElement("style");
  style.id = "monthly-stats-styles";
  style.textContent = `
    /* ========== الإحصائيات الشهرية ========== */
    .monthly-section {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0284c7;
      border-radius: 12px;
      padding: 20px;
    }
    
    .monthly-section h3 {
      color: #0369a1;
      margin-bottom: 10px;
    }
    
    .monthly-note {
      color: #64748b;
      font-size: 12px;
      margin-bottom: 15px;
      padding: 8px;
      background: #fff7ed;
      border-radius: 6px;
      border-right: 3px solid #f59e0b;
    }
    
    .monthly-stats-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    /* ========== Month Selector ========== */
    .monthly-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .monthly-header h3 {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
    
    .month-selector {
      display: flex;
      gap: 8px;
    }
    
    .month-selector select {
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #1e293b;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .month-selector select:hover {
      border-color: #667eea;
    }
    
    .month-selector select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }
    
    .monthly-category {
      background: white;
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .monthly-category h4 {
      margin: 0 0 12px 0;
      color: #1e293b;
      font-size: 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .monthly-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .monthly-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .monthly-table .amount {
      text-align: left;
      font-weight: 600;
      color: #0369a1;
    }
    
    .monthly-table .total-row {
      background: #f0fdf4;
    }
    
    .monthly-table .total-row .amount {
      color: #16a34a;
    }
    
    .monthly-grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      font-size: 16px;
    }
    
    .monthly-grand-total .value {
      font-weight: 700;
      font-size: 20px;
    }
    
    .monthly-info {
      display: flex;
      justify-content: space-around;
      padding: 10px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 13px;
      color: #64748b;
    }
    
    .btn-print-stats {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .btn-print-stats:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    /* ========== عدم دفع الرسوم ========== */
    .np-warning-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px;
      margin-top: 15px;
      text-align: center;
    }
    
    .np-warning-box p {
      color: #92400e;
      margin: 0;
      font-weight: 600;
    }
    
    .btn-cancel-np {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .btn-cancel-np:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
  `;

  document.head.appendChild(style);
}




function closeExistingNonPaymentModal() {
  const modal = Utils.getElement("existing-non-payment-modal", false);
  if (modal) modal.classList.remove("active");
}

async function printExistingNonPayment(nonPaymentId) {
  closeExistingNonPaymentModal();
  await showNonPaymentPage(nonPaymentId);
}

// ========== تصدير الدوال ==========



// ========== التهيئة الرئيسية ==========
async function initializeApp() {
  try {
    console.log("🚀 بدء تهيئة التطبيق...");

    // 1. إعداد معالجات الأخطاء
    setupErrorHandlers();

    // 2. إضافة CSS
    addAllStyles();

    // 3. التحقق من الـ API
    const apiReady = await API.check();
    if (!apiReady) {
      console.warn("⚠️ التطبيق يعمل بدون قاعدة بيانات");
    }

    // 4. تحميل الحالة المحفوظة
    AppState.load();
    DateSystem.load();

    // 5. تحميل آخر شهادة أو البدء فارغاً
    await loadLastCertificateOrStartEmpty(apiReady);

    // 6. تهيئة التواريخ
    const hasAnyDate = Object.values(AppState.pageDates).some(
      (d) => d !== null
    );
    if (!hasAnyDate) {
      DateSystem.initializeAll();
    }

    // 6. تحديث زر الرسوم
    updateFeesButtonText();

    // 7. إعداد تحويل الأرقام
    setupArabicNumberInputs();

    // 8. تعديل حجم الخط
    adjustFieldValueFontSize();
    window.addEventListener(
      "resize",
      Utils.throttle(adjustFieldValueFontSize, 200)
    );

    // 9. تحميل اسم المستخدم
    const savedUserName = Storage.loadUserName();
    if (savedUserName) {
      updateUserNameDisplay(savedUserName);
    }

    // 10. إعداد حفظ اسم المستخدم تلقائياً
    const userNameInput = Utils.getElement("inputUserName", false);
    if (userNameInput) {
      userNameInput.addEventListener(
        "input",
        Utils.debounce(function () {
          const name = this.value.trim();
          if (name) Storage.saveUserName(name);
        }, CONFIG.AUTO_SAVE_DELAY)
      );
    }

    // 11. معاينة لحظية للحسابات
    const calcFields = [
      "inputPersons",
      "inputConsultant",
      "inputEvacuation",
      "inputInspection",
      "inputArea",
      "inputProtectionFee",
    ]; // إضافة inputProtectionFee
    calcFields.forEach((fieldId) => {
      const field = Utils.getElement(fieldId, false);
      if (field) {
        field.addEventListener("input", Utils.debounce(updateCalcPreview, 100));
      }
    });

    // 12. إعداد Popup handlers
    setupPopupHandlers();

    // 13. إضافة أزرار الطباعة
    addPrintButtons();

    // 14. تفعيل الاختصارات
    setupKeyboardShortcuts();

    // 15. تهيئة نظام الاقتراحات
    if (apiReady) {
      await AutocompleteSystem.loadCache();

      // تفعيل الاقتراحات على حقول البحث المتقدم
      ["searchActivity", "searchName", "searchLocation"].forEach(
        (id, index) => {
          const types = ["activities", "names", "locations"];
          AutocompleteSystem.setup(id, types[index]);
        }
      );
    }

    // 16. إعداد التنظيف
    setupCleanup();

    console.log("✅ تم تهيئة التطبيق بنجاح");
    console.log("📌 الاختصارات المتاحة:");
    console.log("   Ctrl+S = حفظ");
    console.log("   Ctrl+N = شهادة جديدة");
    console.log("   Ctrl+P = طباعة");
    console.log("   Ctrl+E = تصدير PDF");
    console.log("   Ctrl+F = بحث");
    console.log("   Escape = إغلاق النوافذ");
  } catch (err) {
    console.error("❌ خطأ في تهيئة التطبيق:", err);
    showNotification("❌ حدث خطأ أثناء تهيئة التطبيق", "error");
  }
}

// ========== بدء التطبيق ==========
document.addEventListener("DOMContentLoaded", initializeApp);

// ========== تصدير للاستخدام العالمي ==========
// الدوال الأساسية
window.openFeesPopup = openFeesPopup;
window.closeFeesPopup = closeFeesPopup;
window.applyChanges = applyChanges;
window.saveCertificate = saveCertificate;
window.loadCertificate = loadCertificate;
window.newCertificate = newCertificate;

// الطباعة والتصدير
window.printDocument = printDocument;
window.printSelectedPages = printSelectedPages;
window.exportToPDF = exportToPDF;
window.showPrintOptions = showPrintOptions;
window.closePrintOptions = closePrintOptions;
window.printFromModal = printFromModal;
window.exportFromModal = exportFromModal;
window.updatePrintPreview = updatePrintPreview;

// قائمة الشهادات
window.openCertificatesModal = openCertificatesModal;
window.closeCertsModal = closeCertsModal;
window.loadAndClose = loadAndClose;
window.searchCertificatesUI = searchCertificatesUI;

// البحث المتقدم
window.toggleAdvancedSearch = toggleAdvancedSearch;
window.performAdvancedSearch = performAdvancedSearch;
window.clearAdvancedSearch = clearAdvancedSearch;
window.exportSearchResults = exportSearchResults;

// الحذف
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.performDelete = performDelete;

// الإحصائيات
window.showStats = showStats;
window.closeStatsModal = closeStatsModal;
window.changeStatsMonth = changeStatsMonth;
window.refreshStats = refreshStats;
window.exportStats = exportStats;

// السجل
window.showHistory = showHistory;
window.showFullHistory = showFullHistory;
window.closeFullHistory = closeFullHistory;
window.closeHistoryModal = closeHistoryModal;

// التحقق
window.ValidationSystem = ValidationSystem;
window.closeValidationModal = closeValidationModal;

// المقارنة
window.toggleComparisonDetails = toggleComparisonDetails;
window.hideComparisonBar = hideComparisonBar;

// التحميل
window.Loading = Loading;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// الإخطارات
window.showNotification = showNotification;

// الأدوات المساعدة
window.toArabicNumber = toArabicNumber;
window.numberToArabicWords = numberToArabicWords;
window.formatDate = formatDate;

// للتوافق مع الكود القديم
window.validateRequiredFields = validateRequiredFields;
window.updateCalcPreview = updateCalcPreview;
window.adjustFieldValueFontSize = adjustFieldValueFontSize;
window.updateProtectionDisplay = updateProtectionDisplay;
window.checkForActualChanges = checkForActualChanges;
window.normalizeValue = normalizeValue;
window.openNonPaymentModal = openNonPaymentModal;
window.closeNonPaymentModal = closeNonPaymentModal;
window.submitNonPayment = submitNonPayment;
window.showExistingNonPayment = showExistingNonPayment;
window.closeExistingNonPaymentModal = closeExistingNonPaymentModal;
window.printExistingNonPayment = printExistingNonPayment;
window.printMonthlyStats = printMonthlyStats;
window.cancelNonPayment = cancelNonPayment;

// دالة إخفاء الصفحة الخامسة
function hidePageFive() {
  const pageFive = Utils.$(".page-five");
  if (pageFive) {
    pageFive.style.display = "none";
    pageFive.classList.remove("active-non-payment");
    pageFive.setAttribute("data-non-payment", "false");
  }
}

window.hidePageFive = hidePageFive;

// ========== الأنظمة الجديدة ==========
window.UndoRedoSystem = UndoRedoSystem;
window.SearchHistory = SearchHistory;
window.UIOptimizer = UIOptimizer;

// ========== دوال Undo/Redo للحالة ==========
// تحصل على حالة الحقول الحالية
function getCurrentFormState() {
  return {
    activity: Utils.getElement('inputActivity', false)?.value || '',
    name: Utils.getElement('inputName', false)?.value || '',
    location: Utils.getElement('inputLocation', false)?.value || '',
    area: Utils.getElement('inputArea', false)?.value || '',
    persons: Utils.getElement('inputPersons', false)?.value || '',
    consultant: Utils.getElement('inputConsultant', false)?.value || '',
    evacuation: Utils.getElement('inputEvacuation', false)?.value || '',
    inspection: Utils.getElement('inputInspection', false)?.value || '',
    protectionFee: Utils.getElement('inputProtectionFee', false)?.value || '',
    userName: Utils.getElement('inputUserName', false)?.value || ''
  };
}

// تطبيق حالة على الحقول
function applyFormState(state) {
  const fields = {
    inputActivity: state.activity,
    inputName: state.name,
    inputLocation: state.location,
    inputArea: state.area,
    inputPersons: state.persons,
    inputConsultant: state.consultant,
    inputEvacuation: state.evacuation,
    inputInspection: state.inspection,
    inputProtectionFee: state.protectionFee,
    inputUserName: state.userName
  };

  Object.entries(fields).forEach(([id, value]) => {
    const input = Utils.getElement(id, false);
    if (input && value !== undefined) {
      input.value = value;
    }
  });

  // تحديث العرض
  updateCalcPreview();
}

// تنفيذ Undo
function performUndo() {
  const result = UndoRedoSystem.undo(getCurrentFormState, applyFormState);
  if (result) {
    showNotification('↩️ تم التراجع', 'info');
  } else {
    showNotification('لا يوجد ما يمكن التراجع عنه', 'warning');
  }
}

// تنفيذ Redo
function performRedo() {
  const result = UndoRedoSystem.redo(getCurrentFormState, applyFormState);
  if (result) {
    showNotification('↪️ تم الإعادة', 'info');
  } else {
    showNotification('لا يوجد ما يمكن إعادته', 'warning');
  }
}

// ربط اختصارات لوحة المفاتيح
if (typeof API !== 'undefined' && API.onShortcut) {
  API.onShortcut('shortcut-undo', performUndo);
  API.onShortcut('shortcut-redo', performRedo);
}

window.performUndo = performUndo;
window.performRedo = performRedo;
window.getCurrentFormState = getCurrentFormState;
window.applyFormState = applyFormState;

// حفظ الحالة عند تغيير الحقول (مع debounce)
const saveStateDebounced = Utils.debounce(() => {
  UndoRedoSystem.saveState(getCurrentFormState(), 'تغيير الحقول');
}, 500);

// إضافة listeners لحفظ الحالة عند التغيير
document.querySelectorAll('#inputActivity, #inputName, #inputLocation, #inputArea, #inputPersons, #inputConsultant, #inputEvacuation, #inputInspection, #inputProtectionFee, #inputUserName').forEach(input => {
  if (input) {
    input.addEventListener('input', saveStateDebounced);
  }
});

