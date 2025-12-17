/**
 * Модуль для работы с популяцией в генетическом алгоритме
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

class Population {
    constructor(size, network, chromosomeLength = null) {
        this.size = size;
        this.network = network;
        this.chromosomeLength = chromosomeLength || Math.max(network.size - 2, 4);
        this.chromosomes = [];
        this.generation = 0;
        this.fitnessHistory = [];
    }
    
    initializeRandom() {
        this.chromosomes = [];
        
        for (let i = 0; i < this.size; i++) {
            const chromosome = this._generateRandomChromosome();
            this.chromosomes.push(chromosome);
        }
        
        this._sortByFitness();
    }
    
    _generateRandomChromosome() {
        const maxAttempts = 200;
        const maxSteps = Math.max(this.network.size * 2, this.chromosomeLength);

        const tryRandomWalk = () => {
            const path = [this.network.sender];
            const visited = new Set([this.network.sender]);
            let current = this.network.sender;
            let steps = 0;

            while (current !== this.network.receiver && steps < maxSteps) {
                const neighbors = [];
                for (let neighbor = 0; neighbor < this.network.size; neighbor++) {
                    if (neighbor === current) continue;
                    const weight = this.network.getConnectionWeight(current, neighbor);
                    if (weight === Infinity) continue;

                    // Разрешаем возвращаться на уже посещённые узлы только если это приемник,
                    // иначе избегаем петли.
                    if (neighbor === this.network.receiver || !visited.has(neighbor)) {
                        neighbors.push(neighbor);
                    }
                }

                if (neighbors.length === 0) {
                    break; // тупик
                }

                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                path.push(next);
                if (next !== this.network.receiver) {
                    visited.add(next);
                }
                current = next;
                steps++;
            }

            if (current === this.network.receiver) {
                return new Chromosome(path, this.network);
            }
            return null;
        };

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const chromosome = tryRandomWalk();
            if (chromosome) {
                return chromosome;
            }
        }

        // Если случайные попытки не увенчались успехом, используем резервные варианты
        if (this.network.getConnectionWeight(this.network.sender, this.network.receiver) !== Infinity) {
            return new Chromosome([this.network.sender, this.network.receiver], this.network);
        }

        for (let node = 0; node < this.network.size; node++) {
            if (node === this.network.sender || node === this.network.receiver) continue;
            if (this.network.getConnectionWeight(this.network.sender, node) !== Infinity &&
                this.network.getConnectionWeight(node, this.network.receiver) !== Infinity) {
                return new Chromosome([this.network.sender, node, this.network.receiver], this.network);
            }
        }

        return new Chromosome([this.network.sender, this.network.receiver], this.network);
    }
    
    _sortByFitness() {
        this.chromosomes.sort((a, b) => a.fitness - b.fitness);
    }
    
    getBestChromosome() {
        if (this.chromosomes.length > 0) {
            return this.chromosomes[0];
        }
        return null;
    }
    
    getWorstChromosome() {
        if (this.chromosomes.length > 0) {
            return this.chromosomes[this.chromosomes.length - 1];
        }
        return null;
    }
    
    getAverageFitness() {
        if (this.chromosomes.length === 0) {
            return Infinity;
        }
        
        const totalFitness = this.chromosomes.reduce((sum, ch) => sum + ch.fitness, 0);
        return totalFitness / this.chromosomes.length;
    }
    
    getFitnessStatistics() {
        if (this.chromosomes.length === 0) {
            return { min: Infinity, max: Infinity, avg: Infinity, std: 0 };
        }
        
        const fitnessValues = this.chromosomes.map(ch => ch.fitness);
        const min = Math.min(...fitnessValues);
        const max = Math.max(...fitnessValues);
        const avg = fitnessValues.reduce((a, b) => a + b, 0) / fitnessValues.length;
        const variance = fitnessValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / fitnessValues.length;
        const std = Math.sqrt(variance);
        
        return { min, max, avg, std };
    }
    
    selectionTournament(tournamentSize = 3) {
        if (this.chromosomes.length === 0) {
            return null;
        }
        
        const tournament = [];
        const indices = new Set();
        const actualSize = Math.min(tournamentSize, this.chromosomes.length);
        
        while (tournament.length < actualSize) {
            const index = Math.floor(Math.random() * this.chromosomes.length);
            if (!indices.has(index)) {
                indices.add(index);
                tournament.push(this.chromosomes[index]);
            }
        }
        
        return tournament.reduce((best, current) => current.fitness < best.fitness ? current : best);
    }
    
    selectionRoulette() {
        if (this.chromosomes.length === 0) {
            return null;
        }
        
        const maxFitness = Math.max(...this.chromosomes.map(ch => ch.fitness));
        if (maxFitness === Infinity) {
            return this.chromosomes[Math.floor(Math.random() * this.chromosomes.length)];
        }
        
        const weights = this.chromosomes.map(ch => maxFitness - ch.fitness + 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        if (totalWeight === 0) {
            return this.chromosomes[Math.floor(Math.random() * this.chromosomes.length)];
        }
        
        const target = Math.random() * totalWeight;
        let current = 0;
        
        for (let i = 0; i < weights.length; i++) {
            current += weights[i];
            if (current >= target) {
                return this.chromosomes[i];
            }
        }
        
        return this.chromosomes[this.chromosomes.length - 1];
    }
    
    selectionRank() {
        if (this.chromosomes.length === 0) {
            return null;
        }
        
        const weights = [];
        for (let i = 0; i < this.chromosomes.length; i++) {
            weights.push(this.chromosomes.length - i);
        }
        
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const target = Math.random() * totalWeight;
        let current = 0;
        
        for (let i = 0; i < weights.length; i++) {
            current += weights[i];
            if (current >= target) {
                return this.chromosomes[i];
            }
        }
        
        return this.chromosomes[this.chromosomes.length - 1];
    }
    
    removeDuplicates() {
        const seen = new Set();
        const uniqueChromosomes = [];
        
        for (const chromosome of this.chromosomes) {
            const key = JSON.stringify(chromosome.genes);
            if (!seen.has(key)) {
                seen.add(key);
                uniqueChromosomes.push(chromosome);
            }
        }
        
        this.chromosomes = uniqueChromosomes;
    }
    
    maintainSize() {
        if (this.chromosomes.length > this.size) {
            this.chromosomes = this.chromosomes.slice(0, this.size);
        } else if (this.chromosomes.length < this.size) {
            while (this.chromosomes.length < this.size) {
                const newChromosome = this._generateRandomChromosome();
                this.chromosomes.push(newChromosome);
            }
        }
        
        this._sortByFitness();
    }
    
    updateGeneration() {
        this.generation++;
        
        const stats = this.getFitnessStatistics();
        this.fitnessHistory.push({
            generation: this.generation,
            best: stats.min,
            average: stats.avg,
            worst: stats.max
        });
    }
    
    getDiversity() {
        if (this.chromosomes.length <= 1) {
            return 0.0;
        }
        
        let totalDifferences = 0;
        let comparisons = 0;
        
        for (let i = 0; i < this.chromosomes.length; i++) {
            for (let j = i + 1; j < this.chromosomes.length; j++) {
                const genes1 = new Set(this.chromosomes[i].genes.slice(1, -1));
                const genes2 = new Set(this.chromosomes[j].genes.slice(1, -1));
                
                const union = new Set([...genes1, ...genes2]);
                const intersection = new Set([...genes1].filter(x => genes2.has(x)));
                const differences = union.size - intersection.size;
                const maxPossible = union.size;
                
                if (maxPossible > 0) {
                    totalDifferences += differences / maxPossible;
                    comparisons++;
                }
            }
        }
        
        return comparisons > 0 ? totalDifferences / comparisons : 0.0;
    }
    
    toString() {
        if (this.chromosomes.length === 0) {
            return "Пустая популяция";
        }
        
        const stats = this.getFitnessStatistics();
        let result = `Популяция (поколение ${this.generation}, размер ${this.chromosomes.length}):\n`;
        result += `Лучшая приспособленность: ${stats.min.toFixed(2)}\n`;
        result += `Средняя приспособленность: ${stats.avg.toFixed(2)}\n`;
        result += `Худшая приспособленность: ${stats.max.toFixed(2)}\n`;
        result += `Разнообразие: ${this.getDiversity().toFixed(3)}\n\n`;
        
        for (let i = 0; i < Math.min(5, this.chromosomes.length); i++) {
            result += `${i + 1}. ${this.chromosomes[i].toString()}\n`;
        }
        
        return result;
    }
}

