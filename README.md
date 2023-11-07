# tmuxy README

Tmux integration within VSCode

## Features

Allows you to run commands directly into a tmux buffer from highlighted text within vscode.

## Requirements

You must have `tmux` installed, and be using it for session management

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
