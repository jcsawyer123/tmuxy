import * as vscode from 'vscode';
import { hasPaneKept, hasSession, hasWindow, listTmuxPanes, listTmuxSessions, listTmuxWindows, sendKeysToTmux } from './tmux';


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


/////////////////////////
/// "STATE"

let userCommand: string = "";

let hasRan: Boolean = false;
let previousSession: string = '';
let previousWindowIndex: number = 1;
let previousWindowName: string = "";
let previousPaneIndex: string = '';
let previousPaneCount: number;

function savePreviousValues(session: string, windowIndex: number, windowName: string, paneCount: number, pane: string) {
	hasRan = true;
	previousSession = session;
	previousWindowIndex = windowIndex;
	previousWindowName = windowName;
	previousPaneIndex = pane;
	previousPaneCount = paneCount
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
	if (!editor?.selection.isEmpty) {
		return editor.document.getText(selection);
	}
	const lineNo = editor.selection.active.line;
	return editor.document.lineAt(lineNo).text.trim();
}


/////////////////////////
/// Process / Command Handling

async function executeUserCommand(session: string, window: string, pane:string, command:string): Promise<void> {
	if(command == "") { return }
	try {
	  await sendKeysToTmux(session, window, pane, command);
	} catch (error: any) {
	  // Handle the error here
	  vscode.window.showErrorMessage(`Tmuxy: Error: ${error.message}`);
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
		if (!availableSessions) {
			vscode.window.showErrorMessage(`Tmuxy: No tmux sessions available. Start a session using 'tmux'.`);
			return;
		}
		const session = await showOptionsToUser(availableSessions, "Select a session");
		if (!session) { return };

		const availableWindows = await listTmuxWindows(session);
		let windowIndexStr = "1";
		if(availableWindows.length > 1) {
			const windowInput = await showOptionsToUser(availableWindows, "Select a window");
			windowIndexStr = windowInput?.split("")[0] || "1";
		}
		let windowName = availableWindows[parseInt(windowIndexStr) - 1]
		console.debug(await listTmuxWindows("main"))
		console.debug(`Windows ${windowIndexStr}`)



		const availablePanes = await listTmuxPanes(session, windowIndexStr);
		let pane = "1";
		if (availablePanes.length > 1) {
			pane = (await showOptionsToUser(availablePanes.map(String), "Select a pane")) || "1";
		}

		savePreviousValues(session, parseInt(windowIndexStr), windowName, availablePanes.length, pane);

		const userCommands = userCommand.split('\n');
		await executeCommandList(userCommands, session, windowIndexStr, pane);
	} catch (error) {
		console.error(error);
	}
}
async function runCommandInBackgroundUsingSaved() {
	const editor = vscode.window.activeTextEditor;
	const previous = [previousSession, previousWindowIndex, previousWindowName, previousPaneIndex];

	if(!hasRan){
		vscode.window.showErrorMessage(`Tmuxy: No saved values, please run direct. Default bind: 'Ctrl+K + Ctrl+C'`);
	}

	if (!editor) { return; }
	try {

		if (!await hasSession(previousSession)) {
			vscode.window.showErrorMessage(`Tmuxy: Previous session is no longer available`);
			return;
		}
		if (!await hasWindow(previousSession, previousWindowName)) {
			vscode.window.showErrorMessage(`Tmuxy: Previous window is no longer available or has changed position`);
			return;
		}
		if (!await hasPaneKept(previousSession, previousWindowIndex, previousPaneCount)) {
			// TODO: May want to track previous number of panes, if that value changes we should probably reprompt to avoid accidentally putting data in the wrong pane
			vscode.window.showErrorMessage(`Tmuxy: Number of panes available has changed, please run directly.`);
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
		await executeCommandList(userCommands, previousSession, previousWindowIndex.toString(), previousPaneIndex);
	} catch (error) {
		console.error(error);
	}
}

////////////////////////////
/// Extension


export async function activate(context: vscode.ExtensionContext) {
	// Register all the commands using a loop
	for (const command of commands) {
		const disposable = vscode.commands.registerCommand(command.commandId, command.callback);
		context.subscriptions.push(disposable);
	}
}

export async function deactivate() { }
