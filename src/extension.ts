import * as vscode from 'vscode';
import { ChildProcess, exec } from 'child_process';
import { hasSession, listTmuxPanes, listTmuxSessions, listTmuxWindows, sendKeysToTmux } from './tmux';


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


/////////////////////////
/// Vscode

async function showOptionsToUser(options: string[], promptText: string): Promise<string | undefined> {
	// Show a quick pick menu for the user to select an option.
	const selectedOption = await vscode.window.showQuickPick(options, { placeHolder: promptText });
	return selectedOption;
}

function extractSelectedText(editor: vscode.TextEditor): string {
	const selection = editor?.selection;
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

async function executeUserCommand(session: string, window: string, pane:string, command:string): Promise<void> {
	if(command == "") { return }
	try {
	  await sendKeysToTmux(session, window, pane, command);
	} catch (error: any) {
	  // Handle the error here
	  vscode.window.showErrorMessage(`Error: ${error.message}`);
	}
  }

async function executeCommandList(commandList: string[], session: string, window: string, pane: string): Promise<void> {
	console.debug(commandList);
	// Execute the user-provided command
	for (const command of commandList) {
		const newCommand = command.trim().replace(/'/g, '\"').replace(/"/g, '\"').replace(/;/g, '\\;');
		executeUserCommand(session, window, pane, `${newCommand}`)
	}
}

////////////////////////////
/// Commands

async function runCommandInBackground() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	try {
		let userCommand = extractSelectedText(editor) || "";
		if (!userCommand) {
			userCommand = await vscode.window.showInputBox({
				prompt: 'Enter the command you want to run in the background',
				placeHolder: 'e.g., ls -l',
			}) || "";
		}

		const availableSessions = await listTmuxSessions();
		if (!availableSessions) return;
		const session = await showOptionsToUser(availableSessions, "Select a session");
		if (!session) return;

		vscode.window.showInformationMessage(`Has Session ${(await hasSession(session))}`);
		vscode.window.showInformationMessage(`Has Session 2 ${(await hasSession("abc"))}`);

		const availableWindows = await listTmuxWindows(session);
		let window = "1";
		if(availableWindows.length > 1) {
			const windowInput = await showOptionsToUser(availableWindows, "Select a window");
			window = windowInput?.split("")[0] || "1";
		}

		const availablePanes = await listTmuxPanes(session, window);
		let pane = "1";
		if (availablePanes.length > 1) {
			pane = (await showOptionsToUser(availablePanes.map(String), "Select a pane")) || "1";
		}

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
	// Register all the commands using a loop
	for (const command of commands) {
		const disposable = vscode.commands.registerCommand(command.commandId, command.callback);
		context.subscriptions.push(disposable);
	}
}

export async function deactivate() { }
