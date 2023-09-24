import { htmlToMarkdown, Notice, TFile } from 'obsidian'
import AdmZip from 'adm-zip'
import * as xmljs from 'xml-js'
import AirQuotes from './main'

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

interface EpubContainer {
  container: {
    rootfiles: {
      rootfile: {
        _attributes: {
          'full-path': string
        }
      }
    }
  }
}

export class Epub {
  plugin: AirQuotes
  manifest: EpubManifest
  zipfiles: AdmZip.IZipEntry[]
  containerFile: AdmZip.IZipEntry

  constructor (plugin: AirQuotes, path: string) {
    this.plugin = plugin
    const zip = new AdmZip(path)
    this.zipfiles = zip.getEntries()
    this.processMetaInf()
  }

  /**
   * Returns the XML content of a zipfile as a JSON object
   */
  zipfileToJson (zipfile: AdmZip.IZipEntry | undefined) {
    const xmlData = zipfile?.getData().toString('utf8') || ''
    return xmljs.xml2js(xmlData, {
      compact: true,
      trim: true
    }) || {}
  }

  processMetaInf () {
    const indexFile = this.zipfiles.find(entry => entry.entryName.match(/^META-INF\/container.xml$/i))
    const data = this.zipfileToJson(indexFile) as EpubContainer
    const file = this.zipfiles.find(entry => entry.entryName === data.container.rootfiles.rootfile._attributes['full-path'])
    if (file) this.containerFile = file
  }

  async convertToMarkdown () {
    if (!this.containerFile) return

    new Notice('Importing book...')

    // Parse the manifest from XML
    this.manifest = this.zipfileToJson(this.containerFile) as EpubManifest

    // Extract the list of book content files from the manifest
    const toc = this.manifest.package.manifest.item
      .map(item => item._attributes.href)
      .filter(item => item.match(/\.x?html$/))

    // Convert the book to Markdown
    let contents = ''
    for (const tocItem of toc) {
      const file = this.zipfiles.find(entry => entry.entryName.endsWith(tocItem))
      const html = file?.getData().toString('utf8') || ''
      contents += htmlToMarkdown(html)
    }

    // Check for destination folder
    let folder = ''
    if (this.plugin.settings.importLocation && !await this.plugin.app.vault.adapter.exists(this.plugin.settings.importLocation)) {
      await this.plugin.app.vault.createFolder(this.plugin.settings.importLocation)
      folder = this.plugin.settings.importLocation + '/'
    }

    // Write the new note
    // Filename in the format of <Title - Author.md>
    const titleParts = []
    if (this.metadataValue('title')) titleParts.push(this.metadataValue('title'))
    if (this.metadataValue('creator')) titleParts.push(this.metadataValue('creator'))
    const title = titleParts.join(' - ')
    const noteFilename = folder + title + '.md'
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
    new Notice('✔ Successfully imported ' + title)
    return noteFilename
  }

  metadataValue (key: string) {
    return this.manifest?.package?.metadata?.['dc:' + key]?._text || ''
  }
}
