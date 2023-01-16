import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, SuggestModal, TFile } from 'obsidian'
import { setMaxIdleHTTPParsers } from 'http'

interface AirQuotesSettings {
  bookSource: string;
}

const DEFAULT_SETTINGS: AirQuotesSettings = {
  bookSource: 'source_text'
}

export default class AirQuotes extends Plugin {
  settings: AirQuotesSettings
  sourceFile: TFile

  async onload () {
    await this.loadSettings()
    this.addSettingTab(new AirQuotesSettingTab(this.app, this))

    this.addCommand({
      id: 'air-quote-insert',
      name: 'Insert quote',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const markdownView = app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          // Parse note data to get YAML field
          const field = this.settings.bookSource.replace(/[/\-^$*+?.()|[\]{}]/g, '/$&')
          const regex = `^${field}:{1,2}\\s+\\[\\[(.+?)]]$`
          const contents = await app.vault.cachedRead(view.file)
          const bookPath = contents.match(new RegExp(regex, 'm'))?.[1]
          if (!bookPath) {
            // No matching YAML/frontmatter field was found
            return
          }
          // Attempt to resolve the link text into a matching TFile
          const bookFile = app.metadataCache.getFirstLinkpathDest('Letters from a Stoic - Robin Campbell', view.file.path)
          if (bookFile) {
            this.sourceFile = bookFile
            new SearchModal(this).open()
          }
        }
      }
    })
  }

  onunload () {

  }

  async loadSettings () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings () {
    await this.saveData(this.settings)
  }
}

class SearchModal extends SuggestModal<any> {
  plugin: AirQuotes
  sourceText: string

  constructor (plugin: AirQuotes) {
    super(plugin.app)
    this.plugin = plugin

    this.setPlaceholder(`Start typing any quote from "${this.plugin.sourceFile.basename}"...`)
    this.resultContainerEl.addClass('airquotes-search-modal')

    // Import the book
    this.app.vault.cachedRead(this.plugin.sourceFile)
      .then(text => {
        // Do some basic character replacements to allow better string matching
        text = text.replace(/[‘’]/g, '\'') // replace single curly quotes
        text = text.replace(/[“”]/g, '"') // replace double curly quotes
        this.sourceText = text
      })
  }

  getSuggestions (query: string): any[] | Promise<any[]> {
    if (query.length > 5) {
      // Sanitise the input text to use in a regex
      query = query.replace(/[/\-^$*+?.()|[\]{}]/g, '/$&')
      const matches = [...this.sourceText.matchAll(new RegExp(query, 'ig'))]
      return matches.map(match => {
        // Add previews of all matches
        const start = match.index || 0
        return {index: start, text: this.sourceText.slice(start, start + 200) + '...'}
      }).slice(0, 5)
    } else {
      return []
    }
  }

  renderSuggestion (value: any, el: HTMLElement) {
    el.setText(value.text)
  }

  onChooseSuggestion (item: any, evt: MouseEvent | KeyboardEvent) {
    // Take a sample of the next 3000 characters, to use in the insert modal
    const sample = this.sourceText.slice(item.index, item.index + 3000)
    console.log(sample)
  }
}

class AirQuotesSettingTab extends PluginSettingTab {
  plugin: AirQuotes

  constructor (app: App, plugin: AirQuotes) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const {containerEl} = this

    containerEl.empty()

    containerEl.createEl('h2', {text: 'Air Quotes settings'})

    new Setting(containerEl)
      .setName('Book source field')
      .setDesc('This can be a standard or Dataview frontmatter field')
      .addText(text => text
        .setPlaceholder('source_text')
        .setValue(this.plugin.settings.bookSource)
        .onChange(async (value) => {
          this.plugin.settings.bookSource = value
          await this.plugin.saveSettings()
        }))
  }
}
