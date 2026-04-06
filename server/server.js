/**
 * 全校教師課表管理系統 - 後端服務器
 * 使用 sql.js (純 JavaScript SQLite) - 無需編譯
 */

const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中間件
app.use(cors());
app.use(express.json());

// 靜態文件
app.use(express.static(path.join(__dirname, '../webapp')));

// 數據庫路徑
const DB_PATH = path.join(__dirname, 'schedule.db');

// 全局數據庫實例
let db;

// 初始化數據庫
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // 嘗試加載現有數據庫
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('✅ 已加載現有數據庫');
    } else {
        db = new SQL.Database();
        console.log('✅ 創建新數據庫');
    }
    
    // 創建表
    db.run(`
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            exemption INTEGER DEFAULT 0
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            total_periods INTEGER DEFAULT 0,
            UNIQUE(name, department)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            position_id INTEGER,
            exemption INTEGER DEFAULT 0
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS teacher_departments (
            teacher_id INTEGER,
            department TEXT NOT NULL,
            PRIMARY KEY (teacher_id, department)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            teacher_id INTEGER,
            subject_id INTEGER,
            PRIMARY KEY (teacher_id, subject_id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS teaching_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            periods INTEGER DEFAULT 0,
            UNIQUE(teacher_id, class_id, subject_id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS homeroom_teachers (
            teacher_id INTEGER,
            class_id INTEGER,
            PRIMARY KEY (teacher_id, class_id)
        )
    `);
    
    // 初始化默認數據
    initDefaultData();
    
    // 保存數據庫
    saveDatabase();
}

// 保存數據庫到文件
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// 初始化默認數據
function initDefaultData() {
    const posResult = db.exec('SELECT COUNT(*) as count FROM positions');
    if (posResult.length > 0 && posResult[0].values[0][0] > 0) return;
    
    // 默認職務
    const defaultPositions = [
        { name: '校長', exemption: 18 },
        { name: '副校長', exemption: 16 },
        { name: '教務主任', exemption: 14 },
        { name: '主任', exemption: 12 },
        { name: '助理主任', exemption: 10 },
        { name: '科組長', exemption: 8 },
        { name: '班主任', exemption: 6 },
        { name: '行政助理', exemption: 4 },
        { name: '其他類別組長', exemption: 4 }
    ];
    
    defaultPositions.forEach(p => {
        try {
            db.run('INSERT OR IGNORE INTO positions (name, exemption) VALUES (?, ?)', [p.name, p.exemption]);
        } catch (e) {}
    });
    
    // 默認科目
    const defaultSubjects = ['班主任', '中文科', '英文科', '數學科', '物理科', '化學科', '歷史科', '地理科', '生物科', '電腦科', '音樂科', '體育科', '視覺藝術科'];
    defaultSubjects.forEach(s => {
        try {
            db.run('INSERT OR IGNORE INTO subjects (name) VALUES (?)', [s]);
        } catch (e) {}
    });
    
    // 默認班級
    const defaultClasses = [
        { name: '幼兒園', department: 'kindergarten' },
        { name: 'K1', department: 'kindergarten' },
        { name: 'K2', department: 'kindergarten' },
        { name: 'K3', department: 'kindergarten' },
        { name: '小一甲', department: 'primary-cn' },
        { name: '小一乙', department: 'primary-cn' },
        { name: '小二甲', department: 'primary-cn' },
        { name: '小二乙', department: 'primary-cn' },
        { name: '小三甲', department: 'primary-cn' },
        { name: '小三乙', department: 'primary-cn' },
        { name: '小四甲', department: 'primary-cn' },
        { name: '小四乙', department: 'primary-cn' },
        { name: '小五甲', department: 'primary-cn' },
        { name: '小五乙', department: 'primary-cn' },
        { name: '小六甲', department: 'primary-cn' },
        { name: '小六乙', department: 'primary-cn' },
        { name: '小一甲', department: 'primary-en' },
        { name: '小一乙', department: 'primary-en' },
        { name: '小二甲', department: 'primary-en' },
        { name: '小二乙', department: 'primary-en' },
        { name: '初一甲', department: 'secondary-cn' },
        { name: '初一乙', department: 'secondary-cn' },
        { name: '初一丙', department: 'secondary-cn' },
        { name: '初二甲', department: 'secondary-cn' },
        { name: '初二乙', department: 'secondary-cn' },
        { name: '初二丙', department: 'secondary-cn' },
        { name: '初三甲', department: 'secondary-cn' },
        { name: '初三乙', department: 'secondary-cn' },
        { name: '高一甲', department: 'secondary-cn' },
        { name: '高一乙', department: 'secondary-cn' },
        { name: '高二甲', department: 'secondary-cn' },
        { name: '高二乙', department: 'secondary-cn' },
        { name: '高三甲', department: 'secondary-cn' },
        { name: '高三乙', department: 'secondary-cn' },
        { name: '初一甲', department: 'secondary-en' },
        { name: '初一乙', department: 'secondary-en' },
        { name: '初一丙', department: 'secondary-en' },
        { name: '初二甲', department: 'secondary-en' },
        { name: '初二乙', department: 'secondary-en' },
        { name: '初二丙', department: 'secondary-en' },
        { name: '初三甲', department: 'secondary-en' },
        { name: '初三乙', department: 'secondary-en' },
        { name: '高一甲', department: 'secondary-en' },
        { name: '高一乙', department: 'secondary-en' },
        { name: '高二甲', department: 'secondary-en' },
        { name: '高二乙', department: 'secondary-en' },
        { name: '高三甲', department: 'secondary-en' },
        { name: '高三乙', department: 'secondary-en' }
    ];
    
    defaultClasses.forEach(c => {
        try {
            db.run('INSERT OR IGNORE INTO classes (name, department) VALUES (?, ?)', [c.name, c.department]);
        } catch (e) {}
    });
    
    console.log('✅ 默認數據已初始化');
}

// WebSocket 廣播
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 輔助函數：執行查詢並返回結果
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
    db.run(sql, params);
    saveDatabase();
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
}

// ========== API 路由 ==========

// 獲取所有數據
app.get('/api/data', (req, res) => {
    try {
        const positions = queryAll('SELECT * FROM positions');
        const subjects = queryAll('SELECT * FROM subjects');
        const classes = queryAll('SELECT * FROM classes');
        const teachers = queryAll('SELECT * FROM teachers');
        
        // 獲取教師詳細信息
        const teachersWithDetails = teachers.map(t => {
            const departments = queryAll('SELECT department FROM teacher_departments WHERE teacher_id = ?', [t.id]).map(d => d.department);
            const subjectIds = queryAll('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?', [t.id]).map(s => s.subject_id);
            const teachingDetails = queryAll('SELECT class_id, subject_id, periods FROM teaching_details WHERE teacher_id = ?', [t.id]);
            const homeroomClasses = queryAll('SELECT class_id FROM homeroom_teachers WHERE teacher_id = ?', [t.id]).map(h => h.class_id);
            
            // 構建 classSubjectPeriods
            const classSubjectPeriods = {};
            teachingDetails.forEach(td => {
                if (!classSubjectPeriods[td.class_id]) {
                    classSubjectPeriods[td.class_id] = {};
                }
                classSubjectPeriods[td.class_id][td.subject_id] = td.periods;
            });
            
            // 計算各學部節數
            const deptPeriods = {};
            Object.keys(classSubjectPeriods).forEach(classId => {
                const cls = classes.find(c => c.id === parseInt(classId));
                if (cls) {
                    if (!deptPeriods[cls.department]) {
                        deptPeriods[cls.department] = 0;
                    }
                    Object.values(classSubjectPeriods[classId]).forEach(p => {
                        deptPeriods[cls.department] += p;
                    });
                }
            });
            
            return {
                id: t.id,
                name: t.name,
                positionId: t.position_id,
                exemption: t.exemption,
                departments,
                subjectIds,
                classSubjectPeriods,
                homeroomClasses,
                deptPeriods
            };
        });
        
        res.json({
            positions,
            subjects,
            classes,
            teachers: teachersWithDetails
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 職務 API ==========
app.post('/api/positions', (req, res) => {
    try {
        const { name, exemption = 0 } = req.body;
        const result = runSql('INSERT INTO positions (name, exemption) VALUES (?, ?)', [name, exemption]);
        broadcast({ type: 'positions_updated' });
        res.json({ id: result.lastInsertRowid, name, exemption });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/positions/:id', (req, res) => {
    try {
        runSql('DELETE FROM positions WHERE id = ?', [req.params.id]);
        broadcast({ type: 'positions_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 科目 API ==========
app.post('/api/subjects', (req, res) => {
    try {
        const { name } = req.body;
        const result = runSql('INSERT INTO subjects (name) VALUES (?)', [name]);
        broadcast({ type: 'subjects_updated' });
        res.json({ id: result.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/subjects/:id', (req, res) => {
    try {
        runSql('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        broadcast({ type: 'subjects_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 班級 API ==========
app.post('/api/classes', (req, res) => {
    try {
        const { name, department } = req.body;
        const result = runSql('INSERT INTO classes (name, department) VALUES (?, ?)', [name, department]);
        broadcast({ type: 'classes_updated' });
        res.json({ id: result.lastInsertRowid, name, department });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/classes/:id', (req, res) => {
    try {
        const { totalPeriods } = req.body;
        runSql('UPDATE classes SET total_periods = ? WHERE id = ?', [totalPeriods, req.params.id]);
        broadcast({ type: 'classes_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/classes/:id', (req, res) => {
    try {
        runSql('DELETE FROM classes WHERE id = ?', [req.params.id]);
        broadcast({ type: 'classes_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 教師 API ==========
app.post('/api/teachers', (req, res) => {
    try {
        const { name, positionId, exemption, departments, subjectIds, classSubjectPeriods, homeroomClasses } = req.body;
        
        // 插入教師
        const result = runSql('INSERT INTO teachers (name, position_id, exemption) VALUES (?, ?, ?)', [
            name,
            positionId || null,
            exemption || 0
        ]);
        const teacherId = result.lastInsertRowid;
        
        // 插入學部關聯
        (departments || []).forEach(dept => {
            runSql('INSERT INTO teacher_departments (teacher_id, department) VALUES (?, ?)', [teacherId, dept]);
        });
        
        // 插入科目關聯
        (subjectIds || []).forEach(subjectId => {
            runSql('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [teacherId, subjectId]);
        });
        
        // 插入授課明細
        Object.entries(classSubjectPeriods || {}).forEach(([classId, subjects]) => {
            Object.entries(subjects).forEach(([subjectId, periods]) => {
                if (periods > 0) {
                    runSql('INSERT INTO teaching_details (teacher_id, class_id, subject_id, periods) VALUES (?, ?, ?, ?)', [
                        teacherId, parseInt(classId), parseInt(subjectId), periods
                    ]);
                }
            });
        });
        
        // 插入班主任關聯
        (homeroomClasses || []).forEach(classId => {
            runSql('INSERT INTO homeroom_teachers (teacher_id, class_id) VALUES (?, ?)', [teacherId, classId]);
        });
        
        broadcast({ type: 'teachers_updated' });
        res.json({ id: teacherId, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/teachers/:id', (req, res) => {
    try {
        const teacherId = parseInt(req.params.id);
        const { name, positionId, exemption, departments, subjectIds, classSubjectPeriods, homeroomClasses } = req.body;
        
        // 更新教師基本信息
        runSql('UPDATE teachers SET name = ?, position_id = ?, exemption = ? WHERE id = ?', [
            name, positionId || null, exemption || 0, teacherId
        ]);
        
        // 刪除舊關聯
        runSql('DELETE FROM teacher_departments WHERE teacher_id = ?', [teacherId]);
        runSql('DELETE FROM teacher_subjects WHERE teacher_id = ?', [teacherId]);
        runSql('DELETE FROM teaching_details WHERE teacher_id = ?', [teacherId]);
        runSql('DELETE FROM homeroom_teachers WHERE teacher_id = ?', [teacherId]);
        
        // 重新插入關聯
        (departments || []).forEach(dept => {
            runSql('INSERT INTO teacher_departments (teacher_id, department) VALUES (?, ?)', [teacherId, dept]);
        });
        
        (subjectIds || []).forEach(subjectId => {
            runSql('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [teacherId, subjectId]);
        });
        
        Object.entries(classSubjectPeriods || {}).forEach(([classId, subjects]) => {
            Object.entries(subjects).forEach(([subjectId, periods]) => {
                if (periods > 0) {
                    runSql('INSERT INTO teaching_details (teacher_id, class_id, subject_id, periods) VALUES (?, ?, ?, ?)', [
                        teacherId, parseInt(classId), parseInt(subjectId), periods
                    ]);
                }
            });
        });
        
        (homeroomClasses || []).forEach(classId => {
            runSql('INSERT INTO homeroom_teachers (teacher_id, class_id) VALUES (?, ?)', [teacherId, classId]);
        });
        
        broadcast({ type: 'teachers_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/teachers/:id', (req, res) => {
    try {
        runSql('DELETE FROM teachers WHERE id = ?', [req.params.id]);
        broadcast({ type: 'teachers_updated' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 匯出數據
app.get('/api/export', (req, res) => {
    try {
        const data = {
            positions: queryAll('SELECT * FROM positions'),
            subjects: queryAll('SELECT * FROM subjects'),
            classes: queryAll('SELECT * FROM classes'),
            teachers: queryAll('SELECT * FROM teachers'),
            teacher_departments: queryAll('SELECT * FROM teacher_departments'),
            teacher_subjects: queryAll('SELECT * FROM teacher_subjects'),
            teaching_details: queryAll('SELECT * FROM teaching_details'),
            homeroom_teachers: queryAll('SELECT * FROM homeroom_teachers')
        };
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 匯入數據
app.post('/api/import', (req, res) => {
    try {
        const imported = req.body;
        
        // 清空現有數據
        runSql('DELETE FROM homeroom_teachers');
        runSql('DELETE FROM teaching_details');
        runSql('DELETE FROM teacher_subjects');
        runSql('DELETE FROM teacher_departments');
        runSql('DELETE FROM teachers');
        runSql('DELETE FROM classes');
        runSql('DELETE FROM subjects');
        runSql('DELETE FROM positions');
        
        // 插入匯入數據
        if (imported.positions) {
            imported.positions.forEach(p => {
                runSql('INSERT INTO positions (id, name, exemption) VALUES (?, ?, ?)', [p.id, p.name, p.exemption]);
            });
        }
        
        if (imported.subjects) {
            imported.subjects.forEach(s => {
                runSql('INSERT INTO subjects (id, name) VALUES (?, ?)', [s.id, s.name]);
            });
        }
        
        if (imported.classes) {
            imported.classes.forEach(c => {
                runSql('INSERT INTO classes (id, name, department, total_periods) VALUES (?, ?, ?, ?)', 
                    [c.id, c.name, c.department, c.total_periods || 0]);
            });
        }
        
        if (imported.teachers) {
            imported.teachers.forEach(t => {
                runSql('INSERT INTO teachers (id, name, position_id, exemption) VALUES (?, ?, ?, ?)', 
                    [t.id, t.name, t.position_id, t.exemption]);
            });
        }
        
        if (imported.teacher_departments) {
            imported.teacher_departments.forEach(td => {
                runSql('INSERT INTO teacher_departments (teacher_id, department) VALUES (?, ?)', 
                    [td.teacher_id, td.department]);
            });
        }
        
        if (imported.teacher_subjects) {
            imported.teacher_subjects.forEach(ts => {
                runSql('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', 
                    [ts.teacher_id, ts.subject_id]);
            });
        }
        
        if (imported.teaching_details) {
            imported.teaching_details.forEach(td => {
                runSql('INSERT INTO teaching_details (id, teacher_id, class_id, subject_id, periods) VALUES (?, ?, ?, ?, ?)', 
                    [td.id, td.teacher_id, td.class_id, td.subject_id, td.periods]);
            });
        }
        
        if (imported.homeroom_teachers) {
            imported.homeroom_teachers.forEach(ht => {
                runSql('INSERT INTO homeroom_teachers (teacher_id, class_id) VALUES (?, ?)', 
                    [ht.teacher_id, ht.class_id]);
            });
        }
        
        broadcast({ type: 'data_imported' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WebSocket 連接
wss.on('connection', (ws) => {
    console.log('新的 WebSocket 連接');
    ws.on('message', (message) => {
        console.log('收到消息:', message);
    });
});

// 啟動服務器
const PORT = process.env.PORT || 3001;

initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`==================================`);
        console.log(`✅ 全校教師課表管理系統已啟動`);
        console.log(`==================================`);
        console.log(`🌐 本地訪問: http://localhost:${PORT}`);
        console.log(`📡 支持多用戶實時協作`);
        console.log(`💾 數據保存在: ${DB_PATH}`);
        console.log(`==================================`);
    });
}).catch(err => {
    console.error('數據庫初始化失敗:', err);
});
