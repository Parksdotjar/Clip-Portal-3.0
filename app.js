/* --- app.js --- */

/* 
   --------------------------------------------------------
   SETUP INSTRUCTIONS:
   1. Create a Supabase Project.
   2. Run the SQL from `supabase.sql` in the Supabase SQL Editor.
   3. Paste your API URL and ANON KEY below.
   --------------------------------------------------------
*/

const SUPABASE_URL = "https://nanoavqjgotzycpmagmb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hbm9hdnFqZ290enljcG1hZ21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDk1NjUsImV4cCI6MjA4NDU4NTU2NX0.V5JFjsJ50D-gb2Z162MCsSlpFbQVrc5dstKJ3kQV5W4";

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- State & DOM Elements ---
const state = {
    user: null,
    clips: []
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Inject Loading Screen
    const loader = document.createElement('div');
    loader.id = 'loading-screen';
    loader.innerHTML = '<div class="loader-spinner"></div>';
    document.body.appendChild(loader);

    // Inject Cursor Elements immediately
    initCursor();
    initCanvas();

    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
            state.user = session?.user || null;
            updateNav();
            checkProtectedRoutes();
        }
    );

    // Initial check
    const { data: { session } } = await supabase.auth.getSession();
    state.user = session?.user || null;
    updateNav();
    checkProtectedRoutes();

    // Page Specific Logic
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
        await loadPublicClips(); // Wait for clips
        setupSearch();
        setupLogout();
    } else if (path.endsWith('upload.html')) {
        setupUpload();
        setupLogout();
    } else if (path.endsWith('dashboard.html')) {
        await loadUserClips(); // Wait for clips
        setupLogout();
    } else if (path.endsWith('login.html') || path.endsWith('signup.html')) {
        setupAuthForms();
    }

    // Hide Loader
    setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
    }, 500); // Small minimum delay for smoothness
});

// --- Auth UI Management ---
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    const userMenu = document.getElementById('user-menu');
    const loginBtn = document.getElementById('login-btn'); // For mobile or placeholder

    // This presumes a specific structure in the HTML.
    // If logged in: show User Menu (Avatar), hide Login links if present in main nav
    // If logged out: show Login/Signup links, hide User Menu

    const navRight = document.querySelector('.nav-links');
    if (!navRight) return;

    if (state.user) {
        // Logged In
        // Show direct links + Cogwheel
        navRight.innerHTML = `
            <a href="index.html" class="nav-link ${isActive('index.html')}">Discover</a>
            <a href="dashboard.html" class="nav-link ${isActive('dashboard.html')}">Dashboard</a>
            <a href="upload.html" class="nav-link ${isActive('upload.html')}">Upload</a>
            
            <div class="user-menu-container">
                <button class="nav-settings-btn" id="settings-btn" title="Settings">
                    <!-- Cogwheel SVG -->
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
                    </svg>
                </button>
                <div class="glass-panel dropdown-menu" id="dropdown-menu">
                    <div style="padding: 8px 16px; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px; opacity: 0.5;">
                        ${state.user.email}
                    </div>
                    <!-- Dashboard/Upload also in menu for mobile convenience if needed, or just Logout -->
                    <div class="dropdown-item" id="logout-btn" style="cursor: pointer;">Log Out</div>
                </div>
            </div>
        `;

        // Dropdown Toggle
        const settingsBtn = document.getElementById('settings-btn');
        const dropdown = document.getElementById('dropdown-menu');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close others if any
                dropdown.classList.toggle('show');
            });
        }

        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target) && e.target !== settingsBtn) {
                dropdown.classList.remove('show');
            }
        });

        // Re-attach logout listener
        setupLogout();

    } else {
        // Logged Out
        navRight.innerHTML = `
            <a href="index.html" class="nav-link ${isActive('index.html')}">Discover</a>
            <a href="login.html" class="nav-link ${isActive('login.html')}">Log In</a>
            <a href="signup.html" class="glass-btn" style="padding: 8px 16px; font-size: 0.8rem;">Sign Up</a>
        `;
    }
}

function isActive(page) {
    const path = window.location.pathname;
    // Simple check
    if (page === 'index.html' && (path === '/' || path.endsWith('/'))) return 'active';
    return path.includes(page) ? 'active' : '';
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
}

function checkProtectedRoutes() {
    const path = window.location.pathname;
    if ((path.includes('upload.html') || path.includes('dashboard.html')) && !state.user) {
        window.location.href = 'login.html';
    }
    // Redirect logged in users away from auth pages
    if ((path.includes('login.html') || path.includes('signup.html')) && state.user) {
        window.location.href = 'index.html';
    }
}

function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            setLoading(true, 'Logging in...');

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            setLoading(false);

            if (error) showToast(error.message, 'error');
            else {
                showToast('Welcome back!', 'success');
                // Redirect handled by auth state listener
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;

            if (password !== confirm) return showToast("Passwords don't match", 'error');

            setLoading(true, 'Creating account...');
            const { error } = await supabase.auth.signUp({ email, password });
            setLoading(false);

            if (error) showToast(error.message, 'error');
            else {
                showToast('Account created! Logging in...', 'success');
            }
        });
    }
}

// --- Data Logic ---

async function loadPublicClips() {
    const grid = document.getElementById('clip-grid');
    if (!grid) return;

    // Loading skeleton could go here
    grid.innerHTML = '<div style="color:white; opacity:0.5; grid-column:span 4; text-align:center;">Loading signals...</div>';

    const { data: clips, error } = await supabase
        .from('clips')
        .select(`
            *,
            profiles:owner_id ( email ) 
        `) // Note: owner_id join assumes we might want email, but we don't have a profiles table in the spec. 
        // The spec says "uploader display", we can just use the owner ID or fetch email if we add a public profile wrapper. 
        // For minimal spec, we'll try to get the user email via a joined query if possible, or just skip it if RLS blocks.
        // Actually, standard supabase auth users table isn't directly joinable casually without setup. 
        // Let's just store the email in the clip or display "User [ID]" for now to respect strict spec constraints 
        // (don't invent extra tables if not needed, but "uploader display" implies something).
        // We will fetch simple * for now.
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        grid.innerHTML = '<div style="color:var(--error-color); grid-column:span 4; text-align:center;">Failed to load clips.</div>';
        return;
    }

    state.clips = clips; // Store for search
    renderClips(clips);
}

function renderClips(clips) {
    const grid = document.getElementById('clip-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (clips.length === 0) {
        grid.innerHTML = '<div style="color:white; opacity:0.5; grid-column:span 4; text-align:center;">No signals found.</div>';
        return;
    }

    clips.forEach(clip => {
        const card = document.createElement('div');
        card.className = 'glass-panel clip-card';
        // Hover effects managed by CSS

        // Video Preview logic: using <video> that plays on hover could be cool, but spec says "video preview element OR thumbnail"
        // Let's use the video tag, muted, loop, no controls (until click or simple preview).
        // Actually, let's keep it simple: Show video with controls=false.

        card.innerHTML = `
            <video 
                src="${clip.public_url}" 
                class="clip-thumbnail" 
                muted 
                loop 
                onmouseover="this.play()" 
                onmouseout="this.pause();this.currentTime=0;"
            ></video>
            <div class="clip-overlay">
                <div class="clip-info">
                    <h3>${escapeHtml(clip.title)}</h3>
                    <p>${new Date(clip.created_at).toLocaleDateString()}</p>
                </div>
                <div class="clip-actions">
                    <a href="${clip.public_url}" download class="icon-btn" title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = state.clips.filter(c => c.title.toLowerCase().includes(term));
        renderClips(filtered);
    });
}

// --- Upload Logic ---
function setupUpload() {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('upload-progress');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('clip-title').value;
        const tags = document.getElementById('clip-tags').value.split(',').map(t => t.trim());
        const file = fileInput.files[0];

        if (!file) return showToast('Please select a video file.', 'error');
        if (!title) return showToast('Title is required.', 'error');

        setLoading(true);
        progressContainer.style.display = 'block';

        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${state.user.id}/${fileName}`;

            // Supabase JS v2 upload
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('clips')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Fake progress animation since fetch doesn't give streams easily in this simple setup
            progressBar.style.width = '100%';

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('clips').getPublicUrl(filePath);

            // 3. Insert Metadata
            const { error: dbError } = await supabase.from('clips').insert({
                title,
                tags, // stored as array
                storage_path: filePath,
                public_url: publicUrl,
                owner_id: state.user.id
            });

            if (dbError) throw dbError;

            showToast('Transmission successful.', 'success');
            setTimeout(() => window.location.href = 'index.html', 1500);

        } catch (err) {
            console.error(err);
            showToast(err.message || 'Upload failed.', 'error');
            progressBar.style.width = '0%';
        } finally {
            setLoading(false);
        }
    });
}

// --- Dashboard Logic ---
async function loadUserClips() {
    const grid = document.getElementById('user-clips-grid');
    if (!grid) return;

    const { data: clips, error } = await supabase
        .from('clips')
        .select('*')
        .eq('owner_id', state.user.id)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    grid.innerHTML = '';
    if (clips.length === 0) {
        grid.innerHTML = '<div style="color:white; opacity:0.5; grid-column:span 4; text-align:center;">No transmissions archived.</div>';
        return;
    }

    clips.forEach(clip => {
        const card = document.createElement('div');
        card.className = 'glass-panel clip-card';
        card.innerHTML = `
            <video src="${clip.public_url}" class="clip-thumbnail" muted></video>
            <div class="clip-overlay">
                <div class="clip-info">
                    <h3>${escapeHtml(clip.title)}</h3>
                </div>
                <div class="clip-actions">
                    <a href="${clip.public_url}" download class="icon-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                    <button class="icon-btn" style="border-color: var(--error-color); color: var(--error-color);" onclick="deleteClip('${clip.id}', '${clip.storage_path}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.deleteClip = async (id, path) => {
    if (!confirm('Are you sure you want to delete this signal?')) return;

    try {
        // Delete from Storage
        const { error: storageError } = await supabase.storage.from('clips').remove([path]);
        if (storageError) console.warn('Storage delete warning:', storageError);

        // Delete from DB
        const { error: dbError } = await supabase.from('clips').delete().eq('id', id);
        if (dbError) throw dbError;

        showToast('Signal erased.', 'success');
        loadUserClips(); // refresh
    } catch (err) {
        showToast('Deletion failed.', 'error');
    }
};

// --- Utilities ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 15px 25px;
        background: ${type === 'error' ? 'rgba(255, 75, 75, 0.2)' : 'rgba(75, 255, 129, 0.2)'};
        border-color: ${type === 'error' ? 'var(--error-color)' : 'var(--success-color)'};
        color: white;
        border-radius: var(--radius-sm);
        z-index: 10000;
        animation: fadeUp 0.3s ease-out;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setLoading(isLoading, text = '') {
    // Simplified loading state
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
        if (isLoading) {
            btn.dataset.originalText = btn.innerText;
            btn.innerText = text || 'Processing...';
            btn.disabled = true;
            btn.style.opacity = 0.7;
        } else {
            btn.innerText = btn.dataset.originalText || 'Submit';
            btn.disabled = false;
            btn.style.opacity = 1;
        }
    }
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* --- Visuals: Space Background Canvas --- */
function initCanvas() {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initStars();
    }

    function initStars() {
        stars = [];
        const count = Math.floor((width * height) / 2500); // Increased density
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 2.2 + 0.5, // Larger stars
                alpha: Math.random() * 0.8 + 0.2, // Brighter
                dAlpha: (Math.random() - 0.5) * 0.03
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Slight parallax with mouse? Maybe later. For now just twinkling.

        stars.forEach(star => {
            star.alpha += star.dAlpha;
            if (star.alpha <= 0 || star.alpha >= 1) star.dAlpha *= -1;

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
}

/* --- Visuals: Custom Cursor --- */
function initCursor() {
    // Check touch
    if (matchMedia('(hover: none)').matches) return;

    // Remove existing if any (to prevent duplicates)
    document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => el.remove());

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.left = `${mouseX}px`;
        dot.style.top = `${mouseY}px`;

        // Check hover target
        const hovered = e.target.closest('a, button, input, .clip-card, .upload-zone, .nav-link, .nav-settings-btn');
        if (hovered) {
            ring.classList.add('hovered');
        } else {
            ring.classList.remove('hovered');
        }
    });

    // Smooth trail
    function animateRing() {
        // Lerp
        const dt = 0.15;
        ringX += (mouseX - ringX) * dt;
        ringY += (mouseY - ringY) * dt;

        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;

        requestAnimationFrame(animateRing);
    }
    animateRing();
}
