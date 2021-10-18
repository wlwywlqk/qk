import { Tag } from './tag'

export class Token {
    constructor(
        public readonly tag: Tag,
        public readonly lexeme: string,
        public readonly literal: any = lexeme,
    ) { }

    public toString() {
        return `${this.literal}`;
    }
}

export class Num extends Token {
    constructor(
        literal: number,
    ) {
        super(Tag.NUM, 'num', literal);
    }

    public toString() {
        return `${this.literal}`;
    }
}

export class Str extends Token {
    constructor(
        public literal: string,
    ) {
        super(Tag.STR, 'str', literal);
    }

    public toString() {
        return `${this.literal}`;
    }
}

export class Id extends Token {
    constructor(
        public literal: string
    ) {
        super(Tag.ID, 'id', literal);
    }
}
