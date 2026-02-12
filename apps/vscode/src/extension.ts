import * as vscode from 'vscode';
import { DesignManifestProvider } from './DesignManifestProvider';
import { TaskProvider } from './TaskProvider';
import { StatusBarManager } from './StatusBarManager';

export function activate(context: vscode.ExtensionContext) {
	console.log('MyContext Extension is now active!');
	
  const workspaceFolders = vscode.workspace.workspaceFolders;
  console.log('Detected Workspace Folders:', workspaceFolders?.map(f => f.uri.fsPath));

  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
		? workspaceFolders[0].uri.fsPath
		: (vscode as any).workspace.rootPath; // Fallback for some IDE environments

  console.log('Final MyContext Workspace Root:', workspaceRoot);

	// Manifest View
	const manifestProvider = new DesignManifestProvider(workspaceRoot);
	vscode.window.registerTreeDataProvider('mycontext-living-brain', manifestProvider);

	// Tasks View
	const taskProvider = new TaskProvider();
	vscode.window.registerTreeDataProvider('mycontext-tasks', taskProvider);

	// Status Bar
	const statusBarManager = new StatusBarManager(context);

	// Commands
	let disposable = vscode.commands.registerCommand('mycontext.status', () => {
		vscode.window.showInformationMessage('MyContext: Checking status...');
		statusBarManager.showBusy('Auditing Narrative...');
		setTimeout(() => statusBarManager.stopBusy(), 2000);
	});

  const refreshCommand = vscode.commands.registerCommand('mycontext.refreshManifest', () => {
    manifestProvider.refresh();
  });

	context.subscriptions.push(disposable, refreshCommand);
}

export function deactivate() {}
