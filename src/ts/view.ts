import { createLineInfoFromChunkLines, LineType, LineInfo } from './transformations';
import { MatchFuriganaForLine } from './csp';

function formatAsHtml(output: string[]) {
  return output
    .join('\n')
    .replace(/\t/g, '    ')
    .replace(/  /g, ' &nbsp;')
    .replace(/\r\n|\n|\r/g, '<br />');
}

function getHtmlFormattedOutput(freeTextInputs: string[]): string {
  return formatAsHtml(furiganaOutputFromLineInfo(createLineInfoFromChunkLines(freeTextInputs)));
}

function furiganaLine(kanji: string, hiragana: string) {
  if (!kanji) { return hiragana; }
  if (!hiragana) { return kanji; }

  const kanjiWithoutSpaces = kanji.split('').filter(x => x !== ' ' && x !== '　').join('');
  const hiraganaWithoutSpaces = hiragana.split('').filter(x => x !== ' ' && x !== '　').join('');
  return MatchFuriganaForLine(kanjiWithoutSpaces, hiraganaWithoutSpaces).map(v => {
    if (v.shouldDisplay || v.shouldDisplayDebug) {
      return '<ruby><rb>' + v.japanese + '</rb><rt>' + v.kana + '</rt></ruby>' + v.trailingUnmatched;
    }
    return v.japanese + v.trailingUnmatched;
  }).join('');

}

function furiganaOutputFromLineInfo(lineInfos: LineInfo[]) {
  const outputChunks = lineInfos.map(lineInfo =>
    [lineInfo[LineType.Music], furiganaLine(lineInfo[LineType.Kanji], lineInfo[LineType.Kana]), lineInfo[LineType.Unclassified].join('\n')]
      .filter(x => x !== undefined && x.length > 0)
      .join('\n')
  );
  return outputChunks;
}

export { getHtmlFormattedOutput };
