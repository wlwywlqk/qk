import { Rules, Production, ProductionLeft, ProductionRight, ProductionRightSingle, ProductionRightEqual } from '../rules';
describe('rules', () => {
    test('sample single rules', () => {
        const rulesStr = `Program -> Declarations Statements`;

        const rules = new Rules(rulesStr);
        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], '', expectedProduction));
        expect(rules.productions).toEqual([ expectedProduction ]);
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
        expect(rules.productions).toEqual([ expectedProduction ]);

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
        expect(rules.productions).toEqual([ expectedProduction ]);
    });

    test('rules with mutiple right', () => {
        const rules = new Rules(`Declarations -> Declarations Declaration
        |`);

        const expectedProduction = new Production('Declarations', []);

        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Declaration'], '', expectedProduction));
        expectedProduction.right.push(new ProductionRightSingle([], '', expectedProduction));

        expect(rules.productions).toEqual([ expectedProduction ]);
    });



    test('multiple line rules', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code
        Program1 -> Declarations Statements   # test code1
        `);

        const expectedProduction = new Production('Program', []);
        expectedProduction.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code', expectedProduction));

        const expectedProduction1 = new Production('Program1', []);
        expectedProduction1.right.push(new ProductionRightSingle(['Declarations', 'Statements'], 'test code1', expectedProduction1));

        expect(rules.productions).toEqual([ expectedProduction, expectedProduction1 ]);
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

        expect(rules.productions).toEqual([ expectedProduction, expectedProduction1 ]);
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

        expect(rules.productions).toEqual([ expectedProduction ]);
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
 
});
