import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { Parser } from './Parser'


const rules = fs.readFileSync(path.resolve(__dirname, './Parser/rules.txt')).toString();


const parser = new Parser(rules);