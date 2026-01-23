const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');

let mainWindow;
let splashWindow;

// ========== إنشاء شاشة التحميل ==========
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 600,
        height: 500,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, 'splash-preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    // إخفاء من taskbar
    splashWindow.setSkipTaskbar(true);
}

// ========== إنشاء النافذة الرئيسية ==========
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        show: false, // لا تظهر حتى يكتمل التحميل
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // عند اكتمال تحميل الصفحة الرئيسية
    mainWindow.webContents.on('did-finish-load', () => {
        // إرسال إشارة لشاشة التحميل
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send('splash-progress', {
                message: 'اكتمل التحميل!',
                status: 'جاهز للعمل',
                progress: 100
            });
        }
    });

    // ========== اختصارات لوحة المفاتيح ==========
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key.toLowerCase() === 's') {
            event.preventDefault();
            mainWindow.webContents.send('shortcut-save');
        }
        if (input.control && input.key.toLowerCase() === 'p') {
            event.preventDefault();
            mainWindow.webContents.send('shortcut-print');
        }
        if (input.control && input.key.toLowerCase() === 'e') {
            event.preventDefault();
            mainWindow.webContents.send('shortcut-export-pdf');
        }
        if (input.control && input.key.toLowerCase() === 'n') {
            event.preventDefault();
            mainWindow.webContents.send('shortcut-new');
        }
        if (input.control && input.key.toLowerCase() === 'f') {
            event.preventDefault();
            mainWindow.webContents.send('shortcut-search');
        }
    });
}

// ========== تسلسل بدء التطبيق ==========
async function initializeApp() {
    // إنشاء شاشة التحميل أولاً
    createSplashWindow();

    // انتظار تحميل الـ splash
    await new Promise(resolve => {
        splashWindow.webContents.on('did-finish-load', resolve);
    });

    const sendProgress = (message, status, progress) => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            try {
                splashWindow.webContents.send('splash-progress', { message, status, progress });
            } catch (err) {
                console.error('Error sending progress:', err);
            }
        }
    };

    try {
        // ⭐⭐⭐ خطوة جديدة: تحديد مسار قاعدة البيانات ⭐⭐⭐
        sendProgress('تجهيز مسار البيانات...', 'جاري التحضير', 10);
        const userDataPath = app.getPath('userData');
        const dataDir = path.join(userDataPath, 'data');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        console.log('📁 User Data Path:', userDataPath);
        console.log('📁 Data Directory:', dataDir);

        // تعيين المسار في db module
        db.setDataPath(dataDir);

        // خطوة 1: تهيئة قاعدة البيانات
        sendProgress('تهيئة قاعدة البيانات...', 'جاري الاتصال', 20);
        await db.init();

        // خطوة 2: تحميل الإعدادات
        sendProgress('تحميل إعدادات النظام...', 'قراءة الملفات', 40);
        await new Promise(resolve => setTimeout(resolve, 300));

        // خطوة 3: إنشاء النافذة الرئيسية
        sendProgress('تجهيز واجهة المستخدم...', 'تحميل المكونات', 60);
        createWindow();

        // خطوة 4: انتظار تحميل الواجهة
        sendProgress('تحميل المكونات...', 'جاري التحميل', 80);

        // انتظار تحميل النافذة الرئيسية
        await new Promise(resolve => {
            mainWindow.webContents.on('did-finish-load', resolve);
        });

        sendProgress('اكتمل التحميل!', 'جاهز للعمل', 100);

    } catch (err) {
        console.error('Failed to initialize:', err);
        // إظهار النافذة الرئيسية حتى لو فيه خطأ
        if (mainWindow) {
            mainWindow.show();
        }
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
    }
}



// ========== استقبال إشارة الجاهزية من splash ==========
ipcMain.on('splash-ready', () => {
    // إظهار النافذة الرئيسية
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();

        // إضافة تأثير fade
        mainWindow.setOpacity(0);
        let opacity = 0;
        const fadeIn = setInterval(() => {
            opacity += 0.1;
            if (opacity >= 1) {
                mainWindow.setOpacity(1);
                clearInterval(fadeIn);
            } else {
                mainWindow.setOpacity(opacity);
            }
        }, 30);
    }

    // إغلاق splash بعد تأخير قصير
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
    }, 300);
});

// ========== بدء التطبيق ==========
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        initializeApp();
    }
});

// ========== باقي الـ IPC Handlers ==========
// الملاحظات
ipcMain.handle('db-add-note', async (event, note) => {
    try {
        return db.addNote(note);
    } catch (err) {
        console.error('db-add-note error', err);
        throw err;
    }
});

ipcMain.handle('db-get-notes', async () => {
    try {
        return db.getNotes();
    } catch (err) {
        console.error('db-get-notes error', err);
        throw err;
    }
});

// الشهادات
ipcMain.handle('db-add-certificate', async (event, data) => {
    try {
        return db.addCertificate(data);
    } catch (err) {
        console.error('db-add-certificate error', err);
        throw err;
    }
});

ipcMain.handle('db-update-certificate', async (event, { id, data, reason, editedBy }) => {
    try {
        return db.updateCertificate(id, data, reason, editedBy);
    } catch (err) {
        console.error('db-update-certificate error', err);
        throw err;
    }
});

ipcMain.handle('db-get-certificate', async (event, id) => {
    try {
        return db.getCertificateById(id);
    } catch (err) {
        console.error('db-get-certificate error', err);
        throw err;
    }
});

ipcMain.handle('db-get-all-certificates', async (event, options) => {
    try {
        return db.getAllCertificates(options);
    } catch (err) {
        console.error('db-get-all-certificates error', err);
        throw err;
    }
});

ipcMain.handle('db-get-certificate-history', async (event, certificateId) => {
    try {
        return db.getCertificateHistory(certificateId);
    } catch (err) {
        console.error('db-get-certificate-history error', err);
        throw err;
    }
});

ipcMain.handle('db-delete-certificate', async (event, { id, deletedBy }) => {
    try {
        return db.deleteCertificate(id, deletedBy);
    } catch (err) {
        console.error('db-delete-certificate error', err);
        throw err;
    }
});


// عدم دفع الرسوم
ipcMain.handle('non-payment:create', async (event, certId, data) => {
    return db.createNonPaymentRecord(certId, data);
});

ipcMain.handle('non-payment:get', async (event, id) => {
    return db.getNonPaymentRecord(id);
});

ipcMain.handle('non-payment:get-by-certificate', async (event, certId) => {
    return db.getNonPaymentByCertificate(certId);
});

ipcMain.handle('non-payment:cancel', async (event, certId) => {
    return db.cancelNonPayment(certId);
});

ipcMain.handle('db-search-certificates', async (event, searchTerm) => {
    try {
        return db.searchCertificates(searchTerm);
    } catch (err) {
        console.error('db-search-certificates error', err);
        throw err;
    }
});

ipcMain.handle('db-get-stats', async () => {
    try {
        return db.getStats();
    } catch (err) {
        console.error('db-get-stats error', err);
        throw err;
    }
});

// الطباعة
ipcMain.handle('print-page', async () => {
    try {
        mainWindow.webContents.print({
            silent: false,
            printBackground: true,
            margins: {
                marginType: 'custom',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            }
        });
        return { success: true };
    } catch (err) {
        console.error('print-page error', err);
        throw err;
    }
});

ipcMain.handle('print-silent', async () => {
    try {
        mainWindow.webContents.print({
            silent: true,
            printBackground: true
        });
        return { success: true };
    } catch (err) {
        console.error('print-silent error', err);
        throw err;
    }
});

// تصدير PDF
ipcMain.handle('export-pdf', async (event, options = {}) => {
    try {
        const pdfOptions = {
            marginsType: 0,
            printBackground: true,
            printSelectionOnly: false,
            landscape: false,
            pageSize: 'A4',
            scaleFactor: 100
        };

        const data = await mainWindow.webContents.printToPDF(pdfOptions);

        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'حفظ ملف PDF',
            defaultPath: options.fileName || `شهادة_${Date.now()}.pdf`,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(filePath, data);

        return { success: true, filePath };
    } catch (err) {
        console.error('export-pdf error', err);
        throw err;
    }
});

// الحصول على الطابعات
ipcMain.handle('get-printers', async () => {
    try {
        const printers = await mainWindow.webContents.getPrintersAsync();
        return printers;
    } catch (err) {
        console.error('get-printers error', err);
        throw err;
    }
});

// حفظ الملفات
ipcMain.handle('save-dialog', async (event, options = {}) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: options.title || 'حفظ الملف',
            defaultPath: options.defaultPath || 'document',
            filters: options.filters || [
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return result;
    } catch (err) {
        console.error('save-dialog error', err);
        throw err;
    }
});

ipcMain.handle('save-file', async (event, { filePath, data }) => {
    try {
        fs.writeFileSync(filePath, data);
        return { success: true };
    } catch (err) {
        console.error('save-file error', err);
        throw err;
    }
});
