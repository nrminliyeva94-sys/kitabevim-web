const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Verilənlər bazası bağlantısı
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error("Bazaya qoşulma xətası:", err.message);
    } else {
        console.log("SQLite bazasına qoşuldu.");
        
        // Bütün cədvəl yaratma əməliyyatlarını serialize blokuna alırıq
        db.serialize(() => {
            // 1. İstifadəçilər cədvəli
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                username TEXT UNIQUE, 
                password TEXT
            )`, (err) => {
                if (err) console.error("Users cədvəli yaradılanda xəta:", err.message);
            });

            // 2. Sifarişlər cədvəli
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                username TEXT, 
                items TEXT, 
                total_price REAL, 
                date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Orders cədvəli yaradılanda xəta:", err.message);
            });

            // 3. Test üçün admin əlavə edirik (yalnız yoxdursa)
            db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('admin', '1234')`);
        });
    }
});

// Giriş marşrutu
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Server xətası" });
        }
        if (row) {
            res.json({ success: true, username: row.username });
        } else {
            res.status(401).json({ success: false, message: "İstifadəçi adı və ya şifrə səhvdir!" });
        }
    });
});

// Sifariş marşrutu
app.post('/place-order', (req, res) => {
    const { username, items, total } = req.body;
    const sql = `INSERT INTO orders (username, items, total_price) VALUES (?, ?, ?)`;
    db.run(sql, [username, JSON.stringify(items), total], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// Qeydiyyat marşrutu
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
        if (err) return res.status(400).json({ success: false, message: "Bu istifadəçi artıq var" });
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log(`Server işləyir: http://localhost:${port}`);
});