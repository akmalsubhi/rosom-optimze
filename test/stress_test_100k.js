/**
 * 🚀 Stress Test - إضافة 100,000 شهادة للاختبار تحت الضغط
 * يستخدم المسار الصحيح للتطبيق (userData)
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const os = require('os');

// ========== إعدادات ==========
const TOTAL_CERTIFICATES = 100000;
const BATCH_SIZE = 5000;  // إدخال 5000 شهادة في كل دفعة

// ⭐ المسار الصحيح - نفس مسار التطبيق
const APP_NAME = 'civil-protection-fees';
const USER_DATA_PATH = path.join(os.homedir(), 'AppData', 'Roaming', APP_NAME);
const DATA_DIR = path.join(USER_DATA_PATH, 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

// ========== بيانات وهمية ==========
const activities = [
    'مطعم', 'كافيه', 'صيدلية', 'سوبر ماركت', 'مخبز', 'محل ملابس',
    'محل إلكترونيات', 'ورشة سيارات', 'صالون حلاقة', 'مكتب محاماة',
    'عيادة طبية', 'مختبر', 'فندق', 'شقة فندقية', 'مطعم وجبات سريعة',
    'محل عطور', 'محل زهور', 'مكتبة', 'نادي رياضي', 'صالة ألعاب',
    'محل أثاث', 'محل سيراميك', 'محل دهانات', 'محل أدوات منزلية',
    'محل ملابس أطفال', 'محل أحذية', 'محل نظارات', 'محل ساعات',
    'محل مجوهرات', 'مغسلة سيارات', 'مغسلة ملابس', 'محل حلويات'
];

const locations = [
    'الرياض - حي النزهة', 'الرياض - حي الملز', 'الرياض - حي العليا',
    'جدة - حي الروضة', 'جدة - حي السلامة', 'جدة - حي البوادي',
    'الدمام - حي الفيصلية', 'الدمام - حي الشاطئ', 'الدمام - حي الراكة',
    'مكة - العزيزية', 'مكة - الشوقية', 'المدينة - حي العيون',
    'الطائف - حي الفيصلية', 'تبوك - حي السليمانية', 'أبها - حي المروج',
    'الأحساء - حي المبرز', 'القصيم - بريدة', 'حائل - حي المزعبر',
    'نجران - حي الفيصلية', 'جازان - حي الروضة', 'ينبع - حي الصناعية',
    'الخبر - حي العليا', 'الخبر - حي الراكة الجنوبية', 'الجبيل الصناعية'
];

const firstNames = [
    'محمد', 'أحمد', 'علي', 'عبدالله', 'سعود', 'فهد', 'خالد', 'عمر',
    'سلطان', 'ناصر', 'عبدالرحمن', 'صالح', 'يوسف', 'إبراهيم', 'حسن',
    'حسين', 'ماجد', 'راشد', 'سالم', 'طلال', 'بندر', 'نايف'
];

const lastNames = [
    'العتيبي', 'الغامدي', 'الشهري', 'الزهراني', 'القحطاني', 'الدوسري',
    'العنزي', 'المطيري', 'الحربي', 'السبيعي', 'الشمري', 'البلوي',
    'العمري', 'الأحمدي', 'السلمي', 'المالكي', 'الثقفي', 'الجهني',
    'الرشيدي', 'الخالدي', 'السعدي', 'العجمي', 'الهاجري', 'اللهيبي'
];

// دالة لاختيار عنصر عشوائي من قائمة
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// دالة لإنشاء رقم عشوائي بين min و max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// دالة لإنشاء شهادة وهمية
function generateFakeCertificate(index) {
    const personsCount = randomInt(1, 50);
    const area = randomInt(50, 5000);

    // حساب الرسوم
    const trainingFee = personsCount * 100;
    const consultantFee = randomInt(500, 3000);
    const evacuationFee = randomInt(200, 1500);
    const inspectionFee = randomInt(300, 2000);
    const areaFee = Math.floor(area * 0.5);
    const ministryFee = randomInt(100, 500);
    const protectionFee = randomInt(0, 1000);

    const grandTotal = trainingFee + consultantFee + evacuationFee + inspectionFee;
    const ministryTotal = areaFee + ministryFee;

    // تاريخ عشوائي خلال آخر 3 سنوات
    const now = Date.now();
    const threeYearsAgo = now - (3 * 365 * 24 * 60 * 60 * 1000);
    const randomDate = randomInt(threeYearsAgo, now);

    return {
        activity: randomChoice(activities),
        name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
        location: randomChoice(locations),
        area: area,
        persons_count: personsCount,
        training_fee: trainingFee,
        consultant_fee: consultantFee,
        evacuation_fee: evacuationFee,
        inspection_fee: inspectionFee,
        area_fee: areaFee,
        ministry_fee: ministryFee,
        grand_total: grandTotal,
        ministry_total: ministryTotal,
        protection_fee: protectionFee,
        user_name: 'مستخدم اختبار',
        created_at: randomDate,
        updated_at: randomDate,
        date_governorate: randomDate,
        date_training: randomDate,
        date_ministry: randomDate,
        date_certificate: randomDate,
        date_decision: randomDate
    };
}

// ========== الدالة الرئيسية ==========
async function main() {
    console.log('🚀 Starting stress test - Adding 100,000 certificates...');
    console.log('');
    console.log('📁 User Data Path:', USER_DATA_PATH);
    console.log('📁 Data Directory:', DATA_DIR);
    console.log('📁 Database Path:', DB_PATH);
    console.log('');

    // التحقق من وجود المجلدات
    if (!fs.existsSync(USER_DATA_PATH)) {
        console.log('⚠️ Creating user data directory...');
        fs.mkdirSync(USER_DATA_PATH, { recursive: true });
    }

    if (!fs.existsSync(DATA_DIR)) {
        console.log('⚠️ Creating data directory...');
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // تهيئة SQL.js
    const SQL = await initSqlJs();
    let db;

    // تحميل قاعدة البيانات الموجودة أو إنشاء جديدة
    if (fs.existsSync(DB_PATH)) {
        console.log('📂 Loading existing database...');
        const filebuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(new Uint8Array(filebuffer));
    } else {
        console.log('📝 Creating new database...');
        db = new SQL.Database();

        // إنشاء جدول الشهادات
        db.run(`CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity TEXT,
      name TEXT,
      location TEXT,
      area REAL,
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
      user_name TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      edit_count INTEGER DEFAULT 0,
      is_modified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      date_governorate INTEGER,
      date_training INTEGER,
      date_ministry INTEGER,
      date_certificate INTEGER,
      date_decision INTEGER,
      has_non_payment INTEGER DEFAULT 0,
      non_payment_id INTEGER
    );`);

        // إنشاء الفهارس
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_created ON certificates(created_at DESC)');
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_status_created ON certificates(status, created_at DESC)');
    }

    // إحصائيات البداية
    const startCount = db.exec("SELECT COUNT(*) FROM certificates")[0]?.values[0][0] || 0;
    console.log(`📊 Current certificates count: ${startCount.toLocaleString()}`);
    console.log(`🎯 Target: Add ${TOTAL_CERTIFICATES.toLocaleString()} certificates`);
    console.log('');

    const startTime = Date.now();
    let totalInserted = 0;

    // إدخال الشهادات على دفعات
    for (let batch = 0; batch < Math.ceil(TOTAL_CERTIFICATES / BATCH_SIZE); batch++) {
        const batchStart = Date.now();
        const batchStartIndex = batch * BATCH_SIZE;
        const batchEndIndex = Math.min(batchStartIndex + BATCH_SIZE, TOTAL_CERTIFICATES);
        const batchCount = batchEndIndex - batchStartIndex;

        // بدء Transaction
        db.run('BEGIN TRANSACTION');

        // إعداد الـ prepared statement
        const stmt = db.prepare(`INSERT INTO certificates (
      activity, name, location, area,
      persons_count, training_fee, consultant_fee, evacuation_fee,
      inspection_fee, area_fee, ministry_fee, grand_total, ministry_total,
      protection_fee, user_name,
      date_governorate, date_training, date_ministry, date_certificate, date_decision,
      created_at, updated_at, edit_count, is_modified, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')`);

        for (let i = batchStartIndex; i < batchEndIndex; i++) {
            const cert = generateFakeCertificate(i);

            stmt.bind([
                cert.activity,
                cert.name,
                cert.location,
                cert.area,
                cert.persons_count,
                cert.training_fee,
                cert.consultant_fee,
                cert.evacuation_fee,
                cert.inspection_fee,
                cert.area_fee,
                cert.ministry_fee,
                cert.grand_total,
                cert.ministry_total,
                cert.protection_fee,
                cert.user_name,
                cert.date_governorate,
                cert.date_training,
                cert.date_ministry,
                cert.date_certificate,
                cert.date_decision,
                cert.created_at,
                cert.updated_at
            ]);
            stmt.step();
            stmt.reset();
        }

        stmt.free();

        // Commit Transaction
        db.run('COMMIT');

        totalInserted += batchCount;
        const batchTime = Date.now() - batchStart;
        const progress = ((totalInserted / TOTAL_CERTIFICATES) * 100).toFixed(1);
        const rate = Math.round(batchCount / (batchTime / 1000));

        console.log(`📦 Batch ${batch + 1}/${Math.ceil(TOTAL_CERTIFICATES / BATCH_SIZE)}: ` +
            `+${batchCount.toLocaleString()} certificates | ` +
            `${progress}% complete | ` +
            `${rate.toLocaleString()} certs/sec | ` +
            `${batchTime}ms`);
    }

    // حفظ قاعدة البيانات
    console.log('\n💾 Saving database...');
    const saveStart = Date.now();
    const binary = db.export();
    const buffer = Buffer.from(binary);
    fs.writeFileSync(DB_PATH, buffer);
    const saveTime = Date.now() - saveStart;

    // إحصائيات النهاية
    const endCount = db.exec("SELECT COUNT(*) FROM certificates")[0]?.values[0][0] || 0;
    const totalTime = Date.now() - startTime;
    const avgRate = Math.round(TOTAL_CERTIFICATES / (totalTime / 1000));

    console.log('');
    console.log('✅ ========== STRESS TEST COMPLETE ==========');
    console.log(`📊 Final certificates count: ${endCount.toLocaleString()}`);
    console.log(`➕ Added: ${totalInserted.toLocaleString()} certificates`);
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`🚀 Average rate: ${avgRate.toLocaleString()} certificates/second`);
    console.log(`💾 Save time: ${saveTime}ms`);
    console.log(`📁 Database size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log('');
    console.log('🔍 Now open the application to test performance!');
    console.log(`📂 Database location: ${DB_PATH}`);

    db.close();
}

main().catch(console.error);
