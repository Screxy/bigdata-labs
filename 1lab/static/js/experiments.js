/**
 * Модуль для проведения экспериментов с генетическим алгоритмом
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

class ExperimentRunner {
    constructor(network) {
        this.network = network;
        this.results = [];
    }
    
    async runExperiments(onProgress = null) {
        console.log("Запуск серии экспериментов с генетическим алгоритмом");
        this.results = []; // Сброс результатов
        
        try {
            // Эксперимент 1: Влияние размера популяции
            if (onProgress) onProgress(1, 5, "Эксперимент 1: Влияние размера популяции");
            await this._delay(100); // Задержка для обновления UI
            await this._runAsync(() => this._experimentPopulationSize());
            
            // Эксперимент 2: Влияние вероятности мутации
            if (onProgress) onProgress(2, 5, "Эксперимент 2: Влияние вероятности мутации");
            await this._delay(100);
            await this._runAsync(() => this._experimentMutationRate());
            
            // Эксперимент 3: Влияние вероятности скрещивания
            if (onProgress) onProgress(3, 5, "Эксперимент 3: Влияние вероятности скрещивания");
            await this._delay(100);
            await this._runAsync(() => this._experimentCrossoverRate());
            
            // Эксперимент 4: Сравнение методов селекции
            if (onProgress) onProgress(4, 5, "Эксперимент 4: Сравнение методов селекции");
            await this._delay(100);
            await this._runAsync(() => this._experimentSelectionMethods());
            
            // Эксперимент 5: Сравнение методов скрещивания
            if (onProgress) onProgress(5, 5, "Эксперимент 5: Сравнение методов скрещивания");
            await this._delay(100);
            await this._runAsync(() => this._experimentCrossoverMethods());
            
            if (onProgress) onProgress(5, 5, "Эксперименты завершены");
        } catch (error) {
            console.error('Ошибка при выполнении экспериментов:', error);
            throw error;
        }
        
        return this.results;
    }
    
    _runAsync(fn) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    fn();
                    resolve();
                } catch (error) {
                    console.error('Ошибка в эксперименте:', error);
                    resolve(); // Продолжаем выполнение даже при ошибке
                }
            }, 0);
        });
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    _experimentPopulationSize() {
        const populationSizes = [20, 50, 100, 150, 200];
        const results = [];
        
        try {
            const [optimalPath, optimalCost] = this.network.getShortestPathDijkstra();
            
            for (const size of populationSizes) {
                try {
                    const ga = new GeneticAlgorithm(this.network, size);
                    ga.setParameters({
                        mutationRate: 0.1,
                        crossoverRate: 0.8
                    });
                    
                    const startTime = performance.now();
                    const [bestChromosome, statsHistory] = ga.run(50); // Уменьшено для ускорения
                    const executionTime = (performance.now() - startTime) / 1000;
                    
                    const bestFitness = bestChromosome && bestChromosome.fitness !== Infinity 
                        ? bestChromosome.fitness 
                        : Infinity;
                    
                    results.push({
                        experiment: 'population_size',
                        parameter: size,
                        bestFitness: bestFitness,
                        optimalFitness: optimalCost === Infinity ? Infinity : optimalCost,
                        generations: ga.generations,
                        executionTime: executionTime,
                        convergenceGeneration: this._findConvergenceGeneration(statsHistory)
                    });
                } catch (error) {
                    console.error(`Ошибка в эксперименте с размером популяции ${size}:`, error);
                }
            }
            
            this.results.push(...results);
        } catch (error) {
            console.error('Ошибка в эксперименте размера популяции:', error);
        }
        
        return results;
    }
    
    _experimentMutationRate() {
        const mutationRates = [0.01, 0.05, 0.1, 0.2, 0.3];
        const results = [];
        
        const [optimalPath, optimalCost] = this.network.getShortestPathDijkstra();
        
        for (const rate of mutationRates) {
            const ga = new GeneticAlgorithm(this.network, 50);
            ga.setParameters({
                mutationRate: rate,
                crossoverRate: 0.8
            });
            
            const startTime = performance.now();
            const [bestChromosome, statsHistory] = ga.run(100);
            const executionTime = (performance.now() - startTime) / 1000;
            
            results.push({
                experiment: 'mutation_rate',
                parameter: rate,
                bestFitness: bestChromosome ? bestChromosome.fitness : Infinity,
                optimalFitness: optimalCost,
                generations: ga.generations,
                executionTime: executionTime,
                convergenceGeneration: this._findConvergenceGeneration(statsHistory)
            });
        }
        
        this.results.push(...results);
        return results;
    }
    
    _experimentCrossoverRate() {
        const crossoverRates = [0.3, 0.5, 0.7, 0.8, 0.9];
        const results = [];
        
        const [optimalPath, optimalCost] = this.network.getShortestPathDijkstra();
        
        for (const rate of crossoverRates) {
            const ga = new GeneticAlgorithm(this.network, 50);
            ga.setParameters({
                mutationRate: 0.1,
                crossoverRate: rate
            });
            
            const startTime = performance.now();
            const [bestChromosome, statsHistory] = ga.run(100);
            const executionTime = (performance.now() - startTime) / 1000;
            
            results.push({
                experiment: 'crossover_rate',
                parameter: rate,
                bestFitness: bestChromosome ? bestChromosome.fitness : Infinity,
                optimalFitness: optimalCost,
                generations: ga.generations,
                executionTime: executionTime,
                convergenceGeneration: this._findConvergenceGeneration(statsHistory)
            });
        }
        
        this.results.push(...results);
        return results;
    }
    
    _experimentSelectionMethods() {
        const selectionMethods = ['tournament', 'roulette', 'rank'];
        const results = [];
        
        const [optimalPath, optimalCost] = this.network.getShortestPathDijkstra();
        
        for (const method of selectionMethods) {
            const ga = new GeneticAlgorithm(this.network, 50);
            ga.setParameters({
                mutationRate: 0.1,
                crossoverRate: 0.8,
                selectionMethod: method
            });
            
            const startTime = performance.now();
            const [bestChromosome, statsHistory] = ga.run(100);
            const executionTime = (performance.now() - startTime) / 1000;
            
            results.push({
                experiment: 'selection_method',
                parameter: method,
                bestFitness: bestChromosome ? bestChromosome.fitness : Infinity,
                optimalFitness: optimalCost,
                generations: ga.generations,
                executionTime: executionTime,
                convergenceGeneration: this._findConvergenceGeneration(statsHistory)
            });
        }
        
        this.results.push(...results);
        return results;
    }
    
    _experimentCrossoverMethods() {
        const crossoverMethods = ['uniform', 'one_point', 'two_point'];
        const results = [];
        
        const [optimalPath, optimalCost] = this.network.getShortestPathDijkstra();
        
        for (const method of crossoverMethods) {
            const ga = new GeneticAlgorithm(this.network, 50);
            ga.setParameters({
                mutationRate: 0.1,
                crossoverRate: 0.8,
                crossoverMethod: method
            });
            
            const startTime = performance.now();
            const [bestChromosome, statsHistory] = ga.run(100);
            const executionTime = (performance.now() - startTime) / 1000;
            
            results.push({
                experiment: 'crossover_method',
                parameter: method,
                bestFitness: bestChromosome ? bestChromosome.fitness : Infinity,
                optimalFitness: optimalCost,
                generations: ga.generations,
                executionTime: executionTime,
                convergenceGeneration: this._findConvergenceGeneration(statsHistory)
            });
        }
        
        this.results.push(...results);
        return results;
    }
    
    _experimentConvergence() {
        const numRuns = 5;
        const convergenceData = [];
        
        for (let run = 0; run < numRuns; run++) {
            const ga = new GeneticAlgorithm(this.network, 50);
            ga.setParameters({
                mutationRate: 0.1,
                crossoverRate: 0.8
            });
            
            const [bestChromosome, statsHistory] = ga.run(200);
            
            for (const stat of statsHistory) {
                convergenceData.push({
                    run: run + 1,
                    generation: stat.generation,
                    bestFitness: stat.best,
                    averageFitness: stat.average
                });
            }
        }
        
        return convergenceData;
    }
    
    _findConvergenceGeneration(statsHistory) {
        if (statsHistory.length < 10) {
            return statsHistory.length;
        }
        
        for (let i = 10; i < statsHistory.length; i++) {
            const recentBest = Math.min(...statsHistory.slice(i - 10, i).map(s => s.best));
            if (recentBest === statsHistory[i - 1].best) {
                return i - 10;
            }
        }
        
        return statsHistory.length;
    }
    
    generateReport() {
        const report = {
            experiments: {},
            summary: {}
        };
        
        // Группировка по типам экспериментов
        const grouped = {};
        for (const result of this.results) {
            if (!grouped[result.experiment]) {
                grouped[result.experiment] = [];
            }
            grouped[result.experiment].push(result);
        }
        
        // Анализ каждого эксперимента
        for (const [experimentType, results] of Object.entries(grouped)) {
            const bestResult = results.reduce((best, current) => 
                current.bestFitness < best.bestFitness ? current : best
            );
            
            report.experiments[experimentType] = {
                results: results,
                bestParameter: bestResult.parameter,
                bestFitness: bestResult.bestFitness,
                optimalFitness: bestResult.optimalFitness,
                deviation: bestResult.optimalFitness !== Infinity ? 
                    ((bestResult.bestFitness - bestResult.optimalFitness) / bestResult.optimalFitness * 100) : null
            };
        }
        
        // Общий лучший результат
        const allResults = this.results.filter(r => r.bestFitness !== Infinity);
        if (allResults.length > 0) {
            const bestOverall = allResults.reduce((best, current) => 
                current.bestFitness < best.bestFitness ? current : best
            );
            report.summary = {
                bestExperiment: bestOverall.experiment,
                bestParameter: bestOverall.parameter,
                bestFitness: bestOverall.bestFitness
            };
        }
        
        return report;
    }
}

