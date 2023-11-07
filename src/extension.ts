import * as vscode from 'vscode';
import { exec } from 'child_process';

/////////////////
// Constants

const extName: string = "tmuxy";

interface Command {
    commandId: string;
    title: string;
    callback: () => void;
}

const commands: Command[] = [
    {
        commandId: `${extName}.RunCommand`,
        title: 'Run Command in Terminal',
        callback: runCommandInBackground,
    },
    {
        commandId: `${extName}.RunCommandSaved`,
        title: 'Run Command in Terminal (Use Saved)',
        callback: runCommandInBackgroundUsingSaved,
    },
];

/////////////////
// State
let userCommand: string = "";
let previousSession: string = '';
let previousWindow: string = '';
let previousPane: string = '';

function savePreviousValues(session: string, window: string, pane: string) {
    previousSession = session;
    previousWindow = window;
    previousPane = pane;
}

/////////////////////////
/// TMUX

async function listTmuxSessions(): Promise<string[]> {
    const getTmuxSessions = "tmux list-sessions -F '#{session_name}'";
    return new Promise<string[]>((resolve, reject) => {
        exec(getTmuxSessions, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim().split('\n'));
            }
        });
    });
}

async function listTmuxWindows(session: string): Promise<string[]> {
    const getTmuxSessions = `tmux list-windows -t ${session} -F '#{window_index} #{window_name}'`;
    return new Promise<string[]>((resolve, reject) => {
        exec(getTmuxSessions, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim().split('\n'));
            }
        });
    });
}

async function listTmuxPanes(session: string, window: string): Promise<string[]> {
    const getTmuxSessions = `tmux list-panes -t ${session}:${window} -F '#{pane_index}'`;
    return new Promise<string[]>((resolve, reject) => {
        exec(getTmuxSessions, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim().split('\n'));
            }
        });
    });
}

/////////////////////////
/// Vscode

async function showOptionsToUser(options: string[], promptText: string): Promise<string | undefined> {
    // Show a quick pick menu for the user to select an option.
    const selectedOption = await vscode.window.showQuickPick(options, { placeHolder: promptText });
    return selectedOption;
}

function extractSelectedText(editor: vscode.TextEditor): string {
    const selection = editor?.selection;
    console.log(editor);

    if (!editor?.selection.isEmpty) {
        return editor.document.getText(selection);
    }

    const lineNo = editor.selection.active.line;
    return editor.document.lineAt(lineNo).text.trim();
}

/////////////////////////
/// Helpers

/////////////////////////
/// Process / Command Handling

function executeUserCommand(userCommand: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const childProcess = exec(userCommand, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                vscode.window.showWarningMessage(`Warning: ${stderr}`);
            }

            resolve();
        });

        childProcess.on('exit', (code) => {
            if (code !== 0) {
                vscode.window.showErrorMessage(`Command exited with code ${code}`);
                reject(`Command exited with code ${code}`);
            }
        });
    });
}

async function executeCommandList(commandList: string[], session: string, window: string, pane: string): Promise<void> {
    console.debug(commandList);
    // Execute the user-provided command
    for (const command of commandList) {
        const newCommand = command.trim().replace(/'/g, '\"').replace(/"/g, '\"').replace(/;/g, '\\;');
        const shellCommand = `tmux-send -s ${session} ${window}.${pane} '${newCommand}'`;
        console.debug(`Executing: ${shellCommand}`);
        await executeUserCommand(shellCommand);
    }
}

////////////////////////////
/// Commands

async function runCommandInBackground() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    console.log(extractSelectedText(editor));
    let i = 0;
    try {
        console.log(i++);
        userCommand = extractSelectedText(editor); // Get highlighted text
        console.log(i++);

        // Prompt the user for input using showInputBox.
		if (!userCommand) {
            userCommand = await vscode.window.showInputBox({
                prompt: 'Enter the command you want to run in the background',
                placeHolder: 'e.g., ls -l',
            }) || "";
        }
		
        console.log(i++);

        let availableSessions = await listTmuxSessions();
		if(!availableSessions) { return }
        console.log(i++, availableSessions);

        let session = await showOptionsToUser(availableSessions, "Select a session");
		if(!session) { return }

        console.log(i++, session);

		const availableWindows = await listTmuxWindows(session);
        let windowInput = (await showOptionsToUser(availableWindows, "Select a window")) || "";
		let window = windowInput.split("")[0]
        if(!window) { return }
		console.log(i++, window);

        let availablePanes = await listTmuxPanes(session, window);
        let pane = "1";
        if (availablePanes.length > 1) {
            pane = await showOptionsToUser(await listTmuxPanes(session, window), "Select a pane") || "1";
        }
        console.log(i++, pane);

        console.log(session, window, pane);
        savePreviousValues(session, window, pane);
        const userCommands = userCommand.split('\n');
        await executeCommandList(userCommands, session, window, pane);
    } catch (error) {
        console.log(">?");
        console.error(error);
    }
}

async function runCommandInBackgroundUsingSaved() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const previous = [previousSession, previousWindow, previousPane];
        console.debug(previous);
        if (previous.some(item => !item)) {
            console.log("The array contains empty or null values.");
            vscode.window.showErrorMessage(`No saved values`);
            return;
        }

        userCommand = extractSelectedText(editor); // Get highlighted text

        // Prompt the user for input using showInputBox.
        if (!userCommand) {
            userCommand = await vscode.window.showInputBox({
                prompt: 'Enter the command you want to run in the background',
                placeHolder: 'e.g., ls -l',
            }) || "";
        }

        const userCommands = userCommand.split('\n');
        await executeCommandList(userCommands, previousSession, previousWindow, previousPane);
    } catch (error) {
        console.error(error);
    }
}

////////////////////////////
/// Ext


export async function activate(context: vscode.ExtensionContext) {
    // const textmateService = new TextmateLanguageService('javascript', context);
    // const textmateTokenService = await textmateService.initTokenService();
    // const textDocument = vscode.window.activeTextEditor.document;
    // const tokens = textmateTokenService.fetch(textDocument);

	// Register all the commands using a loop
	for (const command of commands) {
		const disposable = vscode.commands.registerCommand(command.commandId, command.callback);
		context.subscriptions.push(disposable);
	}
}


export async function deactivate() { }
