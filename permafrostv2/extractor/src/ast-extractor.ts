import * as ts from 'typescript';
import { CallEdge, DeadCodeAnalysis, FunctionNode } from './types';

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
        });

        this.typeChecker = program.getTypeChecker();
        this.sourceFile = program.getSourceFile(filePath)!;
        if (!this.sourceFile){
            throw new Error(`Could not find source file: ${filePath}`);
        }
    }

    public extractCallGraph(): DeadCodeAnalysis{
        this.functions.clear();
        this.calls = [];

        this.findAllFunctions(this.sourceFile);
        this.currentFunction = '';
        this.findAllCalls(this.sourceFile);

        return {
            functions: Array.from(this.functions.values()),
            calls: this.calls,
            entryPoint: 'main'
        }
    }

    // Think about switching this to a strategy pattern for readability?
    private findAllFunctions(node: ts.Node): void {
        switch (node.kind) {
            case ts.SyntaxKind.FunctionDeclaration: 
                this.processFunctionDeclaration(node as ts.FunctionDeclaration);
                break;
            
            case ts.SyntaxKind.ClassDeclaration:
                this.processClassDeclaration(node as ts.ClassDeclaration);
                break;

            case ts.SyntaxKind.MethodDeclaration: 
                this.processMethodDeclaration(node as ts.MethodDeclaration);
                break;
            
            case ts.SyntaxKind.Constructor:
                this.processConstructor(node as ts.ConstructorDeclaration);
        
        }
    }

    private findAllCalls(node: ts.Node): void {
        switch (node.kind){
            case ts.SyntaxKind.FunctionDeclaration:
                const funcDeclaration = node as ts.FunctionDeclaration;
                if (!funcDeclaration.name){
                    return
                }
                
                // Should this be below funcDeclaration.body?
                this.currentFunction = funcDeclaration.name.text;

                if (!funcDeclaration.body){
                    return;
                }

                this.findCallsInBlock(funcDeclaration.body);
                return;
            
            case ts.SyntaxKind.MethodDeclaration:
                const methodDeclaration = node as ts.MethodDeclaration;
                const className = this.getContainingClassName(methodDeclaration);
                if (className && methodDeclaration.name && ts.isIdentifier(methodDeclaration.name)){
                    this.currentFunction = `${className}.${methodDeclaration.name.text}`;
                    if (methodDeclaration.body){
                        this.findCallsInBlock(methodDeclaration.body);
                    }
                }
                return;
            
            case ts.SyntaxKind.Constructor:
                const constructorDelcaration = node as ts.ConstructorDeclaration;
                const constructorClassName = this.getContainingClassName(constructorDelcaration);

                if (constructorClassName){
                    this.currentFunction = `${constructorClassName}.constructor`;
                    if (constructorDelcaration.body){
                        this.findCallsInBlock(constructorDelcaration.body);
                    }
                }
                return;
        }

        ts.forEachChild(node, child => this.findAllCalls(child));
    }

    private findCallsInBlock(block: ts.Block): void{
        const findCalls = (node: ts.Node): void => {
            if (ts.isCallExpression(node)){
                this.processCallExpression(node);
            }
            ts.forEachChild(node, findCalls);
        }

        findCalls(block);
    }

    private processFunctionDeclaration(node: ts.FunctionDeclaration): void {
        if (!node.name || !ts.isIdentifier(node.name)) return;

        const name = node.name.text;
        const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        this.functions.set(name, {
            id: name,
            name,
            type: 'function',
            line
        });
    }

    private processClassDeclaration(node: ts.ClassDeclaration): void{
        ts.forEachChild(node, child => {
            if (ts.isMethodDeclaration(child) || ts.isConstructorDeclaration(child)){
                this.findAllFunctions(child);
            }
        });
    }

    private processMethodDeclaration(node: ts.MethodDeclaration): void{
        const className = this.getContainingClassName(node);
        if (!className ||  !node.name || !ts.isIdentifier(node.name)) return;

        const methodName = node.name.text;
        const id = `${className}.${methodName}`;
        const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        this.functions.set(id, {
            id,
            name: methodName,
            type: 'method',
            line,
            className
        })
    }

    private processConstructor(node: ts.ConstructorDeclaration): void {
        const className = this.getContainingClassName(node);
        if (!className) return;

        const id = `${className}.constructor`;
        const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        this.functions.set(id, {
            id,
            name: 'constructor',
            type: 'constructor',
            line,
            className
        });
    }

    // ABSOLUTELY needs a rewrite
    private processCallExpression(node: ts.CallExpression): void{
        if (!this.currentFunction) return;

        const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        let calledFunction: string | null = null;

        if (ts.isIdentifier(node.expression)){
            calledFunction = node.expression.text;
        } 
        else if (ts.isPropertyAccessExpression(node.expression)){
            const propertyAccess = node.expression;

            // THIS IS REALLY GROSS, DESPERATELY NEEDS A REWRITE
            if (ts.isIdentifier(propertyAccess.name)){
                const methodName = propertyAccess.name.text;

                if (ts.isIdentifier(propertyAccess.expression)){
                    const objectName = propertyAccess.expression.text;
                    const possibleClassMethod = `${objectName}.${methodName}`;
                    if (this.functions.has(possibleClassMethod)){
                        calledFunction = possibleClassMethod;
                    }
                }
                else if (ts.isNewExpression(propertyAccess.expression)){
                    if (ts.isIdentifier(propertyAccess.expression.expression)){
                        const className = propertyAccess.expression.expression.text;
                        calledFunction = `${className}.${methodName}`
                    }
                }
                if (!calledFunction && this.functions.has(methodName)){
                    calledFunction = methodName;
                }
            }
        }
        else if (ts.isNewExpression(node.expression) && ts.isIdentifier(node.expression.expression)){
            const className = node.expression.expression.text;
            calledFunction = `${className}.constructor`;
        }

        if (calledFunction && this.functions.has(calledFunction)){
            this.calls.push({
                from: this.currentFunction,
                to: calledFunction,
                line
            })
        }
    }

    //FINISH THIS
    private getContainingClassName(node: ts.Node): string | null {
        let parent = node.parent;

        return "";
    }
}