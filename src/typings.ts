declare module 'wanakana' {

    /** Automatically bind IME functionality to a form textarea or input. */
    function bind(element: Element): void;

    /** Unbind IME from element. */
    function unbind(element: Element): void;

    /** Returns false if string contains non-romaji characters, otherwise true if Romaji. */
    function isRomaji(str: string): boolean;

    /** Returns false if string contains mixed characters, otherwise true if Hiragana. */
    function isHiragana(str: string): boolean;

    /** Returns false if string contains characters outside of the kana family, otherwise true. */
    function isKana(str: string): boolean;

    /** Returns false if string contains characters outside of the kanji family, otherwise true. */
    function isKanji(str: string): boolean;

    /** Returns false if string contains mixed characters, otherwise true if Katakana. */
    function isKatakana(str: string): boolean;

    /** Convert Katakana or Romaji to Hiragana. */
    function toHiragana(str: string, options?: KanaOptions): string;

    /** Convert Romaji to Kana. Lowcase entries output Hiragana, while upcase entries output Katakana. */
    function toKana(str: string, options?: KanaOptions): string;

    /** Convert Hiragana or Romaji to Katakana. */
    function toKatakana(str: string, options?: KanaOptions): string;

    /** Convert Kana to Romaji. */
    function toRomaji(str: string, options?: KanaOptions): string;

    interface KanaOptions {
        /** Set to true to use obsolete characters, such as ゐ and ゑ. */
        useObsoleteKana?: boolean;
        /** Set to true to handle input from a text input as it is typed. */
        IMEMode?: boolean;
    }
}