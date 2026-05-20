/* ═══════════════════════════════════════════════════════════
   KeyForge — Typing Speed Test
   Uses api.datamuse.com (free, no key, CORS-enabled)
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   1. FALLBACK WORD BANKS (used if API is unavailable)
   ─────────────────────────────────────────────────────────────── */
const FALLBACK = {
  easy: ["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use", "run", "sun", "cat", "dog", "hat", "sit", "hot", "cup", "bed", "red", "box", "log", "map", "tap", "top", "eat", "fly", "job", "key"],
  medium: ["about", "above", "after", "again", "along", "apply", "basic", "below", "bring", "carry", "cause", "clean", "clear", "close", "could", "cover", "dance", "doing", "early", "enter", "every", "first", "focus", "force", "found", "given", "going", "great", "group", "happy", "heart", "heavy", "house", "human", "image", "issue", "large", "later", "light", "lucky", "major", "means", "might", "model", "money", "month", "music", "never", "night", "other"],
  hard: ["algorithm", "approximately", "authentication", "automatically", "bandwidth", "calibration", "compression", "configuration", "consequence", "cryptography", "debugging", "dependency", "distributed", "documentation", "efficiency", "encryption", "environment", "evaluation", "execution", "filesystem", "flexibility", "framework", "implementation", "infrastructure", "initialization", "integration", "interpolation", "iteration", "maintenance", "manipulation"],
};

/* ─────────────────────────────────────────────────────────────
   2. DATAMUSE API WORD FETCHER
   ─────────────────────────────────────────────────────────────
   api.datamuse.com/words — free, no key, CORS enabled
   We query by word length using min/max char filters.
   Each difficulty maps to a different length range + topic.
   ─────────────────────────────────────────────────────────────── */
const WordAPI = (() => {
  // Cache fetched words per difficulty so we don't hammer the API
  const cache = { easy: [], medium: [], hard: [] };

  /**
   * API config per difficulty:
   *  - sp: spelling pattern — "????" = exactly 4 chars, "?????" = 5, etc.
   *    We use wildcard patterns like "??" to "????" for easy, etc.
   *  - topics: Datamuse topic hints to get common/real English words
   *  - max: how many results to request (API max = 1000)
   */
  const CONFIG = {
    easy: {
      // Words 2–4 characters, common everyday words
      endpoints: ["https://api.datamuse.com/words?sp=???&topics=common&max=200", "https://api.datamuse.com/words?sp=????&topics=common&max=300"],
      label: "datamuse · easy (2–4 chars)",
    },
    medium: {
      // Words 5–7 characters
      endpoints: ["https://api.datamuse.com/words?sp=?????&max=300", "https://api.datamuse.com/words?sp=??????&max=300", "https://api.datamuse.com/words?sp=???????&max=200"],
      label: "datamuse · medium (5–7 chars)",
    },
    hard: {
      // Words 8–14 characters
      endpoints: ["https://api.datamuse.com/words?sp=????????&max=200", "https://api.datamuse.com/words?sp=??????????&max=200", "https://api.datamuse.com/words?sp=????????????&max=150"],
      label: "datamuse · hard (8–12 chars)",
    },
  };

  /**
   * fetchForDifficulty — fetches all endpoints for a difficulty in parallel,
   * merges results, filters to only lowercase alpha words (no garbage),
   * deduplicates, and caches.
   */
  async function fetchForDifficulty(diff) {
    const cfg = CONFIG[diff];
    const promises = cfg.endpoints.map((url) =>
      fetch(url)
        .then((r) => r.json())
        .catch(() => []),
    );

    const results = await Promise.all(promises);
    const merged = results.flat();

    // Filter: only clean lowercase alphabetic words
    const clean = merged.map((item) => item.word.toLowerCase().trim()).filter((w) => /^[a-z]+$/.test(w) && w.length >= 2);

    // Deduplicate
    const unique = [...new Set(clean)];

    if (unique.length < 20) {
      // Too few results — fall back to local bank
      return null;
    }

    cache[diff] = unique;
    return unique;
  }

  /**
   * getWords — returns `count` random words for the difficulty.
   * Uses cache if available, otherwise fetches.
   * Falls back to local FALLBACK bank on any error.
   */
  async function getWords(diff, count = 80) {
    // Use cache if we have enough words
    if (cache[diff].length >= count) {
      return shuffle(cache[diff]).slice(0, count);
    }

    // Try to fetch
    try {
      const words = await fetchForDifficulty(diff);
      if (words && words.length >= count) {
        return shuffle(words).slice(0, count);
      }
    } catch (_) {
      /* fall through */
    }

    // Fallback to local bank
    return null;
  }

  function getLabel(diff) {
    return CONFIG[diff].label;
  }

  function hasCached(diff) {
    return cache[diff].length > 0;
  }

  return { getWords, getLabel, hasCached };
})();

/* ─────────────────────────────────────────────────────────────
   3. UTILITIES
   ─────────────────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────────────────────────────────────
   4. AUDIO ENGINE (Web Audio API – no external files)
   ─────────────────────────────────────────────────────────────── */
const AudioEngine = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function playClick() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(),
        gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(820, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ac.currentTime + 0.04);
      gain.gain.setValueAtTime(0.06, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.06);
    } catch (_) {}
  }
  function playError() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(),
        gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ac.currentTime);
      gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.12);
    } catch (_) {}
  }
  function playComplete() {
    try {
      const ac = getCtx();
      [523, 659, 784].forEach((freq, i) => {
        const osc = ac.createOscillator(),
          gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ac.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (_) {}
  }
  return { playClick, playError, playComplete };
})();

/* ─────────────────────────────────────────────────────────────
   5. LOCAL STORAGE — Personal Best
   ─────────────────────────────────────────────────────────────── */
const Storage = (() => {
  const KEY = "keyforge_pb";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { wpm: 0, acc: 0 };
    } catch (_) {
      return { wpm: 0, acc: 0 };
    }
  }
  function save(wpm, acc) {
    localStorage.setItem(KEY, JSON.stringify({ wpm, acc }));
  }
  function loadTheme() {
    return localStorage.getItem("keyforge_theme") || "ocean";
  }
  function saveTheme(theme) {
    localStorage.setItem("keyforge_theme", theme);
  }
  return { load, save, loadTheme, saveTheme };
})();

/* ─────────────────────────────────────────────────────────────
   6. GAME STATE
   ─────────────────────────────────────────────────────────────── */
const State = {
  words: [],
  flatText: "",
  charIndex: 0,
  totalKeys: 0,
  correctChars: 0,
  errorCount: 0,
  timerDuration: 30,
  timeLeft: 30,
  timerInterval: null,
  started: false,
  finished: false,
  difficulty: "easy",
  theme: "ocean",
  usingFallback: false,
};

/* ─────────────────────────────────────────────────────────────
   7. DOM REFERENCES
   ─────────────────────────────────────────────────────────────── */
const DOM = {
  wordDisplay: document.getElementById("word-display"),
  hiddenInput: document.getElementById("hidden-input"),
  typingArea: document.getElementById("typing-area"),
  timerDisplay: document.getElementById("timer-display"),
  timerArc: document.getElementById("timer-arc"),
  liveWpm: document.getElementById("live-wpm"),
  liveAcc: document.getElementById("live-acc"),
  liveCorrect: document.getElementById("live-correct"),
  liveErrors: document.getElementById("live-errors"),
  restartBtn: document.getElementById("restart-btn"),
  resultsOverlay: document.getElementById("results-overlay"),
  resultsRestart: document.getElementById("results-restart-btn"),
  finalWpm: document.getElementById("final-wpm"),
  finalAcc: document.getElementById("final-acc"),
  finalCorrect: document.getElementById("final-correct"),
  finalErrors: document.getElementById("final-errors"),
  newPbBanner: document.getElementById("new-pb-banner"),
  pbBadge: document.getElementById("pb-badge"),
  pbWpmDisplay: document.getElementById("pb-wpm-display"),
  timeGroup: document.getElementById("time-group"),
  diffGroup: document.getElementById("diff-group"),
  themeSelect: document.getElementById("theme-select"),
  loadingOverlay: document.getElementById("loading-overlay"),
  loadingText: document.getElementById("loading-text"),
  apiError: document.getElementById("api-error"),
  errorMsg: document.getElementById("error-msg"),
  retryBtn: document.getElementById("retry-btn"),
  sourceLabel: document.getElementById("source-label"),
};

/* ─────────────────────────────────────────────────────────────
   8. UI HELPERS — loading / error states
   ─────────────────────────────────────────────────────────────── */
function showLoading(msg = "fetching words…") {
  DOM.loadingText.textContent = msg;
  DOM.loadingOverlay.classList.remove("hidden");
  DOM.apiError.classList.add("hidden");
}
function hideLoading() {
  DOM.loadingOverlay.classList.add("hidden");
}
function showError(msg) {
  DOM.errorMsg.innerHTML = msg;
  DOM.apiError.classList.remove("hidden");
  DOM.loadingOverlay.classList.add("hidden");
}
function hideError() {
  DOM.apiError.classList.add("hidden");
}
function updateSourceBadge(label) {
  DOM.sourceLabel.textContent = label;
}

/* ─────────────────────────────────────────────────────────────
   9. RENDER
   ─────────────────────────────────────────────────────────────── */
function renderText() {
  DOM.wordDisplay.innerHTML = "";
  for (let i = 0; i < State.flatText.length; i++) {
    const span = document.createElement("span");
    const ch = State.flatText[i];
    span.textContent = ch === " " ? "\u00A0" : ch;
    span.className = "char pending";
    span.dataset.index = i;
    span.dataset.char = ch;
    DOM.wordDisplay.appendChild(span);
  }
  updateCursorVisual();
}

function updateCursorVisual() {
  const prev = DOM.wordDisplay.querySelector(".char.active");
  if (prev) prev.classList.remove("active");
  const current = DOM.wordDisplay.querySelector(`[data-index="${State.charIndex}"]`);
  if (current) {
    current.classList.add("active");
    scrollToActive(current);
  }
}

function scrollToActive(el) {
  const container = DOM.wordDisplay;
  const lineH = parseFloat(getComputedStyle(container).lineHeight) || 38;
  const elTop = el.offsetTop;
  if (elTop >= lineH * 2) {
    const shift = Math.floor(elTop / lineH) * lineH - lineH;
    container.style.transform = `translateY(-${shift}px)`;
  }
}

/* ─────────────────────────────────────────────────────────────
   10. TIMER
   ─────────────────────────────────────────────────────────────── */
const ARC_CIRCUMFERENCE = 2 * Math.PI * 28;

function updateTimerArc() {
  const ratio = State.timeLeft / State.timerDuration;
  DOM.timerArc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - ratio);
  DOM.timerArc.classList.toggle("urgent", ratio <= 0.2);
  DOM.timerDisplay.textContent = State.timeLeft;
}

function startTimer() {
  if (State.timerInterval) return;
  State.started = true;
  State.timerInterval = setInterval(() => {
    State.timeLeft--;
    updateTimerArc();
    if (State.timeLeft <= 0) endGame();
  }, 1000);
}

/* ─────────────────────────────────────────────────────────────
   11. METRICS
   ─────────────────────────────────────────────────────────────── */
function calculateWPM() {
  const elapsed = State.timerDuration - State.timeLeft;
  if (elapsed <= 0) return 0;
  return Math.round(State.correctChars / 5 / (elapsed / 60));
}
function calculateAccuracy() {
  if (State.totalKeys === 0) return 100;
  return Math.round((State.correctChars / State.totalKeys) * 100);
}
function updateLiveStats() {
  DOM.liveWpm.textContent = State.started ? calculateWPM() : "—";
  DOM.liveAcc.textContent = State.started ? calculateAccuracy() + "%" : "—";
  DOM.liveCorrect.textContent = State.correctChars;
  DOM.liveErrors.textContent = State.errorCount;
  DOM.liveWpm.classList.toggle("live", State.started);
}

/* ─────────────────────────────────────────────────────────────
   12. INPUT HANDLING
   ─────────────────────────────────────────────────────────────── */
let typed = [];
function initTyped() {
  typed = new Array(State.flatText.length).fill(null);
}

function onKeyDown(e) {
  if (State.finished) return;
  if (e.key === "Tab") return;
  e.preventDefault();
  if (e.key === "Backspace") {
    handleBackspace();
    return;
  }
  if (e.key.length === 1) processChar(e.key);
}

function processChar(typedChar) {
  const { flatText, charIndex } = State;
  if (charIndex >= flatText.length) return;
  const expected = flatText[charIndex];
  if (!State.started) startTimer();
  State.totalKeys++;
  const span = DOM.wordDisplay.querySelector(`[data-index="${charIndex}"]`);
  if (typedChar === expected) {
    State.correctChars++;
    typed[charIndex] = "correct";
    if (span) {
      span.classList.remove("pending", "error", "space-error", "active");
      span.classList.add("correct");
    }
    AudioEngine.playClick();
  } else {
    State.errorCount++;
    typed[charIndex] = "error";
    if (span) {
      span.classList.remove("pending", "active");
      span.classList.add(expected === " " ? "space-error" : "error");
    }
    AudioEngine.playError();
  }
  State.charIndex++;
  updateCursorVisual();
  updateLiveStats();
  if (State.charIndex >= flatText.length) endGame();
}

function handleBackspace() {
  if (State.charIndex <= 0) return;
  State.charIndex--;
  const wasTyped = typed[State.charIndex];
  if (wasTyped === "correct") State.correctChars = Math.max(0, State.correctChars - 1);
  else if (wasTyped === "error") State.errorCount = Math.max(0, State.errorCount - 1);
  State.totalKeys = Math.max(0, State.totalKeys - 1);
  typed[State.charIndex] = null;
  const span = DOM.wordDisplay.querySelector(`[data-index="${State.charIndex}"]`);
  if (span) {
    span.classList.remove("correct", "error", "space-error");
    span.classList.add("pending");
  }
  updateCursorVisual();
  updateLiveStats();
}

/* ─────────────────────────────────────────────────────────────
   13. GAME LIFECYCLE
   ─────────────────────────────────────────────────────────────── */

/**
 * initGame — async because it fetches words from the API.
 * Shows a loading spinner while waiting, then renders.
 */
async function initGame() {
  // Stop any running timer
  if (State.timerInterval) {
    clearInterval(State.timerInterval);
    State.timerInterval = null;
  }

  // Reset counters
  State.charIndex = 0;
  State.totalKeys = 0;
  State.correctChars = 0;
  State.errorCount = 0;
  State.timeLeft = State.timerDuration;
  State.started = false;
  State.finished = false;
  State.usingFallback = false;

  // Reset UI
  DOM.wordDisplay.style.transform = "";
  DOM.timerArc.classList.remove("urgent");
  DOM.timerArc.style.strokeDashoffset = "0";
  DOM.timerDisplay.textContent = State.timerDuration;
  DOM.liveWpm.textContent = "—";
  DOM.liveAcc.textContent = "—";
  DOM.liveCorrect.textContent = "0";
  DOM.liveErrors.textContent = "0";
  DOM.liveWpm.classList.remove("live");
  DOM.resultsOverlay.classList.remove("show");
  hideError();

  // Show loading if we don't have cached words
  const hasCached = WordAPI.hasCached(State.difficulty);
  if (!hasCached) {
    showLoading(`fetching ${State.difficulty} words…`);
  }

  // Fetch words from API
  const apiWords = await WordAPI.getWords(State.difficulty, 100);
  console.log(apiWords);

  if (apiWords && apiWords.length >= 30) {
    // ✅ API success
    State.words = apiWords;
    State.usingFallback = false;
    updateSourceBadge(WordAPI.getLabel(State.difficulty));
  } else {
    // ⚠️ Fallback to local bank
    const fb = FALLBACK[State.difficulty];
    State.words = shuffle(fb).concat(shuffle(fb)).concat(shuffle(fb)); // repeat to get ~150
    State.usingFallback = true;
    updateSourceBadge("offline · local bank");
  }

  State.flatText = State.words.join(" ");
  initTyped();
  hideLoading();
  hideError();
  renderText();

  // Focus
  DOM.typingArea.classList.add("focused");
  DOM.hiddenInput.focus();
}

function endGame() {
  if (State.finished) return;
  State.finished = true;
  clearInterval(State.timerInterval);
  State.timerInterval = null;
  State.timeLeft = 0;
  updateTimerArc();
  AudioEngine.playComplete();
  showResults();
}

function showResults() {
  const wpm = calculateWPM(),
    acc = calculateAccuracy();
  DOM.finalWpm.textContent = wpm;
  DOM.finalAcc.textContent = acc + "%";
  DOM.finalCorrect.textContent = State.correctChars;
  DOM.finalErrors.textContent = State.errorCount;
  const pb = Storage.load();
  const isNewPb = wpm > pb.wpm;
  if (isNewPb) {
    Storage.save(wpm, acc);
    updatePbBadge(wpm);
  }
  DOM.newPbBanner.classList.toggle("show", isNewPb);
  DOM.resultsOverlay.classList.add("show");
}

/* ─────────────────────────────────────────────────────────────
   14. PERSONAL BEST BADGE
   ─────────────────────────────────────────────────────────────── */
function updatePbBadge(wpm) {
  if (!wpm) {
    const pb = Storage.load();
    if (pb.wpm > 0) {
      DOM.pbBadge.classList.remove("hidden");
      DOM.pbWpmDisplay.textContent = pb.wpm;
    }
    return;
  }
  DOM.pbBadge.classList.remove("hidden");
  DOM.pbWpmDisplay.textContent = wpm;
}

function applyTheme(theme) {
  const validThemes = ["ocean", "solar", "forest", "violet"];
  const safeTheme = validThemes.includes(theme) ? theme : "ocean";
  State.theme = safeTheme;
  document.body.dataset.theme = safeTheme;
  Storage.saveTheme(safeTheme);
  if (DOM.themeSelect) {
    DOM.themeSelect.value = safeTheme;
  }
}

/* ─────────────────────────────────────────────────────────────
   15. EVENT BINDINGS
   ─────────────────────────────────────────────────────────────── */
DOM.hiddenInput.addEventListener("keydown", onKeyDown);

DOM.typingArea.addEventListener("click", () => {
  DOM.typingArea.classList.add("focused");
  DOM.hiddenInput.focus();
});
DOM.hiddenInput.addEventListener("focus", () => DOM.typingArea.classList.add("focused"));
DOM.hiddenInput.addEventListener("blur", () => DOM.typingArea.classList.remove("focused"));

DOM.restartBtn.addEventListener("click", initGame);
DOM.resultsRestart.addEventListener("click", initGame);
DOM.retryBtn.addEventListener("click", initGame);

// Tab + Enter shortcut
let tabHeld = false;
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    tabHeld = true;
  }
  if (e.key === "Enter" && tabHeld) {
    e.preventDefault();
    initGame();
  }
  if (e.key === "Escape") DOM.resultsOverlay.classList.remove("show");
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Tab") tabHeld = false;
});

// Global keydown → redirect to hidden input
document.addEventListener("keydown", (e) => {
  if (State.finished) return;
  const ignore = ["Tab", "Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "CapsLock", "Shift", "Control", "Alt", "Meta", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
  if (ignore.includes(e.key)) return;
  if (document.activeElement !== DOM.hiddenInput) DOM.hiddenInput.focus();
});

// Time selector
DOM.timeGroup.addEventListener("click", (e) => {
  const btn = e.target.closest(".pill-btn");
  if (!btn) return;
  DOM.timeGroup.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  State.timerDuration = parseInt(btn.dataset.time, 10);
  initGame();
});

// Difficulty selector
DOM.diffGroup.addEventListener("click", (e) => {
  const btn = e.target.closest(".pill-btn");
  if (!btn) return;
  DOM.diffGroup.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  State.difficulty = btn.dataset.diff;
  initGame();
});

// Theme selector
DOM.themeSelect.addEventListener("change", (e) => {
  applyTheme(e.target.value);
});

/* ─────────────────────────────────────────────────────────────
   16. BOOT
   ─────────────────────────────────────────────────────────────── */
applyTheme(Storage.loadTheme());
updatePbBadge();
initGame();
