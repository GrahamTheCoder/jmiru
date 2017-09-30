import { isKanji, isKana, isRomaji, isJapanese, toHiragana } from 'wanakana';

// Index into this with LineType - todo: think of way to tie things together with strong types
class LineInfo {
    constructor() {
        this[LineType.Unclassified] = [];
        }
}

enum LineType {
    Unclassified = 0,
    Kanji,
    Kana,
    Music,
    Romaji
}

const classifiers = new Map<LineType, (line: string) => boolean>([
    [LineType.Kanji, isKanjiLine],
    [LineType.Kana, isKana],
    [LineType.Music, isMusicChordLine],
    [LineType.Romaji, isRomajiLine],
    [LineType.Unclassified, (x: string) => true]
]);

function isLineType(line: string, lineType: LineType) {
    const classifier = classifiers.get(lineType);
    return classifier !== undefined && classifier(line);
}

function removeSpacesAndPunctuation(str: string) {
    return str.replace(/[\s'!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~']/g, '');
}

function isMusicChordLine(line: string) {
    // tslint:disable-next-line:max-line-length
    // MIT licensed https://github.com/hrgui/angular-chord-transposer/blob/master/src/angular.chord-area.js#L88
    const musicChordRegex = /^\(?[A-G][b#]?(2|5|6|7|9|11|13|6\/9|7\-5|7\-9|7#5|7#9|7\+5|7\+9|7b5|7b9|7sus2|7sus4|add2|add4|add9|aug|dim|dim7|M7|m\/maj7|m6|m7|m7b5|m9|m11|m13|maj7|maj9|maj11|maj13|mb5|m|sus|sus2|sus4)*(\/[A-G][b#]*)*\)?$/;
    const repeatTimesRegex = /^[[(][0-9]+[xX][\])]$/; // e.g. (2X), (3x), [4x], [5X] 
    const ignoredCharacters = ['', '    ', '.', ','];
    const potentialChords = line.split(' ').filter(potentialChord => !ignoredCharacters.includes(potentialChord));
    return potentialChords.length > 0
     && potentialChords.every(potentialChord => potentialChord.match(musicChordRegex) != null || potentialChord.match(repeatTimesRegex) != null);
}

function isRomajiLine(line: string) {
    // isRomaji checks individual characters quickly, so the second check ensures that when converted, the line makes valid Japanese
    return isRomaji(line) && isJapanese(removeSpacesAndPunctuation(toHiragana(line)));
}

function isKanjiLine(line: string) {
    return line.split('').some(isKanji);
}

function classifyLine(line: string) {
    const lineTypes = [LineType.Kanji, LineType.Kana, LineType.Music, LineType.Romaji];
    return {line: line, type: lineTypes.find(lt => isLineType(line, lt)) || LineType.Unclassified};    
}

function getChunkLineInfos(chunkLines: string[]): LineInfo[] {
    const classifiedLines = chunkLines.map(classifyLine);
    let currentLineInfo = new LineInfo();
    const lineInfos: LineInfo[] = [currentLineInfo];
    classifiedLines.forEach(({line, type}) => {
        if (currentLineInfo[type] !== undefined && type !== LineType.Unclassified) {
            lineInfos.push(currentLineInfo = new LineInfo());
        }

        if (type === LineType.Unclassified) {
            currentLineInfo[LineType.Unclassified].push(line);
        } else {
            currentLineInfo[type] = line;
        }        
    });

    return lineInfos;
}

function flattenNestedArray<T>(first: T[], second: T[]) {
    if (first.length * 10 > second.length * 9 && first.length * 9 < second.length * 10
    && first[0]) {

    }
    return first.concat([]);
  }

// Deal with the case of a full text in english then a full text in japanese for example
function mergeChunks(chunkLineInfos: LineInfo[][]) {
    // Todo: match up adjacent chunks of similar sizes and merge their line infos to 
    return chunkLineInfos.reduce(flattenNestedArray, []);
}

function createLineInfoFromChunkLines(chunks: string[]): LineInfo[] {
    const chunkLineInfos = chunks.map(chunk => getChunkLineInfos(chunk.split('\n')));
    return mergeChunks(chunkLineInfos);

}

function furiganaOutputFromLineInfo(lineInfos: LineInfo[]) {
    const outputChunks = lineInfos.map(lineInfo => 
        [lineInfo[LineType.Music], lineInfo[LineType.Kanji], toHiragana(lineInfo[LineType.Romaji]), lineInfo[LineType.Unclassified].join('\n')]
        .filter(x => x !== undefined && x !== '').join('\n')
    );
    return outputChunks;
}

export { createLineInfoFromChunkLines, furiganaOutputFromLineInfo };