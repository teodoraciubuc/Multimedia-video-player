"use strict";

/* 1. PLAYLIST STATIC */
let playlist = [
  {
    title: "Film 1",
    src: "media/film1.mp4",
  },
  {
    title: "Film 2",
    src: "media/film2.mp4",
  },
  {
    title: "Film 3",
    src: "media/film3.mp4",
  },
  {
    title: "Film 4",
    src: "media/film4.mp4",
  },
];

const STORAGE_KEYS = {
  VOLUME: "mm_volume",
  INDEX: "mm_index",
};

/* 2. REFERINȚE DOM  */
const canvas = document.getElementById("videoCanvas");
const ctx = canvas.getContext("2d");

const video = document.getElementById("videoElement");
const previewVideo = document.getElementById("previewVideo");

const playlistEl = document.getElementById("playlist");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const effectSelect = document.getElementById("effectSelect");

/*3. STARE PLAYER */
let currentIndex = 0;
let isPlaying = false;
let currentEffect = "none";

const CONTROLS_HEIGHT = 80;

const buttons = {
  prev: { x: 20, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
  play: { x: 70, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
  next: { x: 120, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
};

let progressBar = {
  x: 200,
  y: canvas.height - CONTROLS_HEIGHT + 25,
  width: canvas.width - 260,
  height: 10,
};

let volumeBar = {
  x: canvas.width - 170,
  width: 140,
};

// preview
let hoverOnProgress = false;
let hoverX = 0;
let hoverProgressTime = 0;
let previewReady = false;

/* 5. PLAYLIST UI     */
function renderPlaylist() {
  playlistEl.innerHTML = "";

  playlist.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "playlist-item" + (index === currentIndex ? " active" : "");

    const title = document.createElement("span");
    title.className = "playlist-title";
    title.textContent = item.title;

    const actions = document.createElement("div");
    actions.className = "playlist-actions";

    const up = document.createElement("button");
    up.className = "playlist-btn";
    up.textContent = "▲";
    up.onclick = (e) => {
      e.stopPropagation();
      moveItemUp(index);
    };

    const down = document.createElement("button");
    down.className = "playlist-btn";
    down.textContent = "▼";
    down.onclick = (e) => {
      e.stopPropagation();
      moveItemDown(index);
    };

    const del = document.createElement("button");
    del.className = "playlist-btn";
    del.textContent = "✖";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteItem(index);
    };

    actions.append(up, down, del);
    li.append(title, actions);

    li.onclick = () => loadVideoByIndex(index, true);

    playlistEl.appendChild(li);
  });
}

function moveItemUp(index) {
  if (index <= 0) return;

  const temp = playlist[index];
  playlist[index] = playlist[index - 1];
  playlist[index - 1] = temp;

  if (currentIndex === index) currentIndex = index - 1;
  else if (currentIndex === index - 1) currentIndex = index;

  renderPlaylist();
}

function moveItemDown(index) {
  if (index >= playlist.length - 1) return;

  const temp = playlist[index];
  playlist[index] = playlist[index + 1];
  playlist[index + 1] = temp;

  if (currentIndex === index) currentIndex = index + 1;
  else if (currentIndex === index + 1) currentIndex = index;

  renderPlaylist();
}

function deleteItem(index) {
  playlist.splice(index, 1);

  if (currentIndex >= playlist.length) {
    currentIndex = playlist.length - 1;
  }

  renderPlaylist();

  if (playlist.length > 0) loadVideoByIndex(currentIndex, false);
}

function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith("video/")) continue;
    const url = URL.createObjectURL(f);
    playlist.push({
      title: f.name,
      src: url,
      subtitles: null,
    });
  }
  renderPlaylist();
}

/* 6. LOAD VIDEO*/
function loadVideoByIndex(index, autoplay) {
  if (index < 0 || index >= playlist.length) return;
  currentIndex = index;
  saveIndex();

  const item = playlist[index];

  video.src = item.src;
  video.load();

  previewVideo.src = item.src;
  previewVideo.load();

  video.onloadedmetadata = () => {
    if (autoplay) playVideo();
  };

  renderPlaylist();
}

/* CONTROALE*/
function playVideo() {
  if (!video.src) return;
  video.play();
  isPlaying = true;
}

function pauseVideo() {
  video.pause();
  isPlaying = false;
}

function togglePlay() {
  isPlaying ? pauseVideo() : playVideo();
}

function nextVideo() {
  if (!playlist.length) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= playlist.length) nextIndex = 0;
  loadVideoByIndex(nextIndex, true);
}

function prevVideo() {
  if (!playlist.length) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlist.length - 1;
  loadVideoByIndex(prevIndex, true);
}

video.addEventListener("ended", nextVideo);

/* EFECTE VIDEO*/
effectSelect.addEventListener("change", () => {
  currentEffect = effectSelect.value;
});

function applyEffectToFrame(imageData) {
  const data = imageData.data;
  const len = data.length;

  switch (currentEffect) {
    case "red":
      for (let i = 0; i < len; i += 4) {
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
      break;

    case "invert":
      for (let i = 0; i < len; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;

    case "posterize":
      for (let i = 0; i < len; i += 4) {
        data[i] = data[i] & 0xe0;
        data[i + 1] = data[i + 1] & 0xe0;
        data[i + 2] = data[i + 2] & 0xe0;
      }
      break;

    case "none":
    default:
      break;
  }
}

/* DESENARE CONTROALE*/

function drawControls() {
  const h = canvas.height;
  const barTop = h - CONTROLS_HEIGHT;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, barTop, canvas.width, CONTROLS_HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(buttons.prev.x + 20, buttons.prev.y);
  ctx.lineTo(buttons.prev.x + 10, buttons.prev.y + 15);
  ctx.lineTo(buttons.prev.x + 20, buttons.prev.y + 30);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(buttons.next.x + 10, buttons.next.y);
  ctx.lineTo(buttons.next.x + 20, buttons.next.y + 15);
  ctx.lineTo(buttons.next.x + 10, buttons.next.y + 30);
  ctx.fill();

  if (isPlaying) {
    ctx.fillRect(buttons.play.x + 10, buttons.play.y, 6, 30);
    ctx.fillRect(buttons.play.x + 20, buttons.play.y, 6, 30);
  } else {
    ctx.beginPath();
    ctx.moveTo(buttons.play.x + 10, buttons.play.y);
    ctx.lineTo(buttons.play.x + 10, buttons.play.y + 30);
    ctx.lineTo(buttons.play.x + 25, buttons.play.y + 15);
    ctx.fill();
  }

  progressBar.width = canvas.width - 260;
  progressBar.x = 200;

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(progressBar.x, progressBar.y, progressBar.width, 10);

  if (video.duration) {
    const filled = (video.currentTime / video.duration) * progressBar.width;
    ctx.fillStyle = "#8ab4f8";
    ctx.fillRect(progressBar.x, progressBar.y, filled, 10);
  }

  volumeBar.x = canvas.width - 170;
  volumeBar.y = progressBar.y + 25;

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(volumeBar.x, volumeBar.y, volumeBar.width, 10);

  ctx.fillStyle = "#8ab4f8";
  ctx.fillRect(volumeBar.x, volumeBar.y, video.volume * volumeBar.width, 10);
}

/* PREVIEW*/
previewVideo.addEventListener("seeked", () => {
  previewReady = true;
});

function drawPreview() {
  if (!hoverOnProgress || !previewReady || !video.duration) return;

  const thumbW = 160;
  const thumbH = 90;
  let x = hoverX - thumbW / 2;
  if (x < 10) x = 10;
  if (x + thumbW > canvas.width - 10) x = canvas.width - thumbW - 10;

  const y = progressBar.y - thumbH - 10;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(x - 2, y - 2, thumbW + 4, thumbH + 4);

  ctx.drawImage(previewVideo, x, y, thumbW, thumbH);

  ctx.strokeStyle = "#ffeb3b";
  ctx.beginPath();
  ctx.moveTo(hoverX, progressBar.y - 5);
  ctx.lineTo(hoverX, progressBar.y + 15);
  ctx.stroke();
}
function drawFrame() {
  const vidHeight = canvas.height - CONTROLS_HEIGHT;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, canvas.width, vidHeight);
    const frame = ctx.getImageData(0, 0, canvas.width, vidHeight);
    applyEffectToFrame(frame);
    ctx.putImageData(frame, 0, 0);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, vidHeight);
  }

  drawControls();
  drawPreview();

  requestAnimationFrame(drawFrame);
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const inButton = (btn) =>
    x >= btn.x && x <= btn.x + btn.size && y >= btn.y && y <= btn.y + btn.size;

  if (inButton(buttons.prev)) return prevVideo();
  if (inButton(buttons.play)) return togglePlay();
  if (inButton(buttons.next)) return nextVideo();

  if (
    x >= progressBar.x &&
    x <= progressBar.x + progressBar.width &&
    y >= progressBar.y &&
    y <= progressBar.y + progressBar.height
  ) {
    if (video.duration) {
      const ratio = (x - progressBar.x) / progressBar.width;
      video.currentTime = ratio * video.duration;
    }
    return;
  }

  if (
    x >= volumeBar.x &&
    x <= volumeBar.x + volumeBar.width &&
    y >= volumeBar.y &&
    y <= volumeBar.y + volumeBar.height
  ) {
    const ratio = (x - volumeBar.x) / volumeBar.width;
    const vol = Math.min(1, Math.max(0, ratio));
    video.volume = vol;
    saveVolume();
    return;
  }
  togglePlay();
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  hoverX = x;

  hoverOnProgress =
    x >= progressBar.x &&
    x <= progressBar.x + progressBar.width &&
    y >= progressBar.y - 15 &&
    y <= progressBar.y + progressBar.height + 15;

  if (hoverOnProgress && video.duration) {
    const ratio = (x - progressBar.x) / progressBar.width;
    hoverProgressTime = Math.max(
      0,
      Math.min(ratio * video.duration, video.duration)
    );

    if (Math.abs(previewVideo.currentTime - hoverProgressTime) > 0.4) {
      previewReady = false;
      previewVideo.currentTime = hoverProgressTime;
    }
  }
});

canvas.addEventListener("mouseleave", () => {
  hoverOnProgress = false;
});

/* 14. DRAG & DROP */
fileInput.addEventListener("change", (e) => {
  addFiles(e.target.files);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  addFiles(e.dataTransfer.files);
});

/* 15. WEB STORAGE */
function saveVolume() {
  localStorage.setItem(STORAGE_KEYS.VOLUME, video.volume.toString());
}

function loadVolume() {
  const v = localStorage.getItem(STORAGE_KEYS.VOLUME);
  if (v !== null) {
    const val = parseFloat(v);
    if (!isNaN(val)) video.volume = Math.min(1, Math.max(0, val));
  } else {
    video.volume = 0.7;
  }
}

function saveIndex() {
  localStorage.setItem(STORAGE_KEYS.INDEX, currentIndex.toString());
}

function loadIndex() {
  const idx = localStorage.getItem(STORAGE_KEYS.INDEX);
  if (idx !== null) {
    const val = parseInt(idx);
    if (!isNaN(val) && val >= 0 && val < playlist.length) {
      currentIndex = val;
    }
  }
}
function init() {
  loadVolume();
  loadIndex();
  renderPlaylist();
  loadVideoByIndex(currentIndex, false);
  requestAnimationFrame(drawFrame);
}

init();
