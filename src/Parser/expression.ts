
export interface Visitor<T> {
    visitExpression(expression: Expression): T;
    visitAssignExpression(expression: AssignExpression): T;
    visitBoolExpression(expression: BoolExpression): T;
    visitEqualityExpression(expression: EqualityExpression): T;
    visitRelExpression(expression: RelExpression): T;
    visitArithExpression(expression: ArithExpression): T;
    visitUnaryExpression(expression: UnaryExpression): T;
    visitParenthesisExpression(expression: ParenthesisExpression): T;
}

declare interface Acceptor {
    accept<T>(visitor: Visitor<T>): T;
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