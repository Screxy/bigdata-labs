// Блок ссылок на элементы интерфейса для управления вкладками, формами и отчётами
const toc = document.querySelector(".toc");
const tocToggle = document.querySelector(".toc-toggle");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const datasetForm = document.getElementById("dataset-form");
const datasetList = document.getElementById("dataset-list");
const datasetSummary = document.getElementById("dataset-summary");
const recognitionSelect = document.getElementById("recognition-source");
const addSampleSetBtn = document.getElementById("add-sample-set");
const clearDatasetBtn = document.getElementById("clear-dataset");
const trainingForm = document.getElementById("training-form");
const trainingLog = document.getElementById("training-log");
const inputSizeEl = document.getElementById("input-size");
const classCountEl = document.getElementById("class-count");
const epochCountEl = document.getElementById("epoch-count");
const finalMseEl = document.getElementById("final-mse");
const weightsTable = document.getElementById("weights-table");
const copyWeightsBtn = document.getElementById("copy-weights");
const errorChart = document.getElementById("error-chart");
const recognitionForm = document.getElementById("recognition-form");
const recognitionPreview = document.getElementById("recognition-preview");
const recognitionOutputs = document.getElementById("recognition-outputs");
const recognizedLabelEl = document.getElementById("recognized-label");
const experimentsTable = document.getElementById("experiments-table");
const experimentNotes = document.getElementById("experiment-notes");

// Ключи localStorage для разных сущностей приложения
const STORAGE_KEYS = {
  dataset: "perceptron-dataset",
  experiments: "perceptron-experiments",
  notes: "perceptron-notes",
};

// Глобальное состояние приложения: выборка, параметры и история экспериментов
const state = {
  dataset: [],
  imageWidth: 8,
  imageHeight: 8,
  perceptron: null,
  history: [],
  iterationLog: [],
  experiments: [],
};

// Переключаем состояние бокового оглавления
if (tocToggle && toc) {
  tocToggle.addEventListener("click", () => {
    const isOpen = toc.getAttribute("data-open") === "true";
    toc.setAttribute("data-open", (!isOpen).toString());
    tocToggle.setAttribute(
      "aria-label",
      isOpen ? "Открыть содержание" : "Закрыть содержание"
    );
  });
}

// Обработчики вкладок интерфейса
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
    tabPanels.forEach((panel) =>
      panel.classList.toggle("active", panel.dataset.panel === tab)
    );
  });
});

// Точка входа: подтягиваем сохранённые данные и отрисовываем интерфейс
init();

function init() {
  // Собираем данные из localStorage и синхронизируем UI
  loadDatasetFromStorage();
  loadExperimentsFromStorage();
  loadNotesFromStorage();
  renderDataset();
  renderExperiments();
  updateRecognitionOptions();
}

function loadDatasetFromStorage() {
  // Забираем выборку из localStorage и восстанавливаем размеры изображений
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dataset);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.dataset = parsed;
        if (parsed[0]) {
          state.imageWidth = parsed[0].width;
          state.imageHeight = parsed[0].height;
          const widthInput = document.getElementById("image-width");
          const heightInput = document.getElementById("image-height");
          if (widthInput) widthInput.value = state.imageWidth;
          if (heightInput) heightInput.value = state.imageHeight;
        }
      }
    }
  } catch (error) {
    console.error("Не удалось загрузить выборку:", error);
  }
}

function saveDataset() {
  // Перезаписываем хранилище обновлённой выборкой
  localStorage.setItem(STORAGE_KEYS.dataset, JSON.stringify(state.dataset));
}

function loadExperimentsFromStorage() {
  // Пробуем прочитать историю экспериментов, при ошибке начинаем с пустого списка
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.experiments);
    state.experiments = raw ? JSON.parse(raw) : [];
  } catch (error) {
    state.experiments = [];
  }
}

function saveExperiments() {
  // Фиксируем новые данные экспериментов в localStorage
  localStorage.setItem(
    STORAGE_KEYS.experiments,
    JSON.stringify(state.experiments)
  );
}

function loadNotesFromStorage() {
  // Автосохранение заметок: подтягиваем текст и вешаем обработчик ввода
  if (!experimentNotes) return;
  const saved = localStorage.getItem(STORAGE_KEYS.notes);
  if (saved) experimentNotes.value = saved;
  experimentNotes.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.notes, experimentNotes.value);
  });
}

// Работа с обучающей выборкой: загрузка файлов, демо-наборы и очистка
datasetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  // Собираем параметры изображения и проверяем ввод
  const label = document.getElementById("sample-label")?.value.trim();
  const file = document.getElementById("sample-file")?.files?.[0];
  const width = Number(document.getElementById("image-width")?.value || 8);
  const height = Number(document.getElementById("image-height")?.value || 8);
  const threshold = Number(document.getElementById("threshold")?.value || 128);

  if (!label || !file) {
    alert("Заполните метку и выберите файл изображения.");
    return;
  }

  try {
    // Конвертируем изображение в бинарный вектор и добавляем в состояние
    const sample = await imageFileToVector(file, width, height, threshold);
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      label,
      pixels: sample.pixels,
      preview: sample.preview,
      width,
      height,
      threshold,
    };
    state.dataset.push(entry);
    state.imageWidth = width;
    state.imageHeight = height;
    saveDataset();
    // После добавления обновляем статистику и настройки распознавания
    renderDataset();
    updateRecognitionOptions();
    datasetForm.reset();
    document.getElementById("image-width").value = width;
    document.getElementById("image-height").value = height;
  } catch (error) {
    console.error(error);
    alert("Не удалось обработать изображение. Проверьте формат файла.");
  }
});

addSampleSetBtn?.addEventListener("click", () => {
  // Добавляем предзаданные образы, чтобы быстро начать эксперименты
  const samples = buildDemoSamples();
  state.dataset = [...state.dataset, ...samples];
  state.imageWidth = 8;
  state.imageHeight = 8;
  document.getElementById("image-width").value = 8;
  document.getElementById("image-height").value = 8;
  saveDataset();
  renderDataset();
  updateRecognitionOptions();
});

clearDatasetBtn?.addEventListener("click", () => {
  // Полностью очищаем выборку и связанные результаты
  if (!state.dataset.length) return;
  const confirmed = confirm("Удалить текущую обучающую выборку?");
  if (!confirmed) return;
  state.dataset = [];
  state.perceptron = null;
  state.history = [];
  state.iterationLog = [];
  saveDataset();
  renderDataset();
  updateRecognitionOptions();
  resetTrainingOutputs();
  renderErrorChart([]);
});

datasetList?.addEventListener("click", (event) => {
  // Удаление конкретного образца по кнопке в карточке
  const target = event.target;
  if (target.matches("button[data-remove]")) {
    const id = target.getAttribute("data-remove");
    state.dataset = state.dataset.filter((item) => item.id !== id);
    saveDataset();
    renderDataset();
    updateRecognitionOptions();
  }
});

function renderDataset() {
  // Обновляем список образцов и краткую статистику по ним
  const total = state.dataset.length;
  const classCount = new Set(state.dataset.map((s) => s.label)).size;
  datasetSummary.textContent = `${total} изображений • ${classCount} классов`;

  if (!total) {
    datasetList.classList.add("empty");
    datasetList.innerHTML =
      "<p>Добавьте изображения или загрузите демо-набор.</p>";
    return;
  }

  datasetList.classList.remove("empty");
  datasetList.innerHTML = state.dataset
    .map(
      (sample, index) => `
      <article class="sample-card">
        <img src="${sample.preview}" alt="${sample.label}" />
        <div>
          <strong>${index + 1}. ${sample.label}</strong>
          <p>${sample.width}×${sample.height} • ${sample.pixels.filter((p) => p === 1).length} белых пикселей</p>
        </div>
        <button data-remove="${sample.id}">Удалить</button>
      </article>
    `
    )
    .join("");
}

function updateRecognitionOptions() {
  // Список для выпадающего выбора уже загруженных образов
  recognitionSelect.innerHTML =
    '<option value="">— Не выбрано —</option>' +
    state.dataset
      .map(
        (item) => `<option value="${item.id}">${item.label} (${item.width}×${
          item.height
        })</option>`
      )
      .join("");
}

// Training
trainingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.dataset.length < 2) {
    alert("Добавьте минимум два изображения из разных классов.");
    return;
  }
  if (state.dataset.length < 10) {
    alert("Согласно требованию необходимо минимум 10 изображений.");
    return;
  }

  const inputLengths = new Set(state.dataset.map((s) => s.pixels.length));
  if (inputLengths.size !== 1) {
    alert("Все изображения должны иметь одинаковый размер для обучения.");
    return;
  }

  const learningRate = Number(document.getElementById("learning-rate").value);
  const maxEpochs = Number(document.getElementById("max-epochs").value);
  const targetError = Number(document.getElementById("target-error").value);
  const weightRange = Number(document.getElementById("weight-range").value);
  const activationThreshold = Number(
    document.getElementById("activation-threshold").value
  );

  const options = {
    learningRate,
    maxEpochs,
    targetError,
    weightRange,
    activationThreshold,
  };

  const result = trainPerceptron(state.dataset, options);
  state.perceptron = {
    neurons: result.neurons,
    activationThreshold,
  };
  state.history = result.history;
  state.iterationLog = result.iterationLog;

  inputSizeEl.textContent = state.dataset[0].pixels.length;
  classCountEl.textContent = Object.keys(result.neurons).length;
  epochCountEl.textContent = result.epochs;
  finalMseEl.textContent = result.mse.toFixed(5);

  renderTrainingLog(state.iterationLog);
  renderWeights(result.neurons);
  renderErrorChart(result.history);
  appendExperiment(result);
  alert("Обучение завершено. Проверьте результаты и переходите к распознаванию.");
});

function resetTrainingOutputs() {
  inputSizeEl.textContent = "0";
  classCountEl.textContent = "0";
  epochCountEl.textContent = "0";
  finalMseEl.textContent = "—";
  trainingLog.innerHTML =
    "<p>Запустите обучение, чтобы увидеть прогресс по итерациям.</p>";
  weightsTable.innerHTML =
    "<p>Результаты появятся после успешного обучения.</p>";
}

function renderTrainingLog(entries) {
  if (!entries.length) {
    trainingLog.innerHTML =
      '<p class="placeholder">Запустите обучение, чтобы увидеть прогресс по итерациям.</p>';
    return;
  }
  const rows = entries
    .map(
      (entry) => `
        <tr>
          <td>${entry.epoch}</td>
          <td>${entry.sample}</td>
          <td>${entry.neuron}</td>
          <td>${entry.net}</td>
          <td>${entry.error}</td>
          <td>[${entry.weights.join(", ")}]</td>
        </tr>
      `
    )
    .join("");
  trainingLog.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Эпоха</th>
            <th>Образ</th>
            <th>Нейрон</th>
            <th>net</th>
            <th>Ошибка</th>
            <th>Δw (первые)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderWeights(neurons) {
  const labels = Object.keys(neurons);
  if (!labels.length) {
    weightsTable.innerHTML =
      "<p>Результаты появятся после успешного обучения.</p>";
    return;
  }

  const rows = labels
    .map((label) => {
      const neuron = neurons[label];
      const preview = neuron.weights
        .slice(0, 6)
        .map((w) => Number(w.toFixed(3)))
        .join(", ");
      return `
        <tr>
          <td>${label}</td>
          <td>${Number(neuron.bias.toFixed(3))}</td>
          <td>${preview} ...</td>
        </tr>
      `;
    })
    .join("");

  weightsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Класс</th>
          <th>Bias</th>
          <th>Первые веса</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

copyWeightsBtn?.addEventListener("click", async () => {
  if (!state.perceptron) {
    alert("Сначала обучите персептрон.");
    return;
  }
  try {
    await navigator.clipboard.writeText(
      JSON.stringify(state.perceptron, null, 2)
    );
    alert("Параметры скопированы в буфер обмена.");
  } catch (error) {
    console.error(error);
    alert("Не удалось скопировать данные.");
  }
});

// Recognition
recognitionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.perceptron) {
    alert("Сначала запустите обучение персептрона.");
    return;
  }

  const selectedId = recognitionSelect.value;
  const file = document.getElementById("recognition-file")?.files?.[0];
  let vector;
  let preview;
  let width = state.imageWidth;
  let height = state.imageHeight;

  if (selectedId) {
    const sample = state.dataset.find((item) => item.id === selectedId);
    if (!sample) {
      alert("Выбранное изображение не найдено.");
      return;
    }
    vector = sample.pixels;
    preview = sample.preview;
    width = sample.width;
    height = sample.height;
  } else if (file) {
    try {
      const processed = await imageFileToVector(
        file,
        width,
        height,
        Number(document.getElementById("threshold")?.value || 128)
      );
      vector = processed.pixels;
      preview = processed.preview;
    } catch (error) {
      alert("Не удалось обработать изображение для распознавания.");
      return;
    }
  } else {
    alert("Выберите образ из выборки или загрузите файл.");
    return;
  }

  const results = predict(state.perceptron, vector);
  recognizedLabelEl.textContent = results.predicted;
  renderRecognitionOutputsTable(results.detail);
  renderRecognitionPreview(preview, width, height);
});

function renderRecognitionPreview(preview, width, height) {
  if (!preview) {
    recognitionPreview.innerHTML = "<p>Изображение ещё не выбрано.</p>";
    return;
  }
  recognitionPreview.innerHTML = `
    <div>
      <img src="${preview}" width="${width * 6}" height="${
    height * 6
  }" alt="Распознаваемое изображение" />
    </div>
  `;
}

function renderRecognitionOutputsTable(detail) {
  if (!detail.length) {
    recognitionOutputs.innerHTML =
      "<p>После запуска появятся значения нейронов до/после активации.</p>";
    return;
  }
  recognitionOutputs.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Класс</th>
          <th>net</th>
          <th>f(net)</th>
        </tr>
      </thead>
      <tbody>
        ${detail
          .map(
            (item) => `
          <tr>
            <td>${item.label}</td>
            <td>${item.net.toFixed(4)}</td>
            <td>${item.output}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// Experiments
function appendExperiment(result) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    datasetSize: state.dataset.length,
    classes: Object.keys(result.neurons).length,
    epochs: result.epochs,
    mse: Number(result.mse.toFixed(5)),
    accuracy: Number((result.accuracy * 100).toFixed(1)),
  };
  state.experiments.unshift(entry);
  state.experiments = state.experiments.slice(0, 12);
  saveExperiments();
  renderExperiments();
}

function renderExperiments() {
  if (!state.experiments.length) {
    experimentsTable.innerHTML = `
      <tr>
        <td colspan="7">
          Запустите обучение хотя бы пять раз с разными параметрами, чтобы заполнить протокол.
        </td>
      </tr>
    `;
    return;
  }
  experimentsTable.innerHTML = state.experiments
    .map(
      (exp, index) => `
      <tr>
        <td>${state.experiments.length - index}</td>
        <td>${exp.timestamp}</td>
        <td>${exp.datasetSize}</td>
        <td>${exp.classes}</td>
        <td>${exp.epochs}</td>
        <td>${exp.mse}</td>
        <td>${exp.accuracy}%</td>
      </tr>
    `
    )
    .join("");
}

// Core perceptron logic
function trainPerceptron(dataset, options) {
  const labels = [...new Set(dataset.map((sample) => sample.label))];
  const inputSize = dataset[0].pixels.length;
  const neurons = {};

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

  while (epoch < options.maxEpochs && mse > options.targetError) {
    epoch += 1;
    let sumSq = 0;

    dataset.forEach((sample) => {
      labels.forEach((label) => {
        const neuron = neurons[label];
        const net =
          dot(neuron.weights, sample.pixels) +
          neuron.bias -
          options.activationThreshold;
        const output = net >= 0 ? 1 : 0;
        const target = sample.label === label ? 1 : 0;
        const error = target - output;

        if (error !== 0) {
          for (let i = 0; i < inputSize; i += 1) {
            neuron.weights[i] += options.learningRate * error * sample.pixels[i];
          }
          neuron.bias += options.learningRate * error;
        }

        sumSq += error * error;

        if (iterationLog.length < 200) {
          iterationLog.push({
            epoch,
            sample: sample.label,
            neuron: label,
            error,
            net: Number(net.toFixed(3)),
            weights: neuron.weights
              .slice(0, 5)
              .map((w) => Number(w.toFixed(3))),
          });
        }
      });
    });

    mse = sumSq / (dataset.length * labels.length);
    history.push({ epoch, mse });
    if (mse <= options.targetError) break;
  }

  const accuracy = evaluateAccuracy(dataset, neurons, options.activationThreshold);

  return {
    neurons,
    history,
    iterationLog,
    mse,
    epochs: epoch,
    accuracy,
  };
}

function evaluateAccuracy(dataset, neurons, threshold) {
  const labels = Object.keys(neurons);
  const total = dataset.length;
  let correct = 0;

  dataset.forEach((sample) => {
    const outputs = labels.map((label) => {
      const neuron = neurons[label];
      const net =
        dot(neuron.weights, sample.pixels) + neuron.bias - threshold;
      return { label, net };
    });
    const predicted = outputs.reduce((best, current) =>
      current.net > best.net ? current : best
    ).label;
    if (predicted === sample.label) correct += 1;
  });

  return total ? correct / total : 0;
}

function predict(perceptron, vector) {
  const labels = Object.keys(perceptron.neurons);
  const detail = labels.map((label) => {
    const neuron = perceptron.neurons[label];
    const net =
      dot(neuron.weights, vector) +
      neuron.bias -
      perceptron.activationThreshold;
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

function dot(weights, inputs) {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) {
    sum += weights[i] * inputs[i];
  }
  return sum;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Image helpers
function imageFileToVector(file, width, height, threshold = 128) {
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
            const grayscale =
              0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            pixels.push(grayscale >= threshold ? 1 : 0);
          }
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

function buildDemoSamples() {
  const patterns = getDemoPatterns();
  return patterns.map((pattern) => {
    const pixels = pattern.rows
      .join("")
      .split("")
      .map((bit) => Number(bit));
    const canvas = document.createElement("canvas");
    const width = pattern.rows[0].length;
    const height = pattern.rows.length;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
    pixels.forEach((value, index) => {
      const offset = index * 4;
      const color = value ? 255 : 0;
      imageData.data[offset] = color;
      imageData.data[offset + 1] = color;
      imageData.data[offset + 2] = color;
      imageData.data[offset + 3] = 255;
    });
    ctx.putImageData(imageData, 0, 0);
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = width * 8;
    previewCanvas.height = height * 8;
    const previewCtx = previewCanvas.getContext("2d");
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

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

function getDemoPatterns() {
  return [
    {
      label: "Крест-1",
      rows: [
        "00100100",
        "00100100",
        "00111100",
        "11111111",
        "00111100",
        "00100100",
        "00100100",
        "00000000",
      ],
    },
    {
      label: "Крест-2",
      rows: [
        "00011000",
        "00011000",
        "11111111",
        "00011000",
        "00011000",
        "00011000",
        "00011000",
        "00000000",
      ],
    },
    {
      label: "Квадрат",
      rows: [
        "11111111",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "11111111",
        "00000000",
      ],
    },
    {
      label: "Пустой квадрат",
      rows: [
        "11111111",
        "10000001",
        "10111101",
        "10100101",
        "10111101",
        "10000001",
        "11111111",
        "00000000",
      ],
    },
    {
      label: "Диагональ ↘",
      rows: [
        "10000000",
        "01000000",
        "00100000",
        "00010000",
        "00001000",
        "00000100",
        "00000010",
        "00000001",
      ],
    },
    {
      label: "Диагональ ↗",
      rows: [
        "00000001",
        "00000010",
        "00000100",
        "00001000",
        "00010000",
        "00100000",
        "01000000",
        "10000000",
      ],
    },
    {
      label: "Полоса вертикальная",
      rows: [
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00000000",
      ],
    },
    {
      label: "Полоса горизонтальная",
      rows: [
        "00000000",
        "11111111",
        "11111111",
        "00000000",
        "00000000",
        "00000000",
        "11111111",
        "11111111",
      ],
    },
    {
      label: "Буква L",
      rows: [
        "10000000",
        "10000000",
        "10000000",
        "10000000",
        "10000000",
        "10000000",
        "11111111",
        "11111111",
      ],
    },
    {
      label: "Буква T",
      rows: [
        "11111111",
        "11111111",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
        "00110000",
      ],
    },
    {
      label: "Буква U",
      rows: [
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "11111111",
        "11111111",
      ],
    },
    {
      label: "Стрелка вправо",
      rows: [
        "00011000",
        "00011100",
        "11111110",
        "11111111",
        "11111110",
        "00011100",
        "00011000",
        "00000000",
      ],
    },
  ];
}

// Chart
function renderErrorChart(history) {
  if (!errorChart) return;
  const ctx = errorChart.getContext("2d");
  ctx.clearRect(0, 0, errorChart.width, errorChart.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(0, 0, errorChart.width, errorChart.height);

  if (!history.length) return;

  const padding = 30;
  const maxEpoch = Math.max(...history.map((point) => point.epoch));
  const maxMse = Math.max(...history.map((point) => point.mse));
  const path = history.map((point) => {
    const x =
      padding +
      ((point.epoch - 1) / Math.max(maxEpoch - 1, 1)) *
        (errorChart.width - padding * 2);
    const y =
      errorChart.height -
      padding -
      (point.mse / (maxMse || 1)) * (errorChart.height - padding * 2);
    return { x, y };
  });

  ctx.strokeStyle = "#a5b4fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  path.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();

  ctx.fillStyle = "#c7d2fe";
  ctx.font = "12px Inter";
  ctx.fillText("Эпохи", errorChart.width - padding - 40, errorChart.height - 10);
  ctx.save();
  ctx.translate(12, padding + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("MSE", 0, 0);
  ctx.restore();
}
