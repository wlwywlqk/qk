import { Token, Num, Str } from './token';
import { Tag } from './tag';
import { LexerError } from './error';

export class Lexer {
    public line = 1;
    public col = 0;

    private start = 0;
    private current = 0;

    public error: LexerError | null = null

    public static Keywords = new Map();


    constructor(private readonly source = '') {
        Lexer.Keywords.set('var', new Token(Tag.VAR, 'var'));
        Lexer.Keywords.set('fun', new Token(Tag.FUN, 'fun'));
        Lexer.Keywords.set('if', new Token(Tag.IF, 'if'));
        Lexer.Keywords.set('else', new Token(Tag.ELSE, 'else'));
        Lexer.Keywords.set('do', new Token(Tag.DO, 'do'));
        Lexer.Keywords.set('while', new Token(Tag.WHILE, 'while'));
        Lexer.Keywords.set('for', new Token(Tag.FOR, 'for'));
        Lexer.Keywords.set('class', new Token(Tag.CLASS, 'class'));
        Lexer.Keywords.set('extends', new Token(Tag.EXTENDS, 'extends'));
        Lexer.Keywords.set('true', new Token(Tag.TRUE, 'true'));
        Lexer.Keywords.set('false', new Token(Tag.FALSE, 'false'));
        Lexer.Keywords.set('this', new Token(Tag.THIS, 'this'));
        Lexer.Keywords.set('return', new Token(Tag.RETURN, 'return'));
        Lexer.Keywords.set('null', new Token(Tag.NULL, 'null'));
    }

    public get end() {
        return this.current >= this.source.length;
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
            return this.scanImpl();
        } catch (e) {
            this.error = e;
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
                        return new Str(lexeme, lexeme.slice(1, -1));
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
                    if (this.isNumber(c)) {
                        this.start = this.current - 1;

                        while(this.isNumber(this.peek())) {
                            this.advance();
                        }

                        if (this.peek() === '.') {
                            let hasDecimals = false;
                            this.advance();
                            while(this.isNumber(this.peek())) {
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
                        if (this.isLetter(this.peek())) {
                            throw new LexerError('Unexpected number.', this.line, this.col);
                        }
                        const lexeme = this.source.slice(this.start, this.current)
                        return new Num(lexeme, Number(lexeme));
                    } else if (this.isLetter(c)) {
                        this.start = this.current - 1;
                        while (this.isLetter(this.peek()) || this.isNumber(this.peek())) {
                            this.advance();
                        }
                        const lexeme = this.source.slice(this.start, this.current);
                        if (Lexer.Keywords.has(lexeme)) {
                            return Lexer.Keywords.get(lexeme);
                        } else {
                            return new Token(Tag.ID, lexeme);
                        }
                    }
            }
        }
        return null
    }

    private isNumber(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isLetter(char: string): boolean {
        return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
    }

}