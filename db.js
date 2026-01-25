const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// ========== متغيرات المسارات ==========
let dataDir = null;
let dbPath = null;

let SQL;
let db;

// ========== نظام التخزين المؤقت (Query Cache) ==========
const QueryCache = {
  cache: new Map(),
  maxSize: 100,        // الحد الأقصى للعناصر
  defaultTTL: 30000,   // 30 ثانية

  // الحصول على قيمة من الـ cache
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // التحقق من انتهاء الصلاحية
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  },

  // حفظ قيمة في الـ cache
  set(key, value, ttl = this.defaultTTL) {
    // حذف القديم إذا وصلنا للحد الأقصى
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  },

  // مسح الـ cache (عند تعديل البيانات)
  invalidate(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // مسح المفاتيح التي تحتوي على النمط
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  },

  // إحصائيات الـ cache
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
};

// ========== نظام الحفظ المجمّع (Batch Save) ==========
const BatchSave = {
  pending: false,
  timeout: null,
  delay: 500,  // تأخير 500ms قبل الحفظ

  // جدولة الحفظ
  schedule() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.pending = true;
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  },

  // تنفيذ الحفظ الفوري
  flush() {
    if (!this.pending) return;

    try {
      const binary = db.export();
      const buffer = Buffer.from(binary);
      fs.writeFileSync(dbPath, buffer);
      this.pending = false;
      console.log('💾 Database saved (batch)');
    } catch (err) {
      console.error('BatchSave error:', err);
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  },

  // التنظيف عند إيقاف التطبيق
  cleanup() {
    this.flush();
  }
};

// ========== تتبع الأداء ==========
const PerformanceTracker = {
  queries: [],
  maxQueries: 50,

  track(name, duration) {
    this.queries.push({ name, duration, time: Date.now() });
    if (this.queries.length > this.maxQueries) {
      this.queries.shift();
    }
  },

  getStats() {
    if (this.queries.length === 0) return { avg: 0, max: 0, count: 0 };

    const durations = this.queries.map(q => q.duration);
    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      max: Math.max(...durations),
      count: this.queries.length
    };
  }
};

// ========== دالة تحديد مسار البيانات ==========
function setDataPath(customPath) {
  dataDir = customPath;
  dbPath = path.join(dataDir, 'app.db');

  console.log('✅ Database path set to:', dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// ========== Fallback لو مفيش مسار محدد ==========
function ensurePath() {
  if (!dataDir) {
    dataDir = path.join(__dirname, 'data');
    dbPath = path.join(dataDir, 'app.db');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('⚠️ Using fallback path:', dbPath);
  }
}





function fixOldCertificatesTotals() {
  try {
    const certs = getAllCertificates({ status: 'active' });
    let fixed = 0;

    certs.forEach(cert => {
      // حساب الإجماليات الصحيحة
      const trainingFee = cert.training_fee || 0;
      const consultantFee = cert.consultant_fee || 0;
      const evacuationFee = cert.evacuation_fee || 0;
      const inspectionFee = cert.inspection_fee || 0;
      const areaFee = cert.area_fee || 0;
      const ministryFee = cert.ministry_fee || 0;

      const correctGrandTotal = trainingFee + consultantFee + evacuationFee + inspectionFee;
      const correctMinistryTotal = areaFee + ministryFee;

      // تحديث إذا كانت القيم خاطئة
      if (cert.grand_total !== correctGrandTotal || cert.ministry_total !== correctMinistryTotal) {
        const stmt = db.prepare(`
          UPDATE certificates 
          SET grand_total = ?, ministry_total = ?
          WHERE id = ?
        `);
        stmt.bind([correctGrandTotal, correctMinistryTotal, cert.id]);
        stmt.step();
        stmt.free();
        fixed++;
      }
    });

    if (fixed > 0) {
      save();
      console.log(`✅ تم إصلاح ${fixed} شهادة`);
    }

    return { fixed };
  } catch (err) {
    console.error('fixOldCertificatesTotals error:', err);
    return { fixed: 0, error: err.message };
  }
}

async function init() {
  ensurePath();  // ⭐ سطر جديد - التأكد من وجود مسار

  console.log('🔄 Initializing database at:', dbPath);

  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    console.log('📂 Loading existing database...');
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(filebuffer));
    createTables();
  } else {
    console.log('📝 Creating new database...');
    db = new SQL.Database();
    createTables();

    fixOldCertificatesTotals();
    save();
  }

  console.log('✅ Database initialized successfully');
}


function createTables() {
  try {
    // جدول الملاحظات القديم
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      body TEXT,
      created_at INTEGER
    );`);

    // ========== جدول الشهادات الرئيسي ==========
    db.run(`CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- بيانات المنشأة
      activity TEXT,
      name TEXT,
      location TEXT,
      area REAL,
      
      -- بيانات الرسوم
      persons_count INTEGER,
      training_fee REAL,
      consultant_fee REAL,
      evacuation_fee REAL,
      inspection_fee REAL,
      area_fee REAL,
      ministry_fee REAL,
      grand_total REAL,
      ministry_total REAL,
      protection_fee REAL DEFAULT 0,
      
      -- بيانات المستخدم
      user_name TEXT,
      
      -- تتبع التعديلات
      created_at INTEGER,
      updated_at INTEGER,
      edit_count INTEGER DEFAULT 0,
      is_modified INTEGER DEFAULT 0,
      
      -- حالة الشهادة
      status TEXT DEFAULT 'active'
    );`);

    // ========== ⭐ Migration: إضافة الأعمدة الجديدة للجدول الموجود ==========
    migrateDatabase();

    // ========== جدول عدم دفع الرسوم ==========
    db.run(`CREATE TABLE IF NOT EXISTS non_payment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER,
  
  -- بيانات الخطاب الوارد
  incoming_number TEXT,
  incoming_date INTEGER,
  
  -- بيانات المنشأة (تُنسخ من الشهادة)
  activity TEXT,
  owner_name TEXT,
  location TEXT,
  
  -- بيانات المرسل إليه
  recipient_title TEXT DEFAULT 'السيد /',
  recipient_name TEXT,
  
  -- تتبع
  created_at INTEGER,
  created_by TEXT,
  status TEXT DEFAULT 'active',
  
  FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);`);

    // ========== جدول سجل التعديلات ==========
    db.run(`CREATE TABLE IF NOT EXISTS certificate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_id INTEGER,
      old_data TEXT,
      new_data TEXT,
      changed_fields TEXT,
      edit_reason TEXT,
      edited_by TEXT,
      edited_at INTEGER,
      FOREIGN KEY (certificate_id) REFERENCES certificates(id)
    );`);
  } catch (err) {
    console.error('createTables error:', err);
  }
}



function migrateDatabase() {
  // ========== Migration لجدول certificates ==========
  const newColumns = [
    { name: 'date_governorate', type: 'INTEGER' },
    { name: 'date_training', type: 'INTEGER' },
    { name: 'date_ministry', type: 'INTEGER' },
    { name: 'date_certificate', type: 'INTEGER' },
    { name: 'date_decision', type: 'INTEGER' },
    { name: 'protection_fee', type: 'REAL DEFAULT 0' },
    { name: 'has_non_payment', type: 'INTEGER DEFAULT 0' },
    { name: 'non_payment_id', type: 'INTEGER' }
  ];

  newColumns.forEach(column => {
    try {
      db.run(`ALTER TABLE certificates ADD COLUMN ${column.name} ${column.type};`);
      console.log(`✅ تم إضافة عمود: ${column.name}`);
    } catch (err) {
      if (err.message && err.message.includes('duplicate column name')) {
        console.log(`ℹ️ العمود موجود مسبقاً: ${column.name}`);
      } else {
        console.log(`ℹ️ العمود ${column.name}: ${err.message || 'موجود'}`);
      }
    }
  });

  // ========== Migration لجدول non_payment_records ==========
  const nonPaymentColumns = [
    { name: 'recipient_title', type: "TEXT DEFAULT 'السيد /'" },
    { name: 'recipient_name', type: 'TEXT' },
    { name: 'cancelled_at', type: 'INTEGER' }
  ];

  nonPaymentColumns.forEach(column => {
    try {
      db.run(`ALTER TABLE non_payment_records ADD COLUMN ${column.name} ${column.type};`);
      console.log(`✅ تم إضافة عمود لـ non_payment_records: ${column.name}`);
    } catch (err) {
      console.log(`ℹ️ العمود ${column.name} في non_payment_records: ${err.message || 'موجود'}`);
    }
  });

  // تحديث الشهادات القديمة بتواريخ افتراضية
  try {
    db.run(`
      UPDATE certificates 
      SET 
        date_governorate = COALESCE(date_governorate, created_at),
        date_training = COALESCE(date_training, created_at),
        date_ministry = COALESCE(date_ministry, created_at),
        date_certificate = COALESCE(date_certificate, created_at),
        date_decision = COALESCE(date_decision, created_at),
        protection_fee = COALESCE(protection_fee, 0)
      WHERE date_governorate IS NULL 
         OR date_training IS NULL 
         OR date_ministry IS NULL 
         OR date_certificate IS NULL 
         OR date_decision IS NULL
         OR protection_fee IS NULL;
    `);
    console.log('✅ تم تحديث التواريخ ورسوم الحماية للشهادات القديمة');
  } catch (err) {
    console.log('ℹ️ تحديث البيانات:', err.message || 'تم');
  }

  // ========== إنشاء Indexes للبحث السريع ==========
  createIndexes();
}

/**
 * إنشاء Indexes للبحث السريع - مهم جداً للبيانات الضخمة
 */
function createIndexes() {
  const indexes = [
    // فهرس للحالة - مهم جداً لفلترة الشهادات النشطة
    { name: 'idx_certificates_status', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status)' },

    // فهرس للتاريخ - للبحث بالتاريخ والترتيب
    { name: 'idx_certificates_created', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_created ON certificates(created_at DESC)' },

    // فهرس مركب للحالة والتاريخ - الأكثر استخداماً
    { name: 'idx_certificates_status_created', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_status_created ON certificates(status, created_at DESC)' },

    // فهارس للبحث النصي
    { name: 'idx_certificates_activity', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_activity ON certificates(activity)' },
    { name: 'idx_certificates_name', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_name ON certificates(name)' },
    { name: 'idx_certificates_location', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_location ON certificates(location)' },

    // فهرس للشهادات المعدلة
    { name: 'idx_certificates_modified', sql: 'CREATE INDEX IF NOT EXISTS idx_certificates_modified ON certificates(is_modified)' },

    // فهرس لسجل التعديلات
    { name: 'idx_history_cert_id', sql: 'CREATE INDEX IF NOT EXISTS idx_history_cert_id ON certificate_history(certificate_id)' },

    // فهرس لسجلات عدم الدفع
    { name: 'idx_non_payment_cert_id', sql: 'CREATE INDEX IF NOT EXISTS idx_non_payment_cert_id ON non_payment_records(certificate_id)' }
  ];

  indexes.forEach(index => {
    try {
      db.run(index.sql);
    } catch (err) {
      // الفهرس موجود بالفعل - لا مشكلة
    }
  });

  console.log('✅ تم إنشاء/التحقق من الفهارس (Indexes)');
}


function save(immediate = false) {
  // مسح الـ cache عند تعديل البيانات
  QueryCache.invalidate();

  if (immediate) {
    // حفظ فوري للعمليات الحرجة
    const binary = db.export();
    const buffer = Buffer.from(binary);
    fs.writeFileSync(dbPath, buffer);
    console.log('💾 Database saved (immediate)');
  } else {
    // حفظ مجمّع للعمليات المتكررة
    BatchSave.schedule();
  }
}

// حفظ فوري إجباري (للإغلاق أو العمليات الحرجة)
// حفظ فوري إجباري (للإغلاق أو العمليات الحرجة)
function saveImmediate() {
  BatchSave.flush();
  const binary = db.export();
  const buffer = Buffer.from(binary);
  fs.writeFileSync(dbPath, buffer);
}

// ========== دوال الملاحظات (القديمة) ==========
function addNote({ title, body }) {
  try {
    const stmt = db.prepare('INSERT INTO notes (title, body, created_at) VALUES (?, ?, ?);');
    stmt.bind([title || '', body || '', Date.now()]);
    stmt.step();
    stmt.free();

    const idStmt = db.prepare('SELECT last_insert_rowid() AS id;');
    let id = null;
    if (idStmt.step()) {
      id = idStmt.get()[0];
    }
    idStmt.free();

    save();
    return { id };
  } catch (err) {
    console.error('addNote error:', err);
    throw err;
  }
}

function getNotes() {
  const result = [];
  try {
    const stmt = db.prepare('SELECT id, title, body, created_at FROM notes ORDER BY created_at DESC;');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      result.push(row);
    }
    stmt.free();
  } catch (err) {
    console.error('getNotes error:', err);
  }
  return result;
}

// ========== دوال الشهادات (الجديدة) ==========

/**
 * إضافة شهادة جديدة
 */
function addCertificate(data) {
  const now = Date.now();

  try {
    const stmt = db.prepare(`INSERT INTO certificates (
      activity, name, location, area,
      persons_count, training_fee, consultant_fee, evacuation_fee,
      inspection_fee, area_fee, ministry_fee, grand_total, ministry_total,
      protection_fee,
      user_name,
      date_governorate, date_training, date_ministry, date_certificate, date_decision,
      created_at, updated_at, edit_count, is_modified, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active');`)

    stmt.bind([
      data.activity || '',
      data.name || '',
      data.location || '',
      data.area || 0,
      data.persons_count || 0,
      data.training_fee || 0,
      data.consultant_fee || 0,
      data.evacuation_fee || 0,
      data.inspection_fee || 0,
      data.area_fee || 0,
      data.ministry_fee || 0,
      data.grand_total || 0,
      data.ministry_total || 0,
      data.protection_fee || 0,  // ⭐ إضافة جديدة
      data.user_name || '',
      now, // date_governorate
      now, // date_training
      now, // date_ministry
      now, // date_certificate
      now, // date_decision
      now, // created_at
      now  // updated_at
    ]);

    stmt.step();
    stmt.free();

    const idStmt = db.prepare('SELECT last_insert_rowid() AS id;');
    let id = null;
    if (idStmt.step()) {
      id = idStmt.get()[0];
    }
    idStmt.free();

    save();
    return {
      id,
      created_at: now,
      page_dates: {
        governorate: now,
        training: now,
        ministry: now,
        certificate: now,
        decision: now
      },
      edit_count: 0,
      is_modified: false
    };
  } catch (err) {
    console.error('addCertificate error:', err);
    throw err;
  }
}

/**
 * تعديل شهادة مع حفظ السجل
 */
function updateCertificate(id, newData, editReason = '', editedBy = '') {
  try {
    const oldCert = getCertificateById(id);
    if (!oldCert) {
      throw new Error('الشهادة غير موجودة');
    }

    const now = Date.now();

    // ⭐ تحديد الحقول التي تغيرت فعلياً
    const changedFields = [];
    const fieldsToCheck = [
      'activity', 'name', 'location', 'area',
      'persons_count', 'training_fee', 'consultant_fee', 'evacuation_fee',
      'inspection_fee', 'area_fee', 'ministry_fee', 'grand_total', 'ministry_total',
      'protection_fee',  // ⭐ إضافة جديدة
      'user_name'
    ];

    fieldsToCheck.forEach(field => {
      const oldValue = oldCert[field];
      const newValue = newData[field];

      // تطبيع القيم للمقارنة الصحيحة
      const normalizedOld = normalizeValue(oldValue);
      const normalizedNew = normalizeValue(newValue);

      if (newValue !== undefined && normalizedNew !== normalizedOld) {
        changedFields.push({
          field: field,
          old_value: oldValue,
          new_value: newValue
        });
      }
    });

    // ⭐⭐⭐ إذا لم تتغير أي حقول، لا نحفظ شيء ⭐⭐⭐
    if (changedFields.length === 0) {
      console.log('ℹ️ لا توجد تغييرات فعلية - تم تخطي الحفظ');
      return {
        id,
        updated_at: oldCert.updated_at,
        edit_count: oldCert.edit_count,
        is_modified: oldCert.is_modified === 1,
        changed_fields: [],
        affected_pages: [],
        no_changes: true  // ⭐ علامة لعدم وجود تغييرات
      };
    }

    // ⭐ تحديد الصفحات المتأثرة
    const affectedPages = getAffectedPages(changedFields.map(f => f.field));

    // ⭐ تحديث تواريخ الصفحات المتأثرة فقط
    const newPageDates = {
      date_governorate: affectedPages.includes('governorate') ? now : oldCert.date_governorate,
      date_training: affectedPages.includes('training') ? now : oldCert.date_training,
      date_ministry: affectedPages.includes('ministry') ? now : oldCert.date_ministry,
      date_certificate: affectedPages.includes('certificate') ? now : oldCert.date_certificate,
      date_decision: affectedPages.includes('decision') ? now : oldCert.date_decision
    };

    // حفظ سجل التعديل
    const histStmt = db.prepare(`INSERT INTO certificate_history (
      certificate_id, old_data, new_data, changed_fields, edit_reason, edited_by, edited_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`);

    histStmt.bind([
      id,
      JSON.stringify(oldCert),
      JSON.stringify({ ...newData, affected_pages: affectedPages }),
      JSON.stringify(changedFields),
      editReason,
      editedBy || newData.user_name || '',
      now
    ]);

    histStmt.step();
    histStmt.free();

    // تحديث الشهادة
    const newEditCount = (oldCert.edit_count || 0) + 1;

    const updateStmt = db.prepare(`UPDATE certificates SET
      activity = ?,
      name = ?,
      location = ?,
      area = ?,
      persons_count = ?,
      training_fee = ?,
      consultant_fee = ?,
      evacuation_fee = ?,
      inspection_fee = ?,
      area_fee = ?,
      ministry_fee = ?,
      grand_total = ?,
      ministry_total = ?,
      protection_fee = ?,
      user_name = ?,
      date_governorate = ?,
      date_training = ?,
      date_ministry = ?,
      date_certificate = ?,
      date_decision = ?,
      updated_at = ?,
      edit_count = ?,
      is_modified = 1
    WHERE id = ?;`);

    updateStmt.bind([
      newData.activity ?? oldCert.activity,
      newData.name ?? oldCert.name,
      newData.location ?? oldCert.location,
      newData.area ?? oldCert.area,
      newData.persons_count ?? oldCert.persons_count,
      newData.training_fee ?? oldCert.training_fee,
      newData.consultant_fee ?? oldCert.consultant_fee,
      newData.evacuation_fee ?? oldCert.evacuation_fee,
      newData.inspection_fee ?? oldCert.inspection_fee,
      newData.area_fee ?? oldCert.area_fee,
      newData.ministry_fee ?? oldCert.ministry_fee,
      newData.grand_total ?? oldCert.grand_total,
      newData.ministry_total ?? oldCert.ministry_total,
      newData.protection_fee ?? oldCert.protection_fee,  // ⭐ إضافة جديدة
      newData.user_name ?? oldCert.user_name,
      newPageDates.date_governorate,
      newPageDates.date_training,
      newPageDates.date_ministry,
      newPageDates.date_certificate,
      newPageDates.date_decision,
      now,
      newEditCount,
      id
    ]);

    updateStmt.step();
    updateStmt.free();

    save();

    return {
      id,
      updated_at: now,
      edit_count: newEditCount,
      is_modified: true,
      changed_fields: changedFields,
      affected_pages: affectedPages,
      page_dates: {
        governorate: newPageDates.date_governorate,
        training: newPageDates.date_training,
        ministry: newPageDates.date_ministry,
        certificate: newPageDates.date_certificate,
        decision: newPageDates.date_decision
      }
    };
  } catch (err) {
    console.error('updateCertificate error:', err);
    throw err;
  }
}

// ⭐ دالة مساعدة لتطبيع القيم للمقارنة
function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function getAffectedPages(changedFieldNames) {
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
    protection_fee: ['certificate'],  // ⭐ إضافة جديدة
    activity: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
    name: ['governorate', 'training', 'ministry', 'certificate', 'decision'],
    location: ['governorate', 'training', 'ministry', 'certificate', 'decision']
  };

  const affectedPages = new Set();

  changedFieldNames.forEach(fieldName => {
    const pages = fieldToPageMapping[fieldName];
    if (pages) {
      pages.forEach(page => affectedPages.add(page));
    }
  });

  return Array.from(affectedPages);
}


/**
 * جلب شهادة بالـ ID
 */
function getCertificateById(id) {
  let stmt = null;
  try {
    stmt = db.prepare('SELECT * FROM certificates WHERE id = ?;');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
      result.is_modified = result.is_modified === 1;
    }
    return result;
  } catch (err) {
    console.error('getCertificateById error:', err);
    return null;
  } finally {
    if (stmt) stmt.free();  // دائماً تحرير الـ statement
  }
}

/**
 * جلب كل الشهادات
 */
function getAllCertificates(options = {}) {
  let query = 'SELECT * FROM certificates';
  const conditions = [];
  const params = [];


  // فلترة حسب الحالة
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  // فلترة حسب التعديل
  if (options.modifiedOnly) {
    conditions.push('is_modified = 1');
  }

  // فلترة حسب التاريخ
  if (options.fromDate) {
    conditions.push('created_at >= ?');
    params.push(options.fromDate);
  }
  if (options.toDate) {
    conditions.push('created_at <= ?');
    params.push(options.toDate);
  }

  // فلترة حسب اسم المنشأة
  if (options.searchName) {
    conditions.push('name LIKE ?');
    params.push(`%${options.searchName}%`);
  }

  // فلترة حسب النشاط
  if (options.searchActivity) {
    conditions.push('activity LIKE ?');
    params.push(`%${options.searchActivity}%`);
  }

  // فلترة حسب العنوان
  if (options.searchLocation) {
    conditions.push('location LIKE ?');
    params.push(`%${options.searchLocation}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  // ⭐ Pagination - مهم جداً للبيانات الضخمة
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = [];
  try {
    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.is_modified = row.is_modified === 1;
      result.push(row);
    }
    stmt.free();
  } catch (err) {
    console.error('getAllCertificates error:', err);
  }

  return result;
}

/**
 * ⭐ جلب القيم الفريدة مباشرة من SQL - للـ Autocomplete
 * هذه الدالة أسرع بكثير من تحميل كل الشهادات
 */
function getUniqueValues(column, options = {}) {
  const validColumns = ['activity', 'name', 'location'];
  if (!validColumns.includes(column)) {
    console.error('Invalid column for getUniqueValues:', column);
    return [];
  }

  let query = `SELECT DISTINCT ${column} FROM certificates WHERE ${column} IS NOT NULL AND ${column} != ''`;
  const params = [];

  // فلترة حسب الحالة
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  query += ` ORDER BY ${column} ASC`;

  // حد أقصى للنتائج (للأمان)
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = [];
  try {
    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      const row = stmt.get();
      if (row[0]) {
        // إزالة النقطة من النهاية وتنظيف النص
        const value = row[0].replace(/\.$/, '').trim();
        if (value) {
          result.push(value);
        }
      }
    }
    stmt.free();
  } catch (err) {
    console.error('getUniqueValues error:', err);
  }

  return result;
}

/**
 * جلب عدد الشهادات الإجمالي (للـ Pagination)
 */
function getCertificatesCount(options = {}) {
  let query = 'SELECT COUNT(*) as count FROM certificates';
  const conditions = [];
  const params = [];

  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  if (options.modifiedOnly) {
    conditions.push('is_modified = 1');
  }

  if (options.searchName) {
    conditions.push('name LIKE ?');
    params.push(`%${options.searchName}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }
    if (stmt.step()) {
      const result = stmt.get()[0];
      stmt.free();
      return result;
    }
    stmt.free();
  } catch (err) {
    console.error('getCertificatesCount error:', err);
  }

  return 0;
}

/**
 * إنشاء سجل عدم دفع رسوم
 */
function createNonPaymentRecord(certificateId, data) {
  const now = Date.now();

  try {
    const cert = getCertificateById(certificateId);
    if (!cert) {
      throw new Error('الشهادة غير موجودة');
    }

    const stmt = db.prepare(`INSERT INTO non_payment_records (
      certificate_id,
      incoming_number,
      incoming_date,
      activity,
      owner_name,
      location,
      recipient_title,
      recipient_name,
      created_at,
      created_by,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active');`);

    stmt.bind([
      certificateId,
      data.incoming_number || '',
      data.incoming_date || now,
      cert.activity || '',
      cert.name || '',  // باسم = اسم المالك
      cert.location || '',
      data.recipient_title || 'السيد /',
      data.recipient_name || '',
      now,
      data.created_by || ''
    ]);

    stmt.step();
    stmt.free();

    // الحصول على ID السجل الجديد
    const idStmt = db.prepare('SELECT last_insert_rowid() AS id;');
    let nonPaymentId = null;
    if (idStmt.step()) {
      nonPaymentId = idStmt.get()[0];
    }
    idStmt.free();

    // تحديث الشهادة
    const updateStmt = db.prepare(`
      UPDATE certificates 
      SET has_non_payment = 1, non_payment_id = ?, updated_at = ?
      WHERE id = ?;
    `);
    updateStmt.bind([nonPaymentId, now, certificateId]);
    updateStmt.step();
    updateStmt.free();

    save();

    return {
      id: nonPaymentId,
      certificate_id: certificateId,
      created_at: now
    };
  } catch (err) {
    console.error('createNonPaymentRecord error:', err);
    throw err;
  }
}


/**
 * جلب سجل عدم الدفع
 */
function getNonPaymentRecord(id) {
  try {
    const stmt = db.prepare('SELECT * FROM non_payment_records WHERE id = ?;');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  } catch (err) {
    console.error('getNonPaymentRecord error:', err);
    return null;
  }
}

/**
 * جلب سجل عدم الدفع بواسطة ID الشهادة
 */
function getNonPaymentByCertificate(certificateId) {
  try {
    const stmt = db.prepare('SELECT * FROM non_payment_records WHERE certificate_id = ? AND status = "active";');
    stmt.bind([certificateId]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  } catch (err) {
    console.error('getNonPaymentByCertificate error:', err);
    return null;
  }
}


/**
 * جلب سجل تعديلات شهادة معينة
 */
function getCertificateHistory(certificateId) {
  const result = [];
  try {
    const stmt = db.prepare('SELECT * FROM certificate_history WHERE certificate_id = ? ORDER BY edited_at DESC;');
    stmt.bind([certificateId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      // تحويل JSON strings لـ objects
      if (row.old_data) {
        try {
          row.old_data = JSON.parse(row.old_data);
        } catch { }
      }
      if (row.new_data) {
        try {
          row.new_data = JSON.parse(row.new_data);
        } catch { }
      }
      if (row.changed_fields) {
        try {
          row.changed_fields = JSON.parse(row.changed_fields);
        } catch { }
      }
      result.push(row);
    }
    stmt.free();
  } catch (err) {
    console.error('getCertificateHistory error:', err);
  }

  return result;
}



/**
 * حذف شهادة (soft delete)
 */
function deleteCertificate(id, deletedBy = '') {
  try {
    const now = Date.now();

    // حفظ في السجل قبل الحذف
    const cert = getCertificateById(id);
    if (cert) {
      const histStmt = db.prepare(`INSERT INTO certificate_history (
        certificate_id, old_data, new_data, changed_fields, edit_reason, edited_by, edited_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`);

      histStmt.bind([
        id,
        JSON.stringify(cert),
        null,
        JSON.stringify([{ field: 'status', old_value: cert.status, new_value: 'deleted' }]),
        'حذف الشهادة',
        deletedBy,
        now
      ]);

      histStmt.step();
      histStmt.free();
    }

    const updateStmt = db.prepare('UPDATE certificates SET status = ?, updated_at = ? WHERE id = ?;');
    updateStmt.bind(['deleted', now, id]);
    updateStmt.step();
    updateStmt.free();

    save();

    return { success: true };
  } catch (err) {
    console.error('deleteCertificate error:', err);
    throw err;
  }
}

/**
 * إلغاء حالة عدم دفع الرسوم (عندما يدفع العميل)
 */
function cancelNonPayment(certificateId) {
  const now = Date.now();

  try {
    // تحديث سجل عدم الدفع
    const updateNpStmt = db.prepare(`
      UPDATE non_payment_records 
      SET status = 'cancelled', cancelled_at = ?
      WHERE certificate_id = ? AND status = 'active';
    `);
    updateNpStmt.bind([now, certificateId]);
    updateNpStmt.step();
    updateNpStmt.free();

    // تحديث الشهادة
    const updateCertStmt = db.prepare(`
      UPDATE certificates 
      SET has_non_payment = 0, updated_at = ?
      WHERE id = ?;
    `);
    updateCertStmt.bind([now, certificateId]);
    updateCertStmt.step();
    updateCertStmt.free();

    save();

    return { success: true };
  } catch (err) {
    console.error('cancelNonPayment error:', err);
    throw err;
  }
}




/**
 * البحث في الشهادات - محسّن للأداء
 * @param {string} searchTerm - كلمة البحث
 * @param {Object} options - خيارات إضافية
 * @param {number} options.limit - الحد الأقصى للنتائج (افتراضي 200)
 * @param {number} options.offset - البداية (للـ pagination)
 */
function searchCertificates(searchTerm, options = {}) {
  const startTime = Date.now();
  const limit = options.limit || 200;  // حد افتراضي لتحسين الأداء
  const offset = options.offset || 0;

  // مفتاح الـ cache
  const cacheKey = `search:${searchTerm}:${limit}:${offset}`;

  // التحقق من الـ cache أولاً
  const cached = QueryCache.get(cacheKey);
  if (cached) {
    console.log(`🚀 Search cache hit: "${searchTerm}" (${Date.now() - startTime}ms)`);
    return cached;
  }

  const result = [];
  const searchPattern = `%${searchTerm}%`;

  try {
    const stmt = db.prepare(`
      SELECT * FROM certificates 
      WHERE status = 'active' AND (
        name LIKE ? OR 
        activity LIKE ? OR 
        location LIKE ?
      )
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?;
    `);
    stmt.bind([searchPattern, searchPattern, searchPattern, limit, offset]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.is_modified = row.is_modified === 1;
      result.push(row);
    }
    stmt.free();

    // حفظ في الـ cache (لمدة 15 ثانية للبحث)
    QueryCache.set(cacheKey, result, 15000);

    // تتبع الأداء
    const duration = Date.now() - startTime;
    PerformanceTracker.track('searchCertificates', duration);
    console.log(`🔍 Search: "${searchTerm}" returned ${result.length} results (${duration}ms)`);

  } catch (err) {
    console.error('searchCertificates error:', err);
  }

  return result;
}

/**
 * إحصائيات سريعة
 * يستخدم قاعدة البيانات المحمّلة في `db` (SQL.js)
 * @param {Object} options - خيارات اختيارية
 * @param {number} options.month - الشهر (0-11) - اختياري
 * @param {number} options.year - السنة - اختياري
 */
async function getStats(options = {}) {
  if (!db) throw new Error('Database not initialized');

  // ✅ إعطاء فرصة للـ UI يتنفس (Yield to Main Thread)
  // هذا يمنع تجمد الواجهة تماماً أثناء الحسابات الثقيلة
  await new Promise(resolve => setTimeout(resolve, 0));

  const now = new Date();

  // ========== تحديد الشهر والسنة (الحالي أو المحدد) ==========
  const selectedMonth = options.month !== undefined ? options.month : now.getMonth();
  const selectedYear = options.year !== undefined ? options.year : now.getFullYear();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
  const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

  const querySingle = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (params && params.length) stmt.bind(params);
    let row = {};
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  };

  const queryAll = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (params && params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  // الإحصائيات الأساسية
  const total = querySingle("SELECT COUNT(*) as count FROM certificates WHERE status = 'active'");
  const modified = querySingle("SELECT COUNT(*) as count FROM certificates WHERE status = 'active' AND is_modified = 1");
  const today = querySingle("SELECT COUNT(*) as count FROM certificates WHERE status = 'active' AND created_at >= ?", [todayStart]);
  const thisWeek = querySingle("SELECT COUNT(*) as count FROM certificates WHERE status = 'active' AND created_at >= ?", [weekStart]);
  const thisMonth = querySingle("SELECT COUNT(*) as count FROM certificates WHERE status = 'active' AND created_at >= ?", [monthStart]);

  // ========== الإحصائيات الشهرية المفصلة (بدون شهادات عدم الدفع) ==========
  const monthlyStats = querySingle(`
    SELECT
      COALESCE(SUM(training_fee), 0) as monthlyTrainingFee,
      COALESCE(SUM(consultant_fee), 0) as monthlyConsultantFee,
      COALESCE(SUM(evacuation_fee), 0) as monthlyEvacuationFee,
      COALESCE(SUM(inspection_fee), 0) as monthlyInspectionFee,
      COALESCE(SUM(grand_total), 0) as monthlyGovernorateTotal,
      COALESCE(SUM(ministry_fee), 0) as monthlyMinistryPersonsFee,
      COALESCE(SUM(area_fee), 0) as monthlyAreaFee,
      COALESCE(SUM(ministry_total), 0) as monthlyMinistryTotal,
      COALESCE(SUM(persons_count), 0) as monthlyPersonsCount,
      COUNT(*) as monthlyCount
    FROM certificates
    WHERE status = 'active' 
      AND has_non_payment = 0
      AND created_at >= ? 
      AND created_at <= ?
  `, [monthStart, monthEnd]);

  // الإحصائيات المالية الكلية (بدون شهادات عدم الدفع)
  const financial = querySingle(`
    SELECT
      COALESCE(SUM(grand_total), 0) as totalGovernorate,
      COALESCE(SUM(ministry_total), 0) as totalMinistry,
      COALESCE(SUM(grand_total + ministry_total), 0) as grandTotal,
      COALESCE(AVG(grand_total + ministry_total), 0) as averageValue
    FROM certificates
    WHERE status = 'active' AND has_non_payment = 0
  `);

  // إحصائيات التدريب (بدون شهادات عدم الدفع)
  const training = querySingle(`
    SELECT
      COALESCE(SUM(persons_count), 0) as totalPersons,
      COALESCE(SUM(area), 0) as totalArea,
      COALESCE(AVG(persons_count), 0) as avgPersons
    FROM certificates
    WHERE status = 'active' AND has_non_payment = 0
  `);

  // عدد شهادات عدم الدفع
  const nonPaymentCount = querySingle(`
    SELECT COUNT(*) as count 
    FROM certificates 
    WHERE status = 'active' AND has_non_payment = 1
  `);

  // أكثر المستخدمين نشاطاً
  const topUsers = queryAll(`
    SELECT user_name as name, COUNT(*) as count
    FROM certificates
    WHERE status = 'active' AND user_name IS NOT NULL AND user_name != ''
    GROUP BY user_name
    ORDER BY count DESC
    LIMIT 5
  `);

  // آخر التعديلات
  const recentEdits = queryAll(`
    SELECT certificate_id, edited_by, edited_at
    FROM certificate_history
    ORDER BY edited_at DESC
    LIMIT 5
  `);

  // اسم الشهر المحدد بالعربية
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const selectedMonthName = arabicMonths[selectedMonth];

  // هل هذا الشهر الحالي؟
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  return {
    // الإحصائيات الأساسية
    total: total.count || 0,
    modified: modified.count || 0,
    today: today.count || 0,
    thisWeek: thisWeek.count || 0,
    thisMonth: thisMonth.count || 0,

    // الإحصائيات المالية الكلية
    totalGovernorate: Math.round(financial.totalGovernorate || 0),
    totalMinistry: Math.round(financial.totalMinistry || 0),
    grandTotal: Math.round(financial.grandTotal || 0),
    averageValue: Math.round(financial.averageValue || 0),

    // إحصائيات التدريب
    totalPersons: training.totalPersons || 0,
    totalArea: Math.round(training.totalArea || 0),
    avgPersons: Math.round(training.avgPersons || 0),

    // ========== الإحصائيات الشهرية الجديدة ==========
    monthly: {
      monthName: selectedMonthName,
      year: selectedYear,
      month: selectedMonth, // إضافة رقم الشهر (0-11)
      isCurrentMonth: isCurrentMonth, // هل هذا الشهر الحالي؟
      count: monthlyStats.monthlyCount || 0,

      // رسوم المحافظة
      trainingFee: Math.round(monthlyStats.monthlyTrainingFee || 0),
      consultantFee: Math.round(monthlyStats.monthlyConsultantFee || 0),
      evacuationFee: Math.round(monthlyStats.monthlyEvacuationFee || 0),
      inspectionFee: Math.round(monthlyStats.monthlyInspectionFee || 0),
      governorateTotal: Math.round(monthlyStats.monthlyGovernorateTotal || 0),

      // رسوم الوزارة
      ministryPersonsFee: Math.round(monthlyStats.monthlyMinistryPersonsFee || 0),
      areaFee: Math.round(monthlyStats.monthlyAreaFee || 0),
      ministryTotal: Math.round(monthlyStats.monthlyMinistryTotal || 0),

      // إجمالي الأفراد
      personsCount: monthlyStats.monthlyPersonsCount || 0
    },

    // عدد شهادات عدم الدفع
    nonPaymentCount: nonPaymentCount.count || 0,

    // المستخدمون والتعديلات
    topUsers: topUsers,
    recentEdits: recentEdits
  };
}



module.exports = {
  init,
  setDataPath,
  // الملاحظات
  addNote,
  getNotes,
  // الشهادات
  addCertificate,
  updateCertificate,
  getCertificateById,
  getAllCertificates,
  getCertificateHistory,
  deleteCertificate,
  searchCertificates,
  getStats,
  createNonPaymentRecord,
  getNonPaymentRecord,
  getNonPaymentByCertificate,
  cancelNonPayment,
  normalizeValue,
  // ⭐ دوال جديدة للأداء
  getUniqueValues,
  getCertificatesCount,
  // ⭐ أدوات تحسين الأداء
  saveImmediate,        // حفظ فوري عند إغلاق التطبيق
  QueryCache,           // للتحكم في الـ cache
  BatchSave,            // للتحكم في الحفظ المجمّع
  PerformanceTracker    // لمراقبة الأداء
};


