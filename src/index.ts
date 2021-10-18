import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { Parser } from './Parser';
import { Lexer } from './Lexer';


const rules = fs.readFileSync(path.resolve(__dirname, './Parser/rules.txt')).toString();

const lexer = new Lexer(`if (true) { var a = 1 } else if (1) {}
while (123) {
    if (1) {
        while (1) {
            var a = 1
        }
    }

    do {
        var aa = 1123
    } while (123)
    a = 123
}
`);
const parser = new Parser(rules);

// parser.rules?.print();
// parser.rules?.printParsingTable();

parser.run(lexer);
