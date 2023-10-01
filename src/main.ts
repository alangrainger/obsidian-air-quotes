import { Editor, EditorPosition, MarkdownView, Notice, Plugin, TFile } from 'obsidian'
import { AirQuotesSettings, AirQuotesSettingTab, DEFAULT_SETTINGS } from './Settings'
import { SearchModal } from './Search'
import { Epub } from './Epub'

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
          let bookPath = metadata?.frontmatterLinks?.find(x => x.key === this.settings.bookSourceVariable)?.link

          if (!bookPath) {
            // If no source text property found, look for a Dataview property
            // I don't use the Dataview NPM package as it introduces some vulnerabilities shown in an npm audit
            try {
              // @ts-ignore
              const dv = app?.plugins?.plugins?.dataview?.api
              if (dv) {
                bookPath = dv.page(view.file.path)?.[this.settings.bookSourceVariable]?.path
              }
            } catch (e) {
              console.log(e)
            }
          }

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
        const fileEl = document.createElement('input')
        fileEl.type = 'file'
        fileEl.accept = 'application/epub+zip'
        fileEl.onchange = async (ev) => {
          try {
            // Take the HTML file input and injest the zip data
            const file = (ev.target as HTMLInputElement)?.files?.[0]
            if (file) {
              // Get the file data
              const epub = new Epub(this)
              await epub.processHtmlInputFile(file)

              // Convert the provided file to Markdown
              const filename = await epub.convertToMarkdown()

              // Insert the link to the converted file if the user has selected that option
              const activeFile = this.app.workspace.getActiveFile()
              if (filename && activeFile && this.settings.addLinkToCurrentNote) {
                await app.fileManager.processFrontMatter(activeFile, frontMatter => {
                  frontMatter[this.settings.bookSourceVariable] = '[[' + filename.slice(0, -3) + ']]'
                })
              }
            }
          } catch (e) {
            console.log(e)
          }
          fileEl.remove()
        }
        fileEl.click()
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
