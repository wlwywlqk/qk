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
    constructor(public ref: ProductionRightSingle, public index: number = 0, public lookaheads: Set<string> = new Set()) { }
}

export enum Action {
    SHIFT,
    REDUCE,
    ACCEPT,
    ERROR
}

export type Terminal = string;
export type NonTerminal = string;

export class Rules {
    public productions: Production[] = [];
    public productionMap: Map<ProductionLeft, Production> = new Map();
    public line = 1;
    public col = 0;
    public Nonterminals = new Set<NonTerminal>();

    private i = 0;

    private FirstMap = new Map< Terminal | NonTerminal, Set<Terminal>>();

    constructor(public readonly rules: string) {
        this.rules = rules.replace(/\r/mg, '\n').replace(/\n\n/mg, '\n');
        const len = this.rules.length;
        while (this.i < len) {
            const picked = this.pickProduction();
            if (picked) {
                this.productions.push(picked);
                this.Nonterminals.add(picked.left);
            }
        }
        this.enhanceProductions();
    }

    private goto() {

    }

    private closure() {
        
    }

    private enhanceProductions(): void {
        for (let i = 0, ilen = this.productions.length; i < ilen; i++) {
            const production = this.productions[i];
            for (let j = 0, jlen = production.right.length; j < jlen; j++) {
                const right = production.right[j];
                if (right instanceof ProductionRightSingle) {
                    right.production = production;
                } else {
                    for (let k = 0, klen = right.items.length; k < klen; k++) {
                        const item = right.items[k];
                        item.production = production;
                        item.equal = right;
                    }
                }
            }
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
                            productionRight.push(new ProductionRightEqual([productionRight.pop() as ProductionRightSingle, this.pickProductionRightSingle()], true));
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
                        productionRight.push(new ProductionRightEqual([productionRight.pop() as ProductionRightSingle, this.pickProductionRightSingle()], false));
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


    private pickProduction(): Production | null {
        const left: ProductionLeft = this.pickProductionLeft();
        this.pick('->');
        if (this.productionMap.has(left)) {
            const production = this.productionMap.get(left)!;
            production.right.push(...this.pickProductionRight());
            return null
        } else {
            const production = new Production();
            production.left = left;
            this.productionMap.set(left, production);
            production.right.push(...this.pickProductionRight());
            return production;
        }
    }
}