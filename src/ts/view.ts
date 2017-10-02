import { createLineInfoFromChunkLines, furiganaOutputFromLineInfo } from './transformations';

function lineInfoFromFreeInput(inputText: string, chunkDivider: string) {
  const multiLangChunks = inputText.split(chunkDivider);
  return createLineInfoFromChunkLines(multiLangChunks);
}

function formatAsHtml(output: string[]) {
  return output
    .join('\n')
    .replace(/\t/g, '    ')
    .replace(/  /g, ' &nbsp;')
    .replace(/\r\n|\n|\r/g, '<br />');
}

function getHtmlFormattedOutput(freeTextInput: string, chunkDivider: string): string {
  return formatAsHtml(furiganaOutputFromLineInfo(lineInfoFromFreeInput(freeTextInput, chunkDivider)));
}

export { getHtmlFormattedOutput };
