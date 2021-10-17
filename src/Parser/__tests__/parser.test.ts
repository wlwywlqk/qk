import { Parser } from '../index';
import { Lexer } from '../../Lexer';

import fs from 'fs';
import path from 'path';



const rules = fs.readFileSync(path.resolve(__dirname, '../rules.txt')).toString();

describe('parser', () => {
    test('rules', () => {
        // const rules = `
        //     E -> E + T
        //         | T
        //     T -> T * F
        //         | F
        //     F -> ( E )
        //         | id
        // `;
        const code = `id + id * id + id`;

        const parser = new Parser(rules);
        const lexer = new Lexer(code);

        parser.run(lexer);

    });
});
