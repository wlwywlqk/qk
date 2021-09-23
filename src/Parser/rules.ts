import { isLetter, mergeSet } from '../utils';
import { ParserRuleError } from './error';


export type Terminal = string;
export type NonTerminal = string;
export class ProductionRightSingle {
    constructor(public symbols: string[] = [], public code: string = '', public production: Production | null = null, public equal: ProductionRightEqual | null = null) { }
}
export class ProductionRightEqual {
    constructor(public items: ProductionRightSingle[] = [], public left: boolean = true) { }
}

export type ProductionLeft = NonTerminal;

export type ProductionRight = ProductionRightSingle | ProductionRightEqual;

export class Production {
    constructor(public left: ProductionLeft = '', public right: ProductionRight[] = []) { }
}

export type Lookaheads = Set<Terminal>;
export class ProductionItem {
    constructor(public ref: ProductionRightSingle, public index: number = 0) { }
}

export enum Action {
    SHIFT,
    REDUCE,
    ACCEPT,
    ERROR
}

export const END = '$';
export const EPSILON = 'ε';



export class Rules {
    public productions: Production[] = [];
    public ProductionMap: Map<ProductionLeft, Production> = new Map();
    public line = 1;
    public col = 0;
    public Nonterminals = new Set<NonTerminal>();

    private i = 0;

    private ProductionSingleSetMap = new WeakMap<Production, Set<ProductionRightSingle>>();
    private ProductionRightSingleSet = new Set<ProductionRightSingle>();
    private ProductionItemMap = new WeakMap<ProductionRightSingle, ProductionItem[]>();

    public CoreSets: Set<ProductionItem>[] = [];
    
    private ClosureMap = new WeakMap<Set<ProductionItem>, Set<ProductionItem>>();
    private GotoMap = new WeakMap<Set<ProductionItem>, Map<NonTerminal | Terminal, Set<ProductionItem>>>();


    private NullableMap = new Map<NonTerminal, boolean>();
    private FirstMap = new Map<NonTerminal, Set<Terminal>>();
    private FollowMap = new Map<NonTerminal, Set<Terminal>>();


    constructor(public readonly rules: string) {
        this.rules = rules.replace(/\r/mg, '\n').replace(/\n\n/mg, '\n').trim();
        const len = this.rules.length;
        while (this.i < len) {
            const picked = this.pickProduction();
            if (picked) {
                this.productions.push(picked);
                this.Nonterminals.add(picked.left);
            }
        }

        this.enhanceProductions();

        this.collectFollow();

        this.collectItems();
    }

    public isNonterminal(symbol: NonTerminal | Terminal) {
        return this.Nonterminals.has(symbol);
    }

    private collectItems() {
        for (const item of this.ProductionRightSingleSet) {
            this.ProductionItemMap.set(item, Array.from(Array(item.symbols.length + 1)).map((_, index) => new ProductionItem(item, index)));
        }
    }

    public goto(set: Set<ProductionItem>, symbol: NonTerminal | Terminal): Set<ProductionItem> {
        if (this.GotoMap.has(set) && this.GotoMap.has(set)) {
            return this.GotoMap.get(set)!.get(symbol)!;
        }
        const newSet = new Set<ProductionItem>();
        for (const item of set) {
            if (item.ref.symbols[item.index] === symbol) {
                newSet.add(this.ProductionItemMap.get(item.ref)![item.index + 1]);
            }
        }
        const result = this.closure(newSet);
        if (!this.GotoMap.has(set)) {
            this.GotoMap.set(set, new Map([[symbol, result ]]));
        } else {
            this.GotoMap.get(set)!.set(symbol, result);
        }
        return result;
    }

    public closure(set: Set<ProductionItem>): Set<ProductionItem> {
        if (this.ClosureMap.has(set)) {
            return this.ClosureMap.get(set)!;
        }
        const result = new Set<ProductionItem>(set);

        for (const item of result) {
            const symbol = item.ref.symbols[item.index];
            if (this.isNonterminal(symbol)) {
                const set = new Set<ProductionItem>();
                const singleSet = this.ProductionSingleSetMap.get(this.ProductionMap.get(symbol)!)!;
                for (const single of singleSet) {
                    result.add(this.ProductionItemMap.get(single)![0]);
                }
            } else {
                break;
            }
        }
        return result;
    }

    public first(nonTerminal: NonTerminal): Set<Terminal> {
        if (this.FirstMap.has(nonTerminal)) {
            return this.FirstMap.get(nonTerminal)!;
        }

        const firstSet = this.firstImpl(nonTerminal, new Set([nonTerminal]));
        this.FirstMap.set(nonTerminal, firstSet);
        return firstSet;
    }

    private firstImpl(nonTerminal: NonTerminal, memo: Set<NonTerminal>): Set<Terminal> {
        const production = this.ProductionMap.get(nonTerminal)!;
        const singleSet = this.ProductionSingleSetMap.get(production)!;
        let firstSet = new Set<Terminal>();

        for (const single of singleSet) {
            const { symbols } = single;
            for (let i = 0, len = symbols.length; i < len; i++) {
                const symbol = symbols[i];
                if (!this.isNonterminal(symbol)) {
                    firstSet.add(symbol);
                    break;
                } else {
                    if (!memo.has(symbol)) {
                        firstSet = new Set([...firstSet, ...this.firstImpl(symbol, new Set([symbol, ...memo]))]);
                    }
                    if (!this.nullable(symbol)) {
                        break;
                    }
                }
            }
        }

        return firstSet;
    }

    public nullable(nonTerminal: NonTerminal): boolean {
        if (this.NullableMap.has(nonTerminal)) {
            return this.NullableMap.get(nonTerminal)!;
        }

        const nullable = this.nullableImpl(nonTerminal, new Set([nonTerminal]));
        this.NullableMap.set(nonTerminal, nullable);
        return nullable;
    }

    private nullableImpl(nonTerminal: NonTerminal, memo: Set<NonTerminal>): boolean {
        const production = this.ProductionMap.get(nonTerminal)!;
        const singleSet = this.ProductionSingleSetMap.get(production)!;
        let nullable = true;
        for (const single of singleSet) {
            if (single.symbols.length === 1 && single.symbols[0] === EPSILON) {
                nullable = true;
                break;
            } else {
                const { symbols } = single;
                nullable = true;
                for (let i = 0, len = symbols.length; i < len; i++) {
                    const symbol = symbols[i];
                    if (!this.isNonterminal(symbol) || memo.has(symbol) || !this.nullableImpl(symbol, new Set([symbol, ...memo]))) {
                        nullable = false;
                        break;
                    }
                }
                if (nullable) {
                    break;
                }
            }
        }

        return nullable;
    }

    public follow(nonTerminal: NonTerminal): Set<Terminal> {
        return this.FollowMap.get(nonTerminal)!;
    }

    private collectFollow() {
        for (let i = 0, len = this.productions.length; i < len; i++) {
            this.FollowMap.set(this.productions[i].left, new Set());
        }
        const rootProduction = this.productions[0];
        const rootFollowSet = this.FollowMap.get(rootProduction.left)!;
        rootFollowSet.add(END);

        let changed = true;
        while (changed) {
            changed = false;
            for (const single of this.ProductionRightSingleSet) {
                let followSets: Set<Terminal>[] = [];
                for (let i = 0, len = single.symbols.length; i < len; i++) {
                    const symbol = single.symbols[i];
    
                    if (this.isNonterminal(symbol)) {
                        const firstSet = this.first(symbol);
                        const followSet = this.FollowMap.get(symbol)!;
                        for (let j = 0, jLen = followSets.length; j < jLen; j++) {
                            changed ||= mergeSet(followSets[j], firstSet);
                        }
    
                        if (this.nullable(symbol)) {
                            followSets.push(followSet);
                        } else {
                            followSets = [followSet];
                        }
    
                        if (i === len - 1) {
                            for (let j = 0, jLen = followSets.length; j < jLen; j++) {
                                changed ||= mergeSet(followSets[j], this.FollowMap.get(single.production!.left)!);
                            }
                        }
                    } else if (followSets.length > 0) {
                        for (let j = 0, jLen = followSets.length; j < jLen; j++) {
                            changed ||= !followSets[j].has(symbol);
                            followSets[j].add(symbol);
                        }
                        followSets = [];
                    }
                }
            }
        }

        for (let i = 0, len = this.productions.length; i < len; i++) {
            this.FollowMap.get(this.productions[i].left)!.delete(EPSILON);
        }
    }

    private enhanceProductions(): void {
        for (let i = 0, iLen = this.productions.length; i < iLen; i++) {
            const production = this.productions[i];
            const singleSet = new Set<ProductionRightSingle>();
            this.ProductionSingleSetMap.set(production, singleSet);
            for (let j = 0, jLen = production.right.length; j < jLen; j++) {
                const right = production.right[j];
                if (right instanceof ProductionRightSingle) {
                    right.production = production;
                    singleSet.add(right);
                } else {
                    for (let k = 0, kLen = right.items.length; k < kLen; k++) {
                        const item = right.items[k];
                        item.production = production;
                        item.equal = right;
                        singleSet.add(item);
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
        this.ProductionRightSingleSet.add(rightSingle);
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
        if (this.ProductionMap.has(left)) {
            const production = this.ProductionMap.get(left)!;
            production.right.push(...this.pickProductionRight());
            return null
        } else {
            const production = new Production();
            production.left = left;
            this.ProductionMap.set(left, production);
            production.right.push(...this.pickProductionRight());
            return production;
        }
    }
}