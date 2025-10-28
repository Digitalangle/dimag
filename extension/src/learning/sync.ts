/**
 * Learning Sync System
 * Syncs learnings from Git repository using simple-git
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';

export interface SyncResult {
  updated: boolean;
  newPatterns?: number;
  errors?: string[];
}

export class LearningSync {
  private context: vscode.ExtensionContext;
  private git: SimpleGit | null = null;
  private repoPath: string;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private readonly REPO_URL = 'https://github.com/Digitalangle/dimag.git';
  private readonly AUTO_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.repoPath = path.join(context.globalStorageUri.fsPath, 'dimag');
  }

  /**
   * Initialize the learning sync system
   * Clones the repository if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure global storage directory exists
      await this.ensureDirectory(this.context.globalStorageUri.fsPath);

      // Check if repo already exists
      if (await this.repoExists()) {
        console.log('Dimag brain repository already exists, pulling latest...');
        await this.sync();
      } else {
        console.log('Cloning Dimag brain repository...');
        await this.cloneRepo();
      }

      this.git = simpleGit(this.repoPath);
    } catch (error) {
      console.error('Failed to initialize learning sync:', error);
      vscode.window.showWarningMessage(
        'Could not initialize Dimag learning sync. Learning from community patterns disabled.'
      );
    }
  }

  /**
   * Check if the repository exists locally
   */
  private async repoExists(): Promise<boolean> {
    try {
      await fs.promises.access(path.join(this.repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clone the dimag-brain repository
   */
  private async cloneRepo(): Promise<void> {
    try {
      await simpleGit().clone(this.REPO_URL, this.repoPath, {
        '--depth': 1 // Shallow clone for performance
      });

      vscode.window.showInformationMessage(
        '🧠 Dimag brain synchronized! You now have access to community patterns.'
      );
    } catch (error: any) {
      // If repo doesn't exist yet (user hasn't created it), that's okay
      if (error.message?.includes('not found') || error.message?.includes('repository')) {
        console.log('dimag-brain repository not found yet - this is expected for first-time setup');
        // Create empty directory structure
        await this.createEmptyStructure();
      } else {
        throw error;
      }
    }
  }

  /**
   * Create empty repository structure for first-time setup
   */
  private async createEmptyStructure(): Promise<void> {
    await this.ensureDirectory(this.repoPath);
    await this.ensureDirectory(path.join(this.repoPath, 'learnings'));
    await this.ensureDirectory(path.join(this.repoPath, 'learnings', 'patterns'));
    await this.ensureDirectory(path.join(this.repoPath, 'learnings', 'anti-patterns'));
    await this.ensureDirectory(path.join(this.repoPath, 'learnings', 'rules'));
    await this.ensureDirectory(path.join(this.repoPath, 'learnings', 'statistics'));

    // Create empty patterns file
    const emptyPatterns = {
      patterns: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalPatterns: 0,
        version: '1.0.0'
      }
    };

    await fs.promises.writeFile(
      path.join(this.repoPath, 'learnings', 'patterns', 'architectural-decisions.json'),
      JSON.stringify(emptyPatterns, null, 2)
    );
  }

  /**
   * Sync patterns from Git repository
   */
  async sync(): Promise<SyncResult> {
    if (!this.git) {
      return { updated: false, errors: ['Git not initialized'] };
    }

    try {
      // Get current HEAD
      const beforeSync = await this.git.revparse(['HEAD']);

      // Pull latest changes
      await this.git.pull('origin', 'main', {
        '--rebase': 'false',
        '--ff-only': null
      });

      // Get new HEAD
      const afterSync = await this.git.revparse(['HEAD']);

      const updated = beforeSync !== afterSync;

      if (updated) {
        // Count new patterns
        const newPatterns = await this.countPatterns();

        vscode.window.showInformationMessage(
          `🧠 Dimag synced! ${newPatterns} patterns available.`
        );

        // Trigger pattern reload
        await vscode.commands.executeCommand('dimag.reloadPatterns');

        return { updated: true, newPatterns };
      }

      return { updated: false };
    } catch (error: any) {
      console.error('Sync error:', error);

      // Handle common errors gracefully
      if (error.message?.includes('not found') || error.message?.includes('repository')) {
        // Repo doesn't exist yet, silently skip
        return { updated: false, errors: ['Repository not created yet'] };
      }

      return {
        updated: false,
        errors: [error.message || 'Unknown error']
      };
    }
  }

  /**
   * Count total patterns in repository
   */
  private async countPatterns(): Promise<number> {
    try {
      const patternsPath = path.join(this.repoPath, 'learnings', 'patterns', 'architectural-decisions.json');
      const content = await fs.promises.readFile(patternsPath, 'utf-8');
      const data = JSON.parse(content);
      return data.patterns?.length || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Start automatic sync timer
   */
  startAutoSync(): void {
    const autoSyncEnabled = vscode.workspace
      .getConfiguration('dimag')
      .get('learning.autoSync', true);

    if (!autoSyncEnabled) {
      return;
    }

    // Clear existing interval
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    // Set up new interval
    this.autoSyncInterval = setInterval(async () => {
      console.log('Auto-syncing Dimag brain...');
      await this.sync();
    }, this.AUTO_SYNC_INTERVAL);

    console.log(`Dimag auto-sync enabled (every ${this.AUTO_SYNC_INTERVAL / 1000 / 60} minutes)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Get path to patterns directory
   */
  getPatternsPath(): string {
    return path.join(this.repoPath, 'learnings', 'patterns');
  }

  /**
   * Get path to specific pattern file
   */
  getPatternFilePath(filename: string): string {
    return path.join(this.getPatternsPath(), filename);
  }

  /**
   * Load all patterns from repository
   */
  async loadAllPatterns(): Promise<any[]> {
    try {
      const patternsPath = this.getPatternFilePath('architectural-decisions.json');
      const content = await fs.promises.readFile(patternsPath, 'utf-8');
      const data = JSON.parse(content);
      return data.patterns || [];
    } catch (error) {
      console.error('Failed to load patterns:', error);
      return [];
    }
  }

  /**
   * Load patterns by category
   */
  async loadPatternsByCategory(category: string): Promise<any[]> {
    const allPatterns = await this.loadAllPatterns();
    return allPatterns.filter((p: any) => p.category === category);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    lastSync: string | null;
    totalPatterns: number;
    repoPath: string;
  }> {
    const lastSync = this.context.globalState.get<string>('lastSyncTime') || null;
    const totalPatterns = await this.countPatterns();

    return {
      lastSync,
      totalPatterns,
      repoPath: this.repoPath
    };
  }

  /**
   * Force manual sync
   */
  async forceSync(): Promise<SyncResult> {
    vscode.window.showInformationMessage('🔄 Syncing Dimag brain...');
    const result = await this.sync();

    if (result.updated) {
      await this.context.globalState.update('lastSyncTime', new Date().toISOString());
    }

    return result;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoSync();
  }
}
