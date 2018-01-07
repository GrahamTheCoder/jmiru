import { isKanji, toHiragana, isKana } from 'wanakana';
const kiwi = require('./kiwi');

const maxUnmatched = 2;
const averageKanaPerKanji = 2;
const maxKanaPerKanji = 4;

export class JCharacter {
    hEnd: kiwi.Variable;
    hStart: kiwi.Variable;
    jIsKana: boolean;
    jIsKanji: boolean;
    jChr: string;

    constructor(c: string, i: number) {
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
        solver.createConstraint(this.hEnd, kiwi.Operator.Ge, lastValidEndIndex - maxUnmatched, kiwi.Strength.required);
        solver.createConstraint(this.hEnd, kiwi.Operator.Eq, lastValidEndIndex, kiwi.Strength.strong);
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
            // This is backwards for what's wanted here and totally broken anyway, but it's just to remind me of the idea of creating an expression that can AND and OR things
            let startExpression: kiwi.Expression = new kiwi.Expression(0);
            let endExpression: kiwi.Expression = new kiwi.Expression(0);
            kIndexesToAvoidEndingOn.forEach(kIndex => {
                const zeroIfMatched = (v: kiwi.Variable) => new kiwi.Expression(1).minus(v.plus(1).divide(kIndex + 1));
                const minusTenThousandIfMatchedStart = zeroIfMatched(this.hStart).multiply(zeroIfMatched(this.hStart)).multiply(10000).minus(10000);
                const minusTenThousandIfMatchedEnd = zeroIfMatched(this.hEnd).multiply(zeroIfMatched(this.hEnd)).multiply(10000).minus(10000);
                startExpression = startExpression.plus(minusTenThousandIfMatchedStart);
                endExpression = endExpression.plus(minusTenThousandIfMatchedEnd);
            });            
            
            const avoidSmallKanaStrength = kiwi.Strength.required;
            solver.createConstraint(startExpression, kiwi.Operator.Le, -100000, avoidSmallKanaStrength); 
            solver.createConstraint(endExpression, kiwi.Operator.Le, -100000, avoidSmallKanaStrength); 
            
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