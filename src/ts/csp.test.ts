import { isKanji } from 'wanakana';
import { MatchFuriganaForLine } from './csp';

function expectSolveForLineToBe(expected: string) {
  let inBrackets = false;
  let japanese = '';
  let hiragana = '';
  expected.split('').map(c => {
    if (c === '[') {
      inBrackets = true;
    } else if (c === ']') {
      inBrackets = false;
    } else if (inBrackets) {
      hiragana += c;
    } else {
      japanese += c;
      if (!isKanji(c)) {
        hiragana += c;
      }
    }
  });
  const solved = MatchFuriganaForLine(japanese, hiragana);
  const actual = solved.map(v => {
      let suffix = v.trailingUnmatched;
      if (v.shouldDisplayDebug) {
        suffix = '[' + v.kana /*+ ',' + v.debug*/ + ']' + suffix;
      }
      return v.japanese + suffix;
    }).join('');

  expect(actual).toBe(expected);
}

describe('Works with no spaces in input', () => {
  test('With kanji always matching 2 kana', () => {
    expectSolveForLineToBe('容[よう]赦[しゃ]ないねいつの間[ま]に見[みう]失[しな]ったルート、暴[あば]れだす');
  });

  test('With kanji matching 1 or 3 kana', () => {
    expectSolveForLineToBe('心[こころ]が体[からだ]を追[お]い越[こ]してきたんだよ');
  });
});