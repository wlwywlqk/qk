import { isNumber, isLetter } from '../utils';

export class RuleItem {

    public left: string = '';
    public right: string[] = [];
    constructor () {

    }
}

export class Rules {
    public items: RuleItem[] = [];

    constructor (public readonly rules: string) {
        const len = rules.length;
        let i = 0;
        let newLine = true;
        let item = null;
        while (i < len) {
            switch (rules[i]) {
                case ' ': i++; break;
                case '\n': i++; newLine = true; break;
                default: 
                    if (isLetter(rules[i])) {

                    } else if () {

                    }
                newLine = false;
            }
        }
    }
}