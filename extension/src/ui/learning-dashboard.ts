/**
 * Learning Dashboard
 * Shows learning statistics and metrics
 */

import * as vscode from 'vscode';
import { LearningCapture } from '../learning/capture';
import { LearningSync } from '../learning/sync';
import { PatternMatcher } from '../brain/pattern-matcher';

export class LearningDashboard {
  private context: vscode.ExtensionContext;
  private panel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'dimagDashboard',
      '🧠 Dimag Learning Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await this.refresh();
            break;
          case 'clearQueue':
            await this.clearQueue();
            break;
          case 'syncNow':
            await this.syncNow();
            break;
        }
      }
    );

    await this.refresh();
  }

  private async refresh(): Promise<void> {
    if (!this.panel) return;

    const data = await this.getData();
    this.panel.webview.html = this.getHTML(data);
  }

  private async getData(): Promise<any> {
    // Get learning queue
    const queue = this.context.globalState.get<any[]>('learningQueue') || [];

    // Get sync stats (create temporary instance)
    const syncPath = this.context.globalStorageUri.fsPath;
    let syncStats = {
      lastSync: 'Never',
      totalPatterns: 0,
      repoPath: syncPath
    };

    try {
      const { LearningSync } = await import('../learning/sync');
      const sync = new LearningSync(this.context);
      syncStats = await sync.getSyncStats() as any;
    } catch {}

    // Get pattern stats (if PatternMatcher initialized)
    let patternStats = {
      totalPatterns: 0,
      patternsByCategory: {},
      cacheExpiry: 0
    };

    try {
      // Pattern stats are available from sync
      patternStats.totalPatterns = syncStats.totalPatterns;
    } catch {}

    // Get learning settings
    const config = vscode.workspace.getConfiguration('dimag');
    const learningEnabled = config.get('learning.enabled', true);
    const autoCommit = config.get('learning.autoCommit', true);
    const commitThreshold = config.get('learning.commitThreshold', 10);

    // Get extracted patterns waiting for commit
    const extractedPatterns = this.context.globalState.get<any[]>('extractedPatterns') || [];

    return {
      queue: {
        size: queue.length,
        threshold: commitThreshold,
        items: queue.slice(-5).reverse() // Last 5 events
      },
      sync: syncStats,
      patterns: patternStats,
      extractedPatterns: extractedPatterns.length,
      settings: {
        learningEnabled,
        autoCommit,
        commitThreshold
      }
    };
  }

  private async clearQueue(): Promise<void> {
    await this.context.globalState.update('learningQueue', []);
    vscode.window.showInformationMessage('Learning queue cleared!');
    await this.refresh();
  }

  private async syncNow(): Promise<void> {
    await vscode.commands.executeCommand('dimag.syncLearnings');
    await this.refresh();
  }

  private getHTML(data: any): string {
    const progressPercent = (data.queue.size / data.queue.threshold) * 100;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }

          h1 {
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          h2 {
            font-size: 16px;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            opacity: 0.9;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px;
          }

          .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin: 8px 0;
          }

          .stat-label {
            font-size: 12px;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .progress-bar {
            background: var(--vscode-input-background);
            border-radius: 4px;
            height: 8px;
            overflow: hidden;
            margin: 12px 0;
          }

          .progress-fill {
            background: var(--vscode-progressBar-background);
            height: 100%;
            transition: width 0.3s ease;
          }

          .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-right: 8px;
            margin-top: 12px;
          }

          .button:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .button-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .button-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          .event-list {
            list-style: none;
            margin-top: 12px;
          }

          .event-item {
            padding: 10px;
            background: var(--vscode-input-background);
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 12px;
          }

          .event-type {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-right: 8px;
          }

          .event-time {
            opacity: 0.6;
            font-size: 11px;
          }

          .badge {
            display: inline-block;
            padding: 2px 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
          }

          .badge.success {
            background: #28a745;
            color: white;
          }

          .badge.warning {
            background: #ffc107;
            color: black;
          }

          .info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px;
            font-size: 13px;
            margin-top: 12px;
          }

          .info-label {
            opacity: 0.7;
          }

          .info-value {
            font-weight: 500;
          }

          .empty-state {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.6;
          }
        </style>
      </head>
      <body>
        <h1>🧠 Dimag Learning Dashboard</h1>

        <!-- Status Grid -->
        <div class="grid">
          <div class="card">
            <div class="stat-label">Learning Queue</div>
            <div class="stat-value">${data.queue.size}/${data.queue.threshold}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(progressPercent, 100)}%"></div>
            </div>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
              ${data.queue.threshold - data.queue.size} more until auto-commit
            </p>
          </div>

          <div class="card">
            <div class="stat-label">Community Patterns</div>
            <div class="stat-value">${data.patterns.totalPatterns}</div>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
              Last sync: ${data.sync.lastSync || 'Never'}
            </p>
          </div>

          <div class="card">
            <div class="stat-label">Ready to Commit</div>
            <div class="stat-value">${data.extractedPatterns}</div>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
              Patterns extracted and ready
            </p>
          </div>
        </div>

        <!-- Settings -->
        <div class="card">
          <h2>Settings</h2>
          <div class="info-grid">
            <div class="info-label">Learning Mode:</div>
            <div class="info-value">
              ${data.settings.learningEnabled ? '<span class="badge success">Enabled</span>' : '<span class="badge warning">Disabled</span>'}
            </div>

            <div class="info-label">Auto-Commit:</div>
            <div class="info-value">
              ${data.settings.autoCommit ? '<span class="badge success">On</span>' : '<span class="badge warning">Off</span>'}
            </div>

            <div class="info-label">Commit Threshold:</div>
            <div class="info-value">${data.settings.commitThreshold} learnings</div>
          </div>
        </div>

        <!-- Recent Events -->
        <div class="card">
          <h2>Recent Learning Events</h2>
          ${data.queue.items.length > 0 ? `
            <ul class="event-list">
              ${data.queue.items.map((event: any) => `
                <li class="event-item">
                  <span class="event-type">${event.type}</span>
                  ${event.context?.problemType || 'Unknown context'}
                  <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <div class="empty-state">
              No learning events captured yet. Use Dimag commands to start learning!
            </div>
          `}
        </div>

        <!-- Actions -->
        <div class="card">
          <h2>Actions</h2>
          <button class="button" onclick="refresh()">🔄 Refresh</button>
          <button class="button button-secondary" onclick="syncNow()">📥 Sync Now</button>
          <button class="button button-secondary" onclick="clearQueue()">🗑️ Clear Queue</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function refresh() {
            vscode.postMessage({ command: 'refresh' });
          }

          function clearQueue() {
            if (confirm('Are you sure you want to clear the learning queue?')) {
              vscode.postMessage({ command: 'clearQueue' });
            }
          }

          function syncNow() {
            vscode.postMessage({ command: 'syncNow' });
          }

          // Auto-refresh every 10 seconds
          setInterval(refresh, 10000);
        </script>
      </body>
      </html>
    `;
  }
}
