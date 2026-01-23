/* Simulador CGR (Offline) – versión compatible con bancos con ESCENARIO.
   - Sin servidor: abre index.html en el navegador.
   - Importa bancos JSON (questions) y opcionalmente un escenario compartido (scenario).
   - Guarda banco y progreso en localStorage.
*/
(() => {
  "use strict";

  const LS = {
    BANK: "cgr_sim_bank_v2",
    PROGRESS: "cgr_sim_progress_v2"
  };

  const $ = (id) => document.getElementById(id);
  const nowIso = () => new Date().toISOString();

  const safeJsonParse = (text) => {
    try { return { ok: true, value: JSON.parse(text) }; }
    catch (e) { return { ok: false, error: e }; }
  };

  const uniq = (arr) => Array.from(new Set(arr));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const formatMs = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const downloadTextFile = (filename, text) => {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ------------------------
  // Validación de banco
  // ------------------------
  function validateBank(bank) {
    if (!bank || typeof bank !== "object") return { ok: false, error: "El JSON no es un objeto." };
    if (!Array.isArray(bank.questions)) return { ok: false, error: "Falta el arreglo 'questions'." };
    if (!bank.meta || typeof bank.meta !== "object") bank.meta = {};

    // Escenario (opcional)
    if (bank.scenario && typeof bank.scenario === "object") {
      if (typeof bank.scenario.text !== "string") return { ok: false, error: "Si existe 'scenario', debe tener 'text' (string)." };
      if (bank.scenario.title && typeof bank.scenario.title !== "string") return { ok: false, error: "Si existe 'scenario.title', debe ser string." };
    }

    for (const q of bank.questions) {
      if (!q.id || typeof q.id !== "string") return { ok: false, error: "Hay preguntas sin 'id'." };
      if (!q.axis) return { ok: false, error: `La pregunta ${q.id} no tiene 'axis'.` };
      if (!q.question) return { ok: false, error: `La pregunta ${q.id} no tiene 'question'.` };
      if (!Array.isArray(q.choices) || q.choices.length < 2) return { ok: false, error: `La pregunta ${q.id} requiere 'choices' (>=2).` };
      if (!q.answer || typeof q.answer.correctChoiceId !== "string") return { ok: false, error: `La pregunta ${q.id} requiere 'answer.correctChoiceId'.` };
      const ids = q.choices.map(c => c.id);
      if (!ids.includes(q.answer.correctChoiceId)) return { ok: false, error: `La pregunta ${q.id} tiene respuesta correcta que no existe en choices.` };
    }
    return { ok: true, bank };
  }

  function loadBank() {
    const saved = localStorage.getItem(LS.BANK);
    if (saved) {
      const parsed = safeJsonParse(saved);
      if (parsed.ok) {
        const v = validateBank(parsed.value);
        if (v.ok) return v.bank;
      }
    }
    // fallback
    const v = validateBank(window.SAMPLE_BANK);
    return v.ok ? v.bank : { meta: { version: "0" }, questions: [] };
  }

  function saveBank(bank) {
    localStorage.setItem(LS.BANK, JSON.stringify(bank));
  }

  function loadProgress() {
    const saved = localStorage.getItem(LS.PROGRESS);
    if (!saved) return { history: [], last: null };
    const parsed = safeJsonParse(saved);
    return parsed.ok ? parsed.value : { history: [], last: null };
  }

  function saveProgress(progress) {
    localStorage.setItem(LS.PROGRESS, JSON.stringify(progress));
  }

  // ------------------------
  // Estado
  // ------------------------
  let bank = loadBank();
  let progress = loadProgress();

  const state = {
    running: false,
    mode: "practice", // practice | mock
    axisKey: "ALL",
    count: 10,
    useTimer: false,
    minutes: 15,
    startedAt: null,
    endsAt: null,
    timerHandle: null,
    order: [],
    idx: 0,
    answers: {},
    flagged: {},
    reviewOnlyIncorrect: false,
    scenarioSeen: false
  };

  // ------------------------
  // UI
  // ------------------------
  function setVisible(id, visible) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  function buildAxisOptions() {
    const sel = $("selAxis");
    sel.innerHTML = "";

    const axes = bank.questions.map(q => `${q.module || ""}::${q.axis}`);
    const uniqAxes = uniq(axes).sort((a, b) => a.localeCompare(b));

    const optAll = document.createElement("option");
    optAll.value = "ALL";
    optAll.textContent = "Todos los ejes";
    sel.appendChild(optAll);

    for (const key of uniqAxes) {
      const [module, axis] = key.split("::");
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = module ? `${module} • ${axis}` : axis;
      sel.appendChild(opt);
    }

    sel.value = uniqAxes.includes(state.axisKey) ? state.axisKey : "ALL";
  }

  function renderStats() {
    const total = bank.questions.length;
    const meta = bank.meta || {};
    const last = progress.last;

    const lastPct = last && last.total ? Math.round((last.correct / last.total) * 100) : null;
    const hist = progress.history || [];
    let streak = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i];
      const p = h.total ? (h.correct / h.total) : 0;
      if (p >= 0.7) streak++;
      else break;
    }

    $("bankInfo").textContent = `Banco: ${total} preguntas • versión: ${meta.version || "(s/n)"}`;
    $("statsBox").innerHTML = `
      <div class="stat">
        <div class="stat-k">Preguntas</div>
        <div class="stat-v">${total}</div>
      </div>
      <div class="stat">
        <div class="stat-k">Último resultado</div>
        <div class="stat-v">${lastPct === null ? "—" : `${lastPct}%`}</div>
      </div>
      <div class="stat">
        <div class="stat-k">Racha (≥70%)</div>
        <div class="stat-v">${hist.length ? streak : "—"}</div>
      </div>
    `;
  }

  function renderHistory() {
    const hist = (progress.history || []).slice(-8).reverse();
    if (!hist.length) {
      $("historyBox").innerHTML = `<div class="muted small">(sin historial)</div>`;
      return;
    }
    $("historyBox").innerHTML = hist.map(h => {
      const pct = h.total ? Math.round((h.correct / h.total) * 100) : 0;
      const dt = new Date(h.finishedAt || Date.now());
      const label = (h.axisKey && h.axisKey !== "ALL") ? h.axisKey.split("::").pop() : "Todos";
      return `
        <div class="history-item">
          <div><strong>${pct}%</strong> • ${h.correct}/${h.total} • ${h.mode === "mock" ? "Simulacro" : "Entrenamiento"}</div>
          <div class="muted small">${label} • ${dt.toLocaleString()}</div>
        </div>
      `;
    }).join("");
  }

  // ------------------------
  // Lógica del test
  // ------------------------
  function pickQuestions() {
    let pool = bank.questions;
    if (state.axisKey !== "ALL") {
      pool = pool.filter(q => `${q.module || ""}::${q.axis}` === state.axisKey);
    }

    if (state.reviewOnlyIncorrect) {
      const last = progress.last;
      if (last && last.answers) {
        const incorrect = Object.keys(last.answers).filter(qid => {
          const ans = last.answers[qid];
          const q = bank.questions.find(x => x.id === qid);
          return q && ans && ans.choiceId && ans.choiceId !== q.answer.correctChoiceId;
        });
        pool = pool.filter(q => incorrect.includes(q.id));
      }
    }

    const order = shuffle(pool.map(q => q.id)).slice(0, Math.min(state.count, pool.length));
    return order;
  }

  function startTest() {
    state.mode = $("selMode").value;
    state.axisKey = $("selAxis").value;
    state.count = Math.max(1, Math.min(1000, Number($("numCount").value || 10)));
    state.useTimer = $("chkTimer").checked;
    state.minutes = Math.max(1, Math.min(240, Number($("numMinutes").value || 15)));

    state.order = pickQuestions();
    state.idx = 0;
    state.answers = {};
    state.flagged = {};
    state.running = true;
    state.startedAt = Date.now();
    state.endsAt = state.useTimer ? (state.startedAt + state.minutes * 60 * 1000) : null;
    state.scenarioSeen = false;

    setVisible("quizCard", true);
    setVisible("resultCard", false);

    // Timer
    if (state.timerHandle) clearInterval(state.timerHandle);
    if (state.useTimer) {
      tickTimer();
      state.timerHandle = setInterval(tickTimer, 250);
    } else {
      $("timerValue").textContent = "—";
      state.timerHandle = null;
    }

    renderQuestion();
  }

  function stopTimer() {
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = null;
  }

  function tickTimer() {
    if (!state.endsAt) return;
    const remaining = state.endsAt - Date.now();
    $("timerValue").textContent = formatMs(remaining);
    if (remaining <= 0) {
      stopTimer();
      finishTest(true);
    }
  }

  function currentQuestion() {
    const id = state.order[state.idx];
    return bank.questions.find(q => q.id === id) || null;
  }

  function renderScenarioIfAny() {
    const details = $("scenarioDetails");
    const titleEl = $("scenarioTitle");
    const textEl = $("scenarioText");

    if (!details || !titleEl || !textEl) return;

    if (bank && bank.scenario && typeof bank.scenario.text === "string" && bank.scenario.text.trim()) {
      titleEl.textContent = bank.scenario.title ? `• ${bank.scenario.title}` : "";
      textEl.textContent = bank.scenario.text;
      details.classList.remove("hidden");

      // auto-abrir solo la primera vez en el intento
      if (!state.scenarioSeen) {
        details.open = true;
        state.scenarioSeen = true;
      }
    } else {
      details.classList.add("hidden");
      details.open = false;
      titleEl.textContent = "";
      textEl.textContent = "";
    }
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) {
      finishTest(false);
      return;
    }

    // Encabezado
    const axisLabel = q.axis || "";
    const moduleLabel = q.module ? `${q.module}` : "";
    const subAxis = q.subAxis ? ` • ${q.subAxis}` : "";
    const diff = q.difficulty ? ` • Dificultad ${q.difficulty}` : "";

    $("pillAxis").textContent = moduleLabel ? `${moduleLabel} • ${axisLabel}` : axisLabel;
    $("qTitle").textContent = `Pregunta ${state.idx + 1} de ${state.order.length}`;
    $("qMeta").textContent = `${q.id}${subAxis}${diff}`;

    // Escenario
    renderScenarioIfAny();

    // Enunciado + pregunta
    $("qStem").textContent = q.stem || "";
    $("qText").textContent = q.question;

    // Botón marcar
    const isFlagged = !!state.flagged[q.id];
    $("btnFlag").textContent = isFlagged ? "Marcada" : "Marcar";
    $("btnFlag").classList.toggle("btn-primary", isFlagged);

    // Opciones
    const form = $("choicesForm");
    form.innerHTML = "";
    const chosen = state.answers[q.id]?.choiceId || null;
    for (const c of q.choices) {
      const label = document.createElement("label");
      label.className = "choice";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "choice";
      radio.value = c.id;
      radio.checked = chosen === c.id;
      radio.addEventListener("change", () => {
        state.answers[q.id] = { choiceId: c.id, at: Date.now() };
        if (state.mode === "practice") showFeedback();
      });

      const span = document.createElement("span");
      span.className = "choice-text";
      span.textContent = `${c.id}. ${c.text}`;

      label.appendChild(radio);
      label.appendChild(span);
      form.appendChild(label);
    }

    // Navegación
    $("btnPrev").disabled = state.idx === 0;
    $("btnNext").textContent = (state.idx === state.order.length - 1) ? "Finalizar" : "Siguiente";

    // Feedback
    if (state.mode === "practice") {
      showFeedback();
    } else {
      $("feedbackBox").classList.add("hidden");
      $("feedbackBox").textContent = "";
    }
  }

  function showFeedback() {
    const q = currentQuestion();
    if (!q) return;
    const chosen = state.answers[q.id]?.choiceId;
    const box = $("feedbackBox");
    if (!chosen) {
      box.classList.add("hidden");
      box.textContent = "";
      return;
    }
    const ok = chosen === q.answer.correctChoiceId;
    box.classList.remove("hidden");
    box.classList.toggle("ok", ok);
    box.classList.toggle("bad", !ok);
    const exp = q.explanation ? `\n\nExplicación: ${q.explanation}` : "";
    box.textContent = `${ok ? "✅ Correcto" : "❌ Incorrecto"}. Respuesta correcta: ${q.answer.correctChoiceId}.${exp}`;
  }

  function goNext() {
    if (state.idx === state.order.length - 1) {
      finishTest(false);
      return;
    }
    state.idx++;
    renderQuestion();
  }

  function goPrev() {
    if (state.idx === 0) return;
    state.idx--;
    renderQuestion();
  }

  function toggleFlag() {
    const q = currentQuestion();
    if (!q) return;
    if (state.flagged[q.id]) delete state.flagged[q.id];
    else state.flagged[q.id] = { at: Date.now() };
    renderQuestion();
  }

  function scoreAttempt(answers, order) {
    let correct = 0;
    const byAxis = {};
    for (const qid of order) {
      const q = bank.questions.find(x => x.id === qid);
      if (!q) continue;
      const chosen = answers[qid]?.choiceId;
      const ok = chosen && chosen === q.answer.correctChoiceId;
      if (ok) correct++;

      const key = `${q.module || ""}::${q.axis}`;
      if (!byAxis[key]) byAxis[key] = { module: q.module || "", axis: q.axis, total: 0, correct: 0 };
      byAxis[key].total++;
      if (ok) byAxis[key].correct++;
    }
    return { correct, total: order.length, byAxis };
  }

  function finishTest(isTimeUp) {
    stopTimer();

    const attempt = {
      exportedAt: nowIso(),
      finishedAt: Date.now(),
      startedAt: state.startedAt,
      mode: state.mode,
      axisKey: state.axisKey,
      timeUp: !!isTimeUp,
      order: state.order.slice(),
      answers: { ...state.answers },
      flagged: { ...state.flagged }
    };

    const sc = scoreAttempt(attempt.answers, attempt.order);
    attempt.correct = sc.correct;
    attempt.total = sc.total;
    attempt.byAxis = sc.byAxis;

    // Guardar histórico
    progress.history = progress.history || [];
    progress.history.push({
      finishedAt: attempt.finishedAt,
      mode: attempt.mode,
      axisKey: attempt.axisKey,
      correct: attempt.correct,
      total: attempt.total
    });
    progress.last = attempt;
    saveProgress(progress);

    renderResults(attempt);
    renderStats();
    renderHistory();

    state.running = false;
    setVisible("quizCard", false);
    setVisible("resultCard", true);
  }

  function renderResults(attempt) {
    const pct = attempt.total ? Math.round((attempt.correct / attempt.total) * 100) : 0;
    const elapsed = attempt.startedAt ? (attempt.finishedAt - attempt.startedAt) : 0;

    $("resultSummary").innerHTML = `
      <div class="row" style="gap:12px;flex-wrap:wrap">
        <span class="badge ${pct >= 70 ? "ok" : "bad"}">Resultado: ${pct}%</span>
        <span class="badge">Correctas: ${attempt.correct}/${attempt.total}</span>
        <span class="badge">Tiempo: ${formatMs(elapsed)}</span>
        ${attempt.timeUp ? '<span class="badge bad">Tiempo agotado</span>' : ''}
      </div>
      <div class="small muted" style="margin-top:10px">Nota: esto es práctica; el umbral real depende del concurso.</div>
    `;

    const byAxisArr = Object.values(attempt.byAxis || {}).sort((a, b) => (a.module + a.axis).localeCompare(b.module + b.axis));
    const rows = byAxisArr.map(x => {
      const p = x.total ? Math.round((x.correct / x.total) * 100) : 0;
      const label = x.module ? `${x.module} • ${x.axis}` : x.axis;
      return `<div class="axisrow"><div>${label}</div><div class="muted">${x.correct}/${x.total}</div><div>${p}%</div></div>`;
    }).join("");

    $("resultByAxis").innerHTML = `
      <div class="axisgrid">
        <div class="axisrow axishead"><div>Eje</div><div>Correctas</div><div>%</div></div>
        ${rows || '<div class="muted">(sin datos)</div>'}
      </div>
    `;
  }

  // ------------------------
  // Importar / Exportar / Reset
  // ------------------------
  function importBankFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = safeJsonParse(text);
      if (!parsed.ok) {
        alert("No se pudo leer el JSON: " + parsed.error);
        return;
      }
      const v = validateBank(parsed.value);
      if (!v.ok) {
        alert("El JSON no cumple el esquema mínimo: " + v.error);
        return;
      }
      bank = v.bank;
      saveBank(bank);
      buildAxisOptions();
      renderStats();
      renderHistory();
      alert("✅ Banco importado correctamente. Preguntas: " + bank.questions.length + (bank.scenario ? " (incluye escenario)" : ""));
    };
    reader.onerror = () => alert("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  function exportProgress() {
    const payload = {
      exportedAt: nowIso(),
      bankMeta: bank.meta || {},
      progress
    };
    downloadTextFile("progreso_simulador_cgr.json", JSON.stringify(payload, null, 2));
  }

  function resetAll() {
    if (!confirm("Esto borrará el progreso y restablecerá el banco de ejemplo. ¿Continuar?")) return;
    localStorage.removeItem(LS.BANK);
    localStorage.removeItem(LS.PROGRESS);
    bank = validateBank(window.SAMPLE_BANK).bank;
    progress = { history: [], last: null };
    buildAxisOptions();
    renderStats();
    renderHistory();
    setVisible("quizCard", false);
    setVisible("resultCard", false);
    alert("✅ Listo. Se restableció el banco de ejemplo.");
  }

  function goHome() {
    setVisible("resultCard", false);
    setVisible("quizCard", false);
  }

  function reviewIncorrect() {
    state.reviewOnlyIncorrect = true;
    setVisible("resultCard", false);
    startTest();
    state.reviewOnlyIncorrect = false;
  }

  // ------------------------
  // Eventos
  // ------------------------
  function wireEvents() {
    $("btnStart").addEventListener("click", startTest);
    $("btnNext").addEventListener("click", goNext);
    $("btnPrev").addEventListener("click", goPrev);
    $("btnFlag").addEventListener("click", toggleFlag);
    $("btnExport").addEventListener("click", exportProgress);
    $("btnReset").addEventListener("click", resetAll);
    $("btnHome").addEventListener("click", goHome);
    $("btnReview").addEventListener("click", reviewIncorrect);

    $("fileImport").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importBankFromFile(file);
      e.target.value = "";
    });
  }

  // ------------------------
  // Init
  // ------------------------
  function init() {
    wireEvents();
    buildAxisOptions();
    renderStats();
    renderHistory();
    setVisible("quizCard", false);
    setVisible("resultCard", false);
  }

  init();
})();
