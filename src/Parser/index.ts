import { Rules } from './rules';


export class Parser {
    public rules: Rules | null = null;
    constructor (rules: string) {
        this.rules = new Rules(rules);

        // this.rules.printParsingTable();
    }
}