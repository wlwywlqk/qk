import { Parser } from '../index';
import { Lexer } from '../../Lexer';

import fs from 'fs';
import path from 'path';



const rules = fs.readFileSync(path.resolve(__dirname, '../rules.txt')).toString();

describe('parser', () => {
    test('rules', () => {
        
        const code = `id1 + id2 * id3 + id4`;

        const parser = new Parser(rules);
        const lexer = new Lexer(code);

        parser.run(lexer);

    });
});
