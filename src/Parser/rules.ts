import { isLetter, mergeSet, equalSet } from '../utils';
import { ParserRuleError } from './error';


export type Terminal = string;
export type NonTerminal = string;


export const PRIORITY_NOT_SET = -1;

export class ProductionRightSingle {
    constructor(public symbols: string[] = [], public code: string = '', public production: Production | null = null, public equal: ProductionRightEqual | null = null, public left: boolean = true, public priority = PRIORITY_NOT_SET) { }
    public toString() {
        return this.symbols.join(' ');
    }
}
export class ProductionRightEqual {
    constructor(public items: ProductionRightSingle[] = []) { }
    public toString() {
        return `${this.items.map((item) => `${item}`).join('|= ')}`;
    }
}

export type ProductionLeft = NonTerminal;

export type ProductionRight = ProductionRightSingle | ProductionRightEqual;

export class Production {
    constructor(public left: ProductionLeft = '', public right: ProductionRight[] = []) { }
    public toString() {
        return `${this.left} -> ${this.right.map(item => `${item}`).join('\n\t| ')}`;
    }
}

export type Lookaheads = Set<Terminal>;
export class Item {
    constructor(public ref: ProductionRightSingle, public index: number = 0) { }
    public toString() {
        const symbols = [...this.ref.symbols];
        symbols.splice(this.index, 0, '·')
        return `${this.ref.production!.left} -> ${symbols.join(' ')}`;
    }
}

export type Kernel = Set<Item>;
export type Closure = Set<Item>;


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
    public rootProduction: Production | null = null;
    public rootItem: Item | null = null;
    public Kernels: Set<Item>[] = [];

    private i = 0;

    private ProductionSingleSetMap = new WeakMap<Production, Set<ProductionRightSingle>>();
    private ProductionRightSingleSet = new Set<ProductionRightSingle>();

    private ItemsMap = new WeakMap<ProductionRightSingle, Item[]>();
    private ClosureMap = new WeakMap<Closure, Set<Item>>();
    private GotoMMap = new WeakMap<Set<Item>, Map<NonTerminal | Terminal, Set<Item>>>();
    private LookaheadsMMap = new WeakMap<Kernel, WeakMap<Item, Set<NonTerminal | Terminal>>>();
    private KernelMap = new WeakMap<Kernel, Closure>();

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
        if (this.productions[0].left !== 'Qk') {
            const rootProduction = new Production('Qk', [new ProductionRightSingle([this.productions[0].left])]);
            this.ProductionMap.set('Qk', rootProduction);
            this.ProductionRightSingleSet.add(rootProduction.right[0] as ProductionRightSingle);
            this.productions.unshift(rootProduction);
            this.rootProduction = rootProduction;
        }

        this.enhanceProductions();
        this.collectPriority();

        this.collectFollow();
        this.collectItems();
        this.collectLookaheads();

        this.collectActions();
    }

    public toArray() {
        const result = [];
        for (let i = 0, len = this.Kernels.length; i < len; i++) {
            const kernel = this.Kernels[i];
            const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;

            const kernelArray = [];
            for (const item of kernel) {
                kernelArray.push([`${item}`, lookaheadsMap.get(item)]);
            }

            result.push(kernelArray);
        }

        return result;
    }
    public print() {
        let str = '';
        for (const kernel of this.Kernels) {
            const closure = this.closure(kernel);
            str += `----------------------------------\n`;
            const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;
            for (const item of closure) {
                str += `${item}  [${[...lookaheadsMap.get(item)!]}]  ${item.ref.priority}\n`;
            }
        }

        console.log(str);
    }

    public isNonterminal(symbol: NonTerminal | Terminal) {
        return this.Nonterminals.has(symbol);
    }

    private collectActions(): void {

    }

    private collectLookaheads(): void {
        this.LookaheadsMMap.get(this.Kernels[0])!.get(this.rootItem!)!.add(END);

        let changed = true;
        while (changed) {
            changed = false;
            for (const kernel of this.Kernels) {
                const itemSet = new Set(kernel);
                const closure = this.closure(kernel);
                const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;

                for (const item of itemSet) {
                    const symbol = item.ref.symbols[item.index];
                    if (!this.isNonterminal(symbol)) {
                        continue;
                    }

                    const lookaheads = this.firstOfSymbols(item.ref.symbols.slice(item.index + 1));
                    if (lookaheads.has(EPSILON) || lookaheads.size === 0) {
                        mergeSet(lookaheads, lookaheadsMap.get(item)!);
                    }
                    lookaheads.delete(EPSILON);
                    const singleSet = this.ProductionSingleSetMap.get(this.ProductionMap.get(symbol)!)!;
                    for (const single of singleSet) {
                        if (single.symbols[0] === EPSILON) continue;
                        const subItem = this.ItemsMap.get(single)![0];
                        changed = mergeSet(lookaheadsMap.get(subItem)!, lookaheads) || changed;
                        itemSet.add(subItem);
                    }
                }

                const used = new Set<NonTerminal | Terminal>();
                for (const item of closure) {
                    const symbol = item.ref.symbols[item.index];
                    if (symbol && !used.has(symbol)) {
                        used.add(symbol);
                        const gotoKernel = this.goto(kernel, symbol);

                        const gotoClosure = this.closure(gotoKernel);
                        const gotoLookaheadsMap = this.LookaheadsMMap.get(gotoKernel)!;
                        for (const gotoItem of gotoClosure) {
                            changed = mergeSet(gotoLookaheadsMap.get(gotoItem)!, lookaheadsMap.get(item)!) || changed;
                        }
                    }
                }
            }

        }
    }

    private collectItems(): void {
        for (const single of this.ProductionRightSingleSet) {
            this.ItemsMap.set(single, Array.from(Array(single.symbols.length + 1)).map((_, index) => {
                const item = new Item(single, index);
                return item;
            }));
        }
        this.rootItem = this.ItemsMap.get(this.productions[0].right[0] as ProductionRightSingle)![0];
        const rootKernel = new Set([this.rootItem]);
        this.Kernels.push(rootKernel);
        const rootClosure = this.closure(rootKernel);
        const lookaheadsMap = new WeakMap();
        for (const item of rootClosure) {
            lookaheadsMap.set(item, new Set());
        }
        this.LookaheadsMMap.set(rootKernel, lookaheadsMap);

        for (let i = 0; i < this.Kernels.length; i++) {
            const kernel = this.Kernels[i];
            const closure = this.closure(kernel);
            const used = new Set<NonTerminal | Terminal>();

            for (const item of closure) {

                const symbol = item.ref.symbols[item.index];
                if (symbol && !used.has(symbol)) {
                    used.add(symbol);

                    const gotoKernel = this.goto(kernel, symbol);
                    const gotoClosure = this.closure(gotoKernel);
                    if (!this.Kernels.includes(gotoKernel)) {

                        this.Kernels.push(gotoKernel);
                        const lookaheadsMap = new WeakMap();
                        for (const gotoItem of gotoClosure) {
                            lookaheadsMap.set(gotoItem, new Set());
                        }
                        this.LookaheadsMMap.set(gotoKernel, lookaheadsMap);
                    }
                }
            }

        }
    }

    private extractKernelFromItemSet(closure: Set<Item>): Set<Item> {
        if (this.KernelMap.has(closure)) {
            return this.KernelMap.get(closure)!;
        }
        const result = new Set<Item>();
        for (const item of closure) {
            if (item.index !== 0 || item === this.rootItem) {
                result.add(item);
            }
        }
        this.KernelMap.set(closure, result);
        return result;
    }


    public goto(kernel: Kernel, symbol: NonTerminal | Terminal): Kernel {
        if (this.GotoMMap.has(kernel) && this.GotoMMap.get(kernel)!.has(symbol)) {
            return this.GotoMMap.get(kernel)!.get(symbol)!;
        }
        const closure = this.closure(kernel);
        const newSet = new Set<Item>();
        for (const item of closure) {
            if (item.ref.symbols[item.index] === symbol) {
                newSet.add(this.ItemsMap.get(item.ref)![item.index + 1]);
            }
        }

        let result = this.extractKernelFromItemSet(newSet);

        const [equalKernel] = this.Kernels.filter((kernel) => equalSet(kernel, result));
        if (equalKernel) {
            result = equalKernel;
        }

        if (!this.GotoMMap.has(kernel)) {
            this.GotoMMap.set(kernel, new Map([[symbol, result]]));
        } else {
            this.GotoMMap.get(kernel)!.set(symbol, result);
        }
        return result;
    }

    public closure(set: Set<Item>): Set<Item> {
        if (this.ClosureMap.has(set)) {
            return this.ClosureMap.get(set)!;
        }
        const result = new Set<Item>(set);

        for (const item of result) {
            const symbol = item.ref.symbols[item.index];
            if (!this.isNonterminal(symbol)) {
                continue;
            }
            const singleSet = this.ProductionSingleSetMap.get(this.ProductionMap.get(symbol)!)!;
            for (const single of singleSet) {
                if (single.symbols[0] === EPSILON) continue;
                result.add(this.ItemsMap.get(single)![0]);
            }

        }

        this.ClosureMap.set(set, result);
        return result;
    }

    public firstOfSymbols(symbols: NonTerminal[] | Terminal[]): Set<Terminal> {
        const result = new Set<Terminal>();
        for (let i = 0, len = symbols.length; i < len; i++) {
            const symbol = symbols[i];

            if (this.isNonterminal(symbol)) {
                mergeSet(result, this.first(symbol));
                if (!this.nullable(symbol)) {
                    break;
                }
            } else {
                result.add(symbol);
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

    private collectFollow(): void {
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
                            changed = mergeSet(followSets[j], firstSet) || changed;
                        }

                        if (this.nullable(symbol)) {
                            followSets.push(followSet);
                        } else {
                            followSets = [followSet];
                        }

                        if (i === len - 1) {
                            for (let j = 0, jLen = followSets.length; j < jLen; j++) {
                                changed = mergeSet(followSets[j], this.FollowMap.get(single.production!.left)!) || changed;
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

    private collectPriority(): void {
        let priority = 0;

        const collectPriorityOfProduction = (production: Production) => {
            for (let j = 0, jLen = production.right.length; j < jLen; j++) {
                const right = production.right[j];
                if (right instanceof ProductionRightSingle) {
                    if (right.priority !== PRIORITY_NOT_SET) return;
                    right.priority = priority++;
                    for (let k = 0, kLen = right.symbols.length; k < kLen; k++) {
                        const symbol = right.symbols[k];
                        if (this.isNonterminal(symbol)) {
                            collectPriorityOfProduction(this.ProductionMap.get(symbol)!);
                        }
                    }
                } else {
                    for (let k = 0, kLen = right.items.length; k < kLen; k++) {
                        const item = right.items[k];
                        if (item.priority !== PRIORITY_NOT_SET) return;
                        item.priority = priority;
                        for (let k = 0, kLen = item.symbols.length; k < kLen; k++) {
                            const symbol = item.symbols[k];
                            if (this.isNonterminal(symbol)) {
                                collectPriorityOfProduction(this.ProductionMap.get(symbol)!);
                            }
                        }
                    }
                    priority++;
                }
            }
        }

        for (let i = 0, iLen = this.productions.length; i < iLen; i++) {
            const production = this.productions[i];
            collectPriorityOfProduction(production);
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
        let peeked = this.peek()
        while (!this.end && peeked !== '#' && peeked !== '%' ! && peeked !== '\n') {
            symbols.push(this.pickSymbol());
            this.pickBlank();
            peeked = this.peek();
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
        if (this.peek() === '%') {
            this.pick('%right');
            rightSingle.left = false;
            this.pickBlank();
        }
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
                            productionRight.push(new ProductionRightEqual([productionRight.pop() as ProductionRightSingle, this.pickProductionRightSingle()]));
                        } else {
                            last.items.push(this.pickProductionRightSingle());
                        }
                    } else {
                        productionRight.push(this.pickProductionRightSingle());
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