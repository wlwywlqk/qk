import { isNumber, isLetter } from '../utils';
import { ParserRuleError } from './error';

export class ProductionRightSingle {
    constructor(public symbols: string[] = [], public code: string = '', public production: Production | null = null, public equal: ProductionRightEqual | null = null) { }
}
export class ProductionRightEqual {
    constructor(public items: ProductionRightSingle[] = [], public left: boolean = true) { }
}

export type ProductionLeft = string;

export type ProductionRight = ProductionRightSingle | ProductionRightEqual;

export class Production {
    constructor(public left: ProductionLeft = '', public right: ProductionRight[] = []) { }
}

export class ProductionItem {
    constructor(public left: ProductionLeft = '', public right: ProductionRightSingle[] = [], public index: number = 0, public lookahead: string[] = []) { }
}

export class Rules {
    public productions: Production[] = [];
    public line = 1;
    public col = 0;

    private i = 0;
    private currentProduction: Production | null = null;

    public Nonterminals = new Set<string>();

    constructor(public readonly rules: string) {
        this.rules = rules.replace(/\r/mg, '\n').replace(/\n\n/mg, '\n');
        const len = this.rules.length;
        while (this.i < len) {
            const picked = this.pickProduction()
            this.productions.push(picked);
            this.Nonterminals.add(picked.left);
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
        rightSingle.production = this.currentProduction;
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
                            const pop = productionRight.pop() as ProductionRightSingle;
                            const picked = this.pickProductionRightSingle();
                            const equal = new ProductionRightEqual([pop, picked], true);
                            pop.equal = equal;
                            picked.equal = equal;
                            productionRight.push(equal);
                        } else {
                            if (last.left) {
                                const picked = this.pickProductionRightSingle();
                                picked.equal = last;
                                last.items.push(picked);
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
                        const pop = productionRight.pop() as ProductionRightSingle;
                        const picked = this.pickProductionRightSingle();
                        const equal = new ProductionRightEqual([pop, picked], false);
                        pop.equal = equal;
                        picked.equal = equal;
                        productionRight.push(equal);
                    } else {
                        if (!last.left) {
                            const picked = this.pickProductionRightSingle();
                            picked.equal = last;
                            last.items.push(picked);
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
        this.currentProduction = production;
        production.left = this.pickProductionLeft();
        this.pick('->');
        production.right = this.pickProductionRight();
        this.currentProduction = null;
        return production;
    }
}