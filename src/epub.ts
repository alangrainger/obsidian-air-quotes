import { htmlToMarkdown, TFile } from 'obsidian'
import AdmZip from 'adm-zip'
import * as xmljs from 'xml-js'

// The ePub manifest format as extracted by xml-js
interface EpubManifest {
  package: {
    manifest: {
      item: [{
        _attributes: {
          href: string
        }
      }]
    },
    metadata: {
      [key: string]: {
        _text: string
      }
    }
  }
}

export class Epub {
  manifest: EpubManifest
  path: string

  constructor (path: string) {
    this.path = path
  }

  async convertToMarkdown () {
    const zip = new AdmZip(this.path)
    const files = zip.getEntries() // an array of ZipEntry records

    // Find the index file
    const indexFile = files.find(entry => entry.entryName.match(/^OEBPS\/[^/]+\.opf$/i))
    if (!indexFile) return

    // Parse the manifest from XML
    this.manifest = xmljs.xml2js(indexFile.getData().toString('utf8'), {
      compact: true,
      trim: true
    }) as EpubManifest

    // Extract the list of book content files from the manifest
    const toc = this.manifest.package.manifest.item.map(item => item._attributes.href)

    // Convert the book to Markdown
    let contents = ''
    for (const tocItem of toc) {
      const file = files.find(entry => entry.entryName.endsWith(tocItem))
      const html = file?.getData().toString('utf8') || ''
      contents += htmlToMarkdown(html)
    }

    // Write the new note
    // Filename in the format of <Title - Author.md>
    const noteFilename = this.metadataValue('title') + ' - ' + this.metadataValue('creator') + '.md'
    if (await app.vault.adapter.exists(noteFilename)) {
      const outputFile = app.vault.getAbstractFileByPath(noteFilename)
      if (outputFile instanceof TFile) {
        // Replace the existing file
        await app.vault.modify(outputFile, contents)
      }
    } else {
      // Create a new file
      await app.vault.create(noteFilename, contents)
    }
    return noteFilename
  }

  metadataValue (key: string) {
    return this.manifest?.package?.metadata?.['dc:' + key]?._text || ''
  }
}
