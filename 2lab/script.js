/**
 * CYBER-PERCEPTRON SYSTEM KERNEL v2.0
 * -----------------------------------
 * Модуль управления нейросетевым моделированием.
 * Реализует логику однослойного персептрона, обработку данных и визуализацию.
 *
 * @author Cyber-Lab AI Assistant
 * @version 2.0.0
 */

"use strict";

/* ==========================================================================
   DOM ELEMENTS & INTERFACE BINDINGS
   ========================================================================== */
const UI = {
  // Navigation & Layout
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  
  // Dataset Module
  datasetForm: document.getElementById("dataset-form"),
  datasetList: document.getElementById("dataset-list"),
  datasetSummary: document.getElementById("dataset-summary"),
  addSampleSetBtn: document.getElementById("add-sample-set"),
  clearDatasetBtn: document.getElementById("clear-dataset"),
  
  // Training Module
  trainingForm: document.getElementById("training-form"),
  trainingLog: document.getElementById("training-log"),
  inputSizeEl: document.getElementById("input-size"),
  classCountEl: document.getElementById("class-count"),
  epochCountEl: document.getElementById("epoch-count"),
  finalMseEl: document.getElementById("final-mse"),
  weightsTable: document.getElementById("weights-table"),
  copyWeightsBtn: document.getElementById("copy-weights"),
  errorChart: document.getElementById("error-chart"),
  
  // Recognition Module
  recognitionForm: document.getElementById("recognition-form"),
  recognitionSelect: document.getElementById("recognition-source"),
  recognitionPreview: document.getElementById("recognition-preview"),
  recognitionOutputs: document.getElementById("recognition-outputs"),
  recognizedLabelEl: document.getElementById("recognized-label"),
  
  // Experiments & Reports
  experimentsTable: document.getElementById("experiments-table"),
  experimentNotes: document.getElementById("experiment-notes"),
};

/* ==========================================================================
   STATE MANAGEMENT
   ========================================================================== */
const STORAGE_KEYS = {
  dataset: "cyber-perceptron-dataset",
  experiments: "cyber-perceptron-experiments",
  notes: "cyber-perceptron-notes",
};

const LEGACY_KEYS = {
  dataset: "perceptron-dataset",
  experiments: "perceptron-experiments",
  notes: "perceptron-notes",
};

const state = {
  dataset: [],
  imageWidth: 8,
  imageHeight: 8,
  perceptron: null,
  history: [],
  iterationLog: [],
  experiments: [],
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
function init() {
  migrateLegacyData();
  loadFromStorage();
  setupEventListeners();
  renderDataset();
  renderExperiments();
  updateRecognitionOptions();
  console.log("Кибер-Персептрон Система Онлайн.");
}

function loadFromStorage() {
  try {
    // Dataset
    const rawDataset = localStorage.getItem(STORAGE_KEYS.dataset);
    if (rawDataset) {
      const parsed = JSON.parse(rawDataset);
      if (Array.isArray(parsed)) {
        state.dataset = parsed;
        if (parsed[0]) {
          state.imageWidth = parsed[0].width;
          state.imageHeight = parsed[0].height;
          updateInputFields(state.imageWidth, state.imageHeight);
        }
      }
    }

    // Experiments
    const rawExp = localStorage.getItem(STORAGE_KEYS.experiments);
    state.experiments = rawExp ? JSON.parse(rawExp) : [];

    // Notes
    if (UI.experimentNotes) {
      UI.experimentNotes.value = localStorage.getItem(STORAGE_KEYS.notes) || "";
    }
  } catch (error) {
    console.error("System Initialization Error:", error);
  }
}

function updateInputFields(w, h) {
  const wInput = document.getElementById("image-width");
  const hInput = document.getElementById("image-height");
  if (wInput) wInput.value = w;
  if (hInput) hInput.value = h;
}

function setupEventListeners() {
  // Navigation
  if (UI.tocToggle && UI.toc) {
    UI.tocToggle.addEventListener("click", () => {
      const isOpen = UI.toc.getAttribute("data-open") === "true";
      UI.toc.setAttribute("data-open", (!isOpen).toString());
    });
  }

  UI.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      UI.tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      UI.tabPanels.forEach((panel) =>
        panel.classList.toggle("active", panel.dataset.panel === tab)
      );
    });
  });

  // Dataset Actions
  UI.datasetForm?.addEventListener("submit", handleAddSample);
  UI.addSampleSetBtn?.addEventListener("click", handleAddDemoSet);
  UI.clearDatasetBtn?.addEventListener("click", handleClearDataset);
  UI.datasetList?.addEventListener("click", handleRemoveSample);

  // Training Actions
  UI.trainingForm?.addEventListener("submit", handleTraining);
  UI.copyWeightsBtn?.addEventListener("click", copyWeightsToClipboard);

  // Recognition Actions
  UI.recognitionForm?.addEventListener("submit", handleRecognition);

  // Auto-fill label from filename
  const sampleFile = document.getElementById("sample-file");
  if (sampleFile) {
    sampleFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const labelInput = document.getElementById("sample-label");
      if (file && labelInput && !labelInput.value) {
        // Remove extension and use as label
        const name = file.name.replace(/\.[^/.]+$/, "");
        labelInput.value = name;
      }
    });
  }

  // Auto-save Notes
  UI.experimentNotes?.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.notes, UI.experimentNotes.value);
  });
}

/* ==========================================================================
   DATASET MODULE
   ========================================================================== */
async function handleAddSample(event) {
  event.preventDefault();
  
  const label = document.getElementById("sample-label")?.value.trim();
  const file = document.getElementById("sample-file")?.files?.[0];
  const width = Number(document.getElementById("image-width")?.value || 8);
  const height = Number(document.getElementById("image-height")?.value || 8);
  const threshold = Number(document.getElementById("threshold")?.value || 128);

  if (!label || !file) {
    alert("СИСТЕМНАЯ ОШИБКА: Отсутствует метка класса или файл.");
    return;
  }

  try {
    const sample = await processImage(file, width, height, threshold);
    const entry = createSampleEntry(label, sample, width, height, threshold);
    
    state.dataset.push(entry);
    state.imageWidth = width;
    state.imageHeight = height;
    
    saveState();
    refreshUI();
    UI.datasetForm.reset();
    updateInputFields(width, height);
  } catch (error) {
    console.error(error);
    alert("ОШИБКА ОБРАБОТКИ: Неверный формат изображения.");
  }
}

function handleAddDemoSet() {
  const samples = buildCyberSamples();
  state.dataset = [...state.dataset, ...samples];
  state.imageWidth = 8;
  state.imageHeight = 8;
  updateInputFields(8, 8);
  saveState();
  refreshUI();
}

function handleClearDataset() {
  if (!state.dataset.length) return;
  if (!confirm("ПОДТВЕРЖДЕНИЕ ОЧИСТКИ: Удалить все данные обучения?")) return;
  
  state.dataset = [];
  state.perceptron = null;
  state.history = [];
  state.iterationLog = [];
  
  saveState();
  refreshUI();
  resetTrainingOutputs();
  renderErrorChart([]);
}

function handleRemoveSample(event) {
  const target = event.target;
  if (target.matches("button[data-remove]")) {
    const id = target.getAttribute("data-remove");
    state.dataset = state.dataset.filter((item) => item.id !== id);
    saveState();
    refreshUI();
  }
}

function createSampleEntry(label, sample, width, height, threshold) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    label,
    pixels: sample.pixels,
    preview: sample.preview,
    width,
    height,
    threshold,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.dataset, JSON.stringify(state.dataset));
  localStorage.setItem(STORAGE_KEYS.experiments, JSON.stringify(state.experiments));
}

function refreshUI() {
  renderDataset();
  updateRecognitionOptions();
}

function renderDataset() {
  const total = state.dataset.length;
  const classCount = new Set(state.dataset.map((s) => s.label)).size;
  UI.datasetSummary.textContent = `ОБРАЗЦЫ: ${total} | КЛАССЫ: ${classCount}`;

  if (!total) {
    UI.datasetList.classList.add("empty");
    UI.datasetList.innerHTML = "<p>НЕТ ДАННЫХ. Загрузите образцы или инициализируйте демо-набор.</p>";
    return;
  }

  UI.datasetList.classList.remove("empty");
  UI.datasetList.innerHTML = state.dataset
    .map(
      (sample, index) => `
      <article class="sample-card">
        <img src="${sample.preview}" alt="${sample.label}" />
        <div>
          <strong>[${index + 1}] ${sample.label}</strong>
          <p>${sample.width}x${sample.height} | АКТ: ${sample.pixels.filter((p) => p === 1).length}</p>
        </div>
        <button data-remove="${sample.id}">УДАЛИТЬ</button>
      </article>
    `
    )
    .join("");
}

/* ==========================================================================
   TRAINING MODULE
   ========================================================================== */
function handleTraining(event) {
  event.preventDefault();
  
  if (state.dataset.length < 2) {
    alert("ОШИБКА: Недостаточно данных. Требуется минимум 2 образца.");
    return;
  }
  
  // Validate dimensions
  const inputLengths = new Set(state.dataset.map((s) => s.pixels.length));
  if (inputLengths.size !== 1) {
    alert("ОШИБКА: Несовпадение размеров. Все образцы должны быть одного размера.");
    return;
  }

  const options = {
    learningRate: Number(document.getElementById("learning-rate").value),
    maxEpochs: Number(document.getElementById("max-epochs").value),
    targetError: Number(document.getElementById("target-error").value),
    weightRange: Number(document.getElementById("weight-range").value),
    activationThreshold: Number(document.getElementById("activation-threshold").value),
  };

  const result = trainPerceptron(state.dataset, options);
  
  state.perceptron = {
    neurons: result.neurons,
    activationThreshold: options.activationThreshold,
  };
  state.history = result.history;
  state.iterationLog = result.iterationLog;

  // Update Stats
  UI.inputSizeEl.textContent = state.dataset[0].pixels.length;
  UI.classCountEl.textContent = Object.keys(result.neurons).length;
  UI.epochCountEl.textContent = result.epochs;
  UI.finalMseEl.textContent = result.mse.toFixed(5);

  renderTrainingLog(state.iterationLog);
  renderWeights(result.neurons);
  renderErrorChart(result.history);
  appendExperiment(result);
  
  alert("ОБУЧЕНИЕ ЗАВЕРШЕНО. Обновлена конфигурация нейронной сети.");
}

function trainPerceptron(dataset, options) {
  const labels = [...new Set(dataset.map((sample) => sample.label))];
  const inputSize = dataset[0].pixels.length;
  const neurons = {};

  // Initialize weights
  labels.forEach((label) => {
    neurons[label] = {
      weights: Array.from({ length: inputSize }, () =>
        randomBetween(-options.weightRange, options.weightRange)
      ),
      bias: randomBetween(-options.weightRange, options.weightRange),
    };
  });

  const history = [];
  const iterationLog = [];
  let mse = Number.MAX_VALUE;
  let epoch = 0;

  // Training Loop
  while (epoch < options.maxEpochs && mse > options.targetError) {
    epoch += 1;
    let sumSq = 0;

    dataset.forEach((sample) => {
      labels.forEach((label) => {
        const neuron = neurons[label];
        // Calculate Output
        const net = dot(neuron.weights, sample.pixels) + neuron.bias - options.activationThreshold;
        const output = net >= 0 ? 1 : 0;
        const target = sample.label === label ? 1 : 0;
        const error = target - output;

        // Weight Update (Delta Rule)
        if (error !== 0) {
          for (let i = 0; i < inputSize; i += 1) {
            neuron.weights[i] += options.learningRate * error * sample.pixels[i];
          }
          neuron.bias += options.learningRate * error;
        }

        sumSq += error * error;

        // Logging
        if (iterationLog.length < 100) {
          iterationLog.push({
            epoch,
            sample: sample.label,
            neuron: label,
            error,
            net: Number(net.toFixed(3)),
            weights: neuron.weights.slice(0, 5).map(w => Number(w.toFixed(3)))
          });
        }
      });
    });

    mse = sumSq / (dataset.length * labels.length);
    history.push({ epoch, mse });
    if (mse <= options.targetError) break;
  }

  const accuracy = evaluateAccuracy(dataset, neurons, options.activationThreshold);

  return { neurons, history, iterationLog, mse, epochs: epoch, accuracy };
}

function evaluateAccuracy(dataset, neurons, threshold) {
  const labels = Object.keys(neurons);
  const total = dataset.length;
  let correct = 0;

  dataset.forEach((sample) => {
    const outputs = labels.map((label) => {
      const neuron = neurons[label];
      const net = dot(neuron.weights, sample.pixels) + neuron.bias - threshold;
      return { label, net };
    });
    const predicted = outputs.reduce((best, current) =>
      current.net > best.net ? current : best
    ).label;
    if (predicted === sample.label) correct += 1;
  });

  return total ? correct / total : 0;
}

function renderTrainingLog(entries) {
  if (!entries.length) return;
  const rows = entries.map(entry => `
    <tr>
      <td>${entry.epoch}</td>
      <td>${entry.sample}</td>
      <td>${entry.neuron}</td>
      <td>${entry.net}</td>
      <td>${entry.error}</td>
      <td>[${entry.weights.join(", ")}]</td>
    </tr>
  `).join("");
  
  UI.trainingLog.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ЭПОХА</th><th>ОБРАЗЕЦ</th><th>НЕЙРОН</th><th>NET</th><th>ОШИБКА</th><th>ΔW (Первые 5)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderWeights(neurons) {
  const labels = Object.keys(neurons);
  const rows = labels.map(label => {
    const neuron = neurons[label];
    const preview = neuron.weights.slice(0, 6).map(w => w.toFixed(3)).join(", ");
    return `
      <tr>
        <td>${label}</td>
        <td>${neuron.bias.toFixed(3)}</td>
        <td>${preview} ...</td>
      </tr>
    `;
  }).join("");

  UI.weightsTable.innerHTML = `
    <table>
      <thead>
        <tr><th>КЛАСС</th><th>СМЕЩЕНИЕ</th><th>ВЕСА (Первые 6)</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function copyWeightsToClipboard() {
  if (!state.perceptron) {
    alert("ОШИБКА: Обученная модель не найдена.");
    return;
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.perceptron, null, 2));
    alert("УСПЕХ: Веса нейросети скопированы в буфер обмена.");
  } catch (error) {
    console.error(error);
  }
}

function resetTrainingOutputs() {
  UI.inputSizeEl.textContent = "0";
  UI.classCountEl.textContent = "0";
  UI.epochCountEl.textContent = "0";
  UI.finalMseEl.textContent = "—";
  UI.trainingLog.innerHTML = "<p class='placeholder'>Ожидание последовательности обучения...</p>";
  UI.weightsTable.innerHTML = "<p>Нет данных.</p>";
}

/* ==========================================================================
   RECOGNITION MODULE
   ========================================================================== */
async function handleRecognition(event) {
  event.preventDefault();
  if (!state.perceptron) {
    alert("ОШИБКА: Нейросеть не обучена.");
    return;
  }

  const selectedId = UI.recognitionSelect.value;
  const file = document.getElementById("recognition-file")?.files?.[0];
  let vector, preview;
  let width = state.imageWidth;
  let height = state.imageHeight;

  if (selectedId) {
    const sample = state.dataset.find((item) => item.id === selectedId);
    if (!sample) return;
    vector = sample.pixels;
    preview = sample.preview;
    width = sample.width;
    height = sample.height;
  } else if (file) {
    try {
      const processed = await processImage(
        file, width, height,
        Number(document.getElementById("threshold")?.value || 128)
      );
      vector = processed.pixels;
      preview = processed.preview;
    } catch (e) {
      alert("ОШИБКА: Сбой обработки изображения.");
      return;
    }
  } else {
    alert("ОШИБКА: Не выбран источник входных данных.");
    return;
  }

  const results = predict(state.perceptron, vector);
  UI.recognizedLabelEl.textContent = results.predicted;
  renderRecognitionOutputsTable(results.detail);
  renderRecognitionPreview(preview, width, height);
}

function predict(perceptron, vector) {
  const labels = Object.keys(perceptron.neurons);
  const detail = labels.map((label) => {
    const neuron = perceptron.neurons[label];
    const net = dot(neuron.weights, vector) + neuron.bias - perceptron.activationThreshold;
    return {
      label,
      net,
      output: net >= 0 ? 1 : 0,
    };
  });

  const predicted = detail.reduce((best, current) =>
    current.net > best.net ? current : best
  ).label;

  return { predicted, detail };
}

function updateRecognitionOptions() {
  UI.recognitionSelect.innerHTML =
    '<option value="">— Выберите источник —</option>' +
    state.dataset.map(item => 
      `<option value="${item.id}">${item.label} (${item.width}x${item.height})</option>`
    ).join("");
}

function renderRecognitionPreview(preview, width, height) {
  if (!preview) {
    UI.recognitionPreview.innerHTML = "<p>Изображение не загружено.</p>";
    return;
  }
  UI.recognitionPreview.innerHTML = `
    <div>
      <img src="${preview}" width="${width * 6}" height="${height * 6}" alt="Образец" />
    </div>
  `;
}

function renderRecognitionOutputsTable(detail) {
  UI.recognitionOutputs.innerHTML = `
    <table>
      <thead>
        <tr><th>КЛАСС</th><th>NET</th><th>F(NET)</th></tr>
      </thead>
      <tbody>
        ${detail.map(item => `
          <tr>
            <td>${item.label}</td>
            <td>${item.net.toFixed(4)}</td>
            <td>${item.output}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ==========================================================================
   EXPERIMENTS MODULE
   ========================================================================== */
function appendExperiment(result) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString("ru-RU"),
    datasetSize: state.dataset.length,
    classes: Object.keys(result.neurons).length,
    epochs: result.epochs,
    mse: Number(result.mse.toFixed(5)),
    accuracy: Number((result.accuracy * 100).toFixed(1)),
  };
  state.experiments.unshift(entry);
  state.experiments = state.experiments.slice(0, 12); // Keep last 12
  saveState();
  renderExperiments();
}

function renderExperiments() {
  if (!state.experiments.length) {
    UI.experimentsTable.innerHTML = `
      <tr><td colspan="7">Экспериментальные данные отсутствуют. Запустите обучение для генерации логов.</td></tr>
    `;
    return;
  }
  UI.experimentsTable.innerHTML = state.experiments.map((exp, index) => `
    <tr>
      <td>${state.experiments.length - index}</td>
      <td>${exp.timestamp}</td>
      <td>${exp.datasetSize}</td>
      <td>${exp.classes}</td>
      <td>${exp.epochs}</td>
      <td>${exp.mse}</td>
      <td>${exp.accuracy}%</td>
    </tr>
  `).join("");
}

/* ==========================================================================
   UTILITIES & HELPERS
   ========================================================================== */
function dot(weights, inputs) {
  return weights.reduce((sum, w, i) => sum + w * inputs[i], 0);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Image Processing Engine
function processImage(file, width, height, threshold = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          const { data } = ctx.getImageData(0, 0, width, height);
          const pixels = [];
          for (let i = 0; i < data.length; i += 4) {
            // Standard grayscale conversion
            const grayscale = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            pixels.push(grayscale >= threshold ? 1 : 0);
          }
          
          // Create preview
          const previewCanvas = document.createElement("canvas");
          previewCanvas.width = width * 8;
          previewCanvas.height = height * 8;
          const previewCtx = previewCanvas.getContext("2d");
          previewCtx.imageSmoothingEnabled = false;
          previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
          
          resolve({
            pixels,
            preview: previewCanvas.toDataURL("image/png"),
          });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Cyber-Themed Demo Data
function buildCyberSamples() {
  const patterns = getCyberPatterns();
  return patterns.map((pattern) => {
    const pixels = pattern.rows.join("").split("").map(Number);
    
    // Create preview manually from pattern
    const width = pattern.rows[0].length;
    const height = pattern.rows.length;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
    
    pixels.forEach((val, i) => {
      const off = i * 4;
      const col = val ? 255 : 0;
      imageData.data[off] = col;
      imageData.data[off+1] = col;
      imageData.data[off+2] = col;
      imageData.data[off+3] = 255;
    });
    ctx.putImageData(imageData, 0, 0);
    
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = width * 8;
    previewCanvas.height = height * 8;
    const pCtx = previewCanvas.getContext("2d");
    pCtx.imageSmoothingEnabled = false;
    pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      label: pattern.label,
      pixels,
      preview: previewCanvas.toDataURL("image/png"),
      width,
      height,
      threshold: 128,
    };
  });
}

function getCyberPatterns() {
  return [
    {
      label: "ЦЕЛЬ_ЗАХВАТ",
      rows: [
        "00011000",
        "00011000",
        "00011000",
        "11100111",
        "11100111",
        "00011000",
        "00011000",
        "00011000",
      ],
    },
    {
      label: "ЗАХВАТЧИК",
      rows: [
        "00011000",
        "00111100",
        "01111110",
        "11011011",
        "11111111",
        "00100100",
        "01011010",
        "10100101",
      ],
    },
    {
      label: "БЛОК_ДАННЫХ",
      rows: [
        "11111111",
        "10101010",
        "10101010",
        "11111111",
        "10101010",
        "10101010",
        "11111111",
        "00000000",
      ],
    },
    {
      label: "СИГНАЛ",
      rows: [
        "00000000",
        "00011000",
        "00100100",
        "01000010",
        "10000001",
        "00000000",
        "00011000",
        "00011000",
      ],
    },
    {
      label: "ЯДРО_CPU",
      rows: [
        "11111111",
        "10000001",
        "10111101",
        "10100101",
        "10100101",
        "10111101",
        "10000001",
        "11111111",
      ],
    },
    {
      label: "ЦИФРА_0",
      rows: [
        "00111100",
        "01100110",
        "11000011",
        "11000011",
        "11000011",
        "11000011",
        "01100110",
        "00111100",
      ],
    },
    {
      label: "ЦИФРА_1",
      rows: [
        "00011000",
        "00111000",
        "01011000",
        "00011000",
        "00011000",
        "00011000",
        "00011000",
        "01111110",
      ],
    },
    {
      label: "МЕТКА_X",
      rows: [
        "11000011",
        "11000011",
        "01100110",
        "00111100",
        "00111100",
        "01100110",
        "11000011",
        "11000011",
      ],
    },
    {
      label: "ПЛЮС",
      rows: [
        "00011000",
        "00011000",
        "00011000",
        "11111111",
        "11111111",
        "00011000",
        "00011000",
        "00011000",
      ],
    },
    {
      label: "УГОЛ_L",
      rows: [
        "11000000",
        "11000000",
        "11000000",
        "11000000",
        "11000000",
        "11111111",
        "11111111",
        "00000000",
      ],
    },
    {
      label: "СБОЙ",
      rows: [
        "00000000",
        "01100110",
        "01100110",
        "00000000",
        "00011000",
        "11000011",
        "01111110",
        "00000000",
      ],
    },
    {
      label: "СТРЕЛКА_ВВЕРХ",
      rows: [
        "00011000",
        "00111100",
        "01111110",
        "11111111",
        "00011000",
        "00011000",
        "00011000",
        "00011000",
      ],
    },
  ];
}

// Chart Visualization
function renderErrorChart(history) {
  if (!UI.errorChart) return;
  const ctx = UI.errorChart.getContext("2d");
  const { width, height } = UI.errorChart;
  
  // Clear & Background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0, 243, 255, 0.05)";
  ctx.fillRect(0, 0, width, height);

  if (!history.length) return;

  const padding = 40;
  const maxEpoch = Math.max(...history.map((p) => p.epoch));
  const maxMse = Math.max(...history.map((p) => p.mse));
  
  // Map points
  const points = history.map((point) => {
    const x = padding + ((point.epoch - 1) / Math.max(maxEpoch - 1, 1)) * (width - padding * 2);
    const y = height - padding - (point.mse / (maxMse || 1)) * (height - padding * 2);
    return { x, y };
  });

  // Draw Line
  ctx.strokeStyle = "#00f3ff"; // Neon Cyan
  ctx.lineWidth = 2;
  ctx.shadowColor = "#00f3ff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Labels
  ctx.fillStyle = "#8a8a9b"; // Muted text
  ctx.font = "12px Orbitron";
  ctx.fillText("ЭПОХИ", width - padding - 50, height - 10);
  
  ctx.save();
  ctx.translate(15, padding + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("MSE", 0, 0);
  ctx.restore();
}

// Initialize System
function migrateLegacyData() {
  const legacyDataset = localStorage.getItem(LEGACY_KEYS.dataset);
  if (legacyDataset && !localStorage.getItem(STORAGE_KEYS.dataset)) {
    localStorage.setItem(STORAGE_KEYS.dataset, legacyDataset);
  }
}

init();
