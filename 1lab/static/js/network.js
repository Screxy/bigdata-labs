/**
 * Модуль для работы с сетью и графом
 * Автор: Данцаранов Владислав Баторович
 * Email: dvbvladis@mail.ru
 * Курс: Большие данные, 7 семестр
 * Год: 2025
 */

class Network {
    constructor(size = 8) {
        this.size = size;
        this.adjacencyMatrix = [];
        this.sender = 0;
        this.receiver = size - 1;
        
        // Инициализация матрицы смежности
        for (let i = 0; i < size; i++) {
            this.adjacencyMatrix[i] = [];
            for (let j = 0; j < size; j++) {
                if (i === j) {
                    this.adjacencyMatrix[i][j] = 0; // Петли
                } else {
                    this.adjacencyMatrix[i][j] = Infinity;
                }
            }
        }
    }
    
    generateRandomNetwork(maxWeight = 10, connectionProbability = 0.7) {
        for (let i = 0; i < this.size; i++) {
            for (let j = i + 1; j < this.size; j++) {
                if (Math.random() < connectionProbability) {
                    const weight = Math.floor(Math.random() * maxWeight) + 1;
                    this.adjacencyMatrix[i][j] = weight;
                    this.adjacencyMatrix[j][i] = weight;
                } else {
                    this.adjacencyMatrix[i][j] = Infinity;
                    this.adjacencyMatrix[j][i] = Infinity;
                }
            }
        }
    }
    
    setConnection(fromNode, toNode, weight) {
        if (fromNode >= 0 && fromNode < this.size && toNode >= 0 && toNode < this.size) {
            this.adjacencyMatrix[fromNode][toNode] = weight;
        }
    }
    
    removeConnection(fromNode, toNode) {
        if (fromNode >= 0 && fromNode < this.size && toNode >= 0 && toNode < this.size) {
            this.adjacencyMatrix[fromNode][toNode] = Infinity;
        }
    }
    
    getConnectionWeight(fromNode, toNode) {
        if (fromNode >= 0 && fromNode < this.size && toNode >= 0 && toNode < this.size) {
            return this.adjacencyMatrix[fromNode][toNode];
        }
        return Infinity;
    }
    
    calculatePathCost(path) {
        if (path.length < 2) {
            return Infinity;
        }
        
        let totalCost = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = path[i];
            const toNode = path[i + 1];
            const weight = this.getConnectionWeight(fromNode, toNode);
            
            if (weight === Infinity) {
                return Infinity;
            }
            
            totalCost += weight;
        }
        
        return totalCost;
    }
    
    isValidPath(path) {
        if (path.length < 2) {
            return false;
        }
        
        // Проверка начала и конца пути
        if (path[0] !== this.sender || path[path.length - 1] !== this.receiver) {
            return false;
        }
        
        // Проверка диапазона узлов
        if (!path.every(node => node >= 0 && node < this.size)) {
            return false;
        }
        
        // Проверка на дубликаты в промежуточных узлах
        const middleNodes = path.length > 2 ? path.slice(1, -1) : [];
        const uniqueMiddleNodes = new Set(middleNodes);
        if (middleNodes.length !== uniqueMiddleNodes.size) {
            return false;
        }
        
        // Проверка существования связей
        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = path[i];
            const toNode = path[i + 1];
            if (this.getConnectionWeight(fromNode, toNode) === Infinity) {
                return false;
            }
        }
        
        return true;
    }
    
    getShortestPathDijkstra() {
        const distances = new Array(this.size).fill(Infinity);
        const previous = new Array(this.size).fill(-1);
        const visited = new Array(this.size).fill(false);
        
        distances[this.sender] = 0;
        
        for (let _ = 0; _ < this.size; _++) {
            // Находим узел с минимальным расстоянием
            let u = -1;
            let minDist = Infinity;
            
            for (let i = 0; i < this.size; i++) {
                if (!visited[i] && distances[i] < minDist) {
                    minDist = distances[i];
                    u = i;
                }
            }
            
            if (u === -1) {
                break;
            }
            
            visited[u] = true;
            
            // Обновляем расстояния до соседних узлов
            for (let v = 0; v < this.size; v++) {
                if (!visited[v] && this.adjacencyMatrix[u][v] !== Infinity) {
                    const alt = distances[u] + this.adjacencyMatrix[u][v];
                    if (alt < distances[v]) {
                        distances[v] = alt;
                        previous[v] = u;
                    }
                }
            }
        }
        
        // Восстанавливаем путь
        if (distances[this.receiver] === Infinity) {
            return [[], Infinity];
        }
        
        const path = [];
        let current = this.receiver;
        while (current !== -1) {
            path.push(current);
            current = previous[current];
        }
        
        path.reverse();
        return [path, distances[this.receiver]];
    }
    
    toString() {
        let result = "Матрица смежности сети:\n    ";
        for (let j = 0; j < this.size; j++) {
            result += `${j.toString().padStart(4)}`;
        }
        result += "\n";
        
        for (let i = 0; i < this.size; i++) {
            result += `${i.toString().padStart(2)}: `;
            for (let j = 0; j < this.size; j++) {
                if (this.adjacencyMatrix[i][j] === Infinity) {
                    result += "  ∞";
                } else {
                    result += `${Math.floor(this.adjacencyMatrix[i][j]).toString().padStart(3)}`;
                }
            }
            result += "\n";
        }
        
        result += `\nОтправитель: ${this.sender}\n`;
        result += `Получатель: ${this.receiver}\n`;
        
        return result;
    }
}

