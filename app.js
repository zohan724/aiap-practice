const QUESTION_BANK_CACHE_KEY = "aiap-question-bank-v5";
const CONTACT_EMAIL = "zohan.eth@gmail.com";

const state = {
  questions: [],
  filtered: [],
  poolCount: 0,
  examPool: [],
  index: 0,
  mode: getInitialMode(),
  activeSetIds: null,
  examSession: loadJson("aiap-exam-session", null),
  examResult: null,
  timerId: null,
  progress: loadJson("aiap-progress", {}),
  saved: new Set(loadJson("aiap-saved", [])),
  unsure: new Set(loadJson("aiap-unsure", [])),
};

const els = {
  appShell: document.querySelector("#appShell"),
  homePanel: document.querySelector("#homePanel"),
  statsGrid: document.querySelector("#statsGrid"),
  filtersPanel: document.querySelector("#filtersPanel"),
  loadingState: document.querySelector("#loadingState"),
  examBar: document.querySelector("#examBar"),
  examTimer: document.querySelector("#examTimer"),
  examAnswered: document.querySelector("#examAnswered"),
  examMarked: document.querySelector("#examMarked"),
  submitExam: document.querySelector("#submitExam"),
  submitExamSide: document.querySelector("#submitExamSide"),
  examControlPanel: document.querySelector("#examControlPanel"),
  examStatusPanel: document.querySelector("#examStatusPanel"),
  examSideAnswered: document.querySelector("#examSideAnswered"),
  examSideTimer: document.querySelector("#examSideTimer"),
  examStartPanel: document.querySelector("#examStartPanel"),
  examStartDuration: document.querySelector("#examStartDuration"),
  examStartCount: document.querySelector("#examStartCount"),
  startExam: document.querySelector("#startExam"),
  emptyState: document.querySelector("#emptyState"),
  resultPanel: document.querySelector("#resultPanel"),
  resultSummary: document.querySelector("#resultSummary"),
  resultScore: document.querySelector("#resultScore"),
  subjectBreakdown: document.querySelector("#subjectBreakdown"),
  topicBreakdown: document.querySelector("#topicBreakdown"),
  reviewExamWrong: document.querySelector("#reviewExamWrong"),
  retakeExam: document.querySelector("#retakeExam"),
  questionCard: document.querySelector("#questionCard"),
  questionPosition: document.querySelector("#questionPosition"),
  questionSource: document.querySelector("#questionSource"),
  questionText: document.querySelector("#questionText"),
  optionsList: document.querySelector("#optionsList"),
  answerPanel: document.querySelector("#answerPanel"),
  answerResult: document.querySelector("#answerResult"),
  correctAnswer: document.querySelector("#correctAnswer"),
  answerHint: document.querySelector("#answerHint"),
  saveQuestion: document.querySelector("#saveQuestion"),
  revealAnswer: document.querySelector("#revealAnswer"),
  prevQuestion: document.querySelector("#prevQuestion"),
  nextQuestion: document.querySelector("#nextQuestion"),
  markUnsure: document.querySelector("#markUnsure"),
  randomQuestion: document.querySelector("#randomQuestion"),
  restartSet: document.querySelector("#restartSet"),
  practiceSizeField: document.querySelector("#practiceSizeField"),
  customPracticeSize: document.querySelector("#customPracticeSize"),
  clearFilters: document.querySelector("#clearFilters"),
  searchInput: document.querySelector("#searchInput"),
  resetProgress: document.querySelector("#resetProgress"),
  reviewWrong: document.querySelector("#reviewWrong"),
  reviewList: document.querySelector("#reviewList"),
  questionPalettePanel: document.querySelector("#questionPalettePanel"),
  questionPalette: document.querySelector("#questionPalette"),
  sourceLinks: document.querySelector("#sourceLinks"),
  exportBackup: document.querySelector("#exportBackup"),
  importBackup: document.querySelector("#importBackup"),
  backupStatus: document.querySelector("#backupStatus"),
  contactLink: document.querySelector("#contactLink"),
  homeContactLink: document.querySelector("#homeContactLink"),
  statTotal: document.querySelector("#statTotal"),
  statAnswered: document.querySelector("#statAnswered"),
  statAccuracy: document.querySelector("#statAccuracy"),
  statWrong: document.querySelector("#statWrong"),
  statSaved: document.querySelector("#statSaved"),
  ringAccuracy: document.querySelector("#ringAccuracy"),
  progressArc: document.querySelector("#progressArc"),
  currentSetCount: document.querySelector("#currentSetCount"),
  doneCount: document.querySelector("#doneCount"),
  unsureCount: document.querySelector("#unsureCount"),
};

init();

async function init() {
  renderSources();
  renderContactLink();
  syncModeTabs();
  wireEvents();

  try {
    state.questions = await loadQuestionBank();
  } catch (error) {
    console.error(error);
    els.loadingState.innerHTML = `
      <h2>PDF 題庫解析失敗</h2>
      <p>請確認網路可載入 PDF.js CDN，或重新啟動本機伺服器後再試。</p>
    `;
    return;
  }

  applyFilters();
}

function getInitialMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["home", "practice", "generated", "exam", "wrong", "saved", "unsure"].includes(mode) ? mode : "home";
}

function syncModeTabs() {
  document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-active", item.dataset.mode === state.mode));
  const isExamMode = state.mode === "exam";
  const isHomeMode = state.mode === "home";
  els.appShell.classList.toggle("is-exam-mode", isExamMode);
  els.appShell.classList.toggle("is-home-mode", isHomeMode);
  els.homePanel.hidden = !isHomeMode;
  els.statsGrid.hidden = isExamMode || isHomeMode;
  els.filtersPanel.hidden = isExamMode || isHomeMode;
  document.querySelector(".workspace").hidden = isHomeMode;
  els.examControlPanel.hidden = !isExamMode;
}

function wireEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      setMode(tab.dataset.mode);
    });
  });

  document.querySelectorAll("[data-start-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.startMode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll("input[name='year'], input[name='subject'], input[name='status']").forEach((input) => {
    input.addEventListener("change", () => {
      state.activeSetIds = null;
      state.examResult = null;
      state.index = 0;
      applyFilters();
    });
  });

  document.querySelectorAll("input[name='practiceSize']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) els.customPracticeSize.value = "";
      state.activeSetIds = null;
      state.examResult = null;
      state.index = 0;
      applyFilters();
    });
  });

  els.customPracticeSize.addEventListener("input", () => {
    if (els.customPracticeSize.value) {
      document.querySelectorAll("input[name='practiceSize']").forEach((input) => {
        input.checked = false;
      });
    }
    state.activeSetIds = null;
    state.examResult = null;
    state.index = 0;
    applyFilters();
  });

  els.searchInput.addEventListener("input", () => {
    state.activeSetIds = null;
    state.examResult = null;
    state.index = 0;
    applyFilters();
  });

  els.clearFilters.addEventListener("click", () => {
    document.querySelectorAll("input[name='year'], input[name='subject']").forEach((input) => {
      input.checked = true;
    });
    document.querySelectorAll("input[name='status']").forEach((input) => {
      input.checked = false;
    });
    document.querySelector("input[name='practiceSize'][value='20']").checked = true;
    els.customPracticeSize.value = "";
    els.searchInput.value = "";
    state.activeSetIds = null;
    state.examResult = null;
    state.index = 0;
    applyFilters();
  });

  els.randomQuestion.addEventListener("click", () => {
    if (state.mode === "exam") clearExamSession();
    state.activeSetIds = null;
    state.examResult = null;
    state.index = 0;
    applyFilters();
  });

  els.restartSet.addEventListener("click", () => {
    state.index = 0;
    render();
  });

  els.prevQuestion.addEventListener("click", () => {
    state.index = Math.max(0, state.index - 1);
    render();
  });

  els.nextQuestion.addEventListener("click", () => {
    state.index = Math.min(state.filtered.length - 1, state.index + 1);
    render();
  });

  els.revealAnswer.addEventListener("click", () => {
    if (state.mode === "exam") return;
    const question = currentQuestion();
    if (!question) return;
    showAnswer(question);
  });

  els.saveQuestion.addEventListener("click", () => {
    if (state.mode === "exam") return;
    const question = currentQuestion();
    if (!question) return;
    toggleSet(state.saved, question.id);
    saveJson("aiap-saved", [...state.saved]);
    render();
  });

  els.markUnsure.addEventListener("click", () => {
    if (state.mode === "exam") return;
    const question = currentQuestion();
    if (!question) return;
    toggleSet(state.unsure, question.id);
    saveJson("aiap-unsure", [...state.unsure]);
    render();
  });

  els.startExam.addEventListener("click", () => {
    startExam();
  });

  els.submitExam.addEventListener("click", () => {
    requestSubmitExam();
  });

  els.submitExamSide.addEventListener("click", () => {
    requestSubmitExam();
  });

  els.retakeExam.addEventListener("click", () => {
    clearExamSession();
    state.examResult = null;
    state.activeSetIds = null;
    state.index = 0;
    state.mode = "exam";
    syncModeTabs();
    applyFilters();
  });

  els.reviewExamWrong.addEventListener("click", () => {
    const wrongIds = (state.examResult?.wrongQuestions ?? []).map((question) => question.id);
    state.mode = "wrong";
    syncModeTabs();
    state.activeSetIds = wrongIds;
    state.index = 0;
    applyFilters();
  });

  els.resetProgress.addEventListener("click", () => {
    if (!confirm("確定清除所有作答紀錄、收藏與不確定標記？")) return;
    state.progress = {};
    state.saved = new Set();
    state.unsure = new Set();
    state.examResult = null;
    clearExamSession();
    saveJson("aiap-progress", state.progress);
    saveJson("aiap-saved", []);
    saveJson("aiap-unsure", []);
    render();
  });

  els.reviewWrong.addEventListener("click", () => {
    state.mode = "wrong";
    syncModeTabs();
    state.activeSetIds = null;
    state.examResult = null;
    state.index = 0;
    applyFilters();
  });

  els.exportBackup.addEventListener("click", exportBackup);

  els.importBackup.addEventListener("change", (event) => {
    importBackup(event.target.files?.[0]);
    event.target.value = "";
  });
}

function setMode(mode) {
  if (!["home", "practice", "generated", "exam", "wrong", "saved", "unsure"].includes(mode)) return;
  state.mode = mode;
  state.activeSetIds = null;
  state.examResult = null;
  state.index = 0;
  applyFilters();
}

async function loadQuestionBank() {
  const cached = loadJson(QUESTION_BANK_CACHE_KEY, null);
  if (cached?.length) return cached;

  const [pastResponse, generatedResponse] = await Promise.all([fetch("./public/questions.json"), fetch("./public/generated-questions.json")]);
  if (!pastResponse.ok || !generatedResponse.ok) throw new Error("Question bank JSON failed to load");
  const pastQuestions = await pastResponse.json();
  const generatedQuestions = await generatedResponse.json();
  const questions = [
    ...pastQuestions.map((question) => ({ ...question, sourceType: question.sourceType ?? "past" })),
    ...generatedQuestions,
  ];
  saveJson(QUESTION_BANK_CACHE_KEY, questions);
  return questions;
}

function applyFilters() {
  if (state.mode === "home") {
    state.filtered = [];
    state.poolCount = 0;
    render();
    return;
  }

  const years = checkedValues("year");
  const subjects = checkedValues("subject");
  const statuses = checkedValues("status");
  const query = els.searchInput.value.trim().toLowerCase();

  let filtered = state.questions.filter((question) => subjects.includes(question.subject));

  if (state.mode === "generated") {
    filtered = filtered.filter((question) => question.sourceType === "generated");
  } else {
    filtered = filtered.filter((question) => question.sourceType !== "generated" && years.includes(question.year));
  }

  if (query) {
    filtered = filtered.filter((question) => {
      const haystack = `${question.text} ${Object.values(question.options).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  if (state.mode === "wrong") {
    filtered = filtered.filter((question) => state.progress[question.id]?.isCorrect === false);
  } else if (state.mode === "saved") {
    filtered = filtered.filter((question) => state.saved.has(question.id));
  } else if (state.mode === "unsure") {
    filtered = filtered.filter((question) => state.unsure.has(question.id));
  } else if (state.mode === "exam") {
    state.poolCount = filtered.length;
    state.examPool = filtered;
    if (isExamInProgress()) {
      filtered = restoreExamSet();
    } else {
      filtered = [];
    }
  } else {
    if (statuses.includes("unanswered")) {
      filtered = filtered.filter((question) => !state.progress[question.id]);
    }
    if (statuses.includes("wrong")) {
      filtered = filtered.filter((question) => state.progress[question.id]?.isCorrect === false);
    }
    if (statuses.includes("saved")) {
      filtered = filtered.filter((question) => state.saved.has(question.id));
    }
    state.poolCount = filtered.length;
    filtered = buildPracticeSet(filtered);
  }

  if (state.mode === "wrong" || state.mode === "saved" || state.mode === "unsure") {
    if (state.activeSetIds?.length) {
      const ids = new Set(state.activeSetIds);
      filtered = filtered.filter((question) => ids.has(question.id));
    }
    if (statuses.includes("unanswered")) {
      filtered = filtered.filter((question) => !state.progress[question.id]);
    }
    if (statuses.includes("wrong")) {
      filtered = filtered.filter((question) => state.progress[question.id]?.isCorrect === false);
    }
    if (statuses.includes("saved")) {
      filtered = filtered.filter((question) => state.saved.has(question.id));
    }
    state.poolCount = filtered.length;
  }

  state.filtered = filtered;
  state.index = Math.min(state.index, Math.max(0, filtered.length - 1));
  render();
}

function buildPracticeSet(questions) {
  const size = getPracticeSize(questions.length);
  if (size >= questions.length) return sortBySource(questions);
  return buildStableRandomSet(questions, size);
}

function buildExamSet(questions, subjects) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const expectedSize = subjects.reduce((total, subject) => {
    const count = questions.filter((question) => question.subject === subject).length;
    return total + Math.min(50, count);
  }, 0);

  if (state.activeSetIds?.length === expectedSize && state.activeSetIds.every((id) => byId.has(id))) {
    return state.activeSetIds.map((id) => byId.get(id));
  }

  const selected = subjects.flatMap((subject) => {
    const pool = questions.filter((question) => question.subject === subject);
    return shuffle(pool).slice(0, 50);
  });
  state.activeSetIds = selected.map((question) => question.id);
  return selected;
}

function startExam() {
  const subjects = checkedValues("subject");
  state.activeSetIds = null;
  state.examResult = null;
  const selected = buildExamSet(state.examPool, subjects);
  if (!selected.length) return;
  state.examSession = {
    ids: selected.map((question) => question.id),
    answers: {},
    startedAt: Date.now(),
    durationSeconds: getExamDurationSeconds(selected.length),
    submittedAt: null,
  };
  saveJson("aiap-exam-session", state.examSession);
  state.filtered = selected;
  state.index = 0;
  render();
}

function restoreExamSet() {
  const byId = new Map(state.questions.map((question) => [question.id, question]));
  return (state.examSession?.ids ?? []).map((id) => byId.get(id)).filter(Boolean);
}

function isExamInProgress() {
  return state.mode === "exam" && Boolean(state.examSession?.startedAt) && Boolean(state.examSession?.answers) && !state.examSession?.submittedAt && !state.examResult;
}

function getActiveExamQuestions() {
  if (state.filtered.length) return state.filtered;
  if (!isExamInProgress()) return [];
  const restored = restoreExamSet();
  if (restored.length) state.filtered = restored;
  return restored;
}

function requestSubmitExam() {
  const examQuestions = getActiveExamQuestions();
  if (!examQuestions.length) {
    alert("目前沒有可交卷的模擬考題組，請重新開始模擬考。");
    clearExamSession();
    state.examResult = null;
    state.activeSetIds = null;
    state.index = 0;
    applyFilters();
    return;
  }
  if (confirm("確定要交卷並查看成績？")) submitExam(false, examQuestions);
}

function clearExamSession() {
  state.examSession = null;
  saveJson("aiap-exam-session", null);
}

function getExamDurationSeconds(questionCount) {
  return Math.max(30 * 60, Math.ceil(questionCount * 72));
}

function buildStableRandomSet(questions, size) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  if (state.activeSetIds?.length === size && state.activeSetIds.every((id) => byId.has(id))) {
    return state.activeSetIds.map((id) => byId.get(id));
  }
  const selected = shuffle(questions).slice(0, size);
  state.activeSetIds = selected.map((question) => question.id);
  return selected;
}

function getPracticeSize(max) {
  const custom = Number(els.customPracticeSize.value);
  if (Number.isFinite(custom) && custom > 0) return Math.min(Math.floor(custom), max);
  const selected = document.querySelector("input[name='practiceSize']:checked")?.value ?? "20";
  if (selected === "all") return max;
  return Math.min(Number(selected), max);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sortBySource(questions) {
  return [...questions].sort((a, b) => a.year.localeCompare(b.year) || a.subject.localeCompare(b.subject) || a.number - b.number);
}

function render() {
  els.loadingState.hidden = true;
  renderModeControls();
  renderStats();
  renderReviewList();
  renderQuestionPalette();
  renderExamBar();
  renderExamStartPanel();

  if (state.examResult) {
    els.emptyState.hidden = true;
    els.examStartPanel.hidden = true;
    els.questionCard.hidden = true;
    els.resultPanel.hidden = false;
    renderResultPanel();
    return;
  }

  els.resultPanel.hidden = true;

  if (state.mode === "exam" && !isExamInProgress()) {
    els.questionCard.hidden = true;
    els.emptyState.hidden = state.poolCount > 0;
    return;
  }

  if (!state.filtered.length) {
    els.questionCard.hidden = true;
    els.emptyState.hidden = false;
    return;
  }

  els.examStartPanel.hidden = true;
  els.emptyState.hidden = true;
  els.questionCard.hidden = false;

  const question = currentQuestion();
  const record = getQuestionRecord(question);
  const isExam = state.mode === "exam";
  els.questionPosition.textContent = `題目 ${state.index + 1} / ${state.filtered.length}`;
  els.questionSource.textContent = isExam ? "模擬考作答中" : `${question.sourceLabel}｜第 ${question.number} 題｜${getQuestionTopic(question).name}`;
  els.questionText.textContent = question.text;
  els.saveQuestion.textContent = state.saved.has(question.id) ? "★" : "☆";
  els.markUnsure.textContent = state.unsure.has(question.id) ? "取消不確定" : "標記不確定";
  els.saveQuestion.hidden = isExam;
  els.revealAnswer.hidden = isExam;
  els.markUnsure.hidden = isExam;
  els.prevQuestion.disabled = state.index === 0;
  els.nextQuestion.disabled = state.index === state.filtered.length - 1;

  els.optionsList.innerHTML = "";
  ["A", "B", "C", "D"].forEach((key) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.innerHTML = `<span class="option-key">${key}</span><span class="option-text">${question.options[key] ?? ""}</span>`;
    if (record?.selected === key) button.classList.add("is-selected");
    if (record && !isExam) {
      if (key === question.answer) button.classList.add("is-correct");
      if (record.selected === key && key !== question.answer) button.classList.add("is-wrong");
    }
    button.addEventListener("click", () => answerQuestion(question, key));
    els.optionsList.appendChild(button);
  });

  if (record && !isExam) {
    showAnswer(question);
  } else {
    els.answerPanel.hidden = true;
  }
}

function renderModeControls() {
  syncModeTabs();
  els.practiceSizeField.hidden = !(state.mode === "practice" || state.mode === "generated");
  els.questionPalettePanel.hidden = !(isExamInProgress() || state.filtered.length > 1);
  els.examStatusPanel.hidden = !isExamInProgress();
  const lockFilters = isExamInProgress();
  document.querySelectorAll("input[name='year'], input[name='subject'], input[name='status'], input[name='practiceSize']").forEach((input) => {
    input.disabled = lockFilters;
  });
  els.customPracticeSize.disabled = lockFilters;
  els.searchInput.disabled = lockFilters;
  els.clearFilters.disabled = lockFilters;
  if (state.mode === "exam") {
    els.randomQuestion.textContent = isExamInProgress() ? "重新開始模擬考" : "重新設定模擬考";
  } else if (state.mode === "generated") {
    els.randomQuestion.textContent = "產生自創題組";
  } else if (state.mode === "practice") {
    els.randomQuestion.textContent = "產生隨機題組";
  } else if (state.mode === "unsure") {
    els.randomQuestion.textContent = "整理不確定題";
  } else {
    els.randomQuestion.textContent = "重新整理題組";
  }
}

function renderExamStartPanel() {
  const shouldShow = state.mode === "exam" && !state.examResult && !isExamInProgress() && state.poolCount > 0;
  els.examStartPanel.hidden = !shouldShow;
  if (!shouldShow) return;
  const subjects = checkedValues("subject");
  const expectedCount = subjects.reduce((total, subject) => {
    const count = state.examPool.filter((question) => question.subject === subject).length;
    return total + Math.min(50, count);
  }, 0);
  els.examStartCount.textContent = `${expectedCount} 題`;
  els.examStartDuration.textContent = formatSeconds(getExamDurationSeconds(expectedCount));
}

function renderExamBar() {
  els.examBar.hidden = !isExamInProgress();
  if (!isExamInProgress()) {
    stopTimer();
    return;
  }
  updateExamTimer();
  if (!state.timerId) state.timerId = window.setInterval(updateExamTimer, 1000);
  const answered = state.filtered.filter((question) => getQuestionRecord(question)).length;
  els.examAnswered.textContent = `${answered} / ${state.filtered.length}`;
  els.examSideAnswered.textContent = `${answered} / ${state.filtered.length}`;
  els.examMarked.textContent = "關閉";
}

function updateExamTimer() {
  if (!state.examSession) return;
  const elapsedSeconds = Math.floor((Date.now() - state.examSession.startedAt) / 1000);
  const remaining = Math.max(0, state.examSession.durationSeconds - elapsedSeconds);
  const formatted = formatSeconds(remaining);
  els.examTimer.textContent = formatted;
  els.examSideTimer.textContent = formatted;
  if (remaining === 0 && state.mode === "exam" && !state.examResult) submitExam(true);
}

function stopTimer() {
  if (!state.timerId) return;
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function renderQuestionPalette() {
  els.questionPalette.innerHTML = "";
  if (!(state.mode === "exam" || state.filtered.length > 1)) return;
  state.filtered.forEach((question, index) => {
    const record = getQuestionRecord(question);
    const button = document.createElement("button");
    button.className = "palette-button";
    button.type = "button";
    button.textContent = index + 1;
    button.classList.toggle("is-current", index === state.index && !state.examResult);
    button.classList.toggle("is-answered", Boolean(record));
    button.classList.toggle("is-marked", state.mode !== "exam" && state.unsure.has(question.id));
    button.classList.toggle("is-wrong", record?.isCorrect === false && state.mode !== "exam");
    button.addEventListener("click", () => {
      state.examResult = null;
      state.index = index;
      render();
    });
    els.questionPalette.appendChild(button);
  });
}

function renderStats() {
  const statsPool = getStatsPool();
  const answered = statsPool.filter((question) => state.progress[question.id]);
  const correct = answered.filter((question) => state.progress[question.id].isCorrect);
  const wrong = answered.length - correct.length;
  const accuracy = answered.length ? Math.round((correct.length / answered.length) * 100) : 0;
  const setDone = state.filtered.filter((question) => getQuestionRecord(question)).length;

  els.statTotal.textContent = state.questions.length ? statsPool.length : "--";
  els.statAnswered.textContent = answered.length;
  els.statAccuracy.textContent = answered.length ? `${accuracy}%` : "--";
  els.statWrong.textContent = wrong;
  els.statSaved.textContent = statsPool.filter((question) => state.saved.has(question.id)).length;
  els.ringAccuracy.textContent = answered.length ? `${accuracy}%` : "--";
  els.currentSetCount.textContent = `${state.filtered.length} 題`;
  els.doneCount.textContent = `${setDone} 題`;
  els.unsureCount.textContent = `${statsPool.filter((question) => state.unsure.has(question.id)).length} 題`;

  const circumference = 301.59;
  els.progressArc.style.strokeDashoffset = String(circumference - (circumference * accuracy) / 100);
}

function getStatsPool() {
  if (state.mode === "generated") return state.questions.filter((question) => question.sourceType === "generated");
  if (state.mode === "wrong" || state.mode === "saved" || state.mode === "unsure") return state.filtered;
  if (state.mode === "exam") return state.filtered;

  const years = checkedValues("year");
  const subjects = checkedValues("subject");
  const statuses = checkedValues("status");
  const query = els.searchInput.value.trim().toLowerCase();
  let pool = state.questions.filter((question) => question.sourceType !== "generated" && years.includes(question.year) && subjects.includes(question.subject));
  if (query) {
    pool = pool.filter((question) => {
      const haystack = `${question.text} ${Object.values(question.options).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  if (statuses.includes("unanswered")) pool = pool.filter((question) => !state.progress[question.id]);
  if (statuses.includes("wrong")) pool = pool.filter((question) => state.progress[question.id]?.isCorrect === false);
  if (statuses.includes("saved")) pool = pool.filter((question) => state.saved.has(question.id));
  return pool;
}

function renderReviewList() {
  const wrong = state.questions
    .filter((question) => state.progress[question.id]?.isCorrect === false)
    .slice(-5)
    .reverse();
  const items = wrong.length ? wrong : state.questions.filter((question) => state.unsure.has(question.id)).slice(0, 5);

  els.reviewList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "source-note";
    empty.textContent = "尚無錯題或不確定題目。";
    els.reviewList.appendChild(empty);
    return;
  }

  items.forEach((question) => {
    const button = document.createElement("button");
    button.className = "review-item";
    button.type = "button";
    button.innerHTML = `<strong>${question.sourceLabel}｜第 ${question.number} 題</strong><span>${question.text}</span>`;
    button.addEventListener("click", () => {
      state.mode = "practice";
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-active", item.dataset.mode === "practice"));
      applyFilters();
      const nextIndex = state.filtered.findIndex((item) => item.id === question.id);
      if (nextIndex >= 0) {
        state.index = nextIndex;
        render();
      }
    });
    els.reviewList.appendChild(button);
  });
}

function renderSources() {
  els.sourceLinks.innerHTML = "";
  const link = document.createElement("a");
  link.className = "source-link";
  link.href = "https://www.ipas.org.tw/AIAP";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.innerHTML = `<span>iPAS AI 應用規劃師</span><span aria-hidden="true">↗</span>`;
  els.sourceLinks.appendChild(link);
}

function renderContactLink() {
  const subject = encodeURIComponent("AI 合作交流");
  const body = encodeURIComponent("您好，我想聊聊 AI 相關合作或交流：\n\n單位/身分：\n想討論的方向：\n聯絡方式：");
  const href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  els.contactLink.href = href;
  els.homeContactLink.href = href;
}

function exportBackup() {
  const payload = {
    app: "aiap-practice",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: state.progress,
    saved: [...state.saved],
    unsure: [...state.unsure],
    examSession: state.examSession,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `aiap-practice-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(els.backupStatus, "已匯出本機練習備份。", "success");
}

async function importBackup(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup?.app !== "aiap-practice" || backup?.version !== 1) {
      throw new Error("backup format mismatch");
    }
    if (!confirm("匯入備份會覆蓋目前這台裝置的練習紀錄，確定匯入？")) return;

    state.progress = backup.progress && typeof backup.progress === "object" ? backup.progress : {};
    state.saved = new Set(Array.isArray(backup.saved) ? backup.saved : []);
    state.unsure = new Set(Array.isArray(backup.unsure) ? backup.unsure : []);
    state.examSession = backup.examSession ?? null;
    state.examResult = null;
    state.activeSetIds = null;
    state.index = 0;

    saveJson("aiap-progress", state.progress);
    saveJson("aiap-saved", [...state.saved]);
    saveJson("aiap-unsure", [...state.unsure]);
    saveJson("aiap-exam-session", state.examSession);
    setStatus(els.backupStatus, "已匯入備份，練習紀錄已更新。", "success");
    applyFilters();
  } catch {
    setStatus(els.backupStatus, "備份檔格式不正確，請選擇本站匯出的 JSON 檔。", "error");
  }
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.toggle("is-success", type === "success");
  element.classList.toggle("is-error", type === "error");
}

function answerQuestion(question, selected) {
  if (state.mode === "exam") {
    state.examSession = {
      ...(state.examSession ?? {}),
      answers: {
        ...(state.examSession?.answers ?? {}),
        [question.id]: {
          selected,
          isCorrect: selected === question.answer,
          answeredAt: new Date().toISOString(),
        },
      },
    };
    saveJson("aiap-exam-session", state.examSession);
    render();
    return;
  }

  state.progress[question.id] = {
    selected,
    isCorrect: selected === question.answer,
    answeredAt: new Date().toISOString(),
  };
  saveJson("aiap-progress", state.progress);
  if (state.mode === "wrong" && selected === question.answer) {
    state.activeSetIds = state.activeSetIds?.filter((id) => id !== question.id) ?? null;
    state.index = Math.max(0, Math.min(state.index, state.filtered.length - 2));
    applyFilters();
    return;
  }
  render();
}

function submitExam(isAutoSubmit = false, examQuestions = getActiveExamQuestions()) {
  if (!examQuestions.length) {
    clearExamSession();
    state.examResult = null;
    state.activeSetIds = null;
    state.index = 0;
    if (!isAutoSubmit) alert("模擬考題組已遺失，請重新開始模擬考。");
    applyFilters();
    return;
  }
  stopTimer();
  const submittedAt = Date.now();
  const examAnswers = state.examSession?.answers ?? {};
  state.examSession = {
    ...(state.examSession ?? {}),
    ids: examQuestions.map((question) => question.id),
    answers: examAnswers,
    submittedAt,
  };
  saveJson("aiap-exam-session", state.examSession);
  examQuestions.forEach((question) => {
    if (examAnswers[question.id]) state.progress[question.id] = examAnswers[question.id];
  });
  saveJson("aiap-progress", state.progress);
  state.filtered = examQuestions;
  state.examResult = buildResult(examQuestions, submittedAt, examAnswers);
  if (isAutoSubmit) alert("時間到，系統已自動交卷。");
  render();
}

function getQuestionRecord(question) {
  if (state.mode === "exam") return state.examSession?.answers?.[question.id];
  return state.progress[question.id];
}

function buildResult(questions, submittedAt, answers = state.progress) {
  const answered = questions.filter((question) => answers[question.id]);
  const correct = questions.filter((question) => answers[question.id]?.isCorrect);
  const wrongQuestions = questions.filter((question) => answers[question.id]?.isCorrect === false);
  const unansweredQuestions = questions.filter((question) => !answers[question.id]);
  const elapsedSeconds = state.examSession?.startedAt ? Math.floor((submittedAt - state.examSession.startedAt) / 1000) : 0;
  return {
    total: questions.length,
    answered: answered.length,
    correct: correct.length,
    wrong: wrongQuestions.length,
    unanswered: unansweredQuestions.length,
    elapsedSeconds,
    wrongQuestions,
    subjectStats: buildGroupedStats(questions, (question) => question.subjectName, answers),
    topicStats: buildGroupedStats(questions, (question) => getQuestionTopic(question).name, answers),
  };
}

function buildGroupedStats(questions, getKey, answers = state.progress) {
  const groups = new Map();
  questions.forEach((question) => {
    const key = getKey(question);
    if (!groups.has(key)) groups.set(key, { name: key, total: 0, answered: 0, correct: 0, wrong: 0 });
    const group = groups.get(key);
    const record = answers[question.id];
    group.total += 1;
    if (record) group.answered += 1;
    if (record?.isCorrect) group.correct += 1;
    if (record?.isCorrect === false) group.wrong += 1;
  });
  return [...groups.values()].sort((a, b) => getAccuracy(a) - getAccuracy(b));
}

function renderResultPanel() {
  const result = state.examResult;
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  els.resultScore.textContent = `${accuracy}%`;
  els.resultSummary.textContent = `答對 ${result.correct} / ${result.total} 題，未作答 ${result.unanswered} 題，用時 ${formatSeconds(result.elapsedSeconds)}。`;

  els.subjectBreakdown.innerHTML = result.subjectStats.map(renderBreakdownCard).join("");
  els.topicBreakdown.innerHTML = `
    <h3>考點弱點排序</h3>
    ${result.topicStats.map(renderTopicCard).join("")}
  `;
  els.reviewExamWrong.disabled = result.wrongQuestions.length === 0;
}

function renderBreakdownCard(item) {
  const accuracy = getAccuracy(item);
  return `
    <article class="breakdown-card">
      <strong>${item.name}</strong>
      <span>答對 ${item.correct} / ${item.total} 題，錯 ${item.wrong} 題，未作答 ${item.total - item.answered} 題</span>
      <div class="meter"><i style="width:${accuracy}%"></i></div>
    </article>
  `;
}

function renderTopicCard(item) {
  const accuracy = getAccuracy(item);
  return `
    <article class="topic-card">
      <strong>${item.name}</strong>
      <span>正確率 ${accuracy}% · ${item.correct}/${item.total} 題</span>
      <div class="meter"><i style="width:${accuracy}%"></i></div>
    </article>
  `;
}

function getAccuracy(item) {
  return item.total ? Math.round((item.correct / item.total) * 100) : 0;
}

function showAnswer(question) {
  const record = state.progress[question.id];
  const topic = getQuestionTopic(question);
  els.answerPanel.hidden = false;
  els.answerResult.textContent = record ? (record.isCorrect ? "答對了" : "需要複習") : "正確答案";
  els.correctAnswer.textContent = `正確答案：${question.answer}`;
  els.answerHint.innerHTML = `
    <strong>考點：</strong>${topic.name}。${topic.explanation}
    <br><strong>檢討方向：</strong>${getReviewAdvice(question, record)}
    <span class="answer-tags"><span>${question.subjectName}</span><span>${topic.name}</span><span>${question.sourceLabel}</span></span>
  `;
}

function getQuestionTopic(question) {
  if (question.topic) {
    return {
      name: question.topic,
      explanation: question.explanation ?? "此題依（初級）學習指引範圍延伸，請回到題幹情境判斷最符合的應用原則。",
    };
  }
  const text = `${question.text} ${Object.values(question.options).join(" ")}`.toLowerCase();
  const topics = [
    {
      name: "生成式 AI 與模型應用",
      keywords: ["生成式", "generative", "prompt", "提示", "rag", "擴散", "diffusion", "gan", "transformer", "token", "llm"],
      explanation: "注意模型能力、輸入輸出限制、應用情境與生成品質控制。",
    },
    {
      name: "機器學習與模型評估",
      keywords: ["機器學習", "訓練", "測試", "分類", "迴歸", "準確率", "偏差", "變異", "overfitting", "正則化", "lasso", "模型"],
      explanation: "先判斷題目在問模型訓練、泛化、評估指標或避免過擬合。",
    },
    {
      name: "資料處理與特徵工程",
      keywords: ["資料", "etl", "特徵", "正規化", "標準化", "one-hot", "編碼", "缺失", "清理", "資料庫"],
      explanation: "抓住資料流程、欄位轉換、資料品質與特徵設計的目的。",
    },
    {
      name: "AI 導入規劃與專案管理",
      keywords: ["導入", "規劃", "需求", "利害關係", "成本", "風險", "流程", "專案", "系統"],
      explanation: "重點通常在需求釐清、風險控管、效益衡量與導入流程順序。",
    },
    {
      name: "倫理治理與法規",
      keywords: ["倫理", "隱私", "個資", "公平", "偏見", "透明", "治理", "監督", "human", "責任", "法規"],
      explanation: "留意人類監督、可解釋性、隱私保護、偏見與責任歸屬。",
    },
    {
      name: "AI 基礎概念",
      keywords: ["人工智慧", "深度學習", "神經網路", "知識", "推論", "自動化", "演算法"],
      explanation: "確認名詞定義、技術層級與不同 AI 方法的差異。",
    },
  ];
  return topics.find((topic) => topic.keywords.some((keyword) => text.includes(keyword))) ?? {
    name: question.subject === "1" ? "人工智慧基礎" : "生成式 AI 應用",
    explanation: "先辨識題目核心名詞，再用情境與選項關鍵字排除不符合者。",
  };
}

function getReviewAdvice(question, record) {
  if (!record) return "先自行作答，再看正確答案與考點說明。";
  if (record.isCorrect) return "保留這題的判斷依據，之後可用快速複習確認是否穩定掌握。";
  const selected = question.options[record.selected] ? `你選了 ${record.selected}，正解是 ${question.answer}` : `正解是 ${question.answer}`;
  return `${selected}。請回到題幹找定義詞、情境條件與否定語，再比較錯誤選項和正確選項的差異。`;
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function currentQuestion() {
  return state.filtered[state.index];
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name='${name}']:checked`)].map((input) => input.value);
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to save ${key}`, error);
    return false;
  }
}
