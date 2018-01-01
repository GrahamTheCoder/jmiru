import { isKanji, toHiragana, isKana } from 'wanakana';
const kiwi = require('./kiwi');

const maxUnmatched = 2;
const averageKanaPerKanji = 2;
const maxKanaPerKanji = 4;

export const MatchFuriganaForLine = (japaneseStr: string, kanaStr: string) => {
    var solver: kiwi.Solver = new kiwi.Solver();
    // const jStart = new kiwi.Variable('jStart');
    // const hStart = new kiwi.Variable('hStart');
    // const jEnd =  japanese.length - 1;
    const japanese = japaneseStr.split('');
    const kana = kanaStr.split('');
    const  startVars = japanese.map((c, i) => new kiwi.Variable('start-' + i)); // Starting character inclusive
    const  endVars = japanese.map((c, i) => new kiwi.Variable('end-' + i)); // Ending character exclusive
    
    const lastEndVar = endVars[endVars.length - 1];
    solver.createConstraint(lastEndVar, kiwi.Operator.Le, kana.length, kiwi.Strength.required);
    solver.createConstraint(lastEndVar, kiwi.Operator.Ge, kana.length - maxUnmatched, kiwi.Strength.strong);
    solver.createConstraint(lastEndVar, kiwi.Operator.Eq, kana.length, kiwi.Strength.medium);
    let prevEnd: kiwi.Variable | null = null;
    startVars.map((s, i) => {
        const e: kiwi.Variable = endVars[i];
        const jChr = japanese[i];
        const jIsKanji = isKanji(jChr);
        const jIsKana = isKana(jChr);
        let minLength = 0;
        if (jIsKanji || jIsKana) {
            minLength = 1;
        }

        solver.createConstraint(s, kiwi.Operator.Ge, prevEnd || 0, kiwi.Strength.required);
        solver.createConstraint(e, kiwi.Operator.Ge, s.plus(minLength), kiwi.Strength.required);
        solver.createConstraint(s, kiwi.Operator.Le, prevEnd && prevEnd.plus(maxUnmatched) || maxUnmatched, kiwi.Strength.required);
        solver.createConstraint(s, kiwi.Operator.Eq, prevEnd || 0, kiwi.Strength.strong);
        
        if (jIsKana) {
            const asHiragana = toHiragana(jChr);
            solver.createConstraint(e, kiwi.Operator.Eq, s.plus(1), kiwi.Strength.required);
            let firstIndex: number | null = null;
            let lastIndex: number | null = null;
            kana.map((k, ki) => {
                if (toHiragana(k) === asHiragana) {
                    firstIndex = firstIndex || ki;
                    lastIndex = ki;
                    solver.createConstraint(s, kiwi.Operator.Eq, ki, kiwi.Strength.strong);
                }
            });
            if (firstIndex != null && lastIndex != null) {
                solver.createConstraint(s, kiwi.Operator.Ge, firstIndex, kiwi.Strength.strong);
                solver.createConstraint(s, kiwi.Operator.Le, lastIndex, kiwi.Strength.strong);
            }
        } else if (jIsKanji) {
            solver.createConstraint(e, kiwi.Operator.Eq, s.plus(averageKanaPerKanji), kiwi.Strength.weak);
            solver.createConstraint(e, kiwi.Operator.Le, s.plus(maxKanaPerKanji), kiwi.Strength.required);
        }
        prevEnd = e;
    });
    
    solver.updateVariables();
    return startVars.map((s, i) => {
        const e = endVars[i];
        const correspondingKana = kanaStr.substring(s.value(), e.value());
        const nextStart = (startVars[i + 1] || e).value();
        const trailingUnmatched = kanaStr.substring(e.value(), nextStart);
        const shouldDisplay = correspondingKana.length > 0 && isKanji(japanese[i]);
        return {
            japanese: japanese[i],
            kana: correspondingKana,
            trailingUnmatched: trailingUnmatched,
            shouldDisplay: shouldDisplay,
            shouldDisplayDebug: shouldDisplay || isKana(japanese[i]) && toHiragana(japanese[i]) !== toHiragana(correspondingKana),
            debug: s.value() + '-' + e.value()
        };
    });
};