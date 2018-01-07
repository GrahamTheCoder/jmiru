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
    const jVars = japanese.map((c, i) => ({
        jIndex: i,
        jChr: c,
        jIsKanji: isKanji(c),
        jIsKana: isKana(c),
        hStart: <kiwi.Variable> new kiwi.Variable('start-' + i), // Starting character inclusive
        hEnd: <kiwi.Variable> new kiwi.Variable('end-' + i) // Ending character exclusive
    }));

    const kIndexesToAvoidEndingOn = getAllIndexes(kana, attachToPrecedingCharacter);
    const lastEndVar = jVars[jVars.length - 1].hEnd;
    solver.createConstraint(lastEndVar, kiwi.Operator.Le, kana.length, kiwi.Strength.required);
    solver.createConstraint(lastEndVar, kiwi.Operator.Ge, kana.length - maxUnmatched, kiwi.Strength.strong);
    solver.createConstraint(lastEndVar, kiwi.Operator.Eq, kana.length, kiwi.Strength.medium);

    let prevEnd: kiwi.Variable | null = null;
    jVars.forEach((j, i) => {
        const s: kiwi.Variable = j.hStart;
        const e: kiwi.Variable = j.hEnd;
        const jChr = j.jChr;
        const jIsKanji = j.jIsKanji;
        const jIsKana = j.jIsKana;
        let minLength = 0;
        if (jIsKanji || jIsKana) {
            minLength = 1;
        }

        solver.createConstraint(s, kiwi.Operator.Ge, prevEnd || 0, kiwi.Strength.required);
        solver.createConstraint(e, kiwi.Operator.Ge, s.plus(minLength), kiwi.Strength.required);
        solver.createConstraint(s, kiwi.Operator.Le, prevEnd && prevEnd.plus(maxUnmatched) || 0, kiwi.Strength.required);
        solver.createConstraint(s, kiwi.Operator.Eq, prevEnd || 0, kiwi.Strength.strong);
        
        if (jIsKanji) {
            solver.createConstraint(e, kiwi.Operator.Eq, s.plus(averageKanaPerKanji), kiwi.Strength.weak);
            solver.createConstraint(e, kiwi.Operator.Le, s.plus(maxKanaPerKanji), kiwi.Strength.required);
            kIndexesToAvoidEndingOn.forEach(kIndex => {
                // create(0, 0, 1, 0.9) TODO: Fix this - it isn't playing well with the average kana or unmatched rule
                const avoidSmallKanaStrength = kiwi.Strength.weak;
                solver.createConstraint(s, kiwi.Operator.Le, kIndex - 1, avoidSmallKanaStrength);
                solver.createConstraint(s, kiwi.Operator.Ge, kIndex + 1, avoidSmallKanaStrength);
                solver.createConstraint(e, kiwi.Operator.Le, kIndex - 1, avoidSmallKanaStrength);
                solver.createConstraint(e, kiwi.Operator.Ge, kIndex + 1, avoidSmallKanaStrength);
            });            
        } else {
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
                solver.createConstraint(s, kiwi.Operator.Ge, firstIndex, kiwi.Strength.required);
                solver.createConstraint(s, kiwi.Operator.Le, lastIndex, kiwi.Strength.required);
            }
        }
        prevEnd = e;
    });
    
    solver.updateVariables();
    return jVars.map((j, i) => {
        const s = j.hStart;
        const e = j.hEnd;
        const correspondingKana = kanaStr.substring(s.value(), e.value());
        const nextJVar = jVars[j.jIndex + 1];
        const nextStart = (nextJVar && nextJVar.hStart || e).value();
        const trailingUnmatched = kanaStr.substring(e.value(), nextStart);
        const shouldDisplay = correspondingKana.length > 0 && j.jIsKanji;
        return {
            japanese: j.jChr,
            kana: correspondingKana,
            trailingUnmatched: trailingUnmatched,
            shouldDisplay: shouldDisplay,
            shouldDisplayDebug: shouldDisplay || j.jIsKana && toHiragana(j.jChr) !== toHiragana(correspondingKana),
            debug: s.value() + '-' + e.value()
        };
    });
};