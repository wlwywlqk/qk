import { Rules, Production, ProductionLeft, ProductionRight, ProductionRightSingle, ProductionRightEqual } from '../rules';


describe('rules', () => {
    test('sample single rules', () => {
        const rulesStr = `Program -> Declarations Statements`;

        const rules = new Rules(rulesStr);
 
        expect(rules.productions).toEqual([
            new Production('Program', [new ProductionRightSingle(['Declarations', 'Statements'], '')])
        ]);
        expect(rules.line).toEqual(1);
        expect(rules.col).toEqual(rulesStr.length);
        expect(rules.end).toBeTruthy();
    });

    test('single rules with code', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code`);

        expect(rules.productions).toEqual([
            new Production('Program', [new ProductionRightSingle(['Declarations', 'Statements'], 'test code')])
        ]);
    });

    test('rules with mutiple right equal', () => {
        const rules = new Rules(`RelExpression -> Expression < Expression
        |= Expression <= Expression
        |= Expression > Expression
        |= Expression >= Expression`);

        expect(rules.productions).toEqual([
            new Production('RelExpression', [
                new ProductionRightEqual([
                    new ProductionRightSingle(['Expression', '<', 'Expression']),
                    new ProductionRightSingle(['Expression', '<=', 'Expression']),
                    new ProductionRightSingle(['Expression', '>', 'Expression']),
                    new ProductionRightSingle(['Expression', '>=', 'Expression']),
                ], true),
            ])
        ]);
    });

    test('rules with mutiple right', () => {
        const rules = new Rules(`Declarations -> Declarations Declaration
        | ε`);

        expect(rules.productions).toEqual([
            new Production('Declarations', [
                new ProductionRightSingle(['Declarations', 'Declaration']),
                new ProductionRightSingle(['ε'])
            ])
        ]);
    });

    test('multiple line rules', () => {
        const rules = new Rules(`Program -> Declarations Statements   # test code
        Program1 -> Declarations Statements   # test code1
        `);

        expect(rules.productions).toEqual([
            new Production('Program', [new ProductionRightSingle(['Declarations', 'Statements'], 'test code')]),
            new Production('Program1', [new ProductionRightSingle(['Declarations', 'Statements'], 'test code1')])
        ]);
    });

});
