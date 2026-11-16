// Contoh struktur HTML kartu postingan di dalam loop render posts pada public/app.js:
const initial = post.username ? post.username.charAt(0).toUpperCase() : '?';
const badgeHTML = post.role === 'developer' ? `<span class="dev-badge">DEV</span>` : '';

return `
<article class="post-card">
    <div class="post-header">
        <div class="post-user">
            <div class="avatar-circle">${initial}</div>
            <div>
                <span class="username-text">${post.username}</span>
                ${badgeHTML}
            </div>
        </div>
    </div>

    <div class="post-media">
        ${post.media_type === 'video' 
            ? `<video src="${post.media_url}" controls playsinline></video>` 
            : `<img src="${post.media_url}" alt="Postingan ${post.username}" loading="lazy">`}
    </div>

    <div class="post-actions">
        <div class="action-left">
            <button class="icon-btn ${post.is_liked ? 'liked' : ''}" onclick="toggleLike(${post.id})" title="Suka">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <button class="icon-btn" onclick="document.getElementById('comment-input-${post.id}').focus()" title="Komentar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
            </button>
            <button class="icon-btn" onclick="sharePost(${post.id})" title="Bagikan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
        <button class="icon-btn" onclick="downloadMedia('${post.media_url}')" title="Unduh Media">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        </button>
    </div>

    <div class="post-likes">${post.likes_count || 0} suka</div>

    ${post.caption ? `
    <div class="post-caption">
        <strong>${post.username}</strong> ${post.caption}
    </div>` : ''}

    <div class="comments-list">
        ${(post.comments || []).map(c => `
            <div class="comment-item">
                <strong>${c.username}</strong> ${c.role === 'developer' ? '<span class="dev-badge">DEV</span>' : ''} ${c.content}
            </div>
        `).join('')}
    </div>

    <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
        <input id="comment-input-${post.id}" type="text" placeholder="Tambahkan komentar..." required>
        <button type="submit">Kirim</button>
    </form>
</article>
`;
