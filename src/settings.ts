import { App, PluginSettingTab, Setting } from 'obsidian'
import AirQuotes from './main'

export interface AirQuotesSettings {
  bookSource: string;
  outputStyle: string;
  calloutHeader: string;
}

export const DEFAULT_SETTINGS: AirQuotesSettings = {
  bookSource: 'source_text',
  outputStyle: 'callout',
  calloutHeader: '> [!quote]'
}

export class AirQuotesSettingTab extends PluginSettingTab {
  plugin: AirQuotes

  constructor (app: App, plugin: AirQuotes) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const {containerEl} = this

    containerEl.empty()

    containerEl.createEl('h2', {text: 'Air Quotes settings'})

    new Setting(containerEl)
      .setName('Book source field')
      .setDesc('This can be a standard or Dataview frontmatter field')
      .addText(text => text
        .setPlaceholder('source_text')
        .setValue(this.plugin.settings.bookSource)
        .onChange(async (value) => {
          this.plugin.settings.bookSource = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Quote output style')
      .setDesc('')
      .addDropdown(dropdown => {
        dropdown
          .addOption('callout', 'Callout / admonition')
          .addOption('quote', 'Blockquote')
          .addOption('none', 'Normal text')
          .setValue(this.plugin.settings.outputStyle)
          .onChange(async (value) => {
            this.plugin.settings.outputStyle = value
            await this.plugin.saveSettings()
          })
      })
    new Setting(containerEl)
      .setName('Callout header')
      .setDesc('If using the callout/admonition quote style, this will be the first line of the callout')
      .addText(text => text
        .setPlaceholder('> [!quote]')
        .setValue(this.plugin.settings.calloutHeader)
        .onChange(async (value) => {
          this.plugin.settings.calloutHeader = value
          await this.plugin.saveSettings()
        }))
  }
}
