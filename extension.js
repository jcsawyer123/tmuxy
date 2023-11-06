const vscode = require('vscode');
const { exec } = require('child_process')

/////////////////
// Constants

const extName = "tmuxy"

const commands = [
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
]
runCommandInBackgroundUsingSaved
/////////////////
// State
let userCommand = ""
let previousSession = '';
let previousWindow = '';
let previousPane = '';

function savePreviousValues(session, window, pane) {
    previousSession = session;
    previousWindow = window;
    previousPane = pane;
}

/////////////////////////
/// TMUX

async function listTmuxSessions() {
	const getTmuxSessions = "tmux list-sessions -F '#{session_name}'";
	return new Promise((resolve, reject) => {
		exec(getTmuxSessions, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout.trim().split('\n'));
			}
		});
	});
}

async function listTmuxWindows(session) {
	const getTmuxSessions = `tmux list-windows -t ${session} -F '#{window_index} #{window_name}'`;
	return new Promise((resolve, reject) => {
		exec(getTmuxSessions, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout.trim().split('\n'));
			}
		});
	});
}

async function listTmuxPanes(session, window) {
	const getTmuxSessions = `tmux list-panes -t ${session}:${window} -F '#{pane_index}'`;
	return new Promise((resolve, reject) => {
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

async function showOptionsToUser(options, promptText) {
	// Define a list of options to pick from.
	// Show a quick pick menu for the user to select an option.
	const selectedOption = await vscode.window.showQuickPick(options, { placeHolder: promptText });
	if (selectedOption) {
		return selectedOption
	}
}


function extractSelectedText() {
	const editor = vscode.window.activeTextEditor;

    if (editor) {
        const selection = editor.selection;
        return editor.document.getText(selection) || null;
    } else {
        return null;
    }
}

/////////////////////////
/// Vscode

function executeUserCommand(userCommand) {
    return new Promise((resolve, reject) => {
        const childProcess = exec(userCommand, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                vscode.window.showWarningMessage(`Warning: ${stderr}`);
            }

            resolve(stdout);
        });

        childProcess.on('exit', (code) => {
            if (code !== 0) {
                vscode.window.showErrorMessage(`Command exited with code ${code}`);
                reject(`Command exited with code ${code}`);
            }
        });
    });
}

async function executeCommandList(commandList, session, window, pane) {
	console.debug(commandList)
	// Execute the user-provided command
	for (const command of commandList) {
		let newCommand = command.trim().replace(/'/g, '\"').replace(/"/g, '\"').replace(/;/g, '\\;');
		const shellCommand = `tmux-send -s ${session} ${window}.${pane} '${newCommand}'`
		console.debug(`Executing: ${shellCommand}`)
        await executeUserCommand(shellCommand);
    }
}



////////////////////////////
/// Commands

async function runCommandInBackground() {
	let i = 0
	try {
		console.log(i++);
		userCommand = extractSelectedText(); // Get highlighted text
		console.log(i++);

		// Prompt the user for input using showInputBox.
		if (userCommand == null)
			userCommand = await vscode.window.showInputBox({
				prompt: 'Enter the command you want to run in the background',
				placeHolder: 'e.g., ls -l',
			});
		console.log(i++);

		let availableSessions = await listTmuxSessions()
		console.log(i++, availableSessions);

		let session = await showOptionsToUser(availableSessions, "Select a session");
		console.log(i++, session);

		let window = (await showOptionsToUser(await listTmuxWindows(session), "Select a window")).split("")[0];
		console.log(i++, window);

		let availablePanes = await listTmuxPanes(session, window)
		let pane = 1
		if(availablePanes.length > 1) { await showOptionsToUser(await listTmuxPanes(session, window), "Select a pane"); } // If only 1 pane then just return default pane of 1
		console.log(i++,pane);

		console.log(session, window, pane);
		savePreviousValues(session, window, pane)
		const userCommands = userCommand.split('\n');
		await executeCommandList(userCommands, session, window, pane)
	} catch (error) {
		console.log(">?");
		console.error(error);
	}
}

async function runCommandInBackgroundUsingSaved() {
	try {
		const previous = [previousSession, previousWindow, previousPane];
		console.debug(previous);
		if (previous.some(item => !item)) {
			console.log("The array contains empty or null values.");
			return
		}
	
		userCommand = extractSelectedText(); // Get highlighted text
	
		// Prompt the user for input using showInputBox.
		if (userCommand == null)
			userCommand = await vscode.window.showInputBox({
				prompt: 'Enter the command you want to run in the background',
				placeHolder: 'e.g., ls -l',
		});	
	
		const userCommands = userCommand.split('\n');
		await executeCommandList(userCommands, previousSession, previousWindow, previousPane)
	} catch (error) {
		console.error();(error);
	}
}


////////////////////////////
/// Ext


function activate(context) {
	// Register all the commands using a loop
	for (const command of commands) {
		const disposable = vscode.commands.registerCommand(command.commandId, command.callback);
		context.subscriptions.push(disposable);
	}
}


function deactivate() { }

module.exports = {
	activate,
	deactivate
}
