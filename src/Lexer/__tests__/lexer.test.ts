import { Token, Num, Str, Id } from '../token';
import { Tag } from '../tag';
import { Lexer } from '../index';
import { LexerError } from '../error';

describe('lexer', () => {

    test('tokens', () => {
        const lexer = new Lexer('+-*/(){}');
        expect(lexer.scan()).toEqual(new Token(Tag.PLUS, '+'));
        expect(lexer.scan()).toEqual(new Token(Tag.MINUS, '-'));
        expect(lexer.scan()).toEqual(new Token(Tag.STAR, '*'));
        expect(lexer.scan()).toEqual(new Token(Tag.SLASH, '/'));

        expect(lexer.scan()).toEqual(new Token(Tag.LEFT_PAREN, '('));
        expect(lexer.scan()).toEqual(new Token(Tag.RIGHT_PAREN, ')'));
        expect(lexer.scan()).toEqual(new Token(Tag.LEFT_BRACE, '{'));
        expect(lexer.scan()).toEqual(new Token(Tag.RIGHT_BRACE, '}'));
    });

    test('end', () => {
        const lexer1 = new Lexer('&&');
        expect(lexer1.end).toBeFalsy();

        const lexer2 = new Lexer(`&&
        
        `);
        expect(lexer2.end).toBeFalsy();
        expect(lexer2.scan()).toEqual(new Token(Tag.AND_AND, '&&'));
        expect(lexer2.scan()).toEqual(null);
        expect(lexer2.end).toBeTruthy();

        const lexer3 = new Lexer('');
        expect(lexer3.end).toBeTruthy();
    });


    test('line and col', () => {
        const lexer = new Lexer(`
        &&

        &&
        `);
        while (lexer.scan()) {}

        expect(lexer.line).toBe(5);
        expect(lexer.col).toBe(8);
    });

    test('comment', () => {
        const lexer = new Lexer(`// comment.
    `);
        expect(lexer.scan()).toBe(null);
        expect(lexer.line).toBe(2);
        expect(lexer.col).toBe(4);
    });


    test('number', () => {
        const lexer = new Lexer(`123 123.22234`);

        expect(lexer.scan()).toEqual(new Num(123));
        expect(lexer.scan()).toEqual(new Num(123.22234));
    });

    test('number throws', () => {
        const lexer1 = new Lexer(`123 123.222.34`);
        expect(lexer1.scan()).toEqual(new Num(123));

        expect(() => lexer1.scan()).toThrow();
        expect(() => lexer1.scan()).toThrow();

        const lexer2 = new Lexer(`123 123.`);
        expect(lexer2.scan()).toEqual(new Num(123));

        expect(() => lexer2.scan()).toThrow();
        expect(() => lexer2.scan()).toThrow();
    });

    test('string', () => {
        const lexer = new Lexer('"test string." "123""123123"');
        expect(lexer.scan()).toEqual(new Str('test string.'));
        expect(lexer.scan()).toEqual(new Str("123"));
        expect(lexer.scan()).toEqual(new Str('123123'));
    });

    test('string throws', () => {
        const lexer = new Lexer('"test string." "123""123123');
        expect(lexer.scan()).toEqual(new Str('test string.'));
        expect(lexer.scan()).toEqual(new Str("123"));
        expect(() => lexer.scan()).toThrow();
    });


    test('keywords and id', () => {
        const lexer = new Lexer(`var a1 = 1;
        fun foo() {}
        `);
        expect(lexer.scan()).toEqual(new Token(Tag.ID, 'var'));
        expect(lexer.scan()).toEqual(new Id('a1'));
        expect(lexer.scan()).toEqual(new Token(Tag.EQUAL, '='));
        expect(lexer.scan()).toEqual(new Num(1));
        expect(lexer.scan()).toEqual(new Token(Tag.SEMICOLON, ';'));

        expect(lexer.scan()).toEqual(new Token(Tag.ID, 'fun'));
        expect(lexer.scan()).toEqual(new Id('foo'));
        expect(lexer.scan()).toEqual(new Token(Tag.LEFT_PAREN, '('));
        expect(lexer.scan()).toEqual(new Token(Tag.RIGHT_PAREN, ')'));
        expect(lexer.scan()).toEqual(new Token(Tag.LEFT_BRACE, '{'));
        expect(lexer.scan()).toEqual(new Token(Tag.RIGHT_BRACE, '}'));
    });
});