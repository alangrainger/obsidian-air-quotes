import { Modal } from 'obsidian'

export interface HTMLInputFile extends File {
  path: string
}

export class FileModal extends Modal {
  private fileSelectCallback: (file: HTMLInputFile) => void

  onOpen (): void {
    this.titleEl.setText('Choose an ePub file to import')
    // Add the file input field
    const inputEl = this.contentEl.createEl('input')
    inputEl.type = 'file'
    inputEl.accept = 'application/epub+zip'
    inputEl.onchange = (ev) => {
      try {
        const file = (ev.target as HTMLInputElement)?.files?.[0] as HTMLInputFile
        this.fileSelectCallback(file)
      } catch (e) {
        console.log(e)
      }
    }
  }

  onFileSelect (callback: (file: HTMLInputFile) => void) {
    this.fileSelectCallback = callback
  }
}
