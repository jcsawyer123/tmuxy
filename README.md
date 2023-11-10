# Tmuxy - VS Code Tmux Integration
Tmuxy is a VS Code extension that aims to seamlessly integrates with `tmux`, allowing you to execute snippets from your editor directly into your Tmux sessions. With Tmuxy, you can effortlessly run snippets in specific Tmux panes, making your development workflow even more efficient.

**Note:** This extension understably require `tmux` to be installed on your system and set to path.

## Features

**Run Commands in Tmux:**
- Execute commands from VS Code directly into your Tmux sessions.
Choose the Tmux session, window, and pane interactively.

**Flexible Execution**
- Run commands on selected text lines or the current cursor line in the editor.


## Commands

- **`tmuxy.RunCommand`:**
  - Prompts the user to select a Tmux `session`, `window`, or `pane`.
  - If only one option is available for `window` and `pane`, Tmuxy will automatically select them.

- **`tmuxy.RunCommandSaved`:**
  - Runs the selected code using the Tmux `session`, `window`, and `pane` from the last run, provided they are still available and unchanged.


## Usage

### RunCommand `(Ctrl + K, Ctrl + C)`:

1. Select text lines or position the cursor on a line.
2. Execute the command (`Ctrl + K, Ctrl + C`).
3. Tmuxy will prompt you to choose a Tmux session, window, and pane.
4. The selected or current line will be executed in the chosen Tmux pane.

### RunCommandSaved `(Ctrl + K, Ctrl + X)`:

1. Select text lines or position the cursor on a line, then execute the command.
2. Execute the command (`Ctrl + K, Ctrl + S`).
3. If, you have used `RunCommand` prior and the target pane is stil available then it will use last.
4. The selected or current line will be executed in the chosen Tmux pane.

