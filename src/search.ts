import { Modal, SuggestModal, MarkdownRenderer, Component, Platform } from 'obsidian'
import AirQuotes from './main'

export class SearchModal extends SuggestModal<any> {
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
    // Take a sample of the next 5000 characters, to use in the insert modal
    const sample = this.sourceText.slice(item.index, item.index + 5000)
    new SelectText(this.plugin, sample).open()
  }
}

export class SelectText extends Modal {
  plugin: AirQuotes
  sentences: string[]
  component: Component = new Component()
  index: number = 5
  eventListener: EventListener

  constructor (plugin: AirQuotes, text: string) {
    super(plugin.app)
    this.plugin = plugin
    // Split the incoming text into sentences
    this.sentences = [...text.matchAll(/.*?[.?!]['"’”]?\s+(?=[“‘]?[A-Z])/g)].map(x => x[0])
  }

  async onOpen () {
    const {modalEl} = this
    if (Platform.isDesktop) {
      // Resize to fit the viewport width on desktop
      modalEl.addClass('air-quotes-select-modal')
    }
    // Set the initial quote text
    await this.setText()
    this.eventListener = (event: KeyboardEvent) => this.onKeyPress(event)
    window.addEventListener('keydown', this.eventListener)
  }

  /**
   * Listen for arrow key events, and increase/decrease the quote selection
   * @param event
   */
  onKeyPress (event: KeyboardEvent) {
    let index = this.index
    switch (event.key) {
      case 'ArrowDown':
        index += 5
        break
      case 'ArrowUp':
        index -= 5
        break
      case 'ArrowLeft':
        index -= 1
        break
      case 'ArrowRight':
        index += 1
        break
      case 'Enter':
        this.insertText().then()
        break
    }
    this.index = Math.max(index, 1)
    this.index = Math.min(index, this.sentences.length)
    this.setText().then()
  }

  /**
   * Replace the contents of the modal with rendered markdown from the source text
   */
  async setText () {
    this.contentEl.empty()
    const text = this.sentences.slice(0, this.index).join('').trim()
    await MarkdownRenderer.renderMarkdown(text, this.contentEl, '', this.component) // I'm  not sure what sourcePath and component do here...
  }

  /**
   * Insert the final chosen quote into the editor
   */
  async insertText () {
    const lines = [
      '> [!quote]',
      ...this.sentences
        .slice(0, this.index)
        .join('').trim()
        .split('\n')
        .map(x => '> ' + x), ''
    ]
    await this.close()
    this.plugin.editor.replaceRange(lines.join('\n'), this.plugin.cursorPosition)
    this.plugin.editor.setCursor({line: this.plugin.cursorPosition.line + lines.length, ch: 0})
  }

  onClose () {
    window.removeEventListener('keydown', this.eventListener)
  }
}
