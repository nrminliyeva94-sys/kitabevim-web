require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            items TEXT NOT NULL,
            total_price NUMERIC(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    console.log("PostgreSQL bazasına qoşuldu, cədvəllər hazırdır.");
}

initDb().catch(err => console.error("Baza xətası:", err.message));

// Giriş
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Bütün sahələri doldurun!" });
        }
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];
        const duzgun = user && await bcrypt.compare(password, user.password);
        if (duzgun) {
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ success: false, message: "İstifadəçi adı və ya şifrə səhvdir!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server xətası" });
    }
});

// Qeydiyyat
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "Bütün sahələri doldurun!" });
        }
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [username, email, hash]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: "Bu istifadəçi adı və ya e-poçt artıq var" });
        }
        console.error(err);
        res.status(500).json({ success: false, message: "Server xətası" });
    }
});

// Sifariş
app.post('/place-order', async (req, res) => {
    try {
        const { username, items, total } = req.body;
        await pool.query(
            "INSERT INTO orders (username, items, total_price) VALUES ($1, $2, $3)",
            [username, JSON.stringify(items), total]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Server işləyir: http://localhost:${port}`);
});