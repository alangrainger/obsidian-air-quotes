# Converting books to Markdown

The below methods assume your book is in ePub format. If it's in a different format, I recommend using [Calibre]([url](https://calibre-ebook.com/)) to convert it (and honestly you should probably be using Calibre anyway if you read ebooks).

## The instant method

Drag the ePub [onto this website](https://alldocs.app/convert-epub-to-commonmark) and download the converted Markdown file.

## Normal method

It's easy to convert pretty much anything to Markdown with [Pandoc](https://pandoc.org/).
You don't need the Air Quotes plugin to do it - you can do the conversion yourself, but if you are using Windows
there is a command in the plugin to do the conversion for you (requires Pandoc to be installed first).

The specific Pandoc command I'm using in Windows is:

```
pandoc -s "c:\Path\To\Source.epub" -t markdown_strict-raw_html-native_divs-native_spans-fenced_divs-bracketed_spans --wrap=none -o "c:\Obsidian folder\Some\Path\Output.md"
```
