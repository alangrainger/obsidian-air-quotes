import { htmlToMarkdown, Notice, TFile } from 'obsidian'
import jszip from 'jszip'
import * as xmljs from 'xml-js'
import AirQuotes from './main'
import { filter } from 'builtin-modules'

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
  rootFile: string
  drm = false

  constructor (plugin: AirQuotes) {
    this.plugin = plugin
  }

  async processHtmlInputFile (file: File) {
    this.zip = await jszip.loadAsync(file)
    if (this.findFile('META-INF/encryption.xml')) {
      new Notice('⛔ This book appears to be DRM encrypted. We will still convert it, but it\'s likely you won\'t be able to read it. You will need to DeDRM the file first before importing.', 20000)
      this.drm = true
    }
    await this.processMetaInf()
  }

  /**
   * Case insensitive file search
   * @param path - The full path to the file inside the zip
   */
  findFile (path: string) {
    const key = Object.keys(this.zip.files).find(key => key.toLowerCase() === path.toLowerCase())
    return key ? this.zip.files[key] : null
  }

  /**
   * Read the contents of a zip file as a string
   * @param path - The full path to the file inside the zip
   */
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

  /**
   * Find the document root file from the container.xml
   */
  async processMetaInf () {
    const file = this.findFile('META-INF/container.xml')
    if (file) {
      const data = await this.zipfileToJson(file.name) as EpubContainer
      this.rootFile = data.container.rootfiles.rootfile._attributes['full-path'] || ''
    }
  }

  async convertToMarkdown () {
    if (!this.rootFile) return ''

    new Notice('Importing book...')

    // Parse the manifest from XML
    this.manifest = await this.zipfileToJson(this.rootFile) as EpubManifest

    // Extract the list of book content files from the manifest
    const toc = this.manifest.package.manifest.item
      .map(item => item._attributes.href)
      .filter(item => item.match(/\.x?html?$/))

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
    // Replace characters which Obsidian doesn't allow in filenames
    const title = this.makeFilesystemSafeTitle(titleParts.join(' - '))
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
    new Notice((this.drm ? 'Imported ' : '✔ Successfully imported ') + title)
    return noteFilename
  }

  metadataValue (key: string) {
    return this.manifest?.package?.metadata?.['dc:' + key]?._text || ''
  }

  makeFilesystemSafeTitle (title: string) {
    const replacements: { [key: string]: string } = {
      ':': '꞉',
      '/': '∕',
      '\\': '＼',
      '?': '？',
      '*': '⁎',
      '"': '”',
      '<': '‹',
      '>': '›',
      '|': '⏐'
    }
    for (const key of Object.keys(replacements)) {
      title = title.split(key).join(replacements[key])
    }
    // Remove characters which Obsidian doesn't allow in filenames
    title = title.replace(/[*"\\/<>:|?]/g, '')
    return title
  }
}
