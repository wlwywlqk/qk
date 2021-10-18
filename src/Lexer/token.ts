import { Tag } from './tag'

export class Token {
    constructor(
        public readonly tag: Tag,
        public readonly lexeme: string,
    ) { }

    public toString() {
        return `${this.lexeme}`;
    }
}

export class Num extends Token {
    constructor(
        public readonly literal: number,
    ) {
        super(Tag.NUM, 'num');
    }

    public toString() {
        return `${this.literal}`;
    }
}

export class Str extends Token {
    constructor(
        public readonly literal: string,
    ) {
        super(Tag.STR, 'str');
    }

    public toString() {
        return `${this.literal}`;
    }
}

export class Id extends Token {
    constructor(
        public readonly literal: string
    ) {
        super(Tag.ID, 'id')
    }
}
