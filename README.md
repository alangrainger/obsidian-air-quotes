# Air Quotes plugin

![](https://img.shields.io/github/license/alangrainger/obsidian-air-quotes) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-air-quotes?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-air-quotes/total)

<a href="https://ko-fi.com/alan_" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" style="width:190px"></a>

I love reading paper books or on eReader devices while taking notes on my laptop or phone, 
but it massively interrupts my flow to capture quotes from the book.

The existing solutions are essentially either:

- Re-type the entire quote yourself, or 
- Highlight/capture, and sync with a tool like Readwise.

**Air Quotes** for Obsidian is a method for near-instant inserting of direct quotes from a source text.

Here's a demo:

[![](img/video-demo.jpg)](https://www.youtube.com/watch?v=PhP02zbiVS4)

## How it works

#### Step 1

You first need a Markdown format version of the book in your vault. This is the source for the quote text.

- If the source text is already in a note (for example, people who have the Bible or the Quran as a note) then you're good to go.
- If you have an ePub copy of the book, the plugin can convert this straight into an Obsidian note for you. Use the command `Import ePub file`.
- If you have an ebook in another format, you can usually get [Calibre](https://calibre-ebook.com/) to convert it for you. 
- If you're reading a print book, then you'll need to source an ebook copy. Your public library might have Libby or Overdrive available, which are good ebook sources.

#### Step 2

Link the source text note to your current note by adding a `source_text` property, and adding the link to your source text. You can customise the name of this property in the Settings if you like.

#### Step 3

That's it! Now you can run the "Insert quote" command.

## FAQs

**Does this work on mobile?**

Absolutely, it works great!

**Why not use the built-in block link `#^` which already has its own search feature?**

1. I don't like the fuzzy search. If the words you're typing are very common in the book,
you'll receive a lot of incorrect results, and you might not even find the correct result.
2. I like the function of increasing/decreasing the size of the quote with the arrow keys.
