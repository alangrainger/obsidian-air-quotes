import { App, PluginSettingTab, Setting } from 'obsidian'
import AirQuotes from './main'

export interface AirQuotesSettings {
  bookSource: string;
}

export const DEFAULT_SETTINGS: AirQuotesSettings = {
  bookSource: 'source_text'
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
  }
}
