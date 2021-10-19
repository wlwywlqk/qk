import { Token, Num, Str, Id } from './token';
import { Tag } from './tag';
import { LexerError } from './error';

import { isNumber, isLetter } from '../utils';

export class Lexer {
    public line = 1;
    public col = 0;

    private start = 0;
    private current = 0;

    public error: LexerError | null = null

    public static Keywords = new Map();

    public finished = false;

    constructor(private readonly source = '') {
        Lexer.Keywords.set('var', new Token(Tag.ID, 'var'));
        Lexer.Keywords.set('fun', new Token(Tag.ID, 'fun'));
        Lexer.Keywords.set('if', new Token(Tag.ID, 'if'));
        Lexer.Keywords.set('else', new Token(Tag.ID, 'else'));
        Lexer.Keywords.set('do', new Token(Tag.ID, 'do'));
        Lexer.Keywords.set('while', new Token(Tag.ID, 'while'));
        Lexer.Keywords.set('for', new Token(Tag.ID, 'for'));
        Lexer.Keywords.set('class', new Token(Tag.ID, 'class'));
        Lexer.Keywords.set('extends', new Token(Tag.ID, 'extends'));
        Lexer.Keywords.set('true', new Token(Tag.ID, 'true'));
        Lexer.Keywords.set('false', new Token(Tag.ID, 'false'));
        Lexer.Keywords.set('this', new Token(Tag.ID, 'this'));
        Lexer.Keywords.set('return', new Token(Tag.ID, 'return'));
        Lexer.Keywords.set('null', new Token(Tag.ID, 'null'));
    }

    public get end() {
        return this.current >= this.source.length;
    }

    public get rest() {
        return this.source.slice(this.current);
    }

    private advance(): string {
        this.col++;
        return this.source.charAt(this.current++);
    }

    private match(expected: string): boolean {
        if (this.end) return false;
        if (this.source.charAt(this.current) === expected) {
            this.col++;
            this.current++;
            return true;
        }
        return false;
    }

    private peek(): string {
        if (this.end) return '\0';
        return this.source.charAt(this.current);
    }

    public scan(): Token | null {
        if (this.error) {
            throw this.error;
        }
        try {
            const result = this.scanImpl();
            return result;
        } catch (e) {
            this.error = e as LexerError;
            throw e;
        }
    }

    private scanImpl(): Token | null {

        while (!this.end) {
            const c = this.advance();

            switch (c) {
                case ' ':
                case '\t':
                case '\r':
                    break;
                case '\n':
                    this.col = 0;
                    this.line++;
                    break;
                case '&':
                    if (this.match('&')) {
                        return new Token(Tag.AND_AND, '&&');
                    }
                    return new Token(Tag.AND, '&');
                case '|':
                    if (this.match('|')) {
                        return new Token(Tag.OR_OR, '||');
                    }
                    return new Token(Tag.OR, '|');
                case '(':
                    return new Token(Tag.LEFT_PAREN, '(');
                case ')':
                    return new Token(Tag.RIGHT_PAREN, ')');
                case '{':
                    return new Token(Tag.LEFT_BRACE, '{');
                case '}':
                    return new Token(Tag.RIGHT_BRACE, '}');
                case ',':
                    return new Token(Tag.COMMA, ',');
                case ';':
                    return new Token(Tag.SEMICOLON, ';');
                case '.':
                    return new Token(Tag.DOT, '.');
                case '+':
                    return new Token(Tag.PLUS, '+');
                case '-':
                    return new Token(Tag.MINUS, '-');
                case '*':
                    return new Token(Tag.STAR, '*');
                case '"':
                    this.start = this.current - 1;
                    while (this.peek() !== '"' && !this.end) {
                        this.advance();
                    }
                    if (this.match('"')) {
                        const lexeme = this.source.slice(this.start, this.current);
                        return new Str(lexeme.slice(1, -1));
                    }
                    throw new LexerError('Invalid token', this.line, this.col);
                case '/':
                    if (this.match('/')) {
                        while (this.peek() !== '\n' && !this.end) {
                            this.advance();
                        }
                        break;
                    }
                    return new Token(Tag.SLASH, '/');

                case '!':
                    if (this.match('=')) {
                        return new Token(Tag.BANG_EQUAL, '!=');
                    }
                    return new Token(Tag.BANG, '!');
                case '=':
                    if (this.match('=')) {
                        return new Token(Tag.EQUAL_EQUAL, '==');
                    }
                    return new Token(Tag.EQUAL, '=');
                case '>':
                    if (this.match('=')) {
                        return new Token(Tag.GREATER_EQUAL, '>=');
                    }
                    return new Token(Tag.GREATER, '>');
                case '<':
                    if (this.match('=')) {
                        return new Token(Tag.LESS_EQUAL, '<=');
                    }
                    return new Token(Tag.LESS, '<');

                default:
                    if (isNumber(c)) {
                        this.start = this.current - 1;

                        while (isNumber(this.peek())) {
                            this.advance();
                        }

                        if (this.peek() === '.') {
                            let hasDecimals = false;
                            this.advance();
                            while (isNumber(this.peek())) {
                                hasDecimals = true
                                this.advance();
                            }

                            if (!hasDecimals) {
                                throw new LexerError('Unexpected number.', this.line, this.col);
                            }

                            if (this.peek() === '.') {
                                throw new LexerError('Unexpected number.', this.line, this.col);
                            }

                        }
                        if (isLetter(this.peek())) {
                            throw new LexerError('Unexpected number.', this.line, this.col);
                        }
                        const lexeme = this.source.slice(this.start, this.current)
                        return new Num(Number(lexeme));
                    } else if (isLetter(c)) {
                        this.start = this.current - 1;
                        while (isLetter(this.peek()) || isNumber(this.peek())) {
                            this.advance();
                        }
                        const lexeme = this.source.slice(this.start, this.current);
                        if (Lexer.Keywords.has(lexeme)) {
                            return Lexer.Keywords.get(lexeme);
                        } else {
                            return new Id(lexeme);
                        }
                    }
            }
        }
        return null
    }
}
