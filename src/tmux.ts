import { exec, execSync, spawnSync } from "child_process";
import { isNumber, isString } from "util";
import { isNumberObject } from "util/types";

export async function listTmuxSessions(): Promise<string[] | undefined> {
	const getTmuxSessions = "tmux list-sessions -F '#{session_name}'";
	return new Promise<string[] | undefined>((resolve, reject) => {
		exec(getTmuxSessions, (error, stdout, stderr) => {
			if (error) {
				resolve(undefined);
			} else {
				resolve(stdout.trim().split('\n'));
			}
		});
	});
}

export async function listTmuxWindows(session: string): Promise<string[]> {
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

export async function listTmuxPanes(session: string, window: string): Promise<string[]> {
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

export async function hasSession(session: string): Promise<boolean> {
	const result = spawnSync('tmux', ['has-session', '-t', session]);
	if (result.error || result.status !== 0) {
		return false;
	}
	return true;
}
 
export async function hasWindow(session: string, windowName: string): Promise<boolean> {
	try {
		const windowList = await listTmuxWindows(session);
		return (windowList.includes(windowName))
	} catch (error) {
		return false;
	}
};

// @TODO: Rename this function
export async function hasPaneKept(session: string, window:string | number, PrevPaneCount:number): Promise<boolean> {
	let windowVal: string;
	if(typeof(window) == "number") { windowVal = window.toString() } else { windowVal = window }
	try {
		// Note: If we have a different number of panes at all, we return false as  we don't want to assume a pane index is the same. (Panes may be removed)
		const panes = await listTmuxPanes(session, windowVal);
		console.debug(panes.length, PrevPaneCount);
		return panes.length === PrevPaneCount
	} catch (error) {
		return false;
	}
};
export function sendKeysToTmux(session: string | null, windowIndex: string, paneIndex: string | null, command: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		// console.debug(`Command: ${command}`);
		let target = paneIndex !== null ? `${windowIndex}.${paneIndex}` : windowIndex;
		if (session) {
			target = `${session}:${target}`;
		}
		const tmuxCommand = `tmux send-keys -t ${target} '${command}' C-m`;
		const childProcess = exec(tmuxCommand, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error: ${error.message}`);
				reject(error);
				return;
			}
			if (stderr) {
				console.warn(`Warning: ${stderr}`);
			}
			resolve();
		});

		childProcess.on('exit', (code) => {
			if (code !== 0) {
				console.error(`Command exited with code ${code}`);
				reject(`Command exited with code ${code}`);
			}
		});
	});
}
