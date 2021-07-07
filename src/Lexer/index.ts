import { Token, Num, Str } from './token';
import { Tag } from './tag';

export class Lexer {
    public line = 1;
    public col = 0;

    private start = 0;
    private current = 0;



    constructor(private readonly source = '') { }

    public get end() {
        return this.current >= this.source.length;
    }

    private advance(): string {
        return this.source.charAt(this.current++);
    }

    private match(expected: string): boolean {
        if (this.end) return false;
        if (this.source.charAt(this.current) === expected) {
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

        while (!this.end) {
            const c = this.advance();

            switch (c) {
                case ' ':
                case '\t':
                    this.col++;
                case '\r':
                    break;
                case '\n':
                    this.col = 0;
                    this.line++;
                    break;
                case '&':
                    if (this.match('&')) {
                        this.col += 2;
                        return new Token(Tag.AND_AND, '&&');
                    }
                    this.col++;
                    return new Token(Tag.AND, '&');
                case '|':
                    if (this.match('|')) {
                        this.col += 2;
                        return new Token(Tag.OR_OR, '||');
                    }
                    this.col++;
                    return new Token(Tag.OR, '|');
                case '(':
                    this.col++;
                    return new Token(Tag.LEFT_PAREN, '(');
                case ')':
                    this.col++;
                    return new Token(Tag.RIGHT_PAREN, ')');
                case '{':
                    this.col++;
                    return new Token(Tag.LEFT_BRACE, '{');
                case '}':
                    this.col++;
                    return new Token(Tag.RIGHT_BRACE, '}');
                case ',':
                    this.col++;
                    return new Token(Tag.COMMA, ',');
                case ';':
                    this.col++;
                    return new Token(Tag.SEMICOLON, ';');
                case '.': 
                    this.col++;
                    return new Token(Tag.DOT, '.');
                case '+': 
                    this.col++;
                    return new Token(Tag.PLUS, '+');
                case '-':
                    this.col++;
                    return new Token(Tag.MINUS, '-');
                case '*':
                    this.col++;
                    return new Token(Tag.STAR, '*');
                
                case '/':
                    if (this.match('/')) {
                        while (this.peek() !== '\n' && !this.end) {
                            this.advance();
                        }
                        break; 
                    }
                    this.col++;
                    return new Token(Tag.SLASH, '/');

                case '!':
                    if (this.match('=')) {
                        this.col += 2;
                        return new Token(Tag.BANG_EQUAL, '!=');
                    }
                    this.col++;
                    return new Token(Tag.BANG, '!');
                case '=':
                    if (this.match('=')) {
                        this.col += 2;
                        return new Token(Tag.EQUAL_EQUAL, '==');
                    }
                    this.col++;
                    return new Token(Tag.EQUAL, '=');
                case '>':
                    if (this.match('=')) {
                        this.col += 2;
                        return new Token(Tag.GREATER_EQUAL, '>=');
                    }
                    this.col++;
                    return new Token(Tag.GREATER, '>');
                case '<':
                    if (this.match('=')) {
                        this.col += 2;
                        return new Token(Tag.LESS_EQUAL, '<=');
                    }
                    this.col++;
                    return new Token(Tag.LESS, '<');
                



            }
        }
        return null
    }

}