let isRegisterMode = true;
let token = localStorage.getItem('token');
let currentUser = null;

async function init() {
    if (token) {
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            currentUser = await res.json();
            updateUIForLoggedInUser();
        } else {
            logout();
        }
    }
    loadPosts();
}

function updateUIForLoggedInUser() {
    const roleBadge = currentUser.role === 'developer' ? `<span class="badge-developer">Developer</span>` : '';
    document.getElementById('nav-actions').innerHTML = `
        <span style="margin-right: 12px; font-size: 14px;">Halo, <b>${currentUser.username}</b>${roleBadge}</span>
        <button onclick="logout()" class="btn-outline">Keluar</button>
    `;
    document.getElementById('upload-section').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    location.reload();
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-title').innerText = isRegisterMode ? 'Daftar Akun Baru' : 'Login ke Akun';
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? 'Daftar & Masuk' : 'Masuk';
    document.getElementById('switch-text').innerText = isRegisterMode ? 'Sudah punya akun?' : 'Belum punya akun?';
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const payload = {
        username: document.getElementById('username-input').value,
        password: document.getElementById('password-input').value
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);

    localStorage.setItem('token', data.token);
    token = data.token;
    currentUser = data.user;
    closeModal('auth-modal');
    updateUIForLoggedInUser();
});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('media-input');
    const file = fileInput.files[0];
    if (!file) return;

    btn.innerText = 'Mengunggah ke Cloud...';
    btn.disabled = true;

    try {
        const cloudForm = new FormData();
        cloudForm.append('file', file);
        cloudForm.append('upload_preset', 'galeri_preset');

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/idhnjh0v/auto/upload`, {
            method: 'POST',
            body: cloudForm
        });
        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Gagal upload ke Cloudinary');

        const mediaUrl = cloudData.secure_url;
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const description = document.getElementById('desc-input').value;

        const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ media_url: mediaUrl, media_type: mediaType, description })
        });

        if (!res.ok) throw new Error('Gagal menyimpan postingan ke database');

        document.getElementById('upload-form').reset();
        loadPosts();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerText = 'Unggah Sekarang';
        btn.disabled = false;
    }
});

async function loadPosts() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const feed = document.getElementById('feed');

    feed.innerHTML = posts.map(post => {
        const roleBadge = post.role === 'developer' ? `<span class="badge-developer">Developer</span>` : '';
        const downloadUrl = post.media_url.replace('/upload/', '/upload/fl_attachment/');

        const mediaTag = post.media_type === 'video'
            ? `<video src="${post.media_url}" controls preload="metadata"></video>`
            : `<img src="${post.media_url}" alt="Unggahan">`;

        const commentsHtml = post.comments.map(c => {
            const cBadge = c.role === 'developer' ? `<span class="badge-developer">Developer</span>` : '';
            return `<div class="comment-item"><b>${c.username}</b>${cBadge}: ${c.content}</div>`;
        }).join('');

        return `
            <article class="card" id="post-${post.id}">
                <div class="post-header">
                    <div class="username">${post.username}${roleBadge}</div>
                </div>
                <div class="media-wrapper">${mediaTag}</div>
                <p class="post-desc">${post.description}</p>
                <div class="post-actions">
                    <button onclick="toggleLike(${post.id})" class="btn-outline">❤️ Like (${post.like_count})</button>
                    <a href="${downloadUrl}" download class="btn-outline" style="text-decoration:none; color:inherit;">⬇️ Download</a>
                    <button onclick="sharePost(${post.id})" class="btn-outline">🔗 Share</button>
                </div>
                <div class="comments-box">
                    ${commentsHtml}
                    <form class="comment-form" onsubmit="addComment(event, ${post.id})">
                        <input type="text" placeholder="Tulis komentar..." required>
                        <button type="submit" class="btn-primary">Kirim</button>
                    </form>
                </div>
            </article>
        `;
    }).join('');
}

async function toggleLike(postId) {
    if (!token) return openModal('auth-modal');
    await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
    loadPosts();
}

async function addComment(e, postId) {
    e.preventDefault();
    if (!token) return openModal('auth-modal');
    const input = e.target.querySelector('input');
    await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.value })
    });
    loadPosts();
}

function sharePost(postId) {
    const shareUrl = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link unggahan disalin ke clipboard: ' + shareUrl);
}

init();