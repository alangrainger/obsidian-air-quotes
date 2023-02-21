import { Editor, EditorPosition, MarkdownView, Notice, Platform, Plugin, TFile } from 'obsidian'
import { AirQuotesSettings, AirQuotesSettingTab, DEFAULT_SETTINGS } from './settings'
import { SearchModal } from './search'
import { convertEpub } from './pandoc'

export default class AirQuotes extends Plugin {
  settings: AirQuotesSettings
  sourceFile: TFile
  editor: Editor
  cursorPosition: EditorPosition

  async onload () {
    await this.loadSettings()
    this.addSettingTab(new AirQuotesSettingTab(this.app, this))

    this.addCommand({
      id: 'insert',
      name: 'Insert quote',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const markdownView = app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          this.editor = editor
          // Save the cursor insert position
          this.cursorPosition = editor.getCursor()
          // Parse note data to get YAML field
          const field = this.settings.bookSourceVariable.replace(/[/\-^$*+?.()|[\]{}]/g, '/$&')
          const regex = `^${field}:{1,2}\\s+\\[\\[(.+?)]]$`
          const contents = await app.vault.cachedRead(view.file)
          const bookPath = contents.match(new RegExp(regex, 'm'))?.[1]
          if (!bookPath) {
            // No matching YAML/frontmatter field was found
            new Notice('No source path found in YAML/frontmatter. Make sure to link to your source text.')
            return
          }
          // Attempt to resolve the link text into a matching TFile
          const bookFile = app.metadataCache.getFirstLinkpathDest(bookPath, view.file.path)
          if (bookFile) {
            this.sourceFile = bookFile
            new SearchModal(this).open()
          } else {
            new Notice('Unable to resolve book path: ' + bookPath)
          }
        }
      }
    })

    // Add Pandoc conversion command for desktop users
    // This is Windows-only currently
    if (process.platform === 'win32' && Platform.isDesktop) {
      this.addCommand({
        id: 'pandoc',
        name: 'Convert book with Pandoc',
        editorCallback: async (editor: Editor) => {
          const file = await convertEpub(this)
          const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
          if (file && markdownView) {
            // Insert the link to the converted file
            editor.replaceRange('[[' + file.slice(0, -3) + ']]', editor.getCursor())
          }
        }
      })
    }
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
