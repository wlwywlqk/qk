
import fs from 'fs';
import path from 'path';
import { Token, Num, Str } from '../Lexer/token';
import { Tag } from '../Lexer/tag';
import { Lexer } from '../Lexer';
import { LexerError } from '../Lexer/error';
import { Parser } from '../Parser'




const rules = fs.readFileSync(path.resolve(__dirname, '../Parser/rules.txt')).toString();




describe('qk', () => {
    test('', () => {
        const parser = new Parser(rules);

    })
});