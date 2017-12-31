import { isKanji, isKana, isJapanese, toHiragana } from 'wanakana';
import { SolveForLine } from './csp';

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

  public areDefined(excludeUnclassified: boolean = false) {
    return allLineTypes.filter(t => this.isDefined(t) && (!excludeUnclassified || t !== LineType.Unclassified));
  }

  public notDefined() {
    return allLineTypes.filter(t => !this.isDefined(t));
  }

  public isBlank() {
    return this.areDefined().length === 0 && this[LineType.Unclassified].every((l: string) => isBlankLine(l));
  }
}

const classifiers = new Map<LineType, (line: string) => boolean>([
  [LineType.Kanji, isKanjiLine],
  [LineType.Kana, isKana],
  [LineType.Music, isMusicChordLine],
  [LineType.Romaji, isRomajiOrMixedLine],
  [LineType.Unclassified, (x: string) => true]
]);

function isLineType(line: string, lineType: LineType) {
  const classifier = classifiers.get(lineType);
  return classifier !== undefined && classifier(line);
}

function perWordTrimPunctuation(str: string) {
  return str.replace(/\b['!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~']+\B|\B['!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~']+\b/g, '');
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

function isRomajiOrMixedLine(line: string) {
  const words = toHiraganaLine(perWordTrimPunctuation(line)).split(' ').filter(word => perWordTrimPunctuation(word).trim() !== '');
  const convertedWords = words.map(w => isJapaneseLine(w));

  const wordRuns: {state: boolean, count: number}[] = [];
  let currentRun = {state: convertedWords[0], count: 0};
  convertedWords.forEach((w, i) => {
    if (w === currentRun.state) {
      currentRun.count++;
    } else if (currentRun.count < 3 && currentRun.state === true) { // Probably a false positive
      const resurrectedRun = wordRuns.pop() || {state: w, count: 0};
      resurrectedRun.count += currentRun.count + 1;
      currentRun = resurrectedRun;
    } else {
      wordRuns.push(currentRun);
      currentRun = {state: w, count: 1};
    }
  });
  wordRuns.push(currentRun);

  // A line counts as Japanese if it changes language twice and half its words are Japanese
  const jWords = wordRuns.filter(r => r.state === true).reduce((prev, curr) => prev + curr.count, 0);
  const nonJWords = wordRuns.filter(r => r.state === false).reduce((prev, curr) => prev + curr.count, 0);
  return wordRuns.length <= 2 && jWords > nonJWords;
}

/**
 * Make an effort to preserve other languages, but will err j-wards for words that happen to be valid in romaji (on, to, etc.)
 */
function toHiraganaLine(line: string) {
  if (!line) { return line; }
  return line.split(' ')
    .map(w => [w, toHiragana(w.replace('dzu', 'du'))]).map(([w, jw]) => isJapaneseLine(jw) && !w.includes('l') && !w.includes('ti') ? jw : w).join(' ');
}

function isBlankLine(line: string) {
  return line.trim() === '';
}

function isJapaneseLine(line: string) {
  return isJapanese(perWordTrimPunctuation(line));
}

function isKanjiLine(line: string) {
  return line.split('').some(isKanji);
}

function classifyLine(line: string) {
  if (isBlankLine(line)) { return { line: line, type: LineType.Unclassified }; }
  return { line: line, type: classifiedLineTypesByImportance.find(lt => isLineType(line, lt)) || LineType.Unclassified };
}

function getChunkLineInfos(chunkLines: string[]): LineInfo[] {
  const classifiedLines = chunkLines.map(classifyLine);
  let currentLineInfo = new LineInfo();
  const lineInfos: LineInfo[] = [currentLineInfo];
  classifiedLines.forEach(({ line, type }) => {
    if (type === LineType.Unclassified) {
      const isBlank = isBlankLine(line);
      if (isBlank && currentLineInfo.areDefined().length > 0) { 
        lineInfos.push((currentLineInfo = new LineInfo()));
      }
      currentLineInfo[LineType.Unclassified].push(line);
      lineInfos.push((currentLineInfo = new LineInfo()));
      return;
    } 

    // Only one of line type allowed per line info. Music chords must always be first
    if (currentLineInfo.isDefined(type) 
      || (type === LineType.Music && currentLineInfo.areDefined(true).length > 0)) {
      lineInfos.push((currentLineInfo = new LineInfo()));
    }
    
    currentLineInfo[type] = line;
  });

  return lineInfos;
}

function averageLineMatches(lines: LineInfo[], predicate: ((l: LineInfo) => boolean)) {
  lines = lines.filter(l => !l.isBlank());
  return lines.filter(predicate).length > lines.length / 2;
}

function merge(first: LineInfo[], second: LineInfo[]) {
  const notDefinedInFirstOnAverage = allLineTypes.filter(type => averageLineMatches(first, l => l.notDefined().includes(type)));
  const definedInSecondOnAverage = allLineTypes.filter(type => averageLineMatches(second, l => l.areDefined().includes(type)));
  if (notDefinedInFirstOnAverage.some(missingFromFirst => definedInSecondOnAverage.includes(missingFromFirst))) {
    const combined = [];
    let firstIndex = 0, secondIndex = 0;
    while (firstIndex < first.length || secondIndex < second.length) {
      const firstLine = first[firstIndex];  
      const secondLine = second[secondIndex];
      if (secondLine === undefined) {
        firstIndex++;
        combined.push(firstLine);
      } else if (firstLine === undefined) {
        secondIndex++;
        combined.push(secondLine);
      } else if (firstLine.isBlank() && secondLine.isBlank()) {
        firstIndex++;
        secondIndex++;
        combined.push(firstLine);
      } else if (secondLine.isBlank()) {
        firstIndex++;  
        combined.push(firstLine);
      } else if (firstLine.isBlank()) {
          secondIndex++;
          combined.push(secondLine);
      } else {
        const li = new LineInfo();
        li[LineType.Unclassified] = firstLine[LineType.Unclassified].concat(secondLine[LineType.Unclassified]);
        classifiedLineTypesByImportance.forEach(lineType => {
          li[lineType] = [firstLine, secondLine]
            .filter(x => x.isDefined(lineType))
            .map(x => x[lineType])
            .join('\n');
        });
        firstIndex++;
        secondIndex++;
        combined.push(li);
      }
    }
    return combined;
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

function furiganaLine(kanji: string, hiragana: string) {
  if (!kanji) { return hiragana; }
  if (!hiragana) { return kanji; }

  const kanjiWithoutSpaces = kanji.split('').filter(x => x !== ' ' && x !== '　').join('');
  const hiraganaWithoutSpaces = hiragana.split('').filter(x => x !== ' ' && x !== '　').join('');
  return SolveForLine(kanjiWithoutSpaces, hiraganaWithoutSpaces).map(v => {
    let suffix = v.trailingUnmatched;
    if (v.shouldDisplay || v.shouldDisplayDebug) {
      suffix = '[' + v.kana /*+ ',' + v.debug*/ + ']' + suffix;
    }
    return v.japanese + suffix;
  }).join('');

}

function furiganaOutputFromLineInfo(lineInfos: LineInfo[]) {
  const outputChunks = lineInfos.map(lineInfo =>
    [lineInfo[LineType.Music], furiganaLine(lineInfo[LineType.Kanji], toHiraganaLine(lineInfo[LineType.Romaji])), lineInfo[LineType.Unclassified].join('\n')]
      .filter(x => x !== undefined && x.length > 0)
      .join('\n')
  );
  return outputChunks;
}

export { createLineInfoFromChunkLines, furiganaOutputFromLineInfo };
