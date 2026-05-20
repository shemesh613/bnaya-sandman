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
