import * as vscode from 'vscode'

export const enum ExtensionCommands {
  findDuplicateInCurrentFile = 'identify-duplicate-properties.findDuplicateInCurrentFile',
  removeDuplicateErrorDecoration = 'identify-duplicate-properties.removeDuplicateErrorDecoration',
  toggleRealtimeCheck = 'identify-duplicate-properties.toggleRealtimeCheck',
}

interface DuplicatePropertyRange {
  range: vscode.Range
  hoverMessage: string
}

let isRealtimeActive = true
let duplicatedPropertyRanges: DuplicatePropertyRange[] = []
let activeEditor = vscode.window.activeTextEditor

const duplicateDecorationType = vscode.window.createTextEditorDecorationType({
  borderWidth: '1px',
  borderStyle: 'none none dashed none',
  borderColor: 'red',
  overviewRulerColor: 'red',
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  light: {
    borderColor: 'red',
    overviewRulerColor: 'red',
  },
  dark: {
    borderColor: 'red',
    overviewRulerColor: 'red',
  },
})

const updateErrorDecorationsInRealtime = () => {
  if (!activeEditor) {
    return
  }

  const text = activeEditor.document.getText()
  const lines = text.split('\n')

  const propertyMap = new Map()

  duplicatedPropertyRanges = []

  lines.forEach((line, i) => {
    if (!line.startsWith('#')) {
      const match = /^(.*?)=/.exec(line)

      if (match) {
        const [, propertyName] = match
        if (!propertyMap.has(propertyName)) {
          propertyMap.set(propertyName, [])
        }

        const lineNumbers = propertyMap.get(propertyName)
        lineNumbers.push(i)

        if (lineNumbers.length === 2) {
          duplicatedPropertyRanges.push({
            range: new vscode.Range(i, 0, i, line.length),
            hoverMessage: 'Duplicate property key',
          })
        }
      }
    }
  })

  activeEditor.setDecorations(duplicateDecorationType, duplicatedPropertyRanges)
}

const checkDuplicatesForCurrentFile = async () => {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active text editor.')
    return
  }

  duplicatedPropertyRanges.length = 0 // Clear existing ranges

  const text = editor.document.getText()
  const lines = text.split('\n')

  const propertyMap = new Map()

  lines.forEach((line, i) => {
    if (!line.startsWith('#')) {
      const match = /^(.*?)=/.exec(line)

      if (match) {
        const [, propertyName] = match
        if (!propertyMap.has(propertyName)) {
          propertyMap.set(propertyName, [])
        }

        const lineNumbers = propertyMap.get(propertyName)
        lineNumbers.push(i)

        if (lineNumbers.length === 2) {
          duplicatedPropertyRanges.push({
            range: new vscode.Range(i, 0, i, line.length),
            hoverMessage: 'Duplicate property key',
          })
        }
      }
    }
  })

  editor.setDecorations(duplicateDecorationType, duplicatedPropertyRanges)
  return duplicatedPropertyRanges.length
}

const activateRealtimeChecks = (context: vscode.ExtensionContext) => {
  activeEditor = vscode.window.activeTextEditor

  if (activeEditor) {
    updateErrorDecorationsInRealtime()
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor
      if (editor) {
        updateErrorDecorationsInRealtime()
      }
    }),
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isRealtimeActive && activeEditor && event.document === activeEditor.document) {
        updateErrorDecorationsInRealtime()
      }
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(ExtensionCommands.removeDuplicateErrorDecoration, () => {
      if (activeEditor) {
        activeEditor.setDecorations(duplicateDecorationType, [])
        duplicatedPropertyRanges = []
      }
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(ExtensionCommands.toggleRealtimeCheck, () => {
      isRealtimeActive = !isRealtimeActive

      if (!isRealtimeActive) {
        activeEditor?.setDecorations(duplicateDecorationType, [])
        duplicatedPropertyRanges = []
      }
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(ExtensionCommands.findDuplicateInCurrentFile, async () => {
      const duplicatesCount = await checkDuplicatesForCurrentFile()
      vscode.window.showInformationMessage(`Found ${duplicatesCount} duplicate properties!`)
    }),
  )
}

exports.activate = activateRealtimeChecks

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('Extension deactivated')
}
