import { htmlToMarkdown, TFile } from 'obsidian'
import AdmZip from 'adm-zip'

import * as xmljs from 'xml-js'

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

  async convertToMarkdown () {
    const zip = new AdmZip('c:/temp/Never Split the Difference - Chris Voss.epub')
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
      const file = files.find(entry => entry.entryName === 'OEBPS/' + tocItem)
      const html = file?.getData().toString('utf8') || ''
      contents += htmlToMarkdown(html)
    }

    // Write the new note
    // Filename in the format of <Title - Author.md>
    const noteFilename = this.getMetadataValue('title') + ' - ' + this.getMetadataValue('creator') + '.md'
    if (await app.vault.adapter.exists(noteFilename)) {
      const outputFile = app.vault.getAbstractFileByPath(noteFilename)
      if (outputFile instanceof TFile) {
        await app.vault.modify(outputFile, contents)
      }
    } else {
      await app.vault.create(noteFilename, contents)
    }
  }

  getMetadataValue (key: string) {
    return this.manifest?.package?.metadata?.['dc:' + key]?._text || ''
  }
}
