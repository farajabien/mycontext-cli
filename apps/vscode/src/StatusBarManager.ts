import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private progressInterval: NodeJS.Timeout | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'mycontext.status';
    context.subscriptions.push(this.statusBarItem);
    this.showIdle();
  }

  showIdle() {
    this.statusBarItem.text = '$(check) MyContext: Grounded';
    this.statusBarItem.tooltip = 'Click to check project status';
    this.statusBarItem.show();
  }

  showBusy(message: string) {
    let frame = 0;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      this.statusBarItem.text = `${frames[frame]} MyContext: ${message}`;
      frame = (frame + 1) % frames.length;
    }, 100);

    this.statusBarItem.tooltip = message;
    this.statusBarItem.show();
  }

  stopBusy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
    this.showIdle();
  }
}
