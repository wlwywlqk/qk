import { isNumber, isLetter } from '../utils';
import { ParserRuleError } from './error';

export interface ProductionRightSingle {
    code: string;
    symbols: string[];
}
export interface ProductionRightEqual {
    items: ProductionRightSingle[];
    left: boolean;
    right: boolean;
}

export type ProductionLeft = string;

export type ProductionRight = ProductionRightSingle | ProductionRightEqual;

export class Production {

    public left: ProductionLeft = '';
    public right: ProductionRight[] = [];
    constructor () {

    }
}

export class Rules {
    public productions: Production[] = [];
    public line = 1;
    public col = 0;

    private i = 0;

    public error: ParserRuleError | null = null

    constructor (public readonly rules: string) {

        let production = null

        while (production = this.pickProduction()) {
            this.productions.push(production);
        }
    }

    private advance() {
        this.i++;
        this.col++;
    }

    private pick(expected: string) {
        this.pickBlank();
        let j = 0;
        const len = expected.length;
        const start = this.col;
        while (j < len && this.rules[this.i] === expected[j]) {
            this.advance();
        }
        if (j !== len - 1) {
            throw new ParserRuleError('Unexpected picked.', this.line, start);
        }
    }

    private pickBlank() {
        while (this.rules[this.i] === ' ') {
            this.advance();
        }
    }

    private pickLetter(): string {
        this.pickBlank();
        const start = this.i;
        while (isLetter(this.rules[this.i])) {
            this.advance();
        }
        if (this.i === start) {
            throw new ParserRuleError('Unexpected letter.', this.line, this.col);
        }
        return this.rules.slice(start, this.i);
    }

    private pickProductionLeft(): ProductionLeft {
        return this.pickLetter();
    }

    private pickProductionRight(): ProductionRight {
        return {
            items: [],
            left: false,
            right: false
        };
    }


    private pickProduction(): Production | null {
        try {
            const left = this.pickProductionLeft();
            this.pick('->');
            const right = this.pickProductionRight();
        } catch (e: unknown) {
            this.error = e as ParserRuleError;
            return null;
        }
        

        return null;
    }
}