
export interface Visitor<T> {
    visitProgram(program: Program): T;

    visitExpression(expression: Expression): T;
    visitAssignExpression(expression: AssignExpression): T;
    visitBoolExpression(expression: BoolExpression): T;
    visitEqualityExpression(expression: EqualityExpression): T;
    visitRelExpression(expression: RelExpression): T;
    visitArithExpression(expression: ArithExpression): T;
    visitUnaryExpression(expression: UnaryExpression): T;
    visitParenthesisExpression(expression: ParenthesisExpression): T;

    visitStatement(statement: Statement): T;
    visitStatements(statements: Statements): T;
    visitType(type: Type): T;
    visitDeclarationStatement(statement: DeclarationStatement): T;
    visitExpressionStatement(statement: ExpressionStatement): T;
    visitIfStatement(statement: IfStatement): T;
    visitBlockStatement(statement: BlockStatement): T;
    visitWhileStatement(statement: WhileStatement): T;
    visitDoWhileStatement(statement: DoWhileStatement): T;
}

interface Acceptor {
    accept<T>(visitor: Visitor<T>): T;
}

export class Program implements Acceptor {
    public statements: Statement[];
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitProgram(this);
    }
}


export class Expression implements Acceptor {
    public value: any;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitExpression(this);
    }
}

export class AssignExpression implements Acceptor {
    public left: string;
    public right: Expression;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitAssignExpression(this);
    }
}

export class BoolExpression implements Acceptor {
    public left: Expression;
    public right: Expression;
    public op: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitBoolExpression(this);
    }
}

export class EqualityExpression implements Acceptor {
    public left: Expression;
    public right: Expression;
    public op: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitEqualityExpression(this);
    } 
}

export class RelExpression implements Acceptor {
    public left: Expression;
    public right: Expression;
    public op: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitRelExpression(this);
    } 
}

export class ArithExpression implements Acceptor {
    public left: Expression;
    public right: Expression;
    public op: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitArithExpression(this);
    } 
}

export class UnaryExpression implements Acceptor {
    public right: Expression;
    public op: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitUnaryExpression(this);
    } 
}

export class ParenthesisExpression implements Acceptor {
    public value: Expression;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitParenthesisExpression(this);
    }
}


export class Statement implements Acceptor {
    public statement: any;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitStatement(this);
    }
}

export class Statements implements Acceptor {
    public statements: Statement[];
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitStatements(this);
    }
}

export class Type implements Acceptor {
    public kind: string;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitType(this);
    }
}

export class DeclarationStatement implements Acceptor {
    public type: Type;
    public name: string;
    public value: Expression;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitDeclarationStatement(this);
    }
}

export class ExpressionStatement implements Acceptor {
    public expression: Expression;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitExpressionStatement(this);
    } 
}

export class IfStatement implements Acceptor {
    public expression: Expression;
    public then: BlockStatement;
    public else: BlockStatement | IfStatement;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitIfStatement(this);
    } 
}

export class BlockStatement implements Acceptor {
    public statements: Statements;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitBlockStatement(this);
    } 
}

export class WhileStatement implements Acceptor {
    public expression: Expression;
    public statement: BlockStatement;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitWhileStatement(this);
    } 
}

export class DoWhileStatement implements Acceptor {
    public expression: Expression;
    public statement: BlockStatement;
    public accept<T>(visitor: Visitor<T>): T {
        return visitor.visitDoWhileStatement(this);
    }
}


export const DefinitionMap = new Map<string, any>([
    ['Program', Program],
    ['Expression', Expression],
    ['AssignExpression', AssignExpression],
    ['BoolExpression', BoolExpression],
    ['EqualityExpression', EqualityExpression],
    ['RelExpression', RelExpression],
    ['ArithExpression', ArithExpression],
    ['UnaryExpression', UnaryExpression],
    ['ParenthesisExpression', ParenthesisExpression],
    ['Statements', Statements],
    ['Statement', Statement],
    ['DeclarationStatement', DeclarationStatement],
    ['ExpressionStatement', ExpressionStatement],
    ['IfStatement', IfStatement],
    ['WhileStatement', WhileStatement],
    ['DoWhileStatement', DoWhileStatement],
    ['BlockStatement', BlockStatement],
    ['Type', Type],
]);