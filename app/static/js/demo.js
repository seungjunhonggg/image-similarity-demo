const API_BASE_URL = "";
const USE_MOCK = true;
const ENDPOINTS = {
  similarity: "/api/similarity-search",
  summarize: "/api/summarize"
};

const $ = (id) => document.getElementById(id);

const state = {
  file: null,
  result: null
};

const stateDot = $("stateDot");
const stateText = $("stateText");
const topKLabel = $("topKLabel");
const apiLabel = $("apiLabel");

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const btnPick = $("btnPick");
const btnRun = $("btnRun");
const btnClear = $("btnClear");
const btnCopySummary = $("btnCopySummary");
const topK = $("topK");
const topKValue = $("topKValue");

const previewWrap = $("previewWrap");
const emptyState = $("emptyState");
const thumbBox = $("thumbBox");
const fileName = $("fileName");
const fileMeta = $("fileMeta");

const briefBox = $("briefBox");
const spinner = $("spinner");
const statusText = $("statusText");
const timeText = $("timeText");
const recordsGrid = $("recordsGrid");
const slidesTrack = $("slidesTrack");
const btnPrevSlides = $("btnPrevSlides");
const btnNextSlides = $("btnNextSlides");

const modalBack = $("modalBack");
const modalImg = $("modalImg");
const modalTitleText = $("modalTitleText");
const modalBadge = $("modalBadge");
const modalTable = $("modalTable");
const btnCloseModal = $("btnCloseModal");
const btnCopyMeta = $("btnCopyMeta");
const btnDownloadImg = $("btnDownloadImg");

const toastBox = $("toast");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toast(message) {
  toastBox.textContent = message;
  toastBox.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toastBox.classList.remove("show"), 1700);
}

function setState(stateName, label) {
  stateDot.classList.remove("idle", "busy", "live");
  if (stateName === "idle") stateDot.classList.add("idle");
  if (stateName === "busy") stateDot.classList.add("busy");
  if (stateName === "live") stateDot.classList.add("live");
  stateText.textContent = label;
}

function setBusy(isBusy, label) {
  spinner.style.display = isBusy ? "inline-block" : "none";
  statusText.textContent = label || (isBusy ? "처리 중" : "대기 중");
  timeText.textContent = nowTime();
  btnRun.disabled = isBusy || !state.file;
  btnClear.disabled = isBusy || !state.file;
  btnPick.disabled = isBusy;
  topK.disabled = isBusy;
  if (isBusy) setState("busy", "Running");
}

function setPreviewVisible(visible) {
  previewWrap.hidden = !visible;
  emptyState.hidden = visible;
}

async function typeText(el, text, msPerChar) {
  const delay = Number.isFinite(msPerChar) ? msPerChar : 7;
  el.value = "";
  for (let i = 0; i < text.length; i += 1) {
    el.value += text[i];
    if (i % 6 === 0) {
      el.scrollTop = el.scrollHeight;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  el.scrollTop = el.scrollHeight;
}

function updateTopKLabel(value) {
  topKValue.textContent = value;
  topKLabel.textContent = value;
}

function resetOutputs() {
  briefBox.value = "";
  recordsGrid.innerHTML = "";
  slidesTrack.innerHTML = "";
  btnCopySummary.disabled = true;
}

function loadFile(file) {
  if (!file.type.startsWith("image/")) {
    toast("이미지 파일만 업로드할 수 있습니다.");
    return;
  }

  state.file = file;
  setPreviewVisible(true);
  fileName.textContent = file.name;
  fileMeta.textContent = `${file.type} • ${formatBytes(file.size)} • ${new Date(file.lastModified).toLocaleString()}`;

  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.src = url;
  img.onload = () => URL.revokeObjectURL(url);
  thumbBox.textContent = "";
  thumbBox.appendChild(img);

  btnRun.disabled = false;
  btnClear.disabled = false;
  setState("idle", "Idle");
  toast("이미지 업로드 완료");
}

function clearFile() {
  state.file = null;
  state.result = null;
  fileInput.value = "";
  thumbBox.textContent = "IMG";
  fileName.textContent = "-";
  fileMeta.textContent = "-";
  setPreviewVisible(false);
  resetOutputs();
  setState("idle", "Idle");
  btnRun.disabled = true;
  btnClear.disabled = true;
}

function openModal({ title, badge, imageUrl, meta }) {
  modalTitleText.textContent = title || "Preview";
  modalBadge.textContent = badge || "--";
  modalImg.src = imageUrl;

  modalTable.innerHTML = "";
  const entries = Object.entries(meta || {});
  if (entries.length === 0) {
    modalTable.innerHTML = "<tr><th>info</th><td>(no metadata)</td></tr>";
  } else {
    entries.forEach(([key, value]) => {
      const row = document.createElement("tr");
      const th = document.createElement("th");
      const td = document.createElement("td");
      th.textContent = key;
      td.textContent = typeof value === "string" ? value : JSON.stringify(value);
      row.appendChild(th);
      row.appendChild(td);
      modalTable.appendChild(row);
    });
  }

  modalBack.classList.add("show");
  window.__modalMeta = meta || {};
}

function closeModal() {
  modalBack.classList.remove("show");
  window.__modalMeta = null;
}

function renderRecords(matches) {
  const items = (matches || []).slice(0, 5);
  recordsGrid.innerHTML = "";
  if (items.length === 0) {
    recordsGrid.innerHTML = "<div class=\"empty-row\">Top-5 결과가 없습니다.</div>";
    return;
  }

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "record-card";

    const thumb = document.createElement("div");
    thumb.className = "record-thumb";
    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.id || `record-${index + 1}`;
    thumb.appendChild(img);

    const body = document.createElement("div");
    body.className = "record-body";

    const title = document.createElement("div");
    title.className = "record-title";
    title.textContent = item.id || `record-${index + 1}`;

    const scoreRow = document.createElement("div");
    scoreRow.className = "score";
    const scoreText = document.createElement("span");
    const scoreValue = Number(item.score || 0);
    scoreText.textContent = `score ${scoreValue.toFixed(2)}`;
    const scoreBar = document.createElement("div");
    scoreBar.className = "score-bar";
    const scoreFill = document.createElement("span");
    scoreFill.style.width = `${Math.min(scoreValue * 100, 100)}%`;
    scoreBar.appendChild(scoreFill);
    scoreRow.appendChild(scoreText);
    scoreRow.appendChild(scoreBar);

    const meta = document.createElement("div");
    meta.className = "record-meta";
    [
      `lot ${item.metadata?.lot_id || "-"}`,
      `defect ${item.metadata?.defect || "-"}`,
      `recipe ${item.metadata?.recipe || "-"}`
    ].forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = label;
      meta.appendChild(tag);
    });

    body.appendChild(title);
    body.appendChild(scoreRow);
    body.appendChild(meta);

    card.appendChild(thumb);
    card.appendChild(body);

    card.addEventListener("click", () => {
      openModal({
        title: item.id || "record",
        badge: `Top-${index + 1}`,
        imageUrl: item.imageUrl,
        meta: { score: item.score, ...item.metadata }
      });
    });

    recordsGrid.appendChild(card);
  });
}

function renderSlides(slides) {
  slidesTrack.innerHTML = "";
  if (!slides || slides.length === 0) {
    slidesTrack.innerHTML = "<div class=\"empty-row\">슬라이드가 없습니다.</div>";
    return;
  }

  slides.forEach((slide, index) => {
    const card = document.createElement("div");
    card.className = "slide-card";

    const img = document.createElement("img");
    img.src = slide.imageUrl;
    img.alt = slide.title || `Slide ${index + 1}`;

    const caption = document.createElement("div");
    caption.className = "slide-caption";

    const title = document.createElement("div");
    title.className = "slide-title";
    title.textContent = slide.title || `Slide ${index + 1}`;

    const sub = document.createElement("div");
    sub.className = "slide-sub";
    sub.textContent = slide.subtitle || "summary overview";

    caption.appendChild(title);
    caption.appendChild(sub);

    card.appendChild(img);
    card.appendChild(caption);

    card.addEventListener("click", () => {
      openModal({
        title: slide.title || `Slide ${index + 1}`,
        badge: slide.id || `slide-${index + 1}`,
        imageUrl: slide.imageUrl,
        meta: slide.meta || {}
      });
    });

    slidesTrack.appendChild(card);
  });
}

async function similaritySearchAPI(file, topKValue) {
  const form = new FormData();
  form.append("image", file);
  form.append("topK", String(topKValue));

  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.similarity}`, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`similarity-search failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function summarizeAPI(simResult) {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.summarize}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simResult)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`summarize failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.summary || "";
}

function makeSlideDataURL(index, title, subtitle) {
  const w = 1200;
  const h = 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(15, 118, 110, 0.18)");
  grad.addColorStop(1, "rgba(217, 119, 6, 0.22)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  roundRect(ctx, 40, 40, w - 80, h - 80, 26);
  ctx.fill();

  ctx.strokeStyle = "rgba(18, 22, 29, 0.12)";
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, w - 80, h - 80, 26);
  ctx.stroke();

  ctx.fillStyle = "#12161d";
  ctx.font = "700 38px 'IBM Plex Sans', sans-serif";
  ctx.fillText(`Slide ${index}`, 70, 110);

  ctx.font = "700 52px 'IBM Plex Sans', sans-serif";
  wrapText(ctx, title, 70, 220, w - 140, 64);

  ctx.fillStyle = "rgba(18, 22, 29, 0.65)";
  ctx.font = "600 26px 'IBM Plex Mono', monospace";
  wrapText(ctx, subtitle, 70, 320, w - 140, 40);

  ctx.fillStyle = "rgba(15, 118, 110, 0.12)";
  roundRect(ctx, 70, 390, w - 140, 220, 18);
  ctx.fill();

  ctx.fillStyle = "#12161d";
  ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
  const bullets = [
    "유사도 상위 이력의 핵심 패턴을 요약합니다.",
    "메타데이터 조건을 묶어 원인 후보를 정리합니다.",
    "재발 방지를 위한 권장 액션을 제시합니다."
  ];
  let y = 450;
  bullets.forEach((line) => {
    ctx.fillText(`• ${line}`, 96, y);
    y += 58;
  });

  return canvas.toDataURL("image/png");
}

function makeThumbDataURL(index, label) {
  const w = 480;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(15, 118, 110, 0.25)");
  grad.addColorStop(1, "rgba(217, 119, 6, 0.22)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  roundRect(ctx, 24, 24, w - 48, h - 48, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(18, 22, 29, 0.12)";
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, w - 48, h - 48, 18);
  ctx.stroke();

  ctx.fillStyle = "#12161d";
  ctx.font = "700 28px 'IBM Plex Sans', sans-serif";
  ctx.fillText(`Record ${index}`, 48, 90);

  ctx.fillStyle = "rgba(18, 22, 29, 0.6)";
  ctx.font = "600 18px 'IBM Plex Mono', monospace";
  ctx.fillText(label || "metadata", 48, 130);

  return canvas.toDataURL("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(" ");
  let line = "";
  for (let n = 0; n < words.length; n += 1) {
    const testLine = `${line}${words[n]} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = `${words[n]} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function mockSimilaritySearch(file, topKValue) {
  const defects = ["scratch", "stain", "void", "chip", "crack"];
  const recipes = ["R-118", "R-121", "R-133", "R-140", "R-152"];
  const tools = ["EQ-07", "EQ-12", "EQ-19", "EQ-22", "EQ-30"];

  const matches = Array.from({ length: topKValue }).map((_, index) => {
    const score = Number(Math.max(0.6, 0.94 - index * 0.04).toFixed(2));
    const metadata = {
      lot_id: `LOT-${2024 + index}`,
      defect: defects[index % defects.length],
      recipe: recipes[index % recipes.length],
      tool: tools[index % tools.length],
      captured_at: new Date(Date.now() - index * 86400000).toISOString()
    };
    return {
      id: `rec-${String(index + 1).padStart(3, "0")}`,
      score,
      metadata,
      imageUrl: makeThumbDataURL(index + 1, metadata.lot_id)
    };
  });

  const slideTitles = ["요약 결론", "Top-K 분포", "원인 후보", "재발 패턴", "권장 액션", "추가 확인"];
  const slides = slideTitles.map((title, index) => {
    const subtitle = `query image 기준 • top ${topKValue} 참조`;
    return {
      id: `slide-${index + 1}`,
      title,
      subtitle,
      imageUrl: makeSlideDataURL(index + 1, title, subtitle),
      meta: {
        slide_index: index + 1,
        topK: topKValue,
        generated_at: new Date().toISOString()
      }
    };
  });

  return { topK: topKValue, matches, slides };
}

function mockSummarize(simResult) {
  const topMatch = simResult.matches?.[0];
  return [
    "브리핑 요약",
    "",
    `- 유사도 검색을 완료했고, 상위 ${Math.min(5, simResult.topK)}개 기록을 브리핑에 반영했습니다.`,
    `- Top-K: ${simResult.topK}`,
    topMatch
      ? `- 최고 유사도: ${topMatch.metadata?.lot_id || "-"} (score ${topMatch.score})`
      : "- 최고 유사도: -",
    "",
    "핵심 포인트",
    "• 상위 기록의 defect 유형이 집중되는 구간을 확인했습니다.",
    "• 공정 recipe와 tool 정보를 묶어 원인 후보를 정리했습니다.",
    "• 재발 리스크 구간에 대한 권장 액션을 포함했습니다.",
    "",
    "다음 액션",
    "1) Top-5 샘플을 기준으로 ROI 비교",
    "2) 상위 defect별 재발 빈도 점검",
    "3) 동일 recipe 조건에서 추가 샘플링"
  ].join("\n");
}

async function runSimilarityAndBriefing() {
  if (!state.file) {
    toast("먼저 이미지를 업로드해 주세요.");
    return;
  }

  try {
    setBusy(true, "유사도 검색 중");
    resetOutputs();

    const topKValue = Number(topK.value);
    const simResult = USE_MOCK
      ? mockSimilaritySearch(state.file, topKValue)
      : await similaritySearchAPI(state.file, topKValue);

    setBusy(true, "브리핑 생성 중");
    const summary = USE_MOCK ? mockSummarize(simResult) : await summarizeAPI(simResult);

    await typeText(briefBox, summary, 8);
    renderRecords(simResult.matches);
    renderSlides(simResult.slides);

    state.result = simResult;
    btnCopySummary.disabled = false;

    setBusy(false, "완료");
    setState("live", "Ready");
    toast("완료");
  } catch (error) {
    console.error(error);
    setBusy(false, "에러 발생");
    setState("idle", "Idle");
    toast("실행 실패: 콘솔 로그를 확인하세요.");
  }
}

function scrollSlides(direction) {
  const delta = slidesTrack.clientWidth * 0.8;
  slidesTrack.scrollBy({ left: delta * direction, behavior: "smooth" });
}

apiLabel.textContent = USE_MOCK ? "mock" : API_BASE_URL || "same-origin";
setPreviewVisible(false);
btnRun.disabled = true;
btnClear.disabled = true;
setState("idle", "Idle");

updateTopKLabel(topK.value);
renderRecords([]);
renderSlides([]);

btnPick.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) loadFile(file);
});

dropzone.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-drag");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-drag");
  const file = event.dataTransfer.files?.[0];
  if (file) loadFile(file);
});

btnRun.addEventListener("click", runSimilarityAndBriefing);
btnClear.addEventListener("click", () => {
  clearFile();
  toast("이미지 제거 완료");
});

btnCopySummary.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(briefBox.value || "");
    toast("브리핑 텍스트 복사됨");
  } catch (error) {
    console.error(error);
    toast("복사 실패 (권한 확인 필요)");
  }
});

topK.addEventListener("input", () => updateTopKLabel(topK.value));

btnPrevSlides.addEventListener("click", () => scrollSlides(-1));
btnNextSlides.addEventListener("click", () => scrollSlides(1));

btnCloseModal.addEventListener("click", closeModal);
modalBack.addEventListener("click", (event) => {
  if (event.target === modalBack) closeModal();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalBack.classList.contains("show")) {
    closeModal();
  }
});

btnCopyMeta.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(window.__modalMeta || {}, null, 2));
    toast("메타데이터 복사됨");
  } catch (error) {
    console.error(error);
    toast("복사 실패");
  }
});

btnDownloadImg.addEventListener("click", () => {
  const url = modalImg.src;
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = "slide.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
