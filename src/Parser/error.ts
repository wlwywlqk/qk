export class ParserError extends Error {
    constructor(public readonly message: string, public readonly line: number, public readonly col: number) {
        super('Parser error: ' + message);
        this.name = 'ParserError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ParserError);
        }
    }
}



export class ParserRuleError extends Error {
    constructor(public readonly message: string, public readonly line: number, public readonly col: number) {
        super('Parser Rule error: ' + message);
        this.name = 'ParserRuleError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ParserRuleError);
        }
    }
}

