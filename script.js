// ============ Animated background ============
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r = Math.random() * 2 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.2;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > W) this.vx *= -1;
    if (this.y < 0 || this.y > H) this.vy *= -1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(124, 92, 255, ${this.alpha})`;
    ctx.fill();
  }
}

for (let i = 0; i < 80; i++) particles.push(new Particle());

function animate() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => { p.update(); p.draw(); });
  // connect close particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(124, 92, 255, ${0.15 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animate);
}
animate();

// ============ Storage helpers ============
const STORAGE_KEYS = {
  profile: 'bnaya_profile_img',
  gallery: 'bnaya_gallery',
  music: 'bnaya_music',
  videos: 'bnaya_videos'
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    alert('שטח האחסון בדפדפן מלא. נסה למחוק קבצים קודמים.');
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ============ Profile image ============
const profileFrame = document.getElementById('profileFrame');
const profileImg = document.getElementById('profileImg');
const profilePlaceholder = document.getElementById('profilePlaceholder');
const profileInput = document.getElementById('profileInput');
const changeBtn = document.getElementById('changeBtn');

function showProfile(src) {
  profileImg.src = src;
  profileImg.style.display = 'block';
  profilePlaceholder.style.display = 'none';
  profileFrame.classList.add('has-image');
}

// Load saved
const savedProfile = localStorage.getItem(STORAGE_KEYS.profile);
if (savedProfile) showProfile(savedProfile);

profileFrame.addEventListener('click', e => {
  if (e.target === changeBtn) return;
  profileInput.click();
});

changeBtn.addEventListener('click', e => {
  e.stopPropagation();
  profileInput.click();
});

profileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const base64 = await fileToBase64(file);
  localStorage.setItem(STORAGE_KEYS.profile, base64);
  showProfile(base64);
});

// ============ Generic upload zone setup ============
function setupUploadZone(zoneId, inputId, onFiles) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => onFiles(Array.from(e.target.files)));

  ['dragenter', 'dragover'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });

  zone.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  });
}

// ============ Gallery ============
const galleryGrid = document.getElementById('galleryGrid');
let gallery = loadList(STORAGE_KEYS.gallery);

function renderGallery() {
  if (gallery.length === 0) {
    galleryGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">עדיין אין תמונות בגלריה — העלה את הראשונה!</div>';
    return;
  }
  galleryGrid.innerHTML = gallery.map((item, i) => `
    <div class="gallery-item">
      ${item.ai ? '<span class="ai-badge">AI</span>' : ''}
      <img src="${item.src}" alt="${item.name}" />
      <button class="remove" data-i="${i}" title="הסר">✕</button>
    </div>
  `).join('');

  galleryGrid.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = +btn.dataset.i;
      gallery.splice(i, 1);
      saveList(STORAGE_KEYS.gallery, gallery);
      renderGallery();
    });
  });
}

setupUploadZone('galleryUpload', 'galleryInput', async files => {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const src = await fileToBase64(file);
    gallery.push({ name: file.name, src });
  }
  saveList(STORAGE_KEYS.gallery, gallery);
  renderGallery();
});

renderGallery();

// ============ AI Art Generator ============
const palettes = [
  ['#ff6b9d', '#c44569', '#f8b500', '#ffd93d'],
  ['#7c5cff', '#4ddbff', '#a855f7', '#ec4899'],
  ['#00b8a9', '#f8f3d4', '#f6416c', '#ffde7d'],
  ['#0f3460', '#16213e', '#e94560', '#f5a623'],
  ['#2d00f7', '#6a00f4', '#8900f2', '#a100f2'],
  ['#3a86ff', '#8338ec', '#ff006e', '#fb5607'],
  ['#06ffa5', '#3a86ff', '#8338ec', '#ff006e'],
  ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
  ['#fb8500', '#ffb703', '#219ebc', '#023047'],
  ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe']
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateArt() {
  const size = 800;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const palette = pick(palettes);
  const style = pick(['blobs', 'waves', 'particles', 'rings', 'stripes', 'mesh']);

  const baseGrad = ctx.createLinearGradient(0, 0, size, size);
  baseGrad.addColorStop(0, palette[0]);
  baseGrad.addColorStop(1, palette[1]);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  if (style === 'blobs') {
    for (let i = 0; i < 8; i++) {
      const x = rand(0, size), y = rand(0, size);
      const r = rand(80, 280);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const color = pick(palette);
      g.addColorStop(0, color + 'cc');
      g.addColorStop(1, color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'waves') {
    for (let layer = 0; layer < 5; layer++) {
      ctx.beginPath();
      ctx.fillStyle = pick(palette) + 'aa';
      const yBase = (layer / 5) * size + rand(0, 100);
      ctx.moveTo(0, size);
      for (let x = 0; x <= size; x += 20) {
        const y = yBase + Math.sin(x * rand(0.005, 0.02) + layer) * rand(40, 120);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(size, size);
      ctx.closePath();
      ctx.fill();
    }
  } else if (style === 'particles') {
    for (let i = 0; i < 600; i++) {
      const x = rand(0, size), y = rand(0, size);
      const r = rand(1, 12);
      const alpha = Math.floor(rand(120, 255)).toString(16).padStart(2, '0');
      ctx.fillStyle = pick(palette) + alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'rings') {
    const cx = size / 2 + rand(-100, 100);
    const cy = size / 2 + rand(-100, 100);
    for (let i = 30; i > 0; i--) {
      ctx.strokeStyle = pick(palette) + 'dd';
      ctx.lineWidth = rand(2, 10);
      ctx.beginPath();
      ctx.arc(cx, cy, i * rand(15, 22), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (style === 'stripes') {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rand(0, Math.PI));
    ctx.translate(-size, -size);
    const w = rand(20, 60);
    for (let x = 0; x < size * 2; x += w) {
      ctx.fillStyle = pick(palette) + 'cc';
      ctx.fillRect(x, 0, w, size * 2);
    }
    ctx.restore();
  } else if (style === 'mesh') {
    const cols = 8, rows = 8;
    const cw = size / cols, ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = ctx.createRadialGradient(
          c * cw + cw/2, r * ch + ch/2, 0,
          c * cw + cw/2, r * ch + ch/2, cw
        );
        g.addColorStop(0, pick(palette) + 'cc');
        g.addColorStop(1, pick(palette) + '33');
        ctx.fillStyle = g;
        ctx.fillRect(c * cw, r * ch, cw, ch);
      }
    }
  }

  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(0.02, 0.08)})`;
    ctx.beginPath();
    ctx.arc(rand(0, size), rand(0, size), rand(50, 200), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 18px Heebo, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('בניה סנדמן · AI', 24, size - 24);

  return canvas.toDataURL('image/jpeg', 0.85);
}

const generateBtn = document.getElementById('generateBtn');
generateBtn.addEventListener('click', async () => {
  generateBtn.classList.add('loading');
  await new Promise(r => setTimeout(r, 20));
  try {
    const src = generateArt();
    gallery.unshift({ name: `AI Art #${Date.now().toString().slice(-4)}`, src, ai: true });
    saveList(STORAGE_KEYS.gallery, gallery);
    renderGallery();
    document.getElementById('galleryGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    alert('שגיאה ביצירת התמונה: ' + err.message);
  } finally {
    generateBtn.classList.remove('loading');
  }
});

// ============ Music ============
const musicList = document.getElementById('musicList');
let music = loadList(STORAGE_KEYS.music);

function renderMusic() {
  if (music.length === 0) {
    musicList.innerHTML = '<div class="empty-state">עדיין אין שירים — העלה קובץ ראשון!</div>';
    return;
  }
  musicList.innerHTML = music.map((item, i) => `
    <div class="music-item">
      <div class="play-icon">▶</div>
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="size">${formatSize(item.size)}</div>
      </div>
      <audio controls src="${item.src}"></audio>
      <button class="remove" data-i="${i}" title="הסר">✕</button>
    </div>
  `).join('');

  musicList.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      music.splice(i, 1);
      saveList(STORAGE_KEYS.music, music);
      renderMusic();
    });
  });
}

setupUploadZone('musicUpload', 'musicInput', async files => {
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const src = await fileToBase64(file);
    music.push({ name: file.name, size: file.size, src });
  }
  saveList(STORAGE_KEYS.music, music);
  renderMusic();
});

renderMusic();

// ============ Videos ============
const videoGrid = document.getElementById('videoGrid');
let videos = loadList(STORAGE_KEYS.videos);

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  });
});

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function renderVideos() {
  if (videos.length === 0) {
    videoGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">עדיין אין סרטונים — העלה קובץ או הדבק קישור יוטיוב!</div>';
    return;
  }
  videoGrid.innerHTML = videos.map((item, i) => {
    if (item.type === 'youtube') {
      return `
        <div class="video-item">
          <span class="yt-badge">YouTube</span>
          <iframe src="https://www.youtube.com/embed/${item.videoId}"
            title="${item.name}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
          <div class="meta">
            <div class="name">${item.name}</div>
            <button class="remove" data-i="${i}" title="הסר">✕</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="video-item">
        <video controls src="${item.src}"></video>
        <div class="meta">
          <div class="name">${item.name}</div>
          <button class="remove" data-i="${i}" title="הסר">✕</button>
        </div>
      </div>
    `;
  }).join('');

  videoGrid.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      videos.splice(i, 1);
      saveList(STORAGE_KEYS.videos, videos);
      renderVideos();
    });
  });
}

setupUploadZone('videoUpload', 'videoInput', async files => {
  for (const file of files) {
    if (!file.type.startsWith('video/')) continue;
    if (file.size > 50 * 1024 * 1024) {
      alert(`הקובץ "${file.name}" גדול מ-50MB. נסה קובץ קטן יותר או השתמש בקבצי MP4 דחוסים.`);
      continue;
    }
    const src = await fileToBase64(file);
    videos.push({ type: 'file', name: file.name, size: file.size, src });
  }
  saveList(STORAGE_KEYS.videos, videos);
  renderVideos();
});

// YouTube embed
const ytInput = document.getElementById('youtubeUrl');
const ytBtn = document.getElementById('addYoutubeBtn');

function addYouTube() {
  const url = ytInput.value.trim();
  if (!url) return;
  const id = extractYouTubeId(url);
  if (!id) {
    alert('הקישור לא תקין. הדבק קישור יוטיוב מלא או מקוצר.');
    return;
  }
  videos.push({ type: 'youtube', videoId: id, name: `סרטון יוטיוב (${id})`, url });
  saveList(STORAGE_KEYS.videos, videos);
  ytInput.value = '';
  renderVideos();
  document.getElementById('videoGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

ytBtn.addEventListener('click', addYouTube);
ytInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addYouTube();
});

renderVideos();
