import { isKanji, isKana, isRomaji, toHiragana } from 'wanakana';

interface LineInfo {
    romajiLine: string;
    musicChordLine: string;
    kanaLine: string;
    kanjiLine: string;
    unclassifiedLines: string[];
}

type FindClassifier<T> = (input: T, index: number, array: T[]) => boolean;

function isMusicChordLine(line: string) {
    // tslint:disable-next-line:max-line-length
    // MIT licensed https://github.com/hrgui/angular-chord-transposer/blob/master/src/angular.chord-area.js#L88
    const musicChordRegex = /^\(?[A-G][b#]?(2|5|6|7|9|11|13|6\/9|7\-5|7\-9|7#5|7#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|dim|dim7|M7|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|mb5|m|sus|sus2|sus4)*(\/[A-G][b#]*)*\)?$/;
    const ignoredCharacters = ['', '    ', '.', ','];
    const potentialChords = line.split(' ').filter(potentialChord => !ignoredCharacters.includes(potentialChord));
    return potentialChords.length > 0
        && potentialChords.every(potentialChord => potentialChord.match(musicChordRegex) != null);
}

function isKanjiLine(line: string) {
    return line.split('').some(isKanji);
}

function findEachEntryOnce<T>(f: FindClassifier<T>, usedEntryIndexes: number[]) {
    return (input: T, index: number, array: T[]) => {
        const isNewMatch = !usedEntryIndexes.includes(index) && f(input, index, array);
        if (isNewMatch) {
            usedEntryIndexes.push(index);
        }
        return isNewMatch;
    };
}

function createLineInfoFromChunkLines(chunkLines: string[]): LineInfo {
    const classifiers = [isKanjiLine, isKana, isMusicChordLine, isRomaji];
    const usedLineIndexes = new Array();
    const classified = classifiers
        .map(classify => findEachEntryOnce(classify, usedLineIndexes))
        .map(classifyOnce => chunkLines.find(classifyOnce) || '');
    const unclassified = chunkLines.filter((cur, index) => !usedLineIndexes.includes(index));
    return { kanjiLine: classified[0], kanaLine: classified[1], musicChordLine: classified[2], romajiLine: classified[3], unclassifiedLines: unclassified };
}

function furiganaOutputFromLineInfo(lineInfos: LineInfo[]) {
    const outputChunks = lineInfos.map(lineInfo => 
        [lineInfo.musicChordLine, lineInfo.kanjiLine, toHiragana(lineInfo.romajiLine), lineInfo.unclassifiedLines.join('\n')]
        .filter(x => x !== undefined && x !== '').join('\n')
    );
    return outputChunks;
}

export { createLineInfoFromChunkLines, furiganaOutputFromLineInfo };