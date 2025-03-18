export interface Node {
  id: number;
  label: string;
  x: number;
  y: number;
}

export interface Edge {
  id: number;
  from: number;
  to: number;
}

export interface NodeToAdd {
  label: string;
  x: number | string;
  y: number | string;
}

export interface EdgeToAdd {
  from: string;
  to: string;
}


export interface GraphStep {
  visited: boolean[];
  queue: number[];
  current: number | null;
  description: string;
}

export interface GraphState {
  visitedNodes: boolean[];
  currentQueue: string[];
  currentNode: string | null;
  stepDescription: string;
}