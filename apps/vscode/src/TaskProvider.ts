import * as vscode from 'vscode';

export class TaskProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | undefined | void> = new vscode.EventEmitter<TaskItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskItem | undefined | void> = this._onDidChangeTreeData.event;

  private tasks: any[] = [];

  constructor() {
    // For now, this is a placeholder. 
    // In a real implementation, this would listen to the CLI or a shared state.
    this.tasks = [
      { id: '1', label: 'Analyzing Architecture', status: 'in-progress' },
      { id: '2', label: 'Generating Components', status: 'pending' }
    ];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TaskItem): Promise<TaskItem[]> {
    if (element) return Promise.resolve([]);
    
    return Promise.resolve(this.tasks.map(task => 
      new TaskItem(task.label, task.status === 'in-progress' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None, task.status)
    ));
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly status: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `Status: ${this.status}`;
    this.description = this.status;
    
    if (status === 'in-progress') {
      this.iconPath = new vscode.ThemeIcon('sync~spin');
    } else if (status === 'completed') {
      this.iconPath = new vscode.ThemeIcon('check');
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline');
    }
  }
}
