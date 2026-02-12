import * as vscode from 'vscode';
import * as path from 'path';
import { DesignManifestManager } from '@myycontext/core';

export class DesignManifestProvider implements vscode.TreeDataProvider<ManifestItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ManifestItem | undefined | void> = new vscode.EventEmitter<ManifestItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ManifestItem | undefined | void> = this._onDidChangeTreeData.event;

  private manifestManager: DesignManifestManager | null = null;
  private workspaceRoot: string | undefined;

  constructor(workspaceRoot: string | undefined) {
    this.workspaceRoot = workspaceRoot;
    console.log('DesignManifestProvider initialized with root:', workspaceRoot);
    if (workspaceRoot) {
      this.manifestManager = new DesignManifestManager(workspaceRoot);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ManifestItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ManifestItem): Promise<ManifestItem[]> {
    if (!this.workspaceRoot || !this.manifestManager) {
      return [new ManifestItem('No Workspace Opened', vscode.TreeItemCollapsibleState.None)];
    }

    const manifest = await this.manifestManager.loadDesignManifest();
    if (!manifest) {
      return [new ManifestItem('No Design Manifest Found', vscode.TreeItemCollapsibleState.None)];
    }

    if (element) {
      // Return children for a specific phase
      const phaseKey = element.id as string;
      const phaseData = (manifest.phases as any)[phaseKey];
      
      if (typeof phaseData === 'object' && phaseData !== null) {
        return Object.entries(phaseData).map(([key, value]) => {
          const displayValue = Array.isArray(value) ? `[${value.length}]` : typeof value === 'object' ? '{...}' : String(value);
          return new ManifestItem(`${key}: ${displayValue}`, vscode.TreeItemCollapsibleState.None, key);
        });
      }
      return [];
    } else {
      // Return top-level phases
      return [
        new ManifestItem('Functional Summary', vscode.TreeItemCollapsibleState.Collapsed, 'functional_summary', 'rocket'),
        new ManifestItem('Visual System', vscode.TreeItemCollapsibleState.Collapsed, 'visual_system', 'paintcan'),
        new ManifestItem('Component Hierarchy', vscode.TreeItemCollapsibleState.Collapsed, 'component_hierarchy', 'symbol-structure'),
        new ManifestItem('Implementation Plan', vscode.TreeItemCollapsibleState.Collapsed, 'implementation_plan', 'beaker'),
        new ManifestItem('State Attestation', vscode.TreeItemCollapsibleState.Collapsed, 'state_attestation', 'verified'),
      ];
    }
  }
}

class ManifestItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly id?: string,
    public readonly iconName?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
    this.contextValue = 'manifestItem';
  }
}
