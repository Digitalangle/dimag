/**
 * Learning Dashboard
 * Shows learning statistics and metrics
 */

import * as vscode from 'vscode';

export class LearningDashboard {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async show(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'dimagDashboard',
      '🧠 Dimag Learning Dashboard',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getHTML();
  }

  private getHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .stat { padding: 20px; border: 1px solid #ccc; margin: 10px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>🧠 Dimag Learning Dashboard</h1>
        <div class="stat">
          <h2>Coming Soon!</h2>
          <p>Learning statistics and patterns will appear here.</p>
        </div>
      </body>
      </html>
    `;
  }
}
