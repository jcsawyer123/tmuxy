import { exec, execSync, spawnSync } from "child_process";

export async function listTmuxSessions(): Promise<string[]> {
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


export function sendKeysToTmux(session: string | null, windowIndex: string, paneIndex: string | null, command: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
	  console.debug(`Command: ${command}`);
	  let target = paneIndex !== null ? `${windowIndex}.${paneIndex}` : windowIndex;
	  if (session) {
		target = `${session}:${target}`;
	  }
	  const tmuxCommand = `tmux send-keys -t ${target} '${command}' C-m`;
	  console.debug(`Executing-Debug: ${tmuxCommand}`);
  
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

// export function sendKeysToTmux(session: string | null, windowIndex: string, paneIndex: string | null, command: string) {
// 	console.debug(`Command: ${command}`);
// 	let target = paneIndex !== null ? `${windowIndex}.${paneIndex}` : windowIndex;
// 	if (session) {
// 		target = `${session}:${target}`;
// 	}
// 	const tmuxCommand = `tmux send-keys -t ${target} '${command}' C-m`;
// 	console.debug(`Executing-Debug: ${tmuxCommand}`);
// 	return exec(tmuxCommand)
// }

