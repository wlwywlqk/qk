import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { Parser } from './Parser';
import { Lexer } from './Lexer';


const rules = fs.readFileSync(path.resolve(__dirname, './Parser/rules.txt')).toString();

const lexer = new Lexer(`while (1) { var id1 = 1; }`);
const parser = new Parser(rules);

// parser.rules?.print();
// parser.rules?.printParsingTable();

parser.run(lexer);
