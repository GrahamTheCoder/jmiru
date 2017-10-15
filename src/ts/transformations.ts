import { isKanji, isKana, isRomaji, isJapanese, toHiragana } from 'wanakana';

enum LineType {
  Unclassified = 0,
  Kanji,
  Kana,
  Music,
  Romaji
}

const classifiedLineTypesByImportance = [LineType.Kanji, LineType.Kana, LineType.Music, LineType.Romaji];
const allLineTypes = classifiedLineTypesByImportance.concat([LineType.Unclassified]);
// Index into this with LineType - todo: think of way to tie things together with strong types
class LineInfo {
  constructor() {
    this[LineType.Unclassified] = [];
  }

  public isDefined(t: LineType) {
    return this[t] !== undefined && this[t].length > 0;
  }
  public areDefined() {
    return allLineTypes.filter(t => this.isDefined(t));
  }

  public notDefined() {
    return allLineTypes.filter(t => !this.isDefined(t));
  }
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
  return (
    potentialChords.length > 0 &&
    potentialChords.every(potentialChord => potentialChord.match(musicChordRegex) != null || potentialChord.match(repeatTimesRegex) != null)
  );
}

function mostWordsAreJapanese(line: string) {
  if (isJapanese(line)) { return true; }
  const words = toHiragana(line).split(' ');
  const jWords = words.filter(w => isJapaneseLine(w));
  return jWords.length * 2 > words.length;
}

/**
 * Requires more than half the words to be romaji to allow for mixed language lines
 * @param line 
 */
function isRomajiLine(line: string) {
  // isRomaji checks individual characters quickly, so the second check ensures that when converted, the line makes valid Japanese
  return isRomaji(line) && mostWordsAreJapanese(line);
}

/**
 * Make an effort to preserve other languages, but will err j-wards for words that happen to be valid in romaji (on, to, etc.)
 */
function toHiraganaLine(line: string) {
  if (!line) { return line; }
  return line.split(' ')
    .map(w => [w, toHiragana(w)]).map(([w, jw]) => isJapaneseLine(jw) && !w.includes('l') ? jw : w).join(' ');
}

function isJapaneseLine(line: string) {
  return isJapanese(removeSpacesAndPunctuation(line));
}

function isKanjiLine(line: string) {
  return line.split('').some(isKanji);
}

function classifyLine(line: string) {
  return { line: line, type: classifiedLineTypesByImportance.find(lt => isLineType(line, lt)) || LineType.Unclassified };
}

function getChunkLineInfos(chunkLines: string[]): LineInfo[] {
  const classifiedLines = chunkLines.map(classifyLine);
  let currentLineInfo = new LineInfo();
  const lineInfos: LineInfo[] = [currentLineInfo];
  classifiedLines.forEach(({ line, type }) => {
    if (type === LineType.Unclassified) {
      currentLineInfo[LineType.Unclassified].push(line);
      return;
    } 

    // Only one of line type allowed per line info. Music chords must always be first
    if (currentLineInfo.isDefined(type) 
      || (type === LineType.Music && currentLineInfo.areDefined().length > 0)) {
      lineInfos.push((currentLineInfo = new LineInfo()));
    }
    
    currentLineInfo[type] = line;
  });

  return lineInfos;
}

function averageLineMatches<T>(array: T[], predicate: ((t: T) => boolean)) {
  return array.filter(predicate).length > array.length / 2;
}

function merge(first: LineInfo[], second: LineInfo[]) {
  const notDefinedInFirstOnAverage = allLineTypes.filter(type => averageLineMatches(first, l => l.notDefined().includes(type)));
  const definedInSecondOnAverage = allLineTypes.filter(type => averageLineMatches(second, l => l.areDefined().includes(type)));
  if (notDefinedInFirstOnAverage.some(missingFromFirst => definedInSecondOnAverage.includes(missingFromFirst))) {
    return first
      .map(function(firstLine: LineInfo, index: number) {
        const secondLine = second[index];
        if (secondLine === undefined) {
          return firstLine;
        }

        const li = new LineInfo();
        li[LineType.Unclassified] = firstLine[LineType.Unclassified].concat(secondLine[LineType.Unclassified]);
        classifiedLineTypesByImportance.forEach(lineType => {
          li[lineType] = [firstLine, secondLine]
            .filter(x => x.isDefined(lineType))
            .map(x => x[lineType])
            .join('\n');
        });
        return li;
      })
      .concat(second.slice(first.length));
  } else {
    return first.concat(second);
  }
}

// Deal with more complex cases like guitar chords with english followed by a full text in kanji and kana
function mergeChunks(chunkLineInfos: LineInfo[][]) {
  return chunkLineInfos.reduce(merge, []);
}

function createLineInfoFromChunkLines(chunks: string[]): LineInfo[] {
  const chunkLineInfos = chunks.map(chunk => getChunkLineInfos(chunk.split('\n')));
  return mergeChunks(chunkLineInfos);
}

function furiganaOutputFromLineInfo(lineInfos: LineInfo[]) {
  const outputChunks = lineInfos.map(lineInfo =>
    [lineInfo[LineType.Music], lineInfo[LineType.Kanji], toHiraganaLine(lineInfo[LineType.Romaji]), lineInfo[LineType.Unclassified].join('\n')]
      .filter(x => x !== undefined && x.length > 0)
      .join('\n')
  );
  return outputChunks;
}

export { createLineInfoFromChunkLines, furiganaOutputFromLineInfo };
