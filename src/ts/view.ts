import { createLineInfoFromChunkLines, furiganaOutputFromLineInfo } from './transformations';

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

export { getHtmlFormattedOutput };
