import { Rules, Production, ProductionLeft, ProductionRight, ProductionRightSingle, ProductionRightEqual, Item, END, EPSILON } from '../rules';
describe('rules', () => {

    test('sample single rules', () => {
        const rulesStr = `Program -> Declarations Statements`;

        const rules = new Rules(rulesStr);
        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], '', expectedProduction));
        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction ]);
        expect(rules.line).toEqual(1);
        expect(rules.col).toEqual(rulesStr.length);
        expect(rules.end).toBeTruthy();
    });

    test('rules line col and end', () => {
        const rulesStr = `Program -> Declarations Statements
Program -> Declarations Statements
Program -> Declarations Statements
Program -> Declarations Statements
Program -> Declarations Statements
Program -> Declarations Statements`;
        const rules = new Rules(rulesStr);
        expect(rules.line).toEqual(6);
        expect(rules.col).toEqual(35);
        expect(rules.end).toBeTruthy();

        expect(rules.Nonterminals).toEqual(new Set(['Program']));
        expect((rules.productions[0].right[0] as ProductionRightSingle).production === rules.productions[0]).toBeTruthy();
    });

    test('single rules with code', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code`);

        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code', expectedProduction));
        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction ]);

    });

    test('rules with right equal', () => {
        const rules = new Rules(`RelExpression -> Expression < Expression
        |= Expression <= Expression
        |= Expression > Expression
        |= Expression >= Expression`);

        const expectedProduction = new Production('RelExpression', []);
        const expectedEqual = new ProductionRightEqual([], true);
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '<', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '<=', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '>', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '>=', 'Expression'], '', expectedProduction, expectedEqual));

        expectedProduction.right.push(expectedEqual);
        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction ]);
    });

    test('rules with mutiple right', () => {
        const rules = new Rules(`Declarations -> Declarations Declaration
        |`);

        const expectedProduction = new Production('Declarations', []);

        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Declaration'], '', expectedProduction));
        expectedProduction.right.push(new ProductionRightSingle([], '', expectedProduction));

        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction ]);
    });



    test('multiple line rules', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code
        Program1 -> Declarations Statements   # test code1
        `);

        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code', expectedProduction));

        const expectedProduction1 = new Production('Program1', []);
        expectedProduction1.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code1', expectedProduction1));

        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction, expectedProduction1 ]);
        expect(rules.Nonterminals).toEqual(new Set(['Program', 'Program1']));
    });


    
    test('multiple newline', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code
        
        
        Program1 -> Declarations Statements   # test code1
        `);

        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code', expectedProduction));


        const expectedProduction1 = new Production('Program1', []);
        expectedProduction1.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code1', expectedProduction1));

        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction, expectedProduction1 ]);
        expect(rules.Nonterminals).toEqual(new Set(['Program', 'Program1']));
    });


    test('rules with right equal and newline', () => {
        const rules = new Rules(`RelExpression -> Expression < Expression
        |= Expression <= Expression

        |= Expression > Expression
        |= Expression >= Expression

        RelExpression -> Expression < Expression
        `);

        const expectedProduction = new Production('RelExpression', []);
        const expectedEqual = new ProductionRightEqual([], true);
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '<', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '<=', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '>', 'Expression'], '', expectedProduction, expectedEqual));
        expectedEqual.items.push(new ProductionRightSingle(['Expression', '>=', 'Expression'], '', expectedProduction, expectedEqual));

        expectedProduction.right.push(expectedEqual);
        expectedProduction.right.push(new ProductionRightSingle(['Expression', '<', 'Expression'], '', expectedProduction));

        expect(rules.productions).toEqual([ rules.rootProduction, expectedProduction ]);
    });


    test('rules with right equal throws', () => {

        expect(() => {
            const rules = new Rules(`RelExpression -> Expression < Expression
            |= Expression <= Expression

            =| Expression > Expression
            |= Expression >= Expression`);
        }).toThrow();
    });


    test('rules nullable', () => {
        const simpleRules = new Rules(`
            A -> d
                | ε
            B -> d
        `);
        expect(simpleRules.nullable('A')).toBeTruthy();
        expect(simpleRules.nullable('B')).toBeFalsy();

        const nestedRules1 = new Rules(`
            A -> Ad
                | b
                | B
            B -> A
                | ε
        `);

        expect(nestedRules1.nullable('A')).toBeTruthy();
        expect(nestedRules1.nullable('B')).toBeTruthy();


        const nestedRules2 = new Rules(`
            A -> B
                | A
                | C
            B -> A
            C -> A
                | B
                | ε
        `);

        expect(nestedRules2.nullable('A')).toBeTruthy();
        expect(nestedRules2.nullable('B')).toBeTruthy();
        expect(nestedRules2.nullable('C')).toBeTruthy();
    });

    test('rules first', () => {
        const rule1 = new Rules(`
            A -> B 0
                | 1
                | 2
                | 3
            B -> ε
                | 4
        `);
        expect(rule1.first('A')).toEqual(new Set(['0', '1', '2', '3', '4', EPSILON]));
        expect(rule1.first('B')).toEqual(new Set([EPSILON, '4']));
        
        expect(rule1.firstOfSymbols(['B', 'A'])).toEqual(new Set(['0', '1', '2', '3', '4', EPSILON]));
        expect(rule1.firstOfSymbols(['B', 'B', '5'])).toEqual(new Set(['4', '5', EPSILON]));

        const rule2 = new Rules(`
            A -> 1
                | B 2
            B -> C 3
                | 4
            C -> A
                | ε
        `);

        expect(rule2.first('A')).toEqual(new Set(['1', '3', '4', EPSILON]));
        expect(rule2.first('B')).toEqual(new Set(['1', '3', '4', EPSILON]));
        expect(rule2.first('C')).toEqual(new Set(['1', '3', '4', EPSILON]));

    });

    test('rules follow', () => {
        const rule1 = new Rules(`
            A -> B 0
                | A 1
                | B
            B -> 2
        `);
        expect(rule1.follow('A')).toEqual(new Set([END, '1']));
        expect(rule1.follow('B')).toEqual(new Set([END, '0', '1']));


        const rule2 = new Rules(`
            A -> B 0
                | A 1
                | B
            B -> A
                | 2
        `);
        expect(rule2.follow('A')).toEqual(new Set([END, '0', '1']));
        expect(rule2.follow('B')).toEqual(new Set([END, '0', '1']));


        const rule3 = new Rules(`
            A -> A B C
            B -> ε
            C -> 3
                | 4
        `);
        expect(rule3.follow('A')).toEqual(new Set([END, '3', '4']));
        expect(rule3.follow('B')).toEqual(new Set(['3', '4']));
        expect(rule3.follow('C')).toEqual(new Set([END, '3', '4']));
        

        expect(rule3.follow('B') === rule3.follow('B')).toBeTruthy();
    });


    test('rules closure', () => {
        const rule1 = new Rules(`
            SS -> S
            S -> C C
            C -> c C 
                | d
        `);
        expect(rule1.closure(new Set([]))).toEqual(new Set([]));
        const item1 = new Item(rule1.productions[1].right[0] as ProductionRightSingle, 0);
        expect(rule1.closure(new Set([item1]))).toEqual(new Set([
            new Item(rule1.productions[1].right[0] as ProductionRightSingle, 0),
            new Item(rule1.productions[2].right[0] as ProductionRightSingle, 0),
            new Item(rule1.productions[3].right[0] as ProductionRightSingle, 0),
            new Item(rule1.productions[3].right[1] as ProductionRightSingle, 0)
        ]));
        const item2 = new Item(rule1.productions[2].right[0] as ProductionRightSingle, 1);

        expect(rule1.closure(new Set([item2]))).toEqual(new Set([
            new Item(rule1.productions[2].right[0] as ProductionRightSingle, 1),
            new Item(rule1.productions[3].right[0] as ProductionRightSingle, 0),
            new Item(rule1.productions[3].right[1] as ProductionRightSingle, 0)
        ]));

        const item3 = new Item(rule1.productions[3].right[0] as ProductionRightSingle, 1);

        expect(rule1.closure(new Set([item3]))).toEqual(new Set([
            new Item(rule1.productions[3].right[0] as ProductionRightSingle, 1),
            new Item(rule1.productions[3].right[0] as ProductionRightSingle, 0),
            new Item(rule1.productions[3].right[1] as ProductionRightSingle, 0)
        ]));

        const item4 = new Item(rule1.productions[3].right[1] as ProductionRightSingle, 0);

        expect(rule1.closure(new Set([item4]))).toEqual(new Set([
            new Item(rule1.productions[3].right[1] as ProductionRightSingle, 0),
        ]));

        const itemSet = new Set([item4]);
        expect(rule1.closure(itemSet) === rule1.closure(itemSet)).toBeTruthy();
    });

    test('rules goto', () => {
        const rule1 = new Rules(`
            S -> C C
            C -> c C 
                | d
        `);

        const item1 = new Item(rule1.productions[0].right[0] as ProductionRightSingle, 0);
       
        expect(rule1.goto(new Set([item1]), 'S')).toEqual(new Set([
            new Item(rule1.productions[0].right[0] as ProductionRightSingle, 1),
        ]));

        expect(rule1.goto(new Set([item1]), 'C')).toEqual(new Set([
            new Item(rule1.productions[1].right[0] as ProductionRightSingle, 1),
        ]));

        expect(rule1.goto(new Set([item1]), 'c')).toEqual(new Set([
            new Item(rule1.productions[2].right[0] as ProductionRightSingle, 1),
        ]));

        expect(rule1.goto(new Set([item1]), 'd')).toEqual(new Set([
            new Item(rule1.productions[2].right[1] as ProductionRightSingle, 1),
        ]));


        const item2 = rule1.goto(new Set([item1]), 'c');

        expect(rule1.goto(item2, 'c')).toEqual(new Set([
            new Item(rule1.productions[2].right[0] as ProductionRightSingle, 1),
        ]));

        expect(rule1.goto(item2, 'C')).toEqual(new Set([
            new Item(rule1.productions[2].right[0] as ProductionRightSingle, 2),
        ]));

        expect(rule1.goto(item2, 'C') === rule1.goto(item2, 'C')).toBeTruthy();
    });

    test('rules collect items', () => {
        const rule1 = new Rules(`
            S -> L = R
                | R
            L -> * R
                | id
            R -> L
        `);
        expect(rule1.Kernels).toEqual([
            new Set([
                new Item(rule1.productions[0].right[0] as ProductionRightSingle, 0),
            ]),
            new Set([
                new Item(rule1.productions[0].right[0] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[1].right[0] as ProductionRightSingle, 1),
                new Item(rule1.productions[3].right[0] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[1].right[1] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[2].right[0] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[2].right[1] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[1].right[0] as ProductionRightSingle, 2),
            ]),
            new Set([
                new Item(rule1.productions[2].right[0] as ProductionRightSingle, 2),
            ]),
            new Set([
                new Item(rule1.productions[3].right[0] as ProductionRightSingle, 1),
            ]),
            new Set([
                new Item(rule1.productions[1].right[0] as ProductionRightSingle, 3),
            ]),
        ]);
        
    });

    test('rules collect lookaheads', () => {
        const rule1 = new Rules(`
            S -> L = R
                | R
            L -> * R
                | id
            R -> L
        `);
        expect(rule1.toArray()).toEqual([
            [
                ['Qk -> · S', new Set([END])]
            ],
            [
                ['Qk -> S ·', new Set([END])]
            ],
            [
                ['S -> L · = R', new Set([END])],
                ['R -> L ·', new Set([END])]
            ],
            [
                ['S -> R ·', new Set([END])]
            ],
            [
                ['L -> * · R', new Set([END, '='])]
            ],
            [
                ['L -> id ·', new Set([END, '='])]
            ],
            [
                ['S -> L = · R', new Set([END])]
            ],
            [
                ['L -> * R ·', new Set([END, '='])]
            ],
            [
                ['R -> L ·', new Set([END, '='])]
            ],
            [
                ['S -> L = R ·', new Set([END])]
            ],
        ]);
    });
});
