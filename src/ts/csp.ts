import { JCharacter } from './JCharacter';

const kiwi = require('./kiwi');

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
    const kana = kanaStr.split('');
    const jVars = japaneseStr.split('').map((c, i) => new JCharacter(c, i));

    const kIndexesToAvoidEndingOn = getAllIndexes(kana, attachToPrecedingCharacter);
    jVars[jVars.length - 1].addEndConstraints(solver, kana.length);
    jVars.forEach((j, i) => {
        j.addSequenceConstraints(solver, jVars[i - 1] && jVars[i - 1].hEnd);
        j.addLengthConstraints(solver);
        j.addCharacterSpecificConstraints(solver, kIndexesToAvoidEndingOn, kana);
    });
    
    solver.updateVariables();
    return jVars.map((j, i) => j.build(kanaStr, jVars[i + 1]));
};