
const CharCodeAt_a = 'a'.charCodeAt(0);
const CharCodeAt_z = 'z'.charCodeAt(0);
const CharCodeAt_A = 'A'.charCodeAt(0);
const CharCodeAt_Z = 'Z'.charCodeAt(0);
const CharCodeAt_0 = '0'.charCodeAt(0);
const CharCodeAt_9 = '9'.charCodeAt(0);

export function isLetter(char: string) {
    const charCode = char.charCodeAt(0);
    return charCode >= CharCodeAt_a && charCode <= CharCodeAt_z
        || charCode >= CharCodeAt_A && charCode <= CharCodeAt_Z;
}

export function isNumber(char: string) {
    const charCode = char.charCodeAt(0);
    return charCode >= CharCodeAt_0 && charCode <= CharCodeAt_9;
}

export function mergeSet(set1: Set<unknown>, set2: Set<unknown>) {
    let changed = false;
    if (set1 === set2) return changed;
    for (const value of set2) {
        if (!set1.has(value)) {
            changed = true;
        }
        set1.add(value);
    }
    return changed;
}
