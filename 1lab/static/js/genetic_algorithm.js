/**
 * Основной модуль генетического алгоритма
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

class GeneticAlgorithm {
    constructor(network, populationSize = 50, chromosomeLength = null) {
        this.network = network;
        this.populationSize = populationSize;
        this.chromosomeLength = chromosomeLength || Math.max(network.size - 2, 4);
        
        // Параметры алгоритма
        this.mutationRate = 0.1;
        this.crossoverRate = 0.8;
        this.eliteSize = 5;
        this.tournamentSize = 3;
        
        // Методы селекции и кроссовера
        this.selectionMethod = 'tournament';
        this.crossoverMethod = 'uniform';
        
        // Статистика
        this.generations = 0;
        this.bestFitnessHistory = [];
        this.averageFitnessHistory = [];
        this.executionTime = 0;
        
        // Колбэки для пошагового режима
        this.stepCallbacks = [];
    }
    
    addStepCallback(callback) {
        this.stepCallbacks.push(callback);
    }
    
    removeStepCallback(callback) {
        const index = this.stepCallbacks.indexOf(callback);
        if (index > -1) {
            this.stepCallbacks.splice(index, 1);
        }
    }
    
    _notifyStep(stepName, population, additionalData = null) {
        const data = {
            stepName: stepName,
            generation: population.generation,
            population: population,
            bestChromosome: population.getBestChromosome(),
            statistics: population.getFitnessStatistics()
        };
        
        if (additionalData) {
            Object.assign(data, additionalData);
        }
        
        this.stepCallbacks.forEach(callback => callback(data));
    }
    
    run(maxGenerations = 100, stepMode = false) {
        const startTime = performance.now();
        
        // Инициализация популяции
        const population = new Population(this.populationSize, this.network, this.chromosomeLength);
        population.initializeRandom();
        
        if (stepMode) {
            this._notifyStep("initialization", population);
        }
        
        // Основной цикл эволюции
        for (let generation = 0; generation < maxGenerations; generation++) {
            this.generations = generation + 1;
            
            if (stepMode) {
                this._notifyStep("generation_start", population);
            }
            
            // Создание нового поколения
            const newPopulation = this._createNewGeneration(population, stepMode);
            
            // Обновление популяции
            population.chromosomes = newPopulation.chromosomes;
            population.updateGeneration();
            
            // Сохранение статистики
            const stats = population.getFitnessStatistics();
            this.bestFitnessHistory.push(stats.min);
            this.averageFitnessHistory.push(stats.avg);
            
            if (stepMode) {
                this._notifyStep("generation_end", population);
            }
            
            // Проверка критерия остановки
            if (this._shouldStop(population)) {
                break;
            }
        }
        
        this.executionTime = (performance.now() - startTime) / 1000;
        
        return [population.getBestChromosome(), population.fitnessHistory];
    }
    
    _createNewGeneration(population, stepMode = false) {
        const newPopulation = new Population(this.populationSize, this.network, this.chromosomeLength);
        newPopulation.generation = population.generation;
        
        // Элитизм
        const eliteChromosomes = population.chromosomes.slice(0, this.eliteSize);
        newPopulation.chromosomes.push(...eliteChromosomes);
        
        if (stepMode) {
            this._notifyStep("elite_selection", population, {
                eliteChromosomes: eliteChromosomes
            });
        }
        
        // Создание потомков
        while (newPopulation.chromosomes.length < this.populationSize) {
            // Селекция родителей
            const parent1 = this._selectParent(population);
            const parent2 = this._selectParent(population);
            
            if (stepMode) {
                this._notifyStep("parent_selection", population, {
                    parent1: parent1,
                    parent2: parent2
                });
            }
            
            // Скрещивание
            let child1, child2;
            if (Math.random() < this.crossoverRate) {
                [child1, child2] = parent1.crossover(parent2, this.crossoverMethod);
                
                if (stepMode) {
                    this._notifyStep("crossover", population, {
                        parent1: parent1,
                        parent2: parent2,
                        child1: child1,
                        child2: child2
                    });
                }
            } else {
                child1 = parent1;
                child2 = parent2;
            }
            
            // Мутация
            child1 = child1.mutate(this.mutationRate);
            child2 = child2.mutate(this.mutationRate);
            
            if (stepMode) {
                this._notifyStep("mutation", population, {
                    child1: child1,
                    child2: child2
                });
            }
            
            // Восстановление хромосом
            child1 = child1.repair();
            child2 = child2.repair();
            
            // Добавление потомков
            newPopulation.chromosomes.push(child1, child2);
        }
        
        // Поддержание размера популяции
        newPopulation.maintainSize();
        
        // Удаление дубликатов
        newPopulation.removeDuplicates();
        
        if (stepMode) {
            this._notifyStep("population_update", population, {
                newPopulation: newPopulation
            });
        }
        
        return newPopulation;
    }
    
    _selectParent(population) {
        if (this.selectionMethod === 'tournament') {
            return population.selectionTournament(this.tournamentSize);
        } else if (this.selectionMethod === 'roulette') {
            return population.selectionRoulette();
        } else if (this.selectionMethod === 'rank') {
            return population.selectionRank();
        } else {
            return population.selectionTournament(this.tournamentSize);
        }
    }
    
    _shouldStop(population) {
        // Остановка если найдено оптимальное решение
        const bestChromosome = population.getBestChromosome();
        if (bestChromosome && bestChromosome.fitness !== Infinity) {
            const [shortestPath, shortestCost] = this.network.getShortestPathDijkstra();
            if (Math.abs(bestChromosome.fitness - shortestCost) < 0.1) {
                return true;
            }
        }
        
        // Остановка при сходимости
        if (this.bestFitnessHistory.length >= 20) {
            const recentBest = Math.min(...this.bestFitnessHistory.slice(-20));
            if (recentBest === this.bestFitnessHistory[this.bestFitnessHistory.length - 1]) {
                return true;
            }
        }
        
        // Остановка при низком разнообразии
        if (population.getDiversity() < 0.01) {
            return true;
        }
        
        return false;
    }
    
    setParameters(params) {
        if (params.mutationRate !== undefined) {
            this.mutationRate = params.mutationRate;
        }
        if (params.crossoverRate !== undefined) {
            this.crossoverRate = params.crossoverRate;
        }
        if (params.eliteSize !== undefined) {
            this.eliteSize = params.eliteSize;
        }
        if (params.tournamentSize !== undefined) {
            this.tournamentSize = params.tournamentSize;
        }
        if (params.selectionMethod !== undefined) {
            this.selectionMethod = params.selectionMethod;
        }
        if (params.crossoverMethod !== undefined) {
            this.crossoverMethod = params.crossoverMethod;
        }
        if (params.populationSize !== undefined) {
            this.populationSize = params.populationSize;
        }
    }
    
    getStatistics() {
        return {
            generations: this.generations,
            executionTime: this.executionTime,
            bestFitnessHistory: this.bestFitnessHistory,
            averageFitnessHistory: this.averageFitnessHistory,
            finalBestFitness: this.bestFitnessHistory.length > 0 ? this.bestFitnessHistory[this.bestFitnessHistory.length - 1] : Infinity,
            parameters: {
                populationSize: this.populationSize,
                mutationRate: this.mutationRate,
                crossoverRate: this.crossoverRate,
                eliteSize: this.eliteSize,
                tournamentSize: this.tournamentSize,
                selectionMethod: this.selectionMethod,
                crossoverMethod: this.crossoverMethod
            }
        };
    }
    
    reset() {
        this.generations = 0;
        this.bestFitnessHistory = [];
        this.averageFitnessHistory = [];
        this.executionTime = 0;
        this.stepCallbacks = [];
    }
}

