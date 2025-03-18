interface Node {
    id: number;
    label?: string;
}

interface Edge {
    from: number;
    to: number;
}

interface Step {
    visited: boolean[];
    queue: number[];
    current: number | null;
    description: string;
}

type AdjacencyList = {
    [key: number]: number[];
};

export const createAdjacencyList = (nodes: Node[], edges: Edge[]): AdjacencyList => {
    const adjList: AdjacencyList = {};
    nodes.forEach((node) => {
        adjList[node.id] = [];
    });
    edges.forEach((edge) => {
        adjList[edge.from].push(edge.to);
    });
    return adjList;
};

export const bfsSteps = (nodes: Node[], edges: Edge[], startNode: number): Step[] => {
    const adjacencyList = createAdjacencyList(nodes, edges);
    const steps: Step[] = [];
    const visited = new Array(nodes.length).fill(false);
    const queue: number[] = [startNode];

    steps.push({
        visited: [...visited],
        queue: [...queue],
        current: null,
        description: `Initialize: Add starting node ${nodes[startNode]?.label || startNode} to queue`,
    });

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited[current]) {
            visited[current] = true;
            steps.push({
                visited: [...visited],
                queue: [...queue],
                current: current,
                description: `Visit node ${nodes[current]?.label || current}`,
            });

            const neighbors = adjacencyList[current] || [];
            for (const neighbor of neighbors) {
                if (!visited[neighbor]) {
                    queue.push(neighbor);
                    steps.push({
                        visited: [...visited],
                        queue: [...queue],
                        current: current,
                        description: `Add neighbor ${nodes[neighbor]?.label || neighbor} of node ${nodes[current]?.label || current} to queue`,
                    });
                }
            }
        }
    }
    return steps;
};

export const dfsSteps = (nodes: Node[], edges: Edge[], startNode: number): Step[] => {
    const adjacencyList = createAdjacencyList(nodes, edges);
    const steps: Step[] = [];
    const visited = new Array(nodes.length).fill(false);
    const stack: number[] = [startNode];

    steps.push({
        visited: [...visited],
        queue: [...stack],
        current: null,
        description: `Initialize: Add starting node ${nodes[startNode]?.label || startNode} to stack`,
    });

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (!visited[current]) {
            visited[current] = true;
            steps.push({
                visited: [...visited],
                queue: [...stack],
                current: current,
                description: `Visit node ${nodes[current]?.label || current}`,
            });

            const neighbors = adjacencyList[current] || [];
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighbor = neighbors[i];
                if (!visited[neighbor]) {
                    stack.push(neighbor);
                    steps.push({
                        visited: [...visited],
                        queue: [...stack],
                        current: current,
                        description: `Add neighbor ${nodes[neighbor]?.label || neighbor} of node ${nodes[current]?.label || current} to stack`,
                    });
                }
            }
        }
    }
    return steps;
};