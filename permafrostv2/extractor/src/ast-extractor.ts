import * as ts from 'typescript';
import { CallEdge, FunctionNode } from './types';

export class OSTSDeadCodeExtractor {
    private sourceFile: ts.SourceFile;
    private typeChecker: ts.TypeChecker;
    private currentFunction: string = '';
    private functions: Map<string, FunctionNode> = new Map();
    private calls: CallEdge[] = [];

    constructor(filePath: string) {
        // Should look more into the documentation to determine if this initialization is correct
        const program = ts.createProgram([filePath], {
            target: ts.ScriptTarget.Latest, // This may have to be changed based on the interpreter that OSTS uses
            module: ts.ModuleKind.CommonJS, 
            allowJs: true,
            checkJs: false
        })
    }
}