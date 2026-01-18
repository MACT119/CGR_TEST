/* Simulador CGR (Offline) - motor de test sin servidor.
   - Funciona abriendo index.html en un navegador móvil/desktop.
   - Permite importar un questions.json para reemplazar el banco.
   - Guarda progreso y banco importado en localStorage.
*/
(() => {
  "use strict";

  const LS_KEYS = {
    BANK: "cgr_sim_bank_v1",
    PROGRESS: "cgr_sim_progress_v1"
  };

  // ------------------------
  // Utilidades
  // ------------------------
  const $ = (id) => document.getElementById(id);
  const safeJsonParse = (s) => {
    try { return { ok: true, value: JSON.parse(s) }; } catch (e) { return { ok: false, error: e }; }
  };
  const uniq = (arr) => Array.from(new Set(arr));
  const shuffle = (array) => {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
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
    if (!bank.meta) bank.meta = {};

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
    const saved = localStorage.getItem(LS_KEYS.BANK);
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
    localStorage.setItem(LS_KEYS.BANK, JSON.stringify(bank));
  }

  function loadProgress() {
    const saved = localStorage.getItem(LS_KEYS.PROGRESS);
    if (!saved) return { history: [], last: null };
    const parsed = safeJsonParse(saved);
    return parsed.ok ? parsed.value : { history: [], last: null };
  }

  function saveProgress(progress) {
    localStorage.setItem(LS_KEYS.PROGRESS, JSON.stringify(progress));
  }

  // ------------------------
  // Estado del simulacro
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
    reviewOnlyIncorrect: false
  };

  // ------------------------
  // UI helpers
  // ------------------------
  function setVisible(id, visible) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  function updateBankInfo() {
    const total = bank.questions.length;
    const meta = bank.meta || {};
    $("bankInfo").textContent = `Banco: ${total} preguntas • versión: ${meta.version || "(s/n)"} • fuente: ${meta.source || "(s/n)"}`;
    $("kpiTotal").textContent = String(total);

    // KPI histórico
    const last = progress.last;
    if (!last) {
      $("kpiScore").textContent = "—";
      $("kpiStreak").textContent = "—";
      return;
    }
    const pct = last.total ? Math.round((last.correct / last.total) * 100) : 0;
    $("kpiScore").textContent = `${pct}%`;

    // "racha" simple: # de simulacros consecutivos >= 70%
    const hist = progress.history || [];
    let streak = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i];
      const p = h.total ? (h.correct / h.total) : 0;
      if (p >= 0.7) streak++;
      else break;
    }
    $("kpiStreak").textContent = String(streak);
  }

  function buildAxisOptions() {
    const axes = bank.questions.map(q => `${q.module || ""}::${q.axis}`);
    const uniqAxes = uniq(axes).sort((a,b) => a.localeCompare(b));
    const sel = $("selAxis");
    sel.innerHTML = "";

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

    // persist selection
    if (uniqAxes.includes(state.axisKey)) sel.value = state.axisKey;
    else sel.value = "ALL";
  }

  function formatMs(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
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
      // filtra a incorrectas del último intento
      const last = progress.last;
      if (last && last.answers) {
        const incorrectIds = Object.keys(last.answers).filter(qid => {
          const ans = last.answers[qid];
          const q = bank.questions.find(x => x.id === qid);
          return q && ans && ans.choiceId && ans.choiceId !== q.answer.correctChoiceId;
        });
        pool = pool.filter(q => incorrectIds.includes(q.id));
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

    setVisible("quizCard", true);
    setVisible("resultCard", false);
    setVisible("btnStart", false);

    if (state.useTimer) {
      setVisible("timerBadge", true);
      tickTimer();
      state.timerHandle = setInterval(tickTimer, 250);
    } else {
      setVisible("timerBadge", false);
      $("timerText").textContent = "";
      if (state.timerHandle) clearInterval(state.timerHandle);
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
    $("timerText").textContent = formatMs(remaining);
    if (remaining <= 0) {
      stopTimer();
      finishTest(true);
    }
  }

  function currentQuestion() {
    const id = state.order[state.idx];
    return bank.questions.find(q => q.id === id) || null;
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) {
      finishTest(false);
      return;
    }

    $("qIndex").textContent = String(state.idx + 1);
    $("qTotal").textContent = String(state.order.length);
    $("qAxis").textContent = q.axis || "";
    $("qModule").textContent = q.module || "";

    $("qStem").textContent = q.stem || "";
    $("qText").textContent = q.question;

    // flagged
    const isFlagged = !!state.flagged[q.id];
    $("btnFlag").textContent = isFlagged ? "Marcada" : "Marcar";
    $("btnFlag").classList.toggle("btn-primary", isFlagged);

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
        updateProgressSidebar();
      });

      const span = document.createElement("span");
      span.className = "choice-text";
      span.textContent = `${c.id}. ${c.text}`;

      label.appendChild(radio);
      label.appendChild(span);
      form.appendChild(label);
    }

    // nav buttons
    $("btnPrev").disabled = state.idx === 0;
    $("btnNext").textContent = state.idx === state.order.length - 1 ? "Finalizar" : "Siguiente";

    // feedback visibility
    if (state.mode === "practice") {
      showFeedback();
    } else {
      $("feedbackBox").classList.add("hidden");
      $("feedbackBox").textContent = "";
    }

    updateProgressSidebar();
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

  function updateProgressSidebar() {
    const total = state.order.length;
    const answered = Object.keys(state.answers).length;
    const flagged = Object.keys(state.flagged).length;

    $("statAnswered").textContent = String(answered);
    $("statRemaining").textContent = String(Math.max(0, total - answered));
    $("statFlagged").textContent = String(flagged);

    // mini-list
    const list = $("progressList");
    list.innerHTML = "";
    for (let i = 0; i < state.order.length; i++) {
      const qid = state.order[i];
      const q = bank.questions.find(x => x.id === qid);
      const a = state.answers[qid]?.choiceId;
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "pill";
      pill.textContent = String(i + 1);
      if (a) pill.classList.add("done");
      if (state.flagged[qid]) pill.classList.add("flag");
      pill.title = q ? `${q.axis} • ${q.id}` : qid;
      pill.addEventListener("click", () => { state.idx = i; renderQuestion(); });
      list.appendChild(pill);
    }
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

    // guardar histórico
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

    state.running = false;
    setVisible("quizCard", false);
    setVisible("resultCard", true);
    setVisible("btnStart", true);
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
      <div class="small muted" style="margin-top:10px">Nota: el umbral de aprobación real depende del concurso. Esto es solo práctica.</div>
    `;

    // detalle por eje
    const byAxisArr = Object.values(attempt.byAxis || {}).sort((a,b) => (a.module+a.axis).localeCompare(b.module+b.axis));
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

    updateBankInfo();
  }

  // ------------------------
  // Importar banco
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
      // reset progreso del intento en curso
      buildAxisOptions();
      updateBankInfo();
      alert("✅ Banco importado correctamente. Preguntas: " + bank.questions.length);
    };
    reader.onerror = () => alert("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  // ------------------------
  // Exportar
  // ------------------------
  function exportProgress() {
    const payload = {
      exportedAt: new Date().toISOString(),
      bankMeta: bank.meta || {},
      progress
    };
    downloadTextFile("progreso_simulador_cgr.json", JSON.stringify(payload, null, 2));
  }

  function resetAll() {
    if (!confirm("Esto borrará el progreso y restablecerá el banco de ejemplo. ¿Continuar?")) return;
    localStorage.removeItem(LS_KEYS.BANK);
    localStorage.removeItem(LS_KEYS.PROGRESS);
    bank = validateBank(window.SAMPLE_BANK).ok ? window.SAMPLE_BANK : { meta: {}, questions: [] };
    progress = { history: [], last: null };
    state.reviewOnlyIncorrect = false;
    buildAxisOptions();
    updateBankInfo();
    alert("Listo. Se reinició el simulador.");
  }

  // ------------------------
  // Wire UI
  // ------------------------
  function init() {
    buildAxisOptions();
    updateBankInfo();

    $("btnStart").addEventListener("click", () => {
      state.reviewOnlyIncorrect = false;
      startTest();
    });

    $("btnPrev").addEventListener("click", goPrev);
    $("btnNext").addEventListener("click", goNext);
    $("btnFlag").addEventListener("click", toggleFlag);

    $("fileImport").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importBankFromFile(file);
      e.target.value = ""; // permitir re-importar el mismo archivo
    });

    $("btnExport").addEventListener("click", exportProgress);
    $("btnReset").addEventListener("click", resetAll);

    $("btnHome").addEventListener("click", () => {
      setVisible("quizCard", false);
      setVisible("resultCard", false);
      setVisible("btnStart", true);
    });

    $("btnReview").addEventListener("click", () => {
      // revisar falladas del último intento
      state.reviewOnlyIncorrect = true;
      startTest();
    });

    // teclado desktop
    window.addEventListener("keydown", (e) => {
      if (!state.running) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    });
  }

  // Añade estilos dinámicos para choice/pills (mantener CSS compacto)
  const extraCss = document.createElement("style");
  extraCss.textContent = `
    .choices{display:flex;flex-direction:column;gap:10px;margin-top:12px}
    .choice{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.03);cursor:pointer}
    .choice input{margin-top:3px}
    .choice:hover{background:rgba(255,255,255,.06)}
    .choice-text{line-height:1.3}
    .question{font-size:16px;font-weight:650;margin-top:10px}
    .feedback{margin-top:12px;padding:12px;border-radius:14px;border:1px solid var(--border);white-space:pre-wrap}
    .feedback.ok{border-color:rgba(57,217,138,.35);background:rgba(57,217,138,.06)}
    .feedback.bad{border-color:rgba(255,93,93,.35);background:rgba(255,93,93,.06)}
    .pillbox{display:flex;gap:8px;flex-wrap:wrap}
    .pill{width:36px;height:36px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);cursor:pointer}
    .pill.done{background:rgba(77,163,255,.16);border-color:rgba(77,163,255,.35)}
    .pill.flag{outline:2px solid rgba(255,214,102,.65)}
    .axisgrid{display:flex;flex-direction:column;gap:8px}
    .axisrow{display:grid;grid-template-columns:1fr 120px 60px;gap:10px;padding:10px;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.03)}
    .axishead{font-weight:700;background:transparent}
    .footer{padding:20px 0 10px;font-size:12px}
  `;
  document.head.appendChild(extraCss);

  document.addEventListener("DOMContentLoaded", init);
})();
