/**
 * Класс для представления хромосомы (пути в сети)
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

class Chromosome {
    constructor(genes, network) {
        this.genes = [...genes];
        this.network = network;
        this.fitness = this.calculateFitness();
        this.isValid = this.network.isValidPath(this.genes);
    }
    
    calculateFitness() {
        if (!this.network.isValidPath(this.genes)) {
            return Infinity;
        }
        
        const cost = this.network.calculatePathCost(this.genes);
        
        if (cost === Infinity) {
            return Infinity;
        }
        
        // Добавляем штраф за длину пути
        const lengthPenalty = this.genes.length * 0.1;
        
        return cost + lengthPenalty;
    }
    
    mutate(mutationRate = 0.1) {
        const newGenes = [...this.genes];
        
        if (newGenes.length > 2 && Math.random() < mutationRate) {
            const mutationIndex = Math.floor(Math.random() * (newGenes.length - 2)) + 1;
            
            const availableNodes = [];
            for (let i = 0; i < this.network.size; i++) {
                if (!newGenes.slice(0, mutationIndex).includes(i) && 
                    !newGenes.slice(mutationIndex + 1).includes(i)) {
                    availableNodes.push(i);
                }
            }
            
            if (availableNodes.length > 0) {
                newGenes[mutationIndex] = availableNodes[Math.floor(Math.random() * availableNodes.length)];
            }
        }
        
        return new Chromosome(newGenes, this.network);
    }
    
    crossover(other, crossoverType = 'uniform') {
        if (crossoverType === 'uniform') {
            return this._uniformCrossover(other);
        } else if (crossoverType === 'one_point') {
            return this._onePointCrossover(other);
        } else if (crossoverType === 'two_point') {
            return this._twoPointCrossover(other);
        } else {
            return this._uniformCrossover(other);
        }
    }
    
    _uniformCrossover(other) {
        const minLength = Math.min(this.genes.length, other.genes.length);
        const maxLength = Math.max(this.genes.length, other.genes.length);
        
        const child1Genes = [];
        const child2Genes = [];
        
        for (let i = 0; i < minLength; i++) {
            if (Math.random() < 0.5) {
                child1Genes.push(this.genes[i]);
                child2Genes.push(other.genes[i]);
            } else {
                child1Genes.push(other.genes[i]);
                child2Genes.push(this.genes[i]);
            }
        }
        
        if (this.genes.length > minLength) {
            child1Genes.push(...this.genes.slice(minLength));
        }
        if (other.genes.length > minLength) {
            child2Genes.push(...other.genes.slice(minLength));
        }
        
        // Обеспечиваем правильное начало и конец пути
        child1Genes[0] = this.network.sender;
        child1Genes[child1Genes.length - 1] = this.network.receiver;
        child2Genes[0] = this.network.sender;
        child2Genes[child2Genes.length - 1] = this.network.receiver;
        
        return [
            new Chromosome(child1Genes, this.network),
            new Chromosome(child2Genes, this.network)
        ];
    }
    
    _onePointCrossover(other) {
        const minLength = Math.min(this.genes.length, other.genes.length);
        
        if (minLength <= 2) {
            return this._uniformCrossover(other);
        }
        
        const crossoverPoint = Math.floor(Math.random() * (minLength - 1)) + 1;
        
        const child1Genes = [...this.genes.slice(0, crossoverPoint), ...other.genes.slice(crossoverPoint)];
        const child2Genes = [...other.genes.slice(0, crossoverPoint), ...this.genes.slice(crossoverPoint)];
        
        child1Genes[0] = this.network.sender;
        child1Genes[child1Genes.length - 1] = this.network.receiver;
        child2Genes[0] = this.network.sender;
        child2Genes[child2Genes.length - 1] = this.network.receiver;
        
        return [
            new Chromosome(child1Genes, this.network),
            new Chromosome(child2Genes, this.network)
        ];
    }
    
    _twoPointCrossover(other) {
        const minLength = Math.min(this.genes.length, other.genes.length);
        
        if (minLength <= 3) {
            return this._uniformCrossover(other);
        }
        
        const point1 = Math.floor(Math.random() * (minLength - 2)) + 1;
        const point2 = Math.floor(Math.random() * (minLength - point1 - 1)) + point1 + 1;
        
        const child1Genes = [
            ...this.genes.slice(0, point1),
            ...other.genes.slice(point1, point2),
            ...this.genes.slice(point2)
        ];
        const child2Genes = [
            ...other.genes.slice(0, point1),
            ...this.genes.slice(point1, point2),
            ...other.genes.slice(point2)
        ];
        
        child1Genes[0] = this.network.sender;
        child1Genes[child1Genes.length - 1] = this.network.receiver;
        child2Genes[0] = this.network.sender;
        child2Genes[child2Genes.length - 1] = this.network.receiver;
        
        return [
            new Chromosome(child1Genes, this.network),
            new Chromosome(child2Genes, this.network)
        ];
    }
    
    repair() {
        if (this.genes.length < 2) {
            return this;
        }
        
        const seen = new Set();
        const repairedGenes = [];
        
        for (const gene of this.genes) {
            if (!seen.has(gene)) {
                seen.add(gene);
                repairedGenes.push(gene);
            } else if (gene === this.network.sender && repairedGenes.length === 0) {
                repairedGenes.push(gene);
            } else if (gene === this.network.receiver && repairedGenes.length > 0) {
                repairedGenes.push(gene);
            }
        }
        
        if (repairedGenes.length === 0 || repairedGenes[0] !== this.network.sender) {
            repairedGenes.unshift(this.network.sender);
        }
        if (repairedGenes.length === 0 || repairedGenes[repairedGenes.length - 1] !== this.network.receiver) {
            repairedGenes.push(this.network.receiver);
        }
        
        return new Chromosome(repairedGenes, this.network);
    }
    
    toString() {
        return `Path: ${this.genes.join(' -> ')}, Cost: ${this.fitness.toFixed(2)}`;
    }
}

