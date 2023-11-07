# tmuxy README

Tmux integration within VSCode

## Features

Allows you to run commands directly into a tmux buffer from highlighted text within vscode.

## Requirements

For this extension to work you need a `tmux-send` command, this command should work in this format `tmux-send -s $session $window.$pane` and must be available from `%PATH`.

## Building

To build and generate a .vsix
```
npm install -g @vscode/vsce
vsce package
```

To publish to store
```
vsce publish
```

### 0.0.1

First release, supports `run command` and `run command (saved)` to send data to Tmux.
