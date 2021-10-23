export class ParserError extends Error {
    constructor(public readonly message: string, public readonly line: number = 0, public readonly col: number = 0) {
        super('Parser error: ' + message);
        this.name = 'ParserError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ParserError);
        }
    }
}



export class ParserRuleError extends Error {
    constructor(public readonly message: string, public readonly line: number = 0, public readonly col: number = 0) {
        super('Parser Rule error: ' + message);
        this.name = 'ParserRuleError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ParserRuleError);
        }
    }
}

