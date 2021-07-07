export class LexerError extends Error {
    constructor(public readonly message: string, public readonly line: number, public readonly col: number) {
        super('Lexer error: ' + message);
        this.name = 'LexerError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, LexerError);
        }
    }
}