import { createLineInfoFromChunkLines, furiganaOutputFromLineInfo } from './transformations';

function lineInfoFromFreeInput(inputText: string) {
    const multiLangChunks = inputText.split('\n\n');
    const chunkLinesArray = multiLangChunks.map(chunkText => chunkText.split('\n'));
    return chunkLinesArray.map(createLineInfoFromChunkLines);
}

function formatAsHtml(outputChunks: string[]) {
    return outputChunks.join('\n\n')
    .replace(/\t/g, '    ')
    .replace(/  /g, ' &nbsp;')
    .replace(/\r\n|\n|\r/g, '<br />');
}

function getHtmlFormattedOutput(freeTextInput: string): string {
    return formatAsHtml(furiganaOutputFromLineInfo(lineInfoFromFreeInput(freeTextInput)));
}

export {getHtmlFormattedOutput};