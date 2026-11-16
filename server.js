require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inisialisasi Tabel (Tanpa Email)
pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        media_url TEXT,
        media_type TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER REFERENCES users(id),
        post_id INTEGER REFERENCES posts(id),
        PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id),
        user_id INTEGER REFERENCES users(id),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`).catch(err => console.error('Gagal inisialisasi database:', err));

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Harus login terlebih dahulu' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Sesi tidak valid' });
    }
}

// Register (Hanya Username & Password)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

        const hashedPassword = await bcrypt.hash(password, 10);
        // Cek apakah username ini diset sebagai developer di .env
        const role = (username.toLowerCase() === process.env.DEVELOPER_USERNAME?.toLowerCase()) ? 'developer' : 'user';

        const result = await pool.query(
            `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role`,
            [username, hashedPassword, role]
        );
        const user = result.rows[0];

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET);
        res.json({ token, user });
    } catch (err) {
        res.status(400).json({ error: 'Username sudah digunakan' });
    }
});

// Login (Hanya Username & Password)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Username atau password salah' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET);
        res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    const result = await pool.query(`SELECT id, username, role FROM users WHERE id = $1`, [req.user.id]);
    res.json(result.rows[0]);
});

// --- POSTINGAN, LIKE, KOMENTAR ---
app.post('/api/posts', authMiddleware, async (req, res) => {
    try {
        const { media_url, media_type, description } = req.body;
        if (!media_url) return res.status(400).json({ error: 'Media URL wajib disertakan' });

        await pool.query(
            `INSERT INTO posts (user_id, media_url, media_type, description) VALUES ($1, $2, $3, $4)`,
            [req.user.id, media_url, media_type, description || '']
        );
        res.json({ message: 'Berhasil diunggah' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const postsQuery = `
            SELECT posts.*, users.username, users.role,
            (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count
            FROM posts
            JOIN users ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
        `;
        const postsRes = await pool.query(postsQuery);

        const commentsRes = await pool.query(`
            SELECT comments.*, users.username, users.role 
            FROM comments 
            JOIN users ON comments.user_id = users.id 
            ORDER BY comments.created_at ASC
        `);

        const posts = postsRes.rows.map(post => ({
            ...post,
            comments: commentsRes.rows.filter(c => c.post_id === post.id)
        }));

        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const check = await pool.query(`SELECT * FROM likes WHERE user_id = $1 AND post_id = $2`, [userId, postId]);

        if (check.rowCount > 0) {
            await pool.query(`DELETE FROM likes WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
            res.json({ liked: false });
        } else {
            await pool.query(`INSERT INTO likes (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
            res.json({ liked: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Komentar tidak boleh kosong' });
        await pool.query(`INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)`, [req.params.id, req.user.id, content]);
        res.json({ message: 'Komentar ditambahkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server lokal berjalan di http://localhost:${PORT}`));
}

module.exports = app;