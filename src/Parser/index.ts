import { Rules, Action, END } from './rules';
import { Lexer } from '../Lexer';
import { Token, Str, Num } from '../Lexer/token';
import { Tag } from '../Lexer/tag';
import { ParserError, ParserRuleError } from './error';


const EndToken = new Token(Tag.END, END);

export class Parser {
    public rules: Rules | null = null;
    public error: ParserError | ParserRuleError | null = null;
    constructor(rules: string) {
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
            const symbolStack = [];
            let token = this.nextToken(lexer);
            while (token) {
                if (token === EndToken) debugger
                let lexerRest = lexer.rest;
                const status = stack[stack.length - 1];
                const action = this.rules!.ActionMap.get(status)!.get(token.lexeme) || [Action.ERROR, Action.ERROR];
                switch (action[0]) {
                    case Action.ACCEPT: this.accept(); token = this.nextToken(lexer); break;
                    case Action.ERROR: token = this.nextToken(lexer); break;
                    case Action.SHIFT: stack.push(action[1]); symbolStack.push(token.lexeme); token = this.nextToken(lexer); break;
                    case Action.REDUCE:
                        const single = this.rules!.productionSingles[action[1]];
                        console.log(`${single.production!.left} -> ${single}`)
                        let i = 1;
                        for (let i = 0, len = single.symbols.length; i < len; i++) {
                            if (symbolStack[symbolStack.length - 1] === single.symbols[single.symbols.length - i - 1]) {
                                symbolStack.pop();
                                stack.pop();
                            }
                        }
                       
                        const head = stack[stack.length - 1];
                        stack.push(this.rules!.GotoMap.get(head)!.get(single.production!.left)!);
                        symbolStack.push(single.production!.left);
                        lexerRest = token.lexeme + lexerRest;
                }

                console.log(`${(stack + '').padEnd(20)}    ${symbolStack.join(' ').padEnd(50)}     ${lexerRest.padStart(30)}`)

            }
        } catch (e) {
            this.error = e as ParserError;
            throw e;
        }
    }

    private nextToken(lexer: Lexer): Token | null {
        if (lexer.finished) {
            return null;
        }
        if (lexer.end) {
            lexer.finished = true;
            return EndToken;
        }
        return lexer.scan();
    }

    private accept() {
        console.log('accept')
    }

    private errorRecovery() {

    }
}