import { Rules, Action, END, ProductionRightSingle } from './rules';
import { DefinitionMap } from './definition';
import { Lexer } from '../Lexer';
import { Token } from '../Lexer/token';
import { Tag } from '../Lexer/tag';
import { ParserError, ParserRuleError } from './error';


const EndToken = new Token(Tag.END, END, 'end');

export class Parser {
    public rules: Rules | null = null;
    constructor(rules: string) {
        this.rules = new Rules(rules);
        // this.rules.printParsingTable();
    }

    public run(lexer: Lexer, cb: CallableFunction | null = null): [any, ParserError[]] {
        try {
            const statusStack = [0];
            const stack: any[] = [];
            let { line, col } = lexer;
            let token = this.nextToken(lexer);
            const errors = [];
            while (token) {
                const status = statusStack[statusStack.length - 1];
                const action = this.rules!.ActionMap.get(status)!.get(token.lexeme) || [Action.ERROR, Action.ERROR];
                switch (action[0]) {
                    case Action.ACCEPT:
                        token = null;
                        break;
                    case Action.ERROR:
                        errors.push(new ParserError(`Unexpected token '${token.literal}'`, line, col));
                        line = lexer.line;
                        col = lexer.col;
                        token = this.nextToken(lexer);
                        break;
                    case Action.SHIFT:
                        statusStack.push(action[1]);
                        stack.push(token);
                        line = lexer.line;
                        col = lexer.col;
                        token = this.nextToken(lexer);
                        break;
                    case Action.REDUCE:
                        const single = this.rules!.productionSingles[action[1]];
                        const params = [];
                        for (let i = 0, len = single.symbols.length; i < len; i++) {
                            if (`${stack[stack.length - 1]}` === single.symbols[single.symbols.length - i - 1]) {
                                const pop = stack.pop();
                                params.unshift(pop instanceof Token ? pop.literal : pop);
                                statusStack.pop();
                            } else {
                                params.unshift(null);
                            }
                        }

                        const head = statusStack[statusStack.length - 1];
                        statusStack.push(this.rules!.GotoMap.get(head)!.get(single.production!.left)!);
                        
                        const node = new (DefinitionMap.get(single.production!.left)!)();
                        stack.push(node);
                        this.evalCode(single, node, params);
                        // console.log(`${single.production?.left} -> ${single.symbols.join(' ')}\n`);
                }

                if (cb) {
                    cb(statusStack, stack);
                }
            }
            return [stack[0], errors];
        } catch (e) {
            throw e;
        }
    }

    private nextToken(lexer: Lexer): Token | null {
        if (lexer.finished) {
            return null;
        }
        const result = lexer.scan();
        if (result === null) {
            lexer.finished = true;
            return EndToken;
        }
        return result;
    }

    private evalCode(single: ProductionRightSingle, $: any, $$: any[]) {
        try {
            eval(single.code);
        } catch(e) {
            throw new ParserRuleError(`Unexpected error at ${single} code.`);
        }
    }
}