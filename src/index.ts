import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { Parser } from './Parser';
import { Lexer } from './Lexer';


const rules = fs.readFileSync(path.resolve(__dirname, './Parser/rules.txt')).toString();

const lexer = new Lexer(`
if (true) {
    var a = 1
} else if (1) {

}
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

    id + id11 + id1 * id2 / !-(id3)
}

{
    var aaa = bbb
    if (aaa) {
        bbb == aaa
    }
}
`);
const parser = new Parser(rules);

// parser.rules?.print();
// parser.rules?.printParsingTable();

const [ast, errors] = parser.run(lexer, (statusStack: any, stack: any[]) => {
    console.log(`${stack.join(' ')}`);
});

console.log(JSON.stringify(ast, null, 4));
