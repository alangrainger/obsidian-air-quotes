import { spawn } from 'child_process'
import AirQuotes from './main'
import { Notice, Platform } from 'obsidian'

export async function convertEpub (plugin: AirQuotes): Promise<string | null> {
  if (Platform.isMobile) {
    new Notice('Pandoc conversion is not supported on mobile')
    return null
  }

  // Get the source file path with the system file picker
  const sourceFile = await new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = () => {
      // @ts-ignore
      resolve(input.files?.item(0)?.path)
    }
    input.click()
  })
  if (!sourceFile || typeof sourceFile !== 'string') {
    return null
  }

  // Get just the file name from the full path
  let newFilename = sourceFile.replace(/.*[/\\]/, '').replace(/\.\w+?$/, '') + '.md'
  // Add the vault-relative save folder (if set)
  if (plugin.settings.pandocSaveLocation) {
    newFilename = plugin.settings.pandocSaveLocation + '/' + newFilename
  }
  // @ts-ignore
  const outputFile = `${plugin.app.vault.adapter.basePath}/${newFilename}`.replace(/"/g, '\\"')
  const pandocCommand = `pandoc -s "${sourceFile}" -t markdown_strict-raw_html-native_divs-native_spans-fenced_divs-bracketed_spans --wrap=none -o "${outputFile}"`

  // Check to make sure the Pandoc save location exists in the vault, and create it if not
  if (!await plugin.app.vault.adapter.exists(plugin.settings.pandocSaveLocation)) {
    await plugin.app.vault.createFolder(plugin.settings.pandocSaveLocation)
  }
  const child_process = spawn(pandocCommand, {
    'cwd': 'c:/temp',
    'shell': 'cmd.exe',
    'env': {},
  })
  const shellResult = await Promise.race<string>([
    new Promise(resolve => {
      child_process.on('exit', () => {
        const stderr = child_process.stderr.read()
        if (stderr !== null) {
          console.log(['Error converting file:', stderr.toString(), 'The convert command was:', pandocCommand].join('\n\n'))
        } else {
          new Notice(`Successfully converted file to "${newFilename}"`)
          resolve(newFilename)
        }
      })
    }),
    new Promise(resolve => setTimeout(resolve, 3000))
  ])
  return shellResult || null
}
