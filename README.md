# Air Quotes plugin

![](https://img.shields.io/github/license/alangrainger/obsidian-air-quotes) ![](https://img.shields.io/github/v/release/alangrainger/obsidian-air-quotes?style=flat-square) ![](https://img.shields.io/github/downloads/alangrainger/obsidian-air-quotes/total)

<a href="https://ko-fi.com/alan_" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" style="width:190px"></a>

I love reading paper books or on eReader devices while taking notes on my laptop or phone, 
but it massively interrupts my flow to capture quotes from the book.

The existing solutions are essentially either:

- Re-type the entire quote yourself, or 
- Highlight/capture, and sync with a tool like Readwise.

**Air Quotes** for Obsidian is a method for near-instant inserting of direct quotes from a source text.

Here's a demo from the book I'm currently reading:

I've found a great quote which I want to insert. I start typing the first few words of the quote,
and it instantly finds it in the book. I use the arrow keys to increase/decrease the size of the quote,
and then hit Enter to insert it into my note.

![](img/demo.gif)

Here's a demo with a print book. The caveat of course is that you also need an ebook copy. It's a great experience doing this with a mobile device - makes for very quick note taking.

[![](img/video-demo.jpg)](https://www.youtube.com/watch?v=G-hpPOMCQys)

## How it works

#### Step 1

You first need a Markdown format version of the book in your vault. This is the source for the quote text.

It's easy to convert pretty much anything to Markdown with [Pandoc](https://pandoc.org/).
You don't need the Air Quotes plugin to do it - you can do the conversion yourself, but if you are using Windows
there is a command in the plugin to do the conversion for you (requires Pandoc to be installed first).

#### Step 2

Link the source text to your current note in a YAML format. You can use either the standard
format:

```
---
source_text: [[Path/To/Amazing Book]]
---
```

or the Dataview format:

```
source_text:: [[Path/To/Amazing Book]]
```

#### Step 3

That's it! Now you can run the "Insert quote" command.

## FAQs

**Does this work on mobile?**

Yes indeed. You'll likely need to add the source text on desktop, as Pandoc isn't supported on mobile, 
but the insert quote function works just fine.

**Why not use the built-in block link `#^` which already has its own search feature?**

1. I don't like the fuzzy search. If the words you're typing are very common in the book,
you'll receive a lot of incorrect results, and you might not even find the correct result.
2. I like the function of increasing/decreasing the size of the quote with the arrow keys.
