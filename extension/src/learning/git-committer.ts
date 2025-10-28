/**
 * Git Committer
 * Handles committing learned patterns to dimag-brain repository
 * Uses hybrid authentication: VS Code Git (primary) + Backend API (fallback)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { ExtractedPattern } from './capture';

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
  authMethod?: 'vscode-git' | 'backend-api' | 'failed';
}

export class GitCommitter {
  private context: vscode.ExtensionContext;
  private repoPath: string;
  private git: SimpleGit | null = null;
  private readonly BACKEND_API_URL = 'https://api.dimag.dev/commit'; // TODO: Set up backend

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.repoPath = path.join(context.globalStorageUri.fsPath, 'dimag-brain');
  }

  /**
   * Initialize Git committer
   */
  async initialize(): Promise<void> {
    // Ensure repo exists
    try {
      await fs.promises.access(path.join(this.repoPath, '.git'));
      this.git = simpleGit(this.repoPath);
    } catch {
      console.warn('dimag-brain repo not found. Learning commits disabled until repo is cloned.');
    }
  }

  /**
   * Commit extracted patterns to repository
   */
  async commitPatterns(patterns: ExtractedPattern[]): Promise<CommitResult> {
    if (!this.git) {
      return {
        success: false,
        error: 'Git not initialized. Please sync with dimag-brain repository first.',
        authMethod: 'failed'
      };
    }

    try {
      // Try VS Code Git authentication first
      const vscodeResult = await this.commitWithVSCodeGit(patterns);

      if (vscodeResult.success) {
        return vscodeResult;
      }

      // Fallback to backend API
      console.log('VS Code Git failed, trying backend API...');
      const backendResult = await this.commitWithBackendAPI(patterns);

      return backendResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error during commit',
        authMethod: 'failed'
      };
    }
  }

  /**
   * Commit using VS Code's Git credentials (primary method)
   */
  private async commitWithVSCodeGit(patterns: ExtractedPattern[]): Promise<CommitResult> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized', authMethod: 'failed' };
    }

    try {
      // Update pattern files
      await this.updatePatternFiles(patterns);

      // Configure git user (use VS Code settings or defaults)
      const gitConfig = vscode.workspace.getConfiguration('git');
      const userName = gitConfig.get<string>('user.name') || 'Dimag User';
      const userEmail = gitConfig.get<string>('user.email') || 'dimag-user@example.com';

      await this.git.addConfig('user.name', userName);
      await this.git.addConfig('user.email', userEmail);

      // Stage changes
      await this.git.add('.');

      // Check if there are changes to commit
      const status = await this.git.status();

      if (status.files.length === 0) {
        return {
          success: false,
          error: 'No changes to commit',
          authMethod: 'vscode-git'
        };
      }

      // Commit
      const commitMessage = this.generateCommitMessage(patterns);
      const commitResult = await this.git.commit(commitMessage);

      // Try to push
      try {
        await this.git.push('origin', 'main');

        return {
          success: true,
          commitHash: commitResult.commit,
          authMethod: 'vscode-git'
        };
      } catch (pushError: any) {
        // Push failed - might be auth issue
        console.error('Push failed with VS Code Git:', pushError);

        return {
          success: false,
          error: `Commit succeeded but push failed: ${pushError.message}`,
          authMethod: 'vscode-git'
        };
      }
    } catch (error: any) {
      console.error('VS Code Git commit failed:', error);

      return {
        success: false,
        error: error.message,
        authMethod: 'vscode-git'
      };
    }
  }

  /**
   * Commit using backend API (fallback method)
   */
  private async commitWithBackendAPI(patterns: ExtractedPattern[]): Promise<CommitResult> {
    try {
      // Get or create API token
      const apiToken = await this.getOrCreateAPIToken();

      if (!apiToken) {
        return {
          success: false,
          error: 'No API token available. Please sign in to Dimag.',
          authMethod: 'backend-api'
        };
      }

      // Send patterns to backend
      const response = await fetch(this.BACKEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          patterns,
          source: 'vscode-extension',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      const result = await response.json() as { commitHash: string };

      return {
        success: true,
        commitHash: result.commitHash,
        authMethod: 'backend-api'
      };
    } catch (error: any) {
      console.error('Backend API commit failed:', error);

      return {
        success: false,
        error: error.message,
        authMethod: 'backend-api'
      };
    }
  }

  /**
   * Update pattern files with new patterns
   */
  private async updatePatternFiles(patterns: ExtractedPattern[]): Promise<void> {
    const patternsFilePath = path.join(
      this.repoPath,
      'learnings',
      'patterns',
      'architectural-decisions.json'
    );

    // Read existing patterns
    let existingData: any = {
      patterns: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalPatterns: 0,
        version: '1.0.0'
      }
    };

    try {
      const content = await fs.promises.readFile(patternsFilePath, 'utf-8');
      existingData = JSON.parse(content);
    } catch {
      // File doesn't exist yet, use defaults
    }

    // Add new patterns (avoid duplicates)
    const existingIds = new Set(existingData.patterns.map((p: any) => p.id));

    for (const pattern of patterns) {
      if (!existingIds.has(pattern.id)) {
        existingData.patterns.push(pattern);
      }
    }

    // Update metadata
    existingData.metadata.lastUpdated = new Date().toISOString();
    existingData.metadata.totalPatterns = existingData.patterns.length;

    // Write back
    await fs.promises.writeFile(
      patternsFilePath,
      JSON.stringify(existingData, null, 2)
    );

    // Update statistics
    await this.updateStatistics(patterns);
  }

  /**
   * Update learning statistics
   */
  private async updateStatistics(patterns: ExtractedPattern[]): Promise<void> {
    const statsFilePath = path.join(
      this.repoPath,
      'learnings',
      'statistics',
      'learning-metrics.json'
    );

    let stats: any = {
      totalPatterns: 0,
      totalContributors: 0,
      totalLearningEvents: 0,
      categories: {},
      growth: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      const content = await fs.promises.readFile(statsFilePath, 'utf-8');
      stats = JSON.parse(content);
    } catch {
      // File doesn't exist yet, use defaults
    }

    // Update statistics
    stats.totalPatterns += patterns.length;
    stats.totalLearningEvents += patterns.reduce((sum, p) => sum + (p.metadata.usageCount || 1), 0);

    for (const pattern of patterns) {
      const category = pattern.category || 'unknown';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }

    // Add growth entry
    stats.growth.push({
      date: new Date().toISOString().split('T')[0],
      patternsAdded: patterns.length
    });

    // Keep only last 90 days of growth data
    if (stats.growth.length > 90) {
      stats.growth = stats.growth.slice(-90);
    }

    stats.lastUpdated = new Date().toISOString();

    // Write back
    await fs.promises.writeFile(
      statsFilePath,
      JSON.stringify(stats, null, 2)
    );
  }

  /**
   * Generate commit message
   */
  private generateCommitMessage(patterns: ExtractedPattern[]): string {
    const categoryCounts = patterns.reduce((acc, p) => {
      const cat = p.category || 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStr = Object.entries(categoryCounts)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    return `🧠 Learn: ${patterns.length} new patterns (${categoryStr})

Automatically learned from community usage via Dimag VS Code Extension.

Generated by: Dimag Learning System
Timestamp: ${new Date().toISOString()}`;
  }

  /**
   * Get or create API token for backend fallback
   */
  private async getOrCreateAPIToken(): Promise<string | null> {
    // Check if token exists
    let token = await this.context.secrets.get('dimag.apiToken');

    if (token) {
      return token;
    }

    // Prompt user to sign in
    const choice = await vscode.window.showInformationMessage(
      'Dimag needs to authenticate to commit learnings. Sign in with GitHub?',
      'Sign In',
      'Cancel'
    );

    if (choice !== 'Sign In') {
      return null;
    }

    // TODO: Implement OAuth flow with backend
    // For now, show manual token input
    const manualToken = await vscode.window.showInputBox({
      prompt: 'Enter your Dimag API token (get from dimag.dev/settings)',
      password: true,
      ignoreFocusOut: true
    });

    if (manualToken) {
      await this.context.secrets.store('dimag.apiToken', manualToken);
      return manualToken;
    }

    return null;
  }

  /**
   * Check if can commit (has Git access or API token)
   */
  async canCommit(): Promise<{
    canCommit: boolean;
    method: string;
    message: string;
  }> {
    // Check VS Code Git
    if (this.git) {
      try {
        const status = await this.git.status();
        return {
          canCommit: true,
          method: 'vscode-git',
          message: 'Using VS Code Git credentials'
        };
      } catch {
        // Git exists but no remote access
      }
    }

    // Check backend API token
    const token = await this.context.secrets.get('dimag.apiToken');

    if (token) {
      return {
        canCommit: true,
        method: 'backend-api',
        message: 'Using Dimag API token'
      };
    }

    return {
      canCommit: false,
      method: 'none',
      message: 'No authentication method available. Please sign in or configure Git.'
    };
  }
}
