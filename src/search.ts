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
    if (Platform.isMobile) {
      modalEl.addClass('air-quotes-select-modal-mobile')
    } else {
      modalEl.addClass('air-quotes-select-modal-desktop')
    }
    this.titleEl.setText('Select quote')
    // Set the initial quote text
    await this.setText()
    this.eventListener = (event: KeyboardEvent) => this.onKeyPress(event)
    window.addEventListener('keydown', this.eventListener)
    if (Platform.isMobile) {
      const buttons = modalEl.createEl('div', {cls: 'air-quotes-select-buttons'})
      // Add the increment/decrement buttons
      const values = ['-5', '-1', '+1', '+5']
      values.forEach((value: string) => {
        buttons.createEl('button', {text: value}, button => button.onclick = () => this.updateIndex(+value))
      })
      // Add the "Insert quote" button
      buttons.createEl('button', {text: '✅'}, button => button.onclick = () => this.insertText())
    }
  }

  updateIndex (amount: number) {
    let index = this.index + amount
    index = Math.max(index, 1)
    this.index = Math.min(index, this.sentences.length)
    this.setText().then()
  }

  /**
   * Listen for arrow key events, and increase/decrease the quote selection
   * @param event
   */
  onKeyPress (event: KeyboardEvent) {
    let index = this.index
    switch (event.key) {
      case 'ArrowDown':
        this.updateIndex(5)
        break
      case 'ArrowUp':
        this.updateIndex(-5)
        break
      case 'ArrowLeft':
        this.updateIndex(-1)
        break
      case 'ArrowRight':
        this.updateIndex(1)
        break
      case 'Enter':
        this.insertText().then()
        break
    }
  }

  /**
   * Replace the contents of the modal with rendered markdown from the source text
   */
  async setText () {
    this.contentEl.empty()
    const helpText = Platform.isDesktop ? `*Use the arrow keys to change the selection size of the quote, and Enter to insert.*\n\n` : ''
    const text = helpText + this.outputAsMarkdownQuote()
    await MarkdownRenderer.renderMarkdown(text, this.contentEl, '', this.component) // I'm  not sure what sourcePath and component do here...
  }

  /**
   * Format as a callout quote
   */
  outputAsMarkdownQuote () {
    return [
      '> [!quote]',
      ...this.sentences
        .slice(0, this.index)
        .join('').trim()
        .split('\n')
        .map(x => '> ' + x), ''
    ].join('\n')
  }

  /**
   * Insert the final chosen quote into the editor
   */
  async insertText () {
    const text = this.outputAsMarkdownQuote()
    await this.close()
    this.plugin.editor.replaceRange(text, this.plugin.cursorPosition)
    this.plugin.editor.setCursor({line: this.plugin.cursorPosition.line + text.split('\n').length, ch: 0})
  }

  onClose () {
    window.removeEventListener('keydown', this.eventListener)
  }
}
