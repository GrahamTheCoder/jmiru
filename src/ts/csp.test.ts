import { SolveForLine } from './csp';

it('Works with no spaces in input', () => {
    const japanese = '容赦ないねいつの間に見失ったルート、暴れだす';
    const hiragana = 'ようしゃないねいつのまにみうしなったるうと、あばれだす';
    const expected = '容[よう]赦[しゃ]ないねいつの間[ま]に見[みう]失[しな]ったルート、暴[あば]れだす';
    const solved = SolveForLine(japanese, hiragana);
    const actual = solved.map(v => {
        let suffix = v.trailingUnmatched;
        if (v.shouldDisplay) {
          suffix = '[' + v.kana /*+ ',' + v.debug*/ + ']' + suffix;
        }
        return v.japanese + suffix;
      }).join('');
    expect(actual).toBe(expected);
  });
  