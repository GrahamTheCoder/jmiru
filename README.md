https://grahamthecoder.github.io/jmiru/

# JMiru

Use case: As a learner of Japanese, I want to see Japanese text (e.g. song lyrics/chords) as Kanji with furigana, and avoid romaji at all costs.
This project aims to help people pull together Japanese to visualize in a convenient way for them.

![image](https://user-images.githubusercontent.com/2490482/34612730-da0d8daa-f222-11e7-9cb2-f63eadc7006c.png)

## How to use it
Sorry this is still very early stage development, star the repository to show your support, or create an issue for some work you'd be interested in doing if you're a developer. Also, feel free to create an issue for input you wish worked with the input and expected output so that I can use it as a test case.

## Vision
A learner of Japanese comes across some guitar chords over the romaji. So they google the lyrics to find the kanji version, paste both bits of information into the box and hit visualize. The default settings show them the chords with kanji and furigana.

The learner can then tweak the level to only show furigana for kanji above N4 for example, but can still mouse over words for the pronunciation and potentially a few other bits of information.

This project is intended to provide the glue between other great Japanese resources rather than being a resource itself.

## Rationale
In the past I've used [たとえば](https://tatoeba.org/eng/tools/furigana) to automatically guess furigana, but it's obviously wrong sometimes, because it can't perfectly know the author's intention. If someone has already written the pronunciation elsewhere, it *should* be really easy to pull that information in, but I can't find any such tool.

## How to develop
For details of how to develop on this project see [development](Development.md)

## FAQ

Q: Why does this project use React?

A: It doesn't currently *need* any framework or libraries, but I think it'll be a good underpinning if the project makes good progress.

Q: Why the name?

A: Pick your favourites out of:
* It's a memorable shortening of "Japanese 見る目(みるめ)" i.e. Japanese way of looking at things.
* It's a concise translation of "see Japanese"
* The pronunciation sounds a bit like "J mirror" - everyone knows you should practice in front of the J mirror.
* It doesn't have many Google search results
