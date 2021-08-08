import { isNumber, isLetter } from '../utils';
import { ParserRuleError } from './error';

export class ProductionRightSingle {
    constructor(public symbols: string[] = [], public code: string = '') { }
}
export class ProductionRightEqual {

    constructor(public items: ProductionRightSingle[] = [], public left: boolean = true) { }
}

export type ProductionLeft = string;

export type ProductionRight = ProductionRightSingle | ProductionRightEqual;

export class Production {

    constructor(public left: ProductionLeft = '', public right: ProductionRight[] = []) { }
}

export class Rules {
    public productions: Production[] = [];
    public line = 1;
    public col = 0;

    private i = 0;

    constructor(public readonly rules: string) {
        this.rules = rules.replace(/\r/mg, '\n').replace(/\n\n/mg, '\n');
        const len = this.rules.length;
        while (this.i < len) {
            this.productions.push(this.pickProduction());
        }
    }

    public get end(): boolean {
        return this.i >= this.rules.length;
    }

    private peek(): string {
        return this.rules[this.i];
    }

    private advance() {
        this.i++;
        if (this.peek() === '\n') {
            this.col = 0;
            this.line++;
        } else {
            this.col++;
        }
    }

    private pick(expected: string) {
        this.pickBlank();
        let j = 0;
        const len = expected.length;
        const start = this.col;
        while (j < len && this.peek() === expected[j]) {
            this.advance();
            j++;
        }
        if (j !== len) {
            throw new ParserRuleError(`Unexpected pick ${expected}.`, this.line, start);
        }
    }

    private pickBlank() {
        while (this.peek() === ' ') {
            this.advance();
        }
    }

    private pickLetter(): string {
        this.pickBlank();
        const start = this.i;
        if (!this.end && isLetter(this.peek())) {
            this.advance();
            while (!this.end && this.peek() !== ' ' && this.peek() !== '\n') {
                this.advance();
            }
        }
        
        if (this.i === start) {
            throw new ParserRuleError('Unexpected letter.', this.line, this.col);
        }
        return this.rules.slice(start, this.i);
    }

    private pickSymbol(): string {
        const start = this.i;
        while (!this.end && this.peek() !== ' ' && this.peek() !== '\n') {
            this.advance();
        }
        if (this.i === start) {
            throw new ParserRuleError('Unexpected symbol.', this.line, this.col);
        }
        return this.rules.slice(start, this.i);
    }

    private pickProductionLeft(): ProductionLeft {
        return this.pickLetter();
    }

    private pickProductionRightSymbols(): string[] {

        const symbols = [];

        this.pickBlank();
        while (!this.end && this.peek() !== '#' && this.peek() !== '\n') {
            symbols.push(this.pickSymbol());
            this.pickBlank();
        }
        return symbols;
    }

    private pickProductionRightCode(): string {

        this.pickBlank();
        const start = this.i;
        while (!this.end && this.peek() !== '\n') {
            this.advance();
        }

        return this.rules.slice(start, this.i);
    }

    private pickProductionRightSingle(): ProductionRightSingle {
        const rightSingle = new ProductionRightSingle();
        rightSingle.symbols = this.pickProductionRightSymbols();
        if (this.peek() === '#') {
            this.pick('#');
            rightSingle.code = this.pickProductionRightCode();
        }
        return rightSingle;
    }

    private pickProductionRight(): ProductionRight[] {
        const productionRight: ProductionRight[] = [this.pickProductionRightSingle()];
        while (!this.end && this.peek() === '\n') {
            this.pick('\n');
            this.pickBlank();
            const last = productionRight[productionRight.length - 1];
            switch (this.peek()) {
                case '|':
                    this.pick('|');
                    if (this.peek() === '=') {
                        this.pick('=');
                        if (last instanceof ProductionRightSingle) {
                            productionRight.push(new ProductionRightEqual([productionRight.pop() as ProductionRightSingle, this.pickProductionRightSingle()], true))
                        } else {
                            if (last.left) {
                                last.items.push(this.pickProductionRightSingle());
                            } else {
                                throw new ParserRuleError('Unexpected equal left false.', this.line, this.col); 
                            }
                        }
                    } else {
                        productionRight.push(this.pickProductionRightSingle());
                    }
                    break;
                case '=': 
                    this.pick('=|');
                    if (last instanceof ProductionRightSingle) {
                        productionRight.push(new ProductionRightEqual([productionRight.pop() as ProductionRightSingle, this.pickProductionRightSingle()], false))
                    } else {
                        if (!last.left) {
                            last.items.push(this.pickProductionRightSingle());
                        } else {
                            throw new ParserRuleError('Unexpected equal left true.', this.line, this.col); 
                        }
                    }
                    break;
                case '\n': continue;
                default: return productionRight;
            }
            
        }

        return productionRight;
    }


    private pickProduction(): Production {
        const production = new Production();
        production.left = this.pickProductionLeft();
        this.pick('->');
        production.right = this.pickProductionRight();

        return production;
    }
}