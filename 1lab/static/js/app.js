/**
 * Главный файл приложения
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

let currentNetwork = null;
let currentGA = null;
let currentPopulation = null;
let algorithmRunning = false;
let stepMode = false;
let convergenceChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Обновление значений слайдеров
    document.getElementById('mutationRate').addEventListener('input', function() {
        document.getElementById('mutationRateValue').textContent = this.value;
    });

    document.getElementById('crossoverRate').addEventListener('input', function() {
        document.getElementById('crossoverRateValue').textContent = this.value;
    });

    // Обработка изменения режима
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const stepBtn = document.getElementById('stepButton');
            const initBtn = document.getElementById('initStepButton');
            if (this.value === 'step') {
                initBtn.style.display = 'block';
                stepBtn.style.display = 'block';
            } else {
                initBtn.style.display = 'none';
                stepBtn.style.display = 'none';
            }
        });
    });

    // Инициализация графика с задержкой для загрузки Chart.js
    setTimeout(() => {
        try {
            initChart();
        } catch (error) {
            console.error('Ошибка инициализации графика:', error);
        }
    }, 100);

    updateStatus('Готов к работе', 'success');
});

// Инициализация графика
function initChart() {
    const canvas = document.getElementById('convergenceChart');
    if (!canvas) {
        console.error('Canvas элемент не найден');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Не удалось получить контекст canvas');
        return;
    }
    
    convergenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Лучшая приспособленность',
                data: [],
                borderColor: '#03dac6', // Teal
                backgroundColor: 'rgba(3, 218, 198, 0.2)',
                tension: 0.1,
                fill: false
            }, {
                label: 'Средняя приспособленность',
                data: [],
                borderColor: '#bb86fc', // Purple
                backgroundColor: 'rgba(187, 134, 252, 0.2)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            color: '#e0e0e0', // Text color
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#333333' // Grid color
                    },
                    ticks: {
                        color: '#a0a0a0' // Tick color
                    },
                    title: {
                        display: true,
                        text: 'Приспособленность',
                        color: '#e0e0e0'
                    }
                },
                x: {
                    grid: {
                        color: '#333333'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    },
                    title: {
                        display: true,
                        text: 'Поколение',
                        color: '#e0e0e0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            }
        }
    });
}

// Создание сети
function createNetwork() {
    const size = parseInt(document.getElementById('networkSize').value);
    const sender = parseInt(document.getElementById('sender').value);
    const receiver = parseInt(document.getElementById('receiver').value);

    // Валидация
    if (isNaN(size) || isNaN(sender) || isNaN(receiver)) {
        alert('Все поля должны содержать числа');
        return;
    }

    if (size < 4 || size > 16) {
        alert('Размер сети должен быть от 4 до 16');
        return;
    }

    if (sender < 0 || sender >= size) {
        alert('Отправитель должен быть от 0 до ' + (size - 1));
        return;
    }

    if (receiver < 0 || receiver >= size) {
        alert('Получатель должен быть от 0 до ' + (size - 1));
        return;
    }

    if (sender === receiver) {
        alert('Отправитель и получатель не должны совпадать');
        return;
    }

    currentNetwork = new Network(size);
    currentNetwork.sender = sender;
    currentNetwork.receiver = receiver;
    currentNetwork.generateRandomNetwork();

    displayNetworkMatrix(currentNetwork.adjacencyMatrix);
    updateStatus('Сеть создана', 'success');
}

// Генерация случайной сети
function generateRandomNetwork() {
    createNetwork();
}

// Отображение матрицы смежности
function displayNetworkMatrix(matrix) {
    const container = document.getElementById('networkMatrix');
    container.innerHTML = '';

    if (!matrix || !matrix.length) {
        container.innerHTML = 'Сеть не создана';
        return;
    }

    const size = matrix.length;
    let html = '<div class="matrix-row" style="margin-bottom: 5px;">';

    // Заголовки столбцов
    // Отступ слева под заголовки строк (30px + 5px margin)
    html += '<span style="width: 30px; display: inline-block; margin-right: 5px;"></span>';
    for (let j = 0; j < size; j++) {
        // Ширина должна совпадать с matrix-cell (36px + 4px margin)
        html += `<span style="width: 36px; margin: 0 2px; display: inline-block; text-align: center; font-weight: bold;">${j}</span>`;
    }
    html += '</div>';

    // Строки матрицы
    for (let i = 0; i < size; i++) {
        html += `<div class="matrix-row">`;
        // Заголовок строки
        html += `<span style="width: 30px; display: inline-block; text-align: right; font-weight: bold; margin-right: 5px; height: 40px; line-height: 40px;">${i}:</span>`;

        for (let j = 0; j < size; j++) {
            const value = matrix[i][j];
            let cellClass = 'matrix-cell';
            let displayValue = value;

            if (i === j) {
                cellClass += ' diagonal';
                displayValue = '0';
            } else if (value === Infinity || value === null || value === undefined) {
                cellClass += ' no-connection';
                displayValue = '∞';
            } else {
                cellClass += ' connection';
                displayValue = Math.round(value).toString();
            }

            html += `<span class="${cellClass}">${displayValue}</span>`;
        }
        html += '</div>';
    }

    container.innerHTML = html;
}

// Запуск алгоритма
function runAlgorithm() {
    if (!currentNetwork) {
        alert('Сначала создайте сеть');
        return;
    }

    const mode = document.querySelector('input[name="mode"]:checked').value;

    if (mode === 'step') {
        initStepMode();
        return;
    }

    const params = {
        population_size: parseInt(document.getElementById('populationSize').value),
        max_generations: parseInt(document.getElementById('maxGenerations').value),
        mutation_rate: parseFloat(document.getElementById('mutationRate').value),
        crossover_rate: parseFloat(document.getElementById('crossoverRate').value),
        tournament_size: parseInt(document.getElementById('tournamentSize').value),
        selection_method: document.getElementById('selectionMethod').value,
        crossover_method: document.getElementById('crossoverMethod').value
    };

    algorithmRunning = true;
    updateStatus('Алгоритм запущен', 'running');
    document.getElementById('runButton').disabled = true;

    // Запуск в асинхронном режиме
    setTimeout(() => {
        runAlgorithmAsync(params);
    }, 100);
}

// Асинхронный запуск алгоритма
function runAlgorithmAsync(params) {
    try {
        currentGA = new GeneticAlgorithm(currentNetwork, params.population_size);
        currentGA.setParameters({
            mutationRate: params.mutation_rate,
            crossoverRate: params.crossover_rate,
            tournamentSize: params.tournament_size,
            selectionMethod: params.selection_method,
            crossoverMethod: params.crossover_method
        });

        const startTime = performance.now();
        const [bestChromosome, statsHistory] = currentGA.run(params.max_generations, false);
        const executionTime = (performance.now() - startTime) / 1000;

        displayResults(bestChromosome, executionTime, currentGA.generations);
        
        // Обновление графика с небольшой задержкой для корректного отображения
        setTimeout(() => {
            updateChart(statsHistory);
        }, 50);
        
        algorithmRunning = false;
        document.getElementById('runButton').disabled = false;
        updateStatus('Алгоритм завершен', 'success');
    } catch (error) {
        updateStatus('Ошибка: ' + error.message, 'error');
        algorithmRunning = false;
        document.getElementById('runButton').disabled = false;
    }
}

// Инициализация пошагового режима
function initStepMode() {
    if (!currentNetwork) {
        alert('Сначала создайте сеть');
        return;
    }

    const populationSize = parseInt(document.getElementById('populationSize').value);

    try {
        currentGA = new GeneticAlgorithm(currentNetwork, populationSize);
        currentGA.setParameters({
            mutationRate: parseFloat(document.getElementById('mutationRate').value),
            crossoverRate: parseFloat(document.getElementById('crossoverRate').value),
            tournamentSize: parseInt(document.getElementById('tournamentSize').value),
            selectionMethod: document.getElementById('selectionMethod').value,
            crossoverMethod: document.getElementById('crossoverMethod').value
        });

        currentPopulation = new Population(populationSize, currentNetwork);
        currentPopulation.initializeRandom();

        stepMode = true;
        displayPopulation(currentPopulation.chromosomes, currentPopulation.generation, currentPopulation.getFitnessStatistics());
        updateStatus('Пошаговый режим инициализирован', 'success');
        document.getElementById('stepButton').disabled = false;
        document.getElementById('initStepButton').style.display = 'none';
        document.getElementById('populationSection').style.display = 'block';
    } catch (error) {
        updateStatus('Ошибка инициализации пошагового режима: ' + error.message, 'error');
    }
}

// Выполнение шага
function runStep() {
    if (!stepMode || !currentGA || !currentPopulation) return;

    try {
        const newPopulation = currentGA._createNewGeneration(currentPopulation, false);
        newPopulation.updateGeneration();
        currentPopulation = newPopulation;

        displayPopulation(currentPopulation.chromosomes, currentPopulation.generation, currentPopulation.getFitnessStatistics());
        
        // Обновление графика с небольшой задержкой
        setTimeout(() => {
            updateChart(currentPopulation.fitnessHistory);
        }, 50);
    } catch (error) {
        updateStatus('Ошибка выполнения шага: ' + error.message, 'error');
    }
}

// Отображение результатов
function displayResults(bestChromosome, executionTime, generations) {
    const resultsDiv = document.getElementById('results');

    if (!bestChromosome) {
        resultsDiv.innerHTML = '<p class="text-danger">Ошибка: нет результатов для отображения</p>';
        return;
    }

    // Получение оптимального решения
    const [optimalPath, optimalCost] = currentNetwork.getShortestPathDijkstra();

    let html = '<div class="path-display">';
    html += '<h6><i class="fas fa-route"></i> Результаты алгоритма:</h6>';

    if (bestChromosome.genes && bestChromosome.genes.length > 0) {
        html += `<p><strong>Найденный путь:</strong> ${bestChromosome.genes.join(' → ')}</p>`;
        const pathLengthEdges = Math.max(bestChromosome.genes.length - 1, 0);
        html += `<p><strong>Длина пути:</strong> ${pathLengthEdges} ${pathLengthEdges === 1 ? 'ребро' : 'рёбер'}</p>`;
    } else {
        html += '<p><strong>Найденный путь:</strong> Не найден</p>';
    }

    if (bestChromosome.fitness !== null && bestChromosome.fitness !== undefined && bestChromosome.fitness !== Infinity) {
        html += `<p><strong>Стоимость пути:</strong> ${bestChromosome.fitness.toFixed(2)}</p>`;
    } else {
        html += '<p><strong>Стоимость пути:</strong> ∞ (невалидный путь)</p>';
    }

    html += `<p><strong>Время выполнения:</strong> ${executionTime.toFixed(2)} сек</p>`;
    html += `<p><strong>Поколений:</strong> ${generations}</p>`;

    // Сравнение с оптимальным решением
    if (optimalCost !== null && optimalCost !== undefined && optimalCost !== Infinity) {
        html += `<p><strong>Оптимальный путь:</strong> ${optimalPath.join(' → ')}</p>`;
        html += `<p><strong>Оптимальная стоимость:</strong> ${optimalCost.toFixed(2)}</p>`;

        if (bestChromosome.fitness !== null && bestChromosome.fitness !== undefined && bestChromosome.fitness !== Infinity) {
            const deviation = ((bestChromosome.fitness - optimalCost) / optimalCost * 100);
            html += `<p><strong>Отклонение от оптимума:</strong> ${deviation.toFixed(1)}%</p>`;

            if (Math.abs(bestChromosome.fitness - optimalCost) < 0.1) {
                html += '<p class="text-success"><i class="fas fa-check-circle"></i> Найдено оптимальное решение!</p>';
            } else {
                html += '<p class="text-warning"><i class="fas fa-exclamation-triangle"></i> Решение не оптимально</p>';
            }
        }
    } else {
        html += '<p><strong>Оптимальное решение:</strong> Не найдено</p>';
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Отображение популяции
function displayPopulation(population, generation, statistics) {
    const container = document.getElementById('populationDisplay');

    let html = `<div class="mb-3">
        <h6>Поколение ${generation}</h6>`;

    if (statistics && statistics.min !== null && statistics.min !== undefined && statistics.min !== Infinity) {
        html += `<p><strong>Лучшая приспособленность:</strong> ${statistics.min.toFixed(2)}</p>`;
    } else {
        html += '<p><strong>Лучшая приспособленность:</strong> ∞</p>';
    }

    if (statistics && statistics.avg !== null && statistics.avg !== undefined && statistics.avg !== Infinity) {
        html += `<p><strong>Средняя приспособленность:</strong> ${statistics.avg.toFixed(2)}</p>`;
    } else {
        html += '<p><strong>Средняя приспособленность:</strong> ∞</p>';
    }

    html += '</div>';

    if (population && population.length > 0) {
        html += '<div class="row">';
        population.slice(0, 20).forEach((item, index) => {
            const fitnessStr = (item.fitness !== null && item.fitness !== undefined && item.fitness !== Infinity)
                ? item.fitness.toFixed(2)
                : '∞';
            const pathLength = item.genes ? Math.max(item.genes.length - 1, 0) : 0;
            html += `<div class="col-md-6 mb-2">
                <div class="population-item">
                    <strong>${index + 1}.</strong> ${item.genes.join(' → ')} 
                    <span class="badge bg-secondary">${fitnessStr}</span>
                    <div class="small text-muted">Длина: ${pathLength}</div>
                </div>
            </div>`;
        });
        html += '</div>';
    } else {
        html += '<p class="text-muted">Популяция пуста</p>';
    }

    container.innerHTML = html;
}

// Обновление графика
function updateChart(statsHistory) {
    if (!convergenceChart) {
        console.error('График не инициализирован');
        return;
    }
    
    if (!statsHistory || statsHistory.length === 0) {
        console.warn('Нет данных для графика');
        return;
    }

    try {
        const generations = statsHistory.map(stat => stat.generation || stat.generationNumber || 0);
        const bestFitness = statsHistory.map(stat => {
            const value = stat.best !== undefined ? stat.best : (stat.min !== undefined ? stat.min : null);
            return (value === Infinity || value === null || value === undefined) ? null : value;
        });
        const avgFitness = statsHistory.map(stat => {
            const value = stat.average !== undefined ? stat.average : (stat.avg !== undefined ? stat.avg : null);
            return (value === Infinity || value === null || value === undefined) ? null : value;
        });

        convergenceChart.data.labels = generations;
        convergenceChart.data.datasets[0].data = bestFitness;
        convergenceChart.data.datasets[1].data = avgFitness;
        convergenceChart.update('none'); // 'none' для плавного обновления
    } catch (error) {
        console.error('Ошибка обновления графика:', error);
    }
}

// Обновление статуса
function updateStatus(message, type) {
    const statusDiv = document.getElementById('algorithmStatus');
    const className = `status-${type}`;
    statusDiv.innerHTML = `<span class="${className}">${message}</span>`;
}

// Остановка алгоритма
function stopAlgorithm() {
    algorithmRunning = false;
    stepMode = false;
    document.getElementById('runButton').disabled = false;
    document.getElementById('stepButton').disabled = true;
    updateStatus('Алгоритм остановлен', 'error');
}

// Сброс алгоритма
function resetAlgorithm() {
    algorithmRunning = false;
    stepMode = false;
    currentGA = null;
    currentPopulation = null;
    document.getElementById('runButton').disabled = false;
    document.getElementById('stepButton').disabled = true;
    document.getElementById('initStepButton').style.display = 'none';
    document.getElementById('populationSection').style.display = 'none';
    document.getElementById('results').innerHTML = '<p class="text-muted">Результаты будут отображены после запуска алгоритма</p>';
    
    // Сброс графика
    if (convergenceChart) {
        convergenceChart.data.labels = [];
        convergenceChart.data.datasets[0].data = [];
        convergenceChart.data.datasets[1].data = [];
        convergenceChart.update();
    }
    
    updateStatus('Алгоритм сброшен', 'success');
}

// Запуск экспериментов
async function runExperiments(event) {
    if (!currentNetwork) {
        alert('Сначала создайте сеть');
        return;
    }

    updateStatus('Эксперименты запущены...', 'running');
    const experimentsSection = document.getElementById('experimentsSection');
    const experimentsResults = document.getElementById('experimentsResults');
    
    if (!experimentsSection || !experimentsResults) {
        alert('Элементы для отображения экспериментов не найдены');
        return;
    }
    
    experimentsSection.style.display = 'block';
    experimentsResults.innerHTML = '<p>Выполняются эксперименты, пожалуйста подождите...</p>';

    // Отключаем кнопку на время выполнения
    const btn = event ? event.target : document.querySelector('button[onclick*="runExperiments"]');
    if (btn) btn.disabled = true;

    try {
        const experimentRunner = new ExperimentRunner(currentNetwork);
        
        // Запускаем эксперименты с обновлением прогресса
        const results = await experimentRunner.runExperiments((current, total, message) => {
            if (experimentsResults) {
                experimentsResults.innerHTML = 
                    `<div class="progress mb-3" style="height: 30px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" 
                             style="width: ${(current/total)*100}%">
                            ${current}/${total}
                        </div>
                    </div>
                    <p><strong>${message}</strong></p>
                    <p class="text-muted">Это может занять некоторое время...</p>`;
            }
        });

        const report = experimentRunner.generateReport();
        displayExperimentsResults(report);
        
        updateStatus('Эксперименты завершены', 'success');
    } catch (error) {
        console.error('Ошибка экспериментов:', error);
        updateStatus('Ошибка экспериментов: ' + error.message, 'error');
        if (experimentsResults) {
            experimentsResults.innerHTML = 
                `<p class="text-danger"><strong>Ошибка:</strong> ${error.message}</p>
                 <p class="text-muted">Проверьте консоль браузера для подробностей.</p>`;
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Отображение результатов экспериментов
function displayExperimentsResults(report) {
    const container = document.getElementById('experimentsResults');
    if (!container) {
        console.error('Контейнер для результатов экспериментов не найден');
        return;
    }
    
    if (!report || !report.experiments) {
        container.innerHTML = '<p class="text-warning">Нет данных для отображения</p>';
        return;
    }
    
    let html = '<h5 class="mb-3"><i class="fas fa-chart-bar"></i> Сводка результатов экспериментов</h5>';

    const experimentNames = {
        'population_size': 'Влияние размера популяции',
        'mutation_rate': 'Влияние вероятности мутации',
        'crossover_rate': 'Влияние вероятности скрещивания',
        'selection_method': 'Сравнение методов селекции',
        'crossover_method': 'Сравнение методов скрещивания'
    };

    for (const [experimentType, data] of Object.entries(report.experiments)) {
        if (!data || data.bestFitness === undefined) continue;
        
        const experimentName = experimentNames[experimentType] || experimentType;
        html += `<div class="experiment-result mb-3">`;
        html += `<h6><i class="fas fa-flask"></i> ${experimentName}</h6>`;
        html += `<p><strong>Лучший параметр:</strong> ${data.bestParameter}</p>`;
        
        if (data.bestFitness !== Infinity && data.bestFitness !== null) {
            html += `<p><strong>Лучшая приспособленность:</strong> ${data.bestFitness.toFixed(2)}</p>`;
        } else {
            html += `<p><strong>Лучшая приспособленность:</strong> ∞ (решение не найдено)</p>`;
        }
        
        if (data.optimalFitness !== Infinity && data.optimalFitness !== null) {
            html += `<p><strong>Оптимальная приспособленность:</strong> ${data.optimalFitness.toFixed(2)}</p>`;
        } else {
            html += `<p><strong>Оптимальная приспособленность:</strong> ∞ (путь не существует)</p>`;
        }
        
        if (data.deviation !== null && data.deviation !== undefined && 
            data.bestFitness !== Infinity && data.optimalFitness !== Infinity) {
            html += `<p><strong>Отклонение от оптимума:</strong> ${data.deviation.toFixed(1)}%</p>`;
        }
        html += `</div>`;
    }

    if (report.summary && Object.keys(report.summary).length > 0 && report.summary.bestFitness !== Infinity) {
        html += `<div class="experiment-result best mb-3">`;
        html += `<h6><i class="fas fa-trophy"></i> Лучший результат</h6>`;
        html += `<p><strong>Эксперимент:</strong> ${experimentNames[report.summary.bestExperiment] || report.summary.bestExperiment}</p>`;
        html += `<p><strong>Параметр:</strong> ${report.summary.bestParameter}</p>`;
        html += `<p><strong>Приспособленность:</strong> ${report.summary.bestFitness.toFixed(2)}</p>`;
        html += `</div>`;
    }

    container.innerHTML = html;
}

