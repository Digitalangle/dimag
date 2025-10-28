/**
 * Dimag VS Code Extension
 * Self-learning AI CTO orchestrator
 *
 * @author Digitalangle
 * @license MIT
 */

import * as vscode from 'vscode';
import { DimagOrchestrator } from './orchestrator/dimag-orchestrator';
import { LearningSync } from './learning/sync';
import { LearningDashboard } from './ui/learning-dashboard';

export async function activate(context: vscode.ExtensionContext) {
  console.log('🧠 Dimag is activating...');

  // Check if user consented to learning
  await checkLearningConsent(context);

  // Initialize learning sync (pulls updates from Git)
  const learningSync = new LearningSync(context);
  await learningSync.initialize();
  learningSync.startAutoSync();

  // Initialize orchestrator (the brain) - pass learningSync for pattern matching
  const orchestrator = new DimagOrchestrator(context, learningSync);
  context.globalState.update('orchestrator', orchestrator);

  // Register all commands
  registerCommands(context, orchestrator, learningSync);

  // Show status bar item
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = '$(brain) Dimag';
  statusBar.command = 'dimag.showDashboard';
  statusBar.tooltip = 'Dimag: AI CTO Orchestrator';
  statusBar.show();
  context.subscriptions.push(statusBar);

  console.log('✅ Dimag activated successfully!');

  // Show welcome message
  vscode.window.showInformationMessage(
    '🧠 Dimag activated! Use Cmd+Shift+P → "Dimag" to get started.',
    'Show Dashboard'
  ).then(selection => {
    if (selection === 'Show Dashboard') {
      vscode.commands.executeCommand('dimag.showDashboard');
    }
  });
}

/**
 * Check if user consented to learning mode
 */
async function checkLearningConsent(context: vscode.ExtensionContext): Promise<void> {
  const consented = context.globalState.get('learningConsented');

  if (consented !== undefined) {
    return; // Already asked
  }

  const choice = await vscode.window.showInformationMessage(
    `🧠 **Dimag learns from your usage to get smarter for everyone.**\n\n` +
    `✅ What we collect:\n` +
    `• Decision patterns (e.g., "Use X for Y scenario")\n` +
    `• Tech stack combinations\n` +
    `• Validation rules\n\n` +
    `❌ What we NEVER collect:\n` +
    `• Your actual code\n` +
    `• File paths or names\n` +
    `• API keys or secrets\n` +
    `• Personal information\n\n` +
    `All learnings are anonymized, reviewable, and open source.\n\n` +
    `Help improve Dimag for everyone?`,
    { modal: true },
    'Enable Learning',
    'Disable Learning',
    'Learn More'
  );

  if (choice === 'Learn More') {
    vscode.env.openExternal(
      vscode.Uri.parse('https://github.com/digitalangle/dimag-brain#privacy--transparency')
    );
    return checkLearningConsent(context); // Ask again
  }

  const enabled = choice === 'Enable Learning';
  await context.globalState.update('learningConsented', enabled);

  const config = vscode.workspace.getConfiguration('dimag');
  await config.update('learning.enabled', enabled, true);

  if (enabled) {
    vscode.window.showInformationMessage(
      '✅ Learning enabled! Thank you for helping improve Dimag.'
    );
  } else {
    vscode.window.showInformationMessage(
      'Learning disabled. You can enable it anytime in settings.'
    );
  }
}

/**
 * Register all extension commands
 */
function registerCommands(
  context: vscode.ExtensionContext,
  orchestrator: DimagOrchestrator,
  learningSync: LearningSync
): void {

  // Main analysis command
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.analyzeProject', async () => {
      await orchestrator.analyzeAndImprove();
    })
  );

  // Create project command
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.createProject', async () => {
      const description = await vscode.window.showInputBox({
        prompt: 'Describe the project you want to create',
        placeHolder: 'e.g., A messaging app like Signal with end-to-end encryption'
      });

      if (description) {
        await orchestrator.createProject(description);
      }
    })
  );

  // Activate autonomous mode
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.activate', async () => {
      vscode.window.showInformationMessage(
        '🧠 Dimag autonomous mode is always active! Just use the commands.'
      );
    })
  );

  // Review learnings command
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.reviewLearnings', async () => {
      // TODO: Implement review panel
      vscode.window.showInformationMessage('Review learnings coming soon!');
    })
  );

  // Show dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.showDashboard', async () => {
      const dashboard = new LearningDashboard(context);
      await dashboard.show();
    })
  );

  // Manual sync command
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.syncLearnings', async () => {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "🧠 Syncing learnings from community...",
        cancellable: false
      }, async () => {
        const result = await learningSync.forceSync();

        if (result.updated) {
          vscode.window.showInformationMessage(
            `🧠 Synced ${result.newPatterns} new patterns!`
          );
        } else {
          vscode.window.showInformationMessage(
            '🧠 Already up to date!'
          );
        }
      });
    })
  );

  // Commit learnings command (called by learning system)
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.commitLearnings', async () => {
      // This is triggered by LearningCapture when patterns are extracted
      const { GitCommitter } = await import('./learning/git-committer');
      const committer = new GitCommitter(context);
      await committer.initialize();

      const extractedPatterns = context.globalState.get<any[]>('extractedPatterns');

      if (!extractedPatterns || extractedPatterns.length === 0) {
        return;
      }

      const result = await committer.commitPatterns(extractedPatterns);

      if (result.success) {
        vscode.window.showInformationMessage(
          `✅ Committed ${extractedPatterns.length} patterns via ${result.authMethod}`
        );
        // Clear extracted patterns
        await context.globalState.update('extractedPatterns', undefined);
      } else {
        vscode.window.showErrorMessage(
          `Failed to commit learnings: ${result.error}`
        );
      }
    })
  );

  // Reload patterns command (called after sync)
  context.subscriptions.push(
    vscode.commands.registerCommand('dimag.reloadPatterns', async () => {
      // This is triggered by LearningSync after successful sync
      // PatternMatcher will reload patterns automatically on next use
      console.log('🧠 Patterns reloaded from Git repository');
    })
  );
}

export function deactivate() {
  console.log('🧠 Dimag deactivated');
}
