import { Editor, EditorPosition, FileSystemAdapter, MarkdownView, Notice, Plugin, TFile } from 'obsidian'
import { AirQuotesSettings, AirQuotesSettingTab, DEFAULT_SETTINGS } from './settings'
import { SearchModal } from './search'
import { ChildProcess, spawn } from 'child_process'
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
      id: 'air-quote-pandoc',
      name: 'Convert book with Pandoc',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const file = await convertEpub(this)
        console.log(file)
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (file && markdownView) {
          // Insert the link to the converted file
          editor.replaceRange('[[' + file.slice(0, -3) + ']]', editor.getCursor())
        }
      }
    })

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
