# Air Quotes plugin

I love reading paper books or on eReader devices while taking notes on my laptop or phone, 
but it massively interrupts my flow to capture quotes from the book.

The existing solutions are essentially either:

- Re-type the entire quote yourself, or 
- Highlight/capture, and sync with a tool like Readwise.

**Air Quotes** for Obsidian is a method for near-instant inserting of direct quotes from a source text.

Here's a demo from the book I'm currently reading. 

I've found a great quote which I want to insert. I start typing the first few words of the quote,
and it instantly finds it in the book. I use the arrow keys to increase/decrease the size of the quote,
and then hit Enter to insert it into my note:

![](img/demo.gif)

## How it works

#### Step 1

You first need a Markdown format version of the book in your vault. This is the source for the quote text.

It's easy to convert pretty much anything to Markdown with [Pandoc](https://pandoc.org/).
You don't need this plugin to do it - you can do the conversion yourself - but if you are using Windows
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

