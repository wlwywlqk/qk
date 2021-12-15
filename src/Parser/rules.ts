import { isLetter, mergeSet, equalSet } from '../utils';
import { ParserRuleError } from './error';


export type Terminal = string;
export type NonTerminal = string;


export const PRIORITY_NOT_SET = -1;

export class ProductionRightSingle {
    constructor(public symbols: string[] = [], public code: string = '', public production: Production | null = null, public equal: ProductionRightEqual | null = null, public left: boolean = true, public priority = PRIORITY_NOT_SET) { }
    public toString() {
        return `${this.symbols.join(' ')} [${this.priority}]`;
    }
}
export class ProductionRightEqual {
    constructor(public items: ProductionRightSingle[] = []) { }
    public toString() {
        return `${this.items.map((item) => `${item}`).join('\n\t|= ')}`;
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
    public productionSingles: ProductionRightSingle[] = [];
    public ProductionMap: Map<ProductionLeft, Production> = new Map();
    public line = 1;
    public col = 0;
    public Nonterminals = new Set<NonTerminal>();
    public Terminals = new Set<Terminal>();
    public rootProduction: Production | null = null;
    public rootItem: Item | null = null;
    public kernels: Set<Item>[] = [];

    private i = 0;

    private ProductionSingleSetMap = new WeakMap<Production, Set<ProductionRightSingle>>();
    private ProductionRightSingleSet = new Set<ProductionRightSingle>();

    private ItemsMap = new WeakMap<ProductionRightSingle, Item[]>();
    private ClosureMap = new WeakMap<Closure, Set<Item>>();
    private GotoMMap = new WeakMap<Set<Item>, Map<NonTerminal | Terminal, Set<Item>>>();
    private LookaheadsMMap = new WeakMap<Kernel, WeakMap<Item, Set<NonTerminal | Terminal>>>();
    private KernelMap = new WeakMap<Kernel, Closure>();

    public NullableMap = new Map<NonTerminal, boolean>();
    public FirstMap = new Map<NonTerminal, Set<Terminal>>();
    public FollowMap = new Map<NonTerminal, Set<Terminal>>();
    public ActionMap = new Map<number, Map<Terminal, [Action, number]>>();
    public GotoMap = new Map<number, Map<NonTerminal, number>>();


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
            this.Nonterminals.add('Qk');
            this.ProductionRightSingleSet.add(rootProduction.right[0] as ProductionRightSingle);
            this.productions.unshift(rootProduction);
            this.rootProduction = rootProduction;
        }

        this.productionSingles = [...this.ProductionRightSingleSet];

        for (const nonterminal of this.Nonterminals) {
            this.Terminals.delete(nonterminal);
        }
        this.Terminals.delete(EPSILON);

        this.enhanceProductions();
        this.collectPriority();

        this.collectFollow();
        this.collectItems();
        this.collectLookaheads();

        this.collectActions();
    }

    public toArray() {
        const result = [];
        for (let i = 0, len = this.kernels.length; i < len; i++) {
            const kernel = this.kernels[i];
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
        let index = 0;
        for (const kernel of this.kernels) {
            str += `\n-----------------${index++}-----------------\n`;
            const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;
            const closure = this.closure(kernel);
            for (const item of closure) {
                str += `${item}  [${[...lookaheadsMap.get(item)!]}]  「${item.ref.priority}」\n`;
            }
        }

        console.log(str);
    }

    public printParsingTable() {
        let str = '';

        str += ''.padEnd(5);
        str += `${[...this.Terminals].map(terminal => `${terminal}`.padEnd(8)).join('')}${END.padEnd(8)} | ${[...this.Nonterminals].map(terminal => `${terminal}`.padEnd(25)).join('')}`;
        str += '\n';
        str += ''.padEnd(str.length, '-');
        for (let i = 0, len = this.kernels.length; i < len; i++) {
            const actionMap = this.ActionMap.get(i)!;
            const gotoMap = this.GotoMap.get(i)!;

            str += '\n';
            str += `${i}`.padEnd(5);
            
            for (const terminal of this.Terminals) {
                const action = actionMap.get(terminal);
                if (!action) {
                    str += ''.padEnd(8)
                } else {
                    switch (action[0]) {
                        case Action.ACCEPT: str += 'accept'.padEnd(8); break;
                        case Action.REDUCE: str += `r${action[1]}`.padEnd(8); break;
                        case Action.SHIFT: str += `s${action[1]}`.padEnd(8); break;
                    }
                }
                
            }
            const action = actionMap.get(END);
            if (!action) {
                str += ''.padEnd(8)
            } else {
                switch (action[0]) {
                    case Action.ACCEPT: str += 'accept'.padEnd(8); break;
                    case Action.REDUCE: str += `r${action[1]}`.padEnd(8); break;
                    case Action.SHIFT: str += `s${action[1]}`.padEnd(8); break;
                }
            }
           
            str += ` | `;
            for (const nonterminal of this.Nonterminals) {
                const goto = gotoMap.get(nonterminal)!;
                if (goto === undefined) {
                    str += ''.padEnd(25);
                } else {
                    str += `${goto}`.padEnd(25);
                }
            }
        }
        console.log(str);
    }

    public printProductions() {
        let str = '';
        let index = 0;
        for (const production of this.productions) {
            str += `-----------------${index++}-----------------\n`;

            str += `${production}\n\n`;
        }
        console.log(str);
    }

    public isNonterminal(symbol: NonTerminal | Terminal) {
        return this.Nonterminals.has(symbol);
    }

    private collectActions(): void {
        const endSingle = this.productions[0].right[0] as ProductionRightSingle;
        const endItem = this.ItemsMap.get(endSingle)![endSingle.symbols.length];
        for (let i = 0, len = this.kernels.length; i < len; i++) {
            const kernel = this.kernels[i];
            const closure = this.closure(kernel);
            const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;
            const priorityMap = new Map<Terminal, number>();
            const actionMap = new Map<Terminal, [Action, number]>();
            const gotoMap = new Map<NonTerminal, number>();
            this.ActionMap.set(i, actionMap);
            this.GotoMap.set(i, gotoMap);
            for (const item of closure) {

                for (let i = item.index, len = item.ref.symbols.length; i <= len; i++) {
                    const symbol = item.ref.symbols[i];
                    if (item.index === len) {
                        if (item === endItem) {
                            actionMap.set(END, [Action.ACCEPT, Action.ACCEPT]);
                        } else {
                            const lookaheads = lookaheadsMap.get(item)!;
    
                            for (const lookahead of lookaheads) {
                                actionMap.set(lookahead, [Action.REDUCE, this.productionSingles.indexOf(item.ref)]);
                                priorityMap.set(lookahead, item.ref.priority);
                            }
                        }
                    } else {
                        const gotoIndex = this.kernels.indexOf(this.goto(kernel, symbol));
                        if (this.isNonterminal(symbol)) {
                            gotoMap.set(symbol, gotoIndex);
                            if (!this.nullable(symbol)) {
                                break;
                            }
                        } else {
                            if (!(priorityMap.has(symbol) && item.ref.priority === priorityMap.get(symbol) && item.ref.left)) {
                                actionMap.set(symbol, [Action.SHIFT, gotoIndex]);
                                priorityMap.delete(symbol);
                            }
                            break;
                        }
                    }
                   
                }
            }
            const map = this.GotoMMap.get(kernel) || new Map();
            for (const [key, val] of map) {
                if (this.isNonterminal(key)) {
                    gotoMap.set(key, this.kernels.indexOf(val));
                }
            }
        }
    }

    private collectLookaheads(): void {
        this.LookaheadsMMap.get(this.kernels[0])!.get(this.rootItem!)!.add(END);

        let changed = true;
        while (changed) {
            changed = false;
            for (const kernel of this.kernels) {
                const itemSet = new Set(kernel);
                const closure = this.closure(kernel);
                const lookaheadsMap = this.LookaheadsMMap.get(kernel)!;

                for (const item of itemSet) {
                    for (let i = item.index, len = item.ref.symbols.length; i < len; i++) {
                        const symbol = item.ref.symbols[i];
                        if (!this.isNonterminal(symbol)) {
                            break;
                        }
                        const lookaheads = this.firstOfSymbols(item.ref.symbols.slice(i + 1));
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
                        if (!this.nullable(symbol)) {
                            break;
                        }
                    }

                    
                }

                for (const item of closure) {
                    if (item.index < item.ref.symbols.length) {
                        const symbol = item.ref.symbols[item.index];
                        const gotoKernel = this.goto(kernel, symbol);
                        const gotoLookaheadsMap = this.LookaheadsMMap.get(gotoKernel)!;
                        changed = mergeSet(gotoLookaheadsMap.get(this.ItemsMap.get(item.ref)![item.index + 1])!, lookaheadsMap.get(item)!) || changed;
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
        this.kernels.push(rootKernel);
        const rootClosure = this.closure(rootKernel);
        const lookaheadsMap = new WeakMap();
        for (const item of rootClosure) {
            lookaheadsMap.set(item, new Set());
        }
        this.LookaheadsMMap.set(rootKernel, lookaheadsMap);

        for (let i = 0; i < this.kernels.length; i++) {
            const kernel = this.kernels[i];
            const closure = this.closure(kernel);
            const used = new Set<NonTerminal | Terminal>();

            for (const item of closure) {
                for (let i = item.index, len = item.ref.symbols.length; i < len; i++) {
                    const symbol = item.ref.symbols[i];
                    if (symbol && !used.has(symbol)) {
                        used.add(symbol);
    
                        const gotoKernel = this.goto(kernel, symbol);
                        const gotoClosure = this.closure(gotoKernel);
                        if (!this.kernels.includes(gotoKernel)) {
    
                            this.kernels.push(gotoKernel);
                            const lookaheadsMap = new WeakMap();
                            for (const gotoItem of gotoClosure) {
                                lookaheadsMap.set(gotoItem, new Set());
                            }
                            this.LookaheadsMMap.set(gotoKernel, lookaheadsMap);
                        }
                    }
                    if (!this.isNonterminal(symbol) || !this.nullable(symbol)) {
                        break;
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
            for (let i = item.index, len = item.ref.symbols.length; i < len; i++) {
                const currentSymbol = item.ref.symbols[i];
                if (currentSymbol === symbol) {
                    newSet.add(this.ItemsMap.get(item.ref)![i + 1]);
                }
                if (!this.isNonterminal(currentSymbol) || !this.nullable(currentSymbol)) {
                    break;
                }
            }
        }

        let result = this.extractKernelFromItemSet(newSet);

        const [equalKernel] = this.kernels.filter((kernel) => equalSet(kernel, result));
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

            for (let i = item.index, len = item.ref.symbols.length; i < len; i++) {
                const symbol = item.ref.symbols[i];
                if (!this.isNonterminal(symbol)) {
                    break;
                }
                const singleSet = this.ProductionSingleSetMap.get(this.ProductionMap.get(symbol)!)!;
                for (const single of singleSet) {
                    if (single.symbols[0] === EPSILON) continue;
                    result.add(this.ItemsMap.get(single)![0]);
                }
                if (!this.nullable(symbol)) {
                    break;
                }
            }

        }

        const closure = new Set([...result].sort((a, b) => a.ref.priority - b.ref.priority));

        this.ClosureMap.set(set, closure);
        return closure;
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

        const collectPriorityOfProduction = (production: Production, priority: number = PRIORITY_NOT_SET): number => {
            for (let j = 0, jLen = production.right.length; j < jLen; j++) {
                const right = production.right[j];
                if (right instanceof ProductionRightSingle) {
                    if (right.priority !== PRIORITY_NOT_SET) return priority;
                    const basePriority = priority++;
                    right.priority = basePriority;
                    for (let k = 0, kLen = right.symbols.length; k < kLen; k++) {
                        const symbol = right.symbols[k];
                        if (this.isNonterminal(symbol)) {
                            priority = Math.max(basePriority, collectPriorityOfProduction(this.ProductionMap.get(symbol)!, basePriority + 1));
                        }
                    }
                } else {
                    const basePriority = priority++;
                    for (let k = 0, kLen = right.items.length; k < kLen; k++) {
                        const item = right.items[k];
                        if (item.priority !== PRIORITY_NOT_SET) return priority;
                        item.priority = basePriority;
                        for (let k = 0, kLen = item.symbols.length; k < kLen; k++) {
                            const symbol = item.symbols[k];
                            if (this.isNonterminal(symbol)) {
                                priority = Math.max(priority, collectPriorityOfProduction(this.ProductionMap.get(symbol)!, basePriority + 1));
                            }
                        }
                    }
                }
            }
            return priority;
        }

        let priority = 0;
        for (let i = 0, iLen = this.productions.length; i < iLen; i++) {
            const production = this.productions[i];
            priority = collectPriorityOfProduction(production, priority);
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
        const symbol = this.rules.slice(start, this.i);
        this.Terminals.add(symbol);
        return symbol;
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
