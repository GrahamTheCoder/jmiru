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
    const startVars: kiwi.Variable[] = japanese.map((c, i) => new kiwi.Variable('start-' + i)); // Starting character inclusive
    const endVars: kiwi.Variable[] = japanese.map((c, i) => new kiwi.Variable('end-' + i)); // Ending character exclusive
    const kIndexesToAvoidEndingOn = getAllIndexes(kana, attachToPrecedingCharacter);
    
    const lastEndVar = endVars[endVars.length - 1];
    solver.createConstraint(lastEndVar, kiwi.Operator.Le, kana.length, kiwi.Strength.required);
    solver.createConstraint(lastEndVar, kiwi.Operator.Ge, kana.length - maxUnmatched, kiwi.Strength.strong);
    solver.createConstraint(lastEndVar, kiwi.Operator.Eq, kana.length, kiwi.Strength.medium);

    let prevEnd: kiwi.Variable | null = null;
    startVars.forEach((s, i) => {
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
            kana.forEach((k, ki) => {
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
            kIndexesToAvoidEndingOn.forEach(kIndex => {
                solver.createConstraint(e, kiwi.Operator.Le, kIndex - 1, kiwi.Strength.weak);
                solver.createConstraint(e, kiwi.Operator.Ge, kIndex + 1, kiwi.Strength.weak);
            });            
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