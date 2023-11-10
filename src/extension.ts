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
let PREVIOUS_SESSION: string = '';
let PREVIOUS_WINDOW_INDEX: number = 1;
let PREVIOUS_WINDOW_NAME: string = "";
let PREVIOUS_PANE_INDEX: number = 1;
let previousPaneCount: number;

function savePreviousValues(session: string, windowIndex: number, windowName: string, paneCount: number, pane: number) {
	hasRan = true;
	PREVIOUS_SESSION = session;
	PREVIOUS_WINDOW_INDEX = windowIndex;
	PREVIOUS_WINDOW_NAME = windowName;
	PREVIOUS_PANE_INDEX = pane;
	previousPaneCount = paneCount
}

////////////////////////////
/// Handlers

function handleOpenTerminalEvent(terminal: vscode.Terminal) {
	if (getShellType(terminal) != "tmux") { return }
	const windowName = getWorkspaceName()
	// TODO: Look a different notation for workspaces - maybe window name should be $workspace_$rootFolderName, or maybe workspaces should be an entirely new session?
	sendCommandToTerminal(terminal, getCommandForWindowName(windowName))
}

////////////////////////////
/// Commands

async function runCommandInBackground() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	try {
		// If there are no TMUX sesions then there is no point continuning
		const availableSessions = await listTmuxSessions();
		if (!availableSessions) { vscode.window.showErrorMessage(`Tmuxy: No tmux sessions available. Start a session using 'tmux'.`); return; }
		// Get session input
		const session = await showOptionsToUser(availableSessions, "Select a session");
		if (!session) { return };

		// WINDOWS - There will ALWAYS be 1 window
		const availableWindows = await listTmuxWindows(session);
		let windowIndexStr = 1;
		if (availableWindows.length > 1) {
			const windowInput = await showOptionsToUser(availableWindows, "Select a window");
			windowIndexStr = parseInt(windowInput?.split("")[0] ||  `${windowIndexStr}`); // 😅
		}
		let windowName = availableWindows[windowIndexStr - 1]

		// PANES  - There will ALWAYS be 1 pane
		const availablePanes = await listTmuxPanes(session, windowIndexStr);
		let paneIndex = 1;
		if (availablePanes.length > 1) {
			const paneInput = await showOptionsToUser(availablePanes.map(String), "Select a pane");
			paneIndex = parseInt(paneInput || `${paneIndex}`); // 😅 again
		}

		savePreviousValues(session, windowIndexStr, windowName, availablePanes.length, paneIndex);

		const userCommandsList = (await getUserCommandsStr(editor)).split('\n');
		await executeCommandList(userCommandsList, session, windowIndexStr, paneIndex);
	} catch (error) {
		console.error(error);
	}
}
async function runCommandInBackgroundUsingSaved() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	if (!hasRan) { vscode.window.showErrorMessage(`Tmuxy: No saved values, please run direct. Default bind: 'Ctrl+K + Ctrl+C'`); return; }
	if (!hasValidSavedState()) { return }
	try {
		const userCommandsList = (await getUserCommandsStr(editor)).split('\n');
		await executeCommandList(userCommandsList, PREVIOUS_SESSION, PREVIOUS_WINDOW_INDEX.toString(), PREVIOUS_PANE_INDEX);
	} catch (error) {
		console.error(error);
	}
}

////////////////////////////
/// Funcs
async function getUserCommandsStr(editor: vscode.TextEditor): Promise<string> {
	let userCommand = extractSelectedText(editor); // Get highlighted text
	if (!userCommand) { return (await getUserCommandsInput()) }
	return userCommand
}

async function getUserCommandsInput() {
	userCommand = await vscode.window.showInputBox({
		prompt: 'Enter the command you want to run in the background',
		placeHolder: 'e.g., ls -l',
	}) || "";
	return userCommand
}


async function hasValidSavedState() {
	if (!await hasSession(PREVIOUS_SESSION)) {
		vscode.window.showErrorMessage(`Tmuxy: Previous session is no longer available`);
		return false;
	}
	if (!await hasWindow(PREVIOUS_SESSION, PREVIOUS_WINDOW_NAME)) {
		vscode.window.showErrorMessage(`Tmuxy: Previous window is no longer available or has changed position`);
		return false;
	}
	if (!await hasPaneKept(PREVIOUS_SESSION, PREVIOUS_WINDOW_INDEX, previousPaneCount)) {
		vscode.window.showErrorMessage(`Tmuxy: Number of panes available has changed, please run directly.`);
		return false;
	}
	return true
}


////////////////////////////
/// Terminal Helpers

function getShellType(terminal: vscode.Terminal): string | undefined {
	const shellPath = (terminal?.creationOptions as any).shellPath || undefined // Sorry not sorry
	const shellBin = shellPath.substring(shellPath.lastIndexOf("/") + 1);
	return shellBin;
}

function sendCommandToTerminal(terminal: vscode.Terminal, command: string) {
	terminal.sendText(command);
}

function getCommandForWindowName(windowName: string | undefined): string {
	let windowCommand = 'tmux new-window'
	if (windowName && windowName != "Untitled (Workspace)") {
		windowCommand += ` -Sn ${windowName}`
	}
	return windowCommand
}

function getWorkspaceName(): string | undefined {
	const workspaceName = vscode.workspace.name
	if (workspaceName) {
		return workspaceName.replace(/\s*\[.*?\]$/, "").trim()
	}
	return undefined
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

async function executeUserCommand(session: string, window: string|number, pane: string|number, command: string): Promise<void> {
	if (command == "") { return }
	try {
		await sendKeysToTmux(session, window, pane, command);
	} catch (error: any) {
		vscode.window.showErrorMessage(`Tmuxy: Error: ${error.message}`);
	}
}

async function executeCommandList(commandList: string[], session: string, window: string|number, pane: string|number): Promise<void> {
	for (const command of commandList) {
		const newCommand = formatCommandSring(command);
		executeUserCommand(session, window, pane, newCommand)
	}
}

function formatCommandSring(command: string): string {
	return command.trim().replace(/'/g, '\"').replace(/"/g, '\"').replace(/;/g, '\\;')
}


////////////////////////////
/// Extension

export async function activate(context: vscode.ExtensionContext) {

	// Register event handler
	vscode.window.onDidOpenTerminal((terminal: vscode.Terminal) => {
		handleOpenTerminalEvent(terminal)
	})

	// Register all commands
	for (const command of commands) {
		const disposable = vscode.commands.registerCommand(command.commandId, command.callback);
		context.subscriptions.push(disposable);
	}
}

export async function deactivate() { }
