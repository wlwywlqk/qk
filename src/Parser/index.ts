import { Rules, Action } from './rules';
import { Lexer } from '../Lexer';
import { Token, Str, Num } from '../Lexer/token';
import { ParserError, ParserRuleError } from './error';


export class Parser {
    public rules: Rules | null = null;
    public error: ParserError | ParserRuleError | null = null;
    constructor (rules: string) {
        try {
            this.rules = new Rules(rules);

        } catch (e) {
            this.error = e as ParserRuleError;
            throw e;
        }
        // this.rules.printParsingTable();
    }

    public run(lexer: Lexer) {
        try {
            const stack = [0];
            while (true) {
                const token = lexer.scan();
                if (token) {
                    const status = stack[stack.length - 1];
                    const action = this.rules!.ActionMap.get(status)!.get(token.lexeme) || [];
                    const production = this.rules!.kernels[status];
                    if (!action) {
                        this.errorRecovery();
                    } else {
                        switch (action[0]) {
                            case Action.ACCEPT: this.accept(); break;
                            case Action.REDUCE: ; break;
                            case Action.SHIFT: stack.push(action[1] as number); break;
                        }
                    }
                } else {
                    break;
                }
            }

        } catch (e) {
            this.error = e as ParserError;
        }
    }

    private accept() {
        console.log('accept')
    }

    private errorRecovery() {

    }

   
}