class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, decay = true) {
    if (!this.enabled) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);

    if (decay) {
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + duration,
      );
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playMove() {
    this.playTone(320, "sine", 0.08);
  }
  playDock() {
    this.playTone(440, "triangle", 0.1);
    setTimeout(() => this.playTone(880, "triangle", 0.2), 80);
  }
  playComplete() {
    this.playTone(523, "sine", 0.1);
    setTimeout(() => this.playTone(659, "sine", 0.1), 100);
    setTimeout(() => this.playTone(783, "sine", 0.2), 200);
  }
}

const sfx = new SoundEffects();

// --- Configuration & Dynamic User ID Setup ---
const API_BASE_URL =
  "https://microsoft-learning-path-tracker-gamified-production.up.railway.app/";

function getOrCreateUserId() {
  let storedId = localStorage.getItem("learning_path_user_id");
  if (!storedId) {
    storedId = `user_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("learning_path_user_id", storedId);
  }
  return storedId;
}

const CURRENT_USER_ID = getOrCreateUserId();

// --- State Variables ---
let currentDomain = "cloud";
let certPathData = [];
let userCompletedCerts = [];
let activeCertNode = null;

let shipPos = { x: 12, y: 50 };
let targetPos = { x: 12, y: 50 };
let shipAngle = 0;

const activeTriggers = new Set();
let isFetchingAI = false; // Lock flag to prevent duplicate/concurrent AI requests

// Helper to normalize cert identifiers across MongoDB (certId) and Local Fallback (id)
function getCertId(cert) {
  return cert ? cert.certId || cert.id : null;
}

// --- Fallback Local Dataset ---
const FALLBACK_DATASET = {
  cloud: [
    {
      certId: "az-900",
      code: "AZ-900",
      title: "Azure Fundamentals",
      prereqs: [],
      x: 15,
      y: 50,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
    },
    {
      certId: "az-104",
      code: "AZ-104",
      title: "Azure Administrator",
      prereqs: ["az-900"],
      x: 40,
      y: 30,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/",
    },
    {
      certId: "az-204",
      code: "AZ-204",
      title: "Azure Developer Associate",
      prereqs: ["az-900"],
      x: 40,
      y: 70,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-developer/",
    },
    {
      certId: "az-305",
      code: "AZ-305",
      title: "Azure Solutions Architect",
      prereqs: ["az-104"],
      x: 75,
      y: 50,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/",
    },
  ],
  ai: [
    {
      certId: "ai-900",
      code: "AI-900",
      title: "Azure AI Fundamentals",
      prereqs: [],
      x: 20,
      y: 50,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/",
    },
    {
      certId: "ai-102",
      code: "AI-102",
      title: "Azure AI Engineer Associate",
      prereqs: ["ai-900"],
      x: 55,
      y: 50,
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/",
    },
  ],
};

// --- DOM Elements ---
const platformsContainer = document.getElementById("platforms-container");
const vehicleEl = document.getElementById("vehicle");
const thrusterEl = document.getElementById("thruster");
const pathLine = document.getElementById("path-line");
const domainPicker = document.getElementById("domain-picker");
const toggleAudioBtn = document.getElementById("toggle-audio");
const levelModal = document.getElementById("level-modal");
const progressEl = document.getElementById("user-progress");
const userIdDisplay = document.getElementById("user-id-display");
const aiExplanationText = document.getElementById("ai-explanation-text");
const btnCompleteStep = document.getElementById("btn-complete-step");

// --- Backend API Integration ---

async function fetchDomainAndProgress() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/path?domain=${currentDomain}&userId=${CURRENT_USER_ID}`,
    );
    if (!response.ok) throw new Error("Backend unreachable");

    const data = await response.json();
    certPathData = data.certs;
    userCompletedCerts = data.completedCerts;
  } catch (err) {
    console.warn("Backend API offline. Utilizing local fallback state.");
    userCompletedCerts =
      JSON.parse(localStorage.getItem(`progress_${CURRENT_USER_ID}`)) || [];
    certPathData = FALLBACK_DATASET[currentDomain];
  }

  computeNodeStates();
  renderPlatforms();
  updatePath();
  calculateOverallProgress();
}

async function markCertCompleted(certId) {
  if (!userCompletedCerts.includes(certId)) {
    userCompletedCerts.push(certId);
  }

  try {
    await fetch(`${API_BASE_URL}/progress/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: CURRENT_USER_ID,
        certId: certId,
        domain: currentDomain,
      }),
    });
  } catch (err) {
    console.warn("Backend offline, caching progress in localStorage.");
    localStorage.setItem(
      `progress_${CURRENT_USER_ID}`,
      JSON.stringify(userCompletedCerts),
    );
  }

  sfx.playComplete();
  closeModal();
  computeNodeStates();
  renderPlatforms();
  calculateOverallProgress();
}

async function fetchAIExplanation(cert) {
  if (!aiExplanationText) return;
  aiExplanationText.innerText = "⚡ Requesting AI path briefing...";

  const plainFallback = `${cert.title} builds upon prerequisite concepts to establish your core proficiency in ${currentDomain}.`;

  try {
    const res = await fetch(`${API_BASE_URL}/ai-explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: CURRENT_USER_ID,
        targetCertId: getCertId(cert),
        domain: currentDomain,
        completedCerts: userCompletedCerts,
      }),
    });

    if (!res.ok) throw new Error("AI Endpoint issue");
    const data = await res.json();
    aiExplanationText.innerText = data.explanation || plainFallback;
  } catch (err) {
    aiExplanationText.innerText = plainFallback;
  }
}

// --- Logic Rules ---
function computeNodeStates() {
  certPathData.forEach((cert) => {
    const id = getCertId(cert);
    if (userCompletedCerts.includes(id)) {
      cert.status = "completed";
    } else {
      const prereqsMet = cert.prereqs.every((reqId) =>
        userCompletedCerts.includes(reqId),
      );
      cert.status = prereqsMet ? "available" : "locked";
    }
  });
}

// --- Render Functions ---
function renderPlatforms() {
  platformsContainer.innerHTML = "";
  certPathData.forEach((cert) => {
    const platform = document.createElement("div");
    platform.className = "platform";
    platform.style.left = `${cert.x}%`;
    platform.style.top = `${cert.y}%`;

    let statusClass = cert.status;
    let statusText = cert.status ? cert.status.toUpperCase() : "LOCKED";

    platform.innerHTML = `
      <div class="status-badge ${statusClass}">${statusText}</div>
      <div class="station-node ${statusClass}">
        ${statusClass === "completed" ? "✅" : statusClass === "available" ? "🎓" : "🔒"}
      </div>
      <div class="platform-title">${cert.code}: ${cert.title}</div>
    `;

    platformsContainer.appendChild(platform);
  });
}

function updatePath() {
  const viewport = document.getElementById("map-viewport");
  if (!viewport || certPathData.length === 0) return;

  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  let d = `M ${(certPathData[0].x * vw) / 100} ${(certPathData[0].y * vh) / 100}`;
  for (let i = 0; i < certPathData.length - 1; i++) {
    const p1 = certPathData[i];
    const p2 = certPathData[i + 1];
    const cx = (((p1.x + p2.x) / 2) * vw) / 100;
    const cy = (((p1.y + p2.y) / 2) * vh) / 100;
    d += ` Q ${cx} ${cy}, ${(p2.x * vw) / 100} ${(p2.y * vh) / 100}`;
  }
  pathLine.setAttribute("d", d);
}

function calculateOverallProgress() {
  const total = certPathData.length;
  const done = certPathData.filter((c) => c.status === "completed").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  progressEl.innerText = `Path Progress: ${percent}%`;
}

function closeModal() {
  if (levelModal) {
    levelModal.style.display = "none";
    levelModal.classList.add("hidden");
  }
}

async function openLevelModal(cert) {
  if (isFetchingAI) return;

  sfx.playDock();
  activeCertNode = cert;

  const modalTitle = document.getElementById("modal-title");
  const modalCode = document.getElementById("modal-code");
  const learnLink = document.getElementById("learn-link");

  if (modalTitle) modalTitle.innerText = cert.title;
  if (modalCode) modalCode.innerText = `Certification: ${cert.code}`;
  if (learnLink) learnLink.href = cert.url;

  levelModal.style.display = "flex";
  levelModal.classList.remove("hidden");

  if (cert.status === "completed") {
    btnCompleteStep.style.display = "none";
    if (aiExplanationText) {
      aiExplanationText.innerText =
        "You have already completed this certification step!";
    }
  } else if (cert.status === "available") {
    btnCompleteStep.style.display = "block";
    btnCompleteStep.innerText = "MARK STEP COMPLETE";

    isFetchingAI = true;
    try {
      await fetchAIExplanation(cert);
    } finally {
      isFetchingAI = false;
    }
  } else {
    btnCompleteStep.style.display = "none";
    if (aiExplanationText) {
      aiExplanationText.innerText =
        "🔒 Complete prerequisites first to unlock this step.";
    }
  }
}

// --- Motion Loop ---
function gameLoop() {
  const dx = targetPos.x - shipPos.x;
  const dy = targetPos.y - shipPos.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 0.2) {
    shipPos.x += dx * 0.1;
    shipPos.y += dy * 0.1;

    const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    shipAngle = targetAngle;
    thrusterEl.classList.add("active");
  } else {
    thrusterEl.classList.remove("active");
  }

  vehicleEl.style.left = `${shipPos.x}%`;
  vehicleEl.style.top = `${shipPos.y}%`;
  vehicleEl.style.transform = `translate(-50%, -50%) rotate(${shipAngle}deg)`;

  // Station Proximity Detector
  certPathData.forEach((cert) => {
    const id = getCertId(cert);
    const distToStation = Math.hypot(shipPos.x - cert.x, shipPos.y - cert.y);

    if (distToStation < 3.5) {
      if (!activeTriggers.has(id)) {
        activeTriggers.add(id);
        openLevelModal(cert);
      }
    } else if (distToStation > 6.0) {
      activeTriggers.delete(id);
    }
  });

  requestAnimationFrame(gameLoop);
}

// --- Event Listeners & Control ---
function setupEventListeners() {
  window.addEventListener("resize", updatePath);

  domainPicker.addEventListener("change", (e) => {
    currentDomain = e.target.value;
    fetchDomainAndProgress();
  });

  document
    .getElementById("btn-close-modal")
    .addEventListener("click", closeModal);

  btnCompleteStep.addEventListener("click", () => {
    if (activeCertNode) {
      markCertCompleted(getCertId(activeCertNode));
    }
  });

  toggleAudioBtn.addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    toggleAudioBtn.innerText = sfx.enabled ? "🔊 Sound: ON" : "🔇 Sound: OFF";
  });

  // Pure Keyboard Flight Controls
  window.addEventListener("keydown", (e) => {
    sfx.init();

    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    ) {
      e.preventDefault();
    }

    const speed = 2.5;
    let moved = false;
    const key = e.key.toLowerCase();

    if (key === "arrowup" || key === "w") {
      targetPos.y = Math.max(8, targetPos.y - speed);
      moved = true;
    }
    if (key === "arrowdown" || key === "s") {
      targetPos.y = Math.min(88, targetPos.y + speed);
      moved = true;
    }
    if (key === "arrowleft" || key === "a") {
      targetPos.x = Math.max(5, targetPos.x - speed);
      moved = true;
    }
    if (key === "arrowright" || key === "d") {
      targetPos.x = Math.min(95, targetPos.x + speed);
      moved = true;
    }

    if (moved) sfx.playMove();
  });
}

// Init Application
function init() {
  window.focus();
  userIdDisplay.innerText = `User ID: ${CURRENT_USER_ID}`;
  setupEventListeners();
  fetchDomainAndProgress();
  requestAnimationFrame(gameLoop);
}

init();
