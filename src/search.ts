import { Modal, SuggestModal, MarkdownRenderer, Component, Platform } from 'obsidian'
import AirQuotes from './main'

export class SearchModal extends SuggestModal<any> {
  plugin: AirQuotes
  sourceText: string
  searchText: string

  constructor (plugin: AirQuotes) {
    super(plugin.app)
    this.plugin = plugin

    this.setPlaceholder(`Start typing any quote from "${this.plugin.sourceFile.basename}"...`)
    this.resultContainerEl.addClass('airquotes-search-modal')

    // Import the book
    this.app.vault.cachedRead(this.plugin.sourceFile)
      .then(text => {
        this.sourceText = text
        // Do some basic character replacements to allow for easily typed input query
        // (very hard for people to type smart quotes in the input)
        text = text.replace(/[‘’]/g, '\'') // replace single curly quotes
        text = text.replace(/[“”]/g, '"') // replace double curly quotes
        this.searchText = text
      })
  }

  /**
   * Return an array of passages from the source text which match the user's inputted query string
   * @param query
   * @return array
   */
  getSuggestions (query: string): any[] | Promise<any[]> {
    if (query.length > 5) {
      // Sanitise the input text to use in a regex
      query = query.replace(/[/\-^$*+?.()|[\]{}]/g, '/$&')
      const matches = [...this.searchText.matchAll(new RegExp(query, 'ig'))]
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

    // Launch the quote selection/adjustment modal
    new QuoteModal(this.plugin, sample).open()
  }
}

export class QuoteModal extends Modal {
  plugin: AirQuotes
  sentences: string[]
  component: Component = new Component()
  index: number = 5
  eventListener: EventListener

  constructor (plugin: AirQuotes, text: string) {
    super(plugin.app)
    this.plugin = plugin
    // Split the incoming text into sentences
    this.sentences = [...text.matchAll(/.+?[.?!\n]['"’”]?\s+(?=[“‘"']?[A-Z])/sg)].map(x => x[0])
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
    await this.setModalContents()
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
      buttons.createEl('button', {text: '✅'}, button => button.onclick = () => this.insertTextIntoEditor())
    }
  }

  /**
   * Increment/decrement the index value (i.e. how many sentences will compose the final quote)
   * @param {number} amount
   */
  updateIndex (amount: number) {
    let index = this.index + amount
    index = Math.max(index, 1)
    this.index = Math.min(index, this.sentences.length)
    this.setModalContents().then()
  }

  /**
   * Listen for arrow key events, and increase/decrease the quote selection
   * @param event
   */
  onKeyPress (event: KeyboardEvent) {
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
        this.insertTextIntoEditor().then()
        break
    }
  }

  /**
   * Replace the contents of the modal with the selected quote from the source text
   */
  async setModalContents () {
    this.contentEl.empty()
    const helpText = Platform.isDesktop ? `*Use the arrow keys to change the selection size of the quote, and Enter to insert.*\n\n` : ''
    const text = helpText + this.formatAsFinalMarkdownOutput()
    // I'm  not sure what sourcePath and component do here, but they are required parameters for renderMarkdown()
    await MarkdownRenderer.renderMarkdown(text, this.contentEl, '', this.component)
  }

  /**
   * Format the selected quote text as Markdown, ready for inserting into the note
   */
  formatAsFinalMarkdownOutput () {
    const lines = []
    let prefix = '> '
    if (this.plugin.settings.outputStyle === 'callout') {
      // Add the header line for the callout
      lines.push(this.plugin.settings.calloutHeader)
    } else if (this.plugin.settings.outputStyle === 'none') {
      // Remove the blockquote prefix for plain-text style
      prefix = ''
    }
    lines.push(...this.sentences
      .slice(0, this.index)
      .join('').trim()
      .split('\n')
      .map(x => prefix + x), '')
    return lines.join('\n')
  }

  /**
   * Insert the final chosen quote into the editor
   */
  async insertTextIntoEditor () {
    const text = this.formatAsFinalMarkdownOutput()
    await this.close()
    this.plugin.editor.replaceRange(text, this.plugin.cursorPosition)
    this.plugin.editor.setCursor({line: this.plugin.cursorPosition.line + text.split('\n').length, ch: 0})
  }

  onClose () {
    window.removeEventListener('keydown', this.eventListener)
  }
}
