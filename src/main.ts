import { Editor, EditorPosition, MarkdownView, Plugin, TFile } from 'obsidian'
import { AirQuotesSettings, AirQuotesSettingTab, DEFAULT_SETTINGS } from './settings'
import { SearchModal } from './search'

export default class AirQuotes extends Plugin {
  settings: AirQuotesSettings
  sourceFile: TFile
  editor: Editor
  cursorPosition: EditorPosition

  async onload () {
    await this.loadSettings()
    this.addSettingTab(new AirQuotesSettingTab(this.app, this))

    this.addCommand({
      id: 'air-quote-insert',
      name: 'Insert quote',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const markdownView = app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          this.editor = editor
          // Save the cursor insert position
          this.cursorPosition = editor.getCursor()
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
          const bookFile = app.metadataCache.getFirstLinkpathDest(bookPath, view.file.path)
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
