"use strict";
//  Definirea listei initiale de fisiere video (hardcoded)
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

// Chei pentru LocalStorage
const STORAGE_KEYS = {
  VOLUME: "mm_volume",
  INDEX: "mm_index",
};

//elemente luate din html
const canvas = document.getElementById("videoCanvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("videoElement");
const previewVideo = document.getElementById("previewVideo");
const playlistEl = document.getElementById("playlist");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const effectSelect = document.getElementById("effectSelect");

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

//stare initiala app
let currentIndex = 0;
let isPlaying = false;
let currentEffect = "none";

let CONTROLS_HEIGHT = 80;

/* Coordonatele si dimensiunile butoanelor de control */
const buttons = {
  prev: { x: 20, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
  play: { x: 70, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
  next: { x: 120, y: canvas.height - CONTROLS_HEIGHT + 20, size: 30 },
};

/* Configuratia barei de progres */
let progressBar = {
  x: 200,
  y: canvas.height - CONTROLS_HEIGHT + 25,
  width: canvas.width - 260,
  height: 10,
};

/* Configuratia barei de volum (Include height pentru a repara click-ul) */
let volumeBar = {
  x: canvas.width - 170,
  width: 140,
  height: 10,
};

/* Variabile pentru  Preview  */
let hoverOnProgress = false; //cursor pe bara
let hoverX = 0;
let hoverProgressTime = 0;
let previewReady = false;

/* lista de redare si adauga butoanele de actiune
 DOM manipulation */
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

    // Buton mutare sus
    const up = document.createElement("button");
    up.className = "playlist-btn";
    up.textContent = "▲";
    up.onclick = (e) => {
      e.stopPropagation();
      moveItemUp(index);
    };

    // Buton mutare jos
    const down = document.createElement("button");
    down.className = "playlist-btn";
    down.textContent = "▼";
    down.onclick = (e) => {
      e.stopPropagation(); //ca sa nu dam play la film
      moveItemDown(index);
    };

    // Buton stergere
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

/* Muta elementul selectat o pozitie mai sus in array */
function moveItemUp(index) {
  if (index <= 0) return;

  const temp = playlist[index];
  playlist[index] = playlist[index - 1];
  playlist[index - 1] = temp;

  if (currentIndex === index) currentIndex = index - 1;
  else if (currentIndex === index - 1) currentIndex = index;

  renderPlaylist();
}

/* Muta elementul selectat o pozitie mai jos in array */
function moveItemDown(index) {
  if (index >= playlist.length - 1) return;

  const temp = playlist[index];
  playlist[index] = playlist[index + 1];
  playlist[index + 1] = temp;

  if (currentIndex === index) currentIndex = index + 1;
  else if (currentIndex === index + 1) currentIndex = index;

  renderPlaylist();
}

/* Sterge elementul din lista si ajusteaza indexul curent daca e cazul */
function deleteItem(index) {
  playlist.splice(index, 1);

  if (currentIndex >= playlist.length) {
    currentIndex = playlist.length - 1;
  }

  renderPlaylist();

  if (playlist.length > 0) loadVideoByIndex(currentIndex, false);
}

/* Transforma fisierele locale in URL-uri si le adauga in playlist */
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

/* Incarca sursa video si pregateste preview-ul */
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

/* Porneste redarea video si actualizeaza starea */
function playVideo() {
  if (!video.src) return;
  video.play();
  isPlaying = true;
}

/* Pune pauza la video */
function pauseVideo() {
  video.pause();
  isPlaying = false;
}

/* Comuta intre Play si Pause */
function togglePlay() {
  isPlaying ? pauseVideo() : playVideo();
}

/* Trece la urmatorul video din lista */
function nextVideo() {
  if (!playlist.length) return;
  let nextIndex = currentIndex + 1;
  if (nextIndex >= playlist.length) nextIndex = 0;
  loadVideoByIndex(nextIndex, true);
}

/* Trece la video-ul anterior */
function prevVideo() {
  if (!playlist.length) return;
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlist.length - 1;
  loadVideoByIndex(prevIndex, true);
}

// Eveniment: Cand se termina video-ul, trecem automat la urmatorul
video.addEventListener("ended", nextVideo);

effectSelect.addEventListener("change", () => {
  currentEffect = effectSelect.value;
});

/* Aplica modificari asupra pixelilor (invert, red, posterize) */
function applyEffectToFrame(imageData) {
  const data = imageData.data;
  const len = data.length;

  switch (currentEffect) {
    case "red":
      for (let i = 0; i < len; i += 4) {
        data[i + 1] = 0; // Green = 0
        data[i + 2] = 0; // Blue = 0
      }
      break;

    case "invert":
      for (let i = 0; i < len; i += 4) {
        data[i] = 255 - data[i]; // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
      }
      break;

    case "posterize":
      for (let i = 0; i < len; i += 4) {
        // Reducem numarul de culori pastrand doar bitii semnificativi
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

/* Deseneaza butoanele, bara de progres si volumul pe Canvas */
function drawControls() {
  const h = canvas.height;
  const barTop = h - CONTROLS_HEIGHT;

  // Fundal semitransparent pentru controale
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, barTop, canvas.width, CONTROLS_HEIGHT);

  // Setari culoare butoane
  ctx.fillStyle = "#ffffff";

  // Desenare buton Previous
  ctx.beginPath();
  ctx.moveTo(buttons.prev.x + 20, buttons.prev.y);
  ctx.lineTo(buttons.prev.x + 10, buttons.prev.y + 15);
  ctx.lineTo(buttons.prev.x + 20, buttons.prev.y + 30);
  ctx.fill();

  // Desenare buton Next
  ctx.beginPath();
  ctx.moveTo(buttons.next.x + 10, buttons.next.y);
  ctx.lineTo(buttons.next.x + 20, buttons.next.y + 15);
  ctx.lineTo(buttons.next.x + 10, buttons.next.y + 30);
  ctx.fill();

  // Desenare buton Play/Pause in functie de stare
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

  // Recalculare latime bara progres
  progressBar.width = canvas.width - 260;
  progressBar.x = 200;

  // Desenare fundal bara progres
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(progressBar.x, progressBar.y, progressBar.width, 10);

  // Desenare progres curent (albastru)
  if (video.duration) {
    const filled = (video.currentTime / video.duration) * progressBar.width;
    ctx.fillStyle = "#9da7b8ff";
    ctx.fillRect(progressBar.x, progressBar.y, filled, 10);
  }

  // Pozitionare si desenare volum
  volumeBar.x = canvas.width - 170;
  volumeBar.y = progressBar.y + 25;

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(volumeBar.x, volumeBar.y, volumeBar.width, 10);

  ctx.fillStyle = "#8ab4f8";
  ctx.fillRect(volumeBar.x, volumeBar.y, video.volume * volumeBar.width, 10);
}

/* Activare flag cand preview-ul a terminat de facut seek */
previewVideo.addEventListener("seeked", () => {
  previewReady = true;
});

/* Deseneaza miniatura deasupra barei de progres */
function drawPreview() {
  if (!hoverOnProgress || !previewReady || !video.duration) return;

  const thumbW = 160;
  const thumbH = 90;

  // Calcul pozitie X ca sa nu iasa din ecran
  let x = hoverX - thumbW / 2;
  if (x < 10) x = 10;
  if (x + thumbW > canvas.width - 10) x = canvas.width - thumbW - 10;

  const y = progressBar.y - thumbH - 10;
  // Desenare imagine preview
  ctx.drawImage(previewVideo, x, y, thumbW, thumbH);

  // Linie indicator galbena
  ctx.strokeStyle = "#ffeb3b";
  ctx.beginPath();
  ctx.moveTo(hoverX, progressBar.y - 5);
  ctx.lineTo(hoverX, progressBar.y + 15);
  ctx.stroke();
}
//functia care formeaza frame uri din poze
function drawFrame() {
  const vidHeight = canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (video.readyState >= 2) {
    // 1. Desenam video
    ctx.drawImage(video, 0, 0, canvas.width, vidHeight);

    // 2. Extragem pixeli si aplicam efecte
    const frame = ctx.getImageData(0, 0, canvas.width, vidHeight);
    applyEffectToFrame(frame);
    ctx.putImageData(frame, 0, 0);
  } else {
    // Ecran negru daca nu e video
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, vidHeight);
  }

  // 3. Desenam controalele PESTE video
  drawControls();
  drawPreview();

  requestAnimationFrame(drawFrame);
}

/* Gestioneaza click-urile pe Canvas (Butoane, Seek, Volum) */
canvas.addEventListener("click", (e) => {
  //localizare click
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // daca click ul se afla in buton
  const inButton = (btn) =>
    x >= btn.x && x <= btn.x + btn.size && y >= btn.y && y <= btn.y + btn.size;

  if (inButton(buttons.prev)) return prevVideo();
  if (inButton(buttons.play)) return togglePlay();
  if (inButton(buttons.next)) return nextVideo();

  // Click pe bara de progres (Seek)-reg de 3 simpla
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

  // Click pe volum
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

/* Monitorizeaza miscarea mouse-ului pentru Preview */
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  hoverX = x;

  // Verificam daca suntem deasupra barei de progres
  hoverOnProgress =
    x >= progressBar.x &&
    x <= progressBar.x + progressBar.width &&
    y >= progressBar.y - 15 &&
    y <= progressBar.y + progressBar.height + 15;

  if (hoverOnProgress && video.duration) {
    //trans poz-mouse in sec
    const ratio = (x - progressBar.x) / progressBar.width;
    hoverProgressTime = Math.max(
      0,
      Math.min(ratio * video.duration, video.duration)
    );

    //Facem seek doar la diferente de peste 0.4s ca sa nu blocam player-ul cu prea multe actualizari.

    if (Math.abs(previewVideo.currentTime - hoverProgressTime) > 0.4) {
      previewReady = false;
      previewVideo.currentTime = hoverProgressTime;
    }
  }
});

/* Ascunde preview-ul cand mouse-ul paraseste canvas-ul */
canvas.addEventListener("mouseleave", () => {
  hoverOnProgress = false;
});

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

/* =========================================
   PERSISTENTA DATE (LOCAL STORAGE)
   ========================================= */

/* Salveaza volumul curent */
function saveVolume() {
  localStorage.setItem(STORAGE_KEYS.VOLUME, video.volume.toString());
}

/* Incarca volumul salvat la pornire */
function loadVolume() {
  const v = localStorage.getItem(STORAGE_KEYS.VOLUME);
  if (v !== null) {
    const val = parseFloat(v);
    if (!isNaN(val)) video.volume = Math.min(1, Math.max(0, val));
  } else {
    video.volume = 0.7;
  }
}

/* Salveaza indexul videoclipului curent */
function saveIndex() {
  localStorage.setItem(STORAGE_KEYS.INDEX, currentIndex.toString());
}

/* Incarca ultimul video redat la pornire */
function loadIndex() {
  const idx = localStorage.getItem(STORAGE_KEYS.INDEX);
  if (idx !== null) {
    const val = parseInt(idx);
    if (!isNaN(val) && val >= 0 && val < playlist.length) {
      currentIndex = val;
    }
  }
}

/* Initializare aplicatie */
function init() {
  loadVolume();
  loadIndex();
  renderPlaylist();
  loadVideoByIndex(currentIndex, false);
  requestAnimationFrame(drawFrame);
}

resizeCanvas();
init();
