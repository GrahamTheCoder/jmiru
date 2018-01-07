import { isKanji, toHiragana, isKana } from 'wanakana';
const kiwi = require('./kiwi');

const maxUnmatched = 2;
const averageKanaPerKanji = 2;
const maxKanaPerKanji = 4;
const smallChars = ['ぁ', 'ぃ', 'ぇ', 'ぅ', 'ぉ', 'ゃ', 'ゅ', 'ょ', 'っ', 'ゕ', 'ゖ', 'ゎ'];

function getAllIndexes<T>(arr: T[], predicate: ((_: T) => boolean)) {
    var indexes = [];
    for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i])) {
            indexes.push(i);
        }
    }
    return indexes;
}

function attachToPrecedingCharacter(char: string) {
    return smallChars.includes(char);
}

export const MatchFuriganaForLine = (japaneseStr: string, kanaStr: string) => {
    var solver: kiwi.Solver = new kiwi.Solver();
    const japanese = japaneseStr.split('');
    const kana = kanaStr.split('');
    const jVars = japanese.map((c, i) => new JCharacter(c, i));

    const kIndexesToAvoidEndingOn = getAllIndexes(kana, attachToPrecedingCharacter);
    jVars[jVars.length - 1].addEndConstraints(solver, kana.length);
    let prevEnd: kiwi.Variable | null = null;
    jVars.forEach((j, i) => {
        j.addSequenceConstraints(solver, prevEnd);
        j.addLengthConstraints(solver);
        j.addCharacterSpecificConstraints(solver, kIndexesToAvoidEndingOn, kana);
        prevEnd = j.hEnd;
    });
    
    solver.updateVariables();
    return jVars.map((j, i) => j.build(kanaStr, jVars[i + 1]));
};

class JCharacter {
    hEnd: kiwi.Variable;
    hStart: kiwi.Variable;
    jIsKana: boolean;
    jIsKanji: boolean;
    jChr: string;
    jIndex: number;

    constructor(c: string, i: number) {
        this.jIndex = i;
        this.jChr = c;
        this.jIsKanji = isKanji(c);
        this.jIsKana = isKana(c);
        this.hStart = new kiwi.Variable('start-' + i); // Starting character inclusive
        this.hEnd = new kiwi.Variable('end-' + i); // Ending character exclusive
    }

    addSequenceConstraints(solver: kiwi.Solver, prevEnd: kiwi.Variable | null) {

        solver.createConstraint(this.hStart, kiwi.Operator.Ge, prevEnd || 0, kiwi.Strength.required);
        solver.createConstraint(this.hStart, kiwi.Operator.Le, prevEnd && prevEnd.plus(maxUnmatched) || 0, kiwi.Strength.required);
        solver.createConstraint(this.hStart, kiwi.Operator.Eq, prevEnd || 0, kiwi.Strength.strong);
    }

    addEndConstraints(solver: kiwi.Solver, lastValidEndIndex: number) {
        solver.createConstraint(this.hEnd, kiwi.Operator.Le, lastValidEndIndex, kiwi.Strength.required);
        solver.createConstraint(this.hEnd, kiwi.Operator.Ge, lastValidEndIndex - maxUnmatched, kiwi.Strength.strong);
        solver.createConstraint(this.hEnd, kiwi.Operator.Eq, lastValidEndIndex, kiwi.Strength.medium);
    }

    addLengthConstraints(solver: kiwi.Solver) {
        if (this.jIsKanji) {
            solver.createConstraint(this.hEnd, kiwi.Operator.Ge, this.hStart.plus(1), kiwi.Strength.required);
            solver.createConstraint(this.hEnd, kiwi.Operator.Le, this.hStart.plus(maxKanaPerKanji), kiwi.Strength.required);
            solver.createConstraint(this.hEnd, kiwi.Operator.Eq, this.hStart.plus(averageKanaPerKanji), kiwi.Strength.weak);
        } else {
            solver.createConstraint(this.hEnd, kiwi.Operator.Eq, this.hStart.plus(1), kiwi.Strength.required);
        }
    }

    addCharacterSpecificConstraints(solver: kiwi.Solver, kIndexesToAvoidEndingOn: number[], kana: string[]) {
        const s: kiwi.Variable = this.hStart;
        const e: kiwi.Variable = this.hEnd;

        if (this.jIsKanji) {
            kIndexesToAvoidEndingOn.forEach(kIndex => {
                // create(0, 0, 1, 0.9) TODO: Fix this - it isn't playing well with the average kana or unmatched rule
                const avoidSmallKanaStrength = kiwi.Strength.weak;
                this.notEqual(solver, s, kIndex, avoidSmallKanaStrength);
                this.notEqual(solver, e, kIndex, avoidSmallKanaStrength);
            });            
        } else {
            const asHiragana = toHiragana(this.jChr);
            let firstIndex: number | null = null;
            let lastIndex: number | null = null;
            kana.forEach((k, ki) => {
                if (toHiragana(k) === asHiragana) {
                    firstIndex = firstIndex || ki;
                    lastIndex = ki;
                    solver.createConstraint(s, kiwi.Operator.Eq, ki, kiwi.Strength.strong);
                }
            });
            if (firstIndex != null && lastIndex != null) {
                solver.createConstraint(s, kiwi.Operator.Ge, firstIndex, kiwi.Strength.required);
                solver.createConstraint(s, kiwi.Operator.Le, lastIndex, kiwi.Strength.required);
            }
        }
    }

    build(kanaStr: string, nextOrDefault: JCharacter) {
        const s = this.hStart;
        const e = this.hEnd;
        const correspondingKana = kanaStr.substring(s.value(), e.value());
        const nextStart = (nextOrDefault && nextOrDefault.hStart || e).value();
        const trailingUnmatched = kanaStr.substring(e.value(), nextStart);
        const shouldDisplay = correspondingKana.length > 0 && this.jIsKanji;
        return {
            japanese: this.jChr,
            kana: correspondingKana,
            trailingUnmatched: trailingUnmatched,
            shouldDisplay: shouldDisplay,
            shouldDisplayDebug: shouldDisplay || this.jIsKana && toHiragana(this.jChr) !== toHiragana(correspondingKana),
            debug: s.value() + '-' + e.value()
        };
    }

    private notEqual(solver: kiwi.Solver, v: kiwi.Variable, i: number, strength: number) {
        solver.createConstraint(v, kiwi.Operator.Le, i - 1, strength);
        solver.createConstraint(v, kiwi.Operator.Ge, i + 1, strength);
    }
}