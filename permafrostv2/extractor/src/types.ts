export interface DeadCodeAnalysis{
    functions: FunctionNode[];
    calls: CallEdge[];
    entryPoint: string;
}

export interface FunctionNode {
    id: string;
    name: string;
    type: 'function' | 'method' | 'constructor';
    line: number;
    className?: string;
}

export interface CallEdge {
    from: string;
    to: string;
    line: number;
}