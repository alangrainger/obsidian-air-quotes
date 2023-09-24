import { htmlToMarkdown, Notice, TFile } from 'obsidian'
import jszip from 'jszip'
import * as xmljs from 'xml-js'
import AirQuotes from './main'
import { HTMLInputFile } from './FileModal'

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
  zip: jszip
  containerFile: string

  // containerFile: AdmZip.IZipEntry

  constructor (plugin: AirQuotes) {
    this.plugin = plugin
  }

  async processHtmlInputFile (file: HTMLInputFile) {
    this.zip = await jszip.loadAsync(file)
    await this.processMetaInf()
  }

  async readFile (path: string) {
    return await this.zip.file(path)?.async('string') || ''
  }

  async zipfileToJson (path: string) {
    const xmlData = await this.readFile(path)
    return xmljs.xml2js(xmlData, {
      compact: true,
      trim: true
    }) || {}
  }

  async processMetaInf () {
    const data = await this.zipfileToJson('META-INF/container.xml') as EpubContainer
    this.containerFile = data.container.rootfiles.rootfile._attributes['full-path'] || ''
  }

  async convertToMarkdown () {
    if (!this.containerFile) return

    new Notice('Importing book...')

    // Parse the manifest from XML
    this.manifest = await this.zipfileToJson(this.containerFile) as EpubManifest

    // Extract the list of book content files from the manifest
    const toc = this.manifest.package.manifest.item
      .map(item => item._attributes.href)
      .filter(item => item.match(/\.x?html$/))

    // Convert the book to Markdown
    let contents = ''
    for (const tocItem of toc) {
      // Get the full file path for a manifest entry
      const path = Object.keys(this.zip.files).find(path => path.endsWith(tocItem)) || ''
      // Read the file and convert to Markdown
      const html = await this.readFile(path)
      contents += htmlToMarkdown(html)
    }

    // Check for destination folder
    let folder = ''
    if (this.plugin.settings.importLocation) {
      if (!await this.plugin.app.vault.adapter.exists(this.plugin.settings.importLocation)) {
        // Create the folder if it doesn't exist
        await this.plugin.app.vault.createFolder(this.plugin.settings.importLocation)
      }
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
