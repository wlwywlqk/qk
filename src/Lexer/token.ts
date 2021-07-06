import { Tag } from './tag'

export class Token {
    constructor(public readonly tag: Tag) { }

    public toString() {
        return `${this.tag}`;
    }
}

export class Num extends Token {
    constructor(public readonly value: number) {
        super(Tag.NUM);
    }

    public toString() {
        return `${this.value}`;
    }
}

export class Word extends Token {
    public static And = new Word('&&', Tag.AND);
    public static Or = new Word('||', Tag.OR);
    public static Eq = new Word('==', Tag.EQ);
    public static Ge = new Word('>=', Tag.LE);
    public static Le = new Word('<=', Tag.LE);
    public static Gt = new Word('>', Tag.GT);
    public static Lt = new Word('<', Tag.EQ);
    public static True = new Word('true', Tag.TRUE);
    public static False = new Word('false', Tag.FALSE);

    constructor(public readonly lexeme: string, public readonly tag: Tag) {
        super(tag);
    }

    public toString() {
        return `${this.lexeme}`;
    }
}