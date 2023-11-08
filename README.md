# tmuxy README

Tmux integration within VSCode

## Features

Allows you to run commands directly into a tmux buffer from highlighted text within vscode.

### Usage
1. Running either command will take the line your cursor is on and send it the tmux target
2. Running with text select will send each line in the selection to the tmux target one at a time, in order.


### Commands

`*tmuxy.RunCommand*` - Prompts direction from the user to select tmux `session`, `window` and `pane`. If only one is available for `window` and `pane` it will select them for you.

`tmuxy.RunCommandSaved` - Will run your selected code using the `session`, `window` and `pane` from last run aslong as they are still available and unchanged.

## Requirements

You must have `tmux` installed, and be using it for session management

## Building Locally

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
