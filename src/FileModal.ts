import { Modal } from 'obsidian'

export interface FileWithPath extends File {
  path: string
}

export class FileModal extends Modal {
  private fileSelectCallback: (file: FileWithPath) => void

  onOpen (): void {
    this.titleEl.setText('Choose an ePub file to import')
    // Add the file input field
    const inputEl = this.contentEl.createEl('input')
    inputEl.type = 'file'
    inputEl.accept = 'application/epub+zip'
    inputEl.onchange = (ev) => {
      try {
        const file = (ev.target as HTMLInputElement)?.files?.[0] as FileWithPath
        this.fileSelectCallback(file)
      } catch (e) {
        console.log(e)
      }
    }
  }

  onFileSelect (callback: (file: FileWithPath) => void) {
    this.fileSelectCallback = callback
  }
}
