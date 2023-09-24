import { Editor, EditorPosition, MarkdownView, Notice, Plugin, TFile } from 'obsidian'
import { AirQuotesSettings, AirQuotesSettingTab, DEFAULT_SETTINGS } from './settings'
import { SearchModal } from './search'
import { Epub } from './epub'
import { FileModal } from './FileModal'

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

          // Get the location for the note containing the source text
          const metadata = app.metadataCache.getFileCache(view.file)
          // @ts-ignore
          const bookPath = metadata?.frontmatterLinks?.find(x => x.key === this.settings.bookSourceVariable)?.link

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

    // Import an ePub into your Vault as a new Markdown note
    this.addCommand({
      id: 'convert-epub',
      name: 'Import/Convert ePub file',
      callback: async () => {
        const modal = new FileModal(app)
        modal.onFileSelect(async file => {
          modal.close()
          const epub = new Epub(this, file.path || '')
          const filename = await epub.convertToMarkdown()
          const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
          if (filename && markdownView) {
            // Insert the link to the converted file
            await app.fileManager.processFrontMatter(markdownView.file, frontMatter => {
              frontMatter[this.settings.bookSourceVariable] = '[[' + filename.slice(0, -3) + ']]'
            })
          }
        })
        modal.open()
      }
    })
  }

  async loadSettings () {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings () {
    await this.saveData(this.settings)
  }
}
