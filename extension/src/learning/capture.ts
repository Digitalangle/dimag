/**
 * Learning Capture System
 * Captures user decisions, extracts patterns, and queues for Git commit
 */

import * as vscode from 'vscode';

export interface LearningEvent {
  type: 'DECISION' | 'CORRECTION' | 'APPROVAL' | 'REJECTION';
  timestamp: string;
  context: {
    projectType?: string;
    technologies?: string[];
    problemType?: string;
    fileTypes?: string[];
    errorType?: string;
    [key: string]: any;
  };
  aiAction: {
    type: string;
    suggestion: string;
    confidence: number;
    approach?: string;
    reasoning?: string;
  };
  userAction: {
    type: 'APPROVED' | 'REJECTED' | 'MODIFIED';
    modification?: string;
  };
  outcome?: {
    success: boolean;
    metrics?: any;
  };
}

export interface ExtractedPattern {
  id: string;
  category: string;
  pattern: {
    context: any;
    solution: any;
    confidence: number;
  };
  metadata: {
    createdAt: string;
    usageCount: number;
    successRate: number;
  };
}

export class LearningCapture {
  private context: vscode.ExtensionContext;
  private queue: LearningEvent[] = [];
  private readonly COMMIT_THRESHOLD = 10;
  private readonly STORAGE_KEY = 'learningQueue';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadQueue();
  }

  /**
   * Load existing queue from storage
   */
  private async loadQueue(): Promise<void> {
    const stored = this.context.globalState.get<LearningEvent[]>(this.STORAGE_KEY);
    if (stored) {
      this.queue = stored;
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    await this.context.globalState.update(this.STORAGE_KEY, this.queue);
  }

  /**
   * Capture a learning event
   */
  async captureDecision(event: LearningEvent): Promise<void> {
    // Check if learning is enabled
    const learningEnabled = vscode.workspace
      .getConfiguration('dimag')
      .get('learning.enabled', true);

    if (!learningEnabled) {
      return;
    }

    // Add to queue
    this.queue.push(event);
    await this.saveQueue();

    // Check if we should trigger commit
    if (this.shouldCommit()) {
      await this.triggerCommit();
    }
  }

  /**
   * Capture an approval event (convenience method)
   */
  async captureApproval(
    suggestion: string,
    context: LearningEvent['context'],
    outcome: LearningEvent['outcome']
  ): Promise<void> {
    await this.captureDecision({
      type: 'APPROVAL',
      timestamp: new Date().toISOString(),
      context,
      aiAction: {
        type: 'SUGGESTION',
        suggestion,
        confidence: 0.8
      },
      userAction: { type: 'APPROVED' },
      outcome
    });
  }

  /**
   * Capture a correction event (user modified AI suggestion)
   */
  async captureCorrection(
    originalSuggestion: string,
    userModification: string,
    context: LearningEvent['context']
  ): Promise<void> {
    await this.captureDecision({
      type: 'CORRECTION',
      timestamp: new Date().toISOString(),
      context,
      aiAction: {
        type: 'SUGGESTION',
        suggestion: originalSuggestion,
        confidence: 0.7
      },
      userAction: {
        type: 'MODIFIED',
        modification: userModification
      }
    });
  }

  /**
   * Capture a rejection event
   */
  async captureRejection(
    suggestion: string,
    context: LearningEvent['context'],
    reason?: string
  ): Promise<void> {
    await this.captureDecision({
      type: 'REJECTION',
      timestamp: new Date().toISOString(),
      context,
      aiAction: {
        type: 'SUGGESTION',
        suggestion,
        confidence: 0.6
      },
      userAction: { type: 'REJECTED' },
      outcome: {
        success: false,
        metrics: { rejectionReason: reason }
      }
    });
  }

  /**
   * Check if we should trigger a commit
   */
  private shouldCommit(): boolean {
    return this.queue.length >= this.COMMIT_THRESHOLD;
  }

  /**
   * Extract patterns from queued events
   */
  extractPatterns(): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Group events by context similarity
    const groups = this.groupSimilarEvents(this.queue);

    for (const group of groups) {
      // Only create pattern if we have multiple successful events
      const approvals = group.filter(e => e.userAction.type === 'APPROVED');
      if (approvals.length < 2) continue;

      const pattern = this.createPattern(group);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Group similar events together
   */
  private groupSimilarEvents(events: LearningEvent[]): LearningEvent[][] {
    const groups: LearningEvent[][] = [];

    for (const event of events) {
      // Find matching group
      let matchedGroup = groups.find(group =>
        this.isSimilarContext(group[0].context, event.context)
      );

      if (matchedGroup) {
        matchedGroup.push(event);
      } else {
        groups.push([event]);
      }
    }

    return groups;
  }

  /**
   * Check if two contexts are similar
   */
  private isSimilarContext(ctx1: any, ctx2: any): boolean {
    // Same project type
    if (ctx1.projectType && ctx2.projectType && ctx1.projectType === ctx2.projectType) {
      return true;
    }

    // Similar technologies (at least 50% overlap)
    if (ctx1.technologies && ctx2.technologies) {
      const tech1 = new Set(ctx1.technologies);
      const tech2 = new Set(ctx2.technologies);
      const intersection = [...tech1].filter(t => tech2.has(t));
      const union = new Set([...tech1, ...tech2]);

      if (intersection.length / union.size >= 0.5) {
        return true;
      }
    }

    // Same problem type
    if (ctx1.problemType && ctx2.problemType && ctx1.problemType === ctx2.problemType) {
      return true;
    }

    return false;
  }

  /**
   * Create a pattern from a group of similar events
   */
  private createPattern(group: LearningEvent[]): ExtractedPattern | null {
    const approvals = group.filter(e => e.userAction.type === 'APPROVED');
    if (approvals.length === 0) return null;

    // Calculate success rate
    const successCount = group.filter(e =>
      e.outcome?.success !== false && e.userAction.type === 'APPROVED'
    ).length;
    const successRate = successCount / group.length;

    // Extract common context
    const commonContext = this.extractCommonContext(group.map(e => e.context));

    // Extract common solution
    const commonSolution = this.extractCommonSolution(approvals.map(e => e.aiAction));

    return {
      id: this.generatePatternId(commonContext),
      category: this.categorizePattern(commonContext),
      pattern: {
        context: commonContext,
        solution: commonSolution,
        confidence: successRate
      },
      metadata: {
        createdAt: new Date().toISOString(),
        usageCount: group.length,
        successRate
      }
    };
  }

  /**
   * Extract common elements from multiple contexts
   */
  private extractCommonContext(contexts: any[]): any {
    const common: any = {};

    // Find common project type
    const projectTypes = contexts.map(c => c.projectType).filter(Boolean);
    if (projectTypes.length > 0 && projectTypes.every(t => t === projectTypes[0])) {
      common.projectType = projectTypes[0];
    }

    // Find common technologies
    const allTechs = contexts.flatMap(c => c.technologies || []);
    const techCounts = allTechs.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    common.technologies = Object.entries(techCounts)
      .filter(([_, count]) => (count as number) >= contexts.length * 0.5)
      .map(([tech, _]) => tech);

    // Find common problem type
    const problemTypes = contexts.map(c => c.problemType).filter(Boolean);
    if (problemTypes.length > 0 && problemTypes.every(t => t === problemTypes[0])) {
      common.problemType = problemTypes[0];
    }

    return common;
  }

  /**
   * Extract common solution from multiple AI actions
   */
  private extractCommonSolution(actions: LearningEvent['aiAction'][]): any {
    // Find the most common approach
    const approaches = actions.map(a => a.approach).filter(Boolean);
    const approachCounts = approaches.reduce((acc, a) => {
      acc[a as string] = (acc[a as string] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonApproach = Object.entries(approachCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      approach: mostCommonApproach,
      averageConfidence: actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length,
      suggestions: actions.map(a => a.suggestion)
    };
  }

  /**
   * Generate a unique pattern ID
   */
  private generatePatternId(context: any): string {
    const parts = [
      context.projectType || 'unknown',
      context.problemType || 'unknown',
      (context.technologies || []).sort().join('-')
    ];

    const base = parts.join('_').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const timestamp = Date.now().toString(36);

    return `${base}_${timestamp}`;
  }

  /**
   * Categorize a pattern
   */
  private categorizePattern(context: any): string {
    if (context.problemType?.includes('deployment')) return 'deployment';
    if (context.problemType?.includes('error')) return 'debugging';
    if (context.problemType?.includes('architecture')) return 'architectural';
    if (context.problemType?.includes('performance')) return 'performance';
    if (context.technologies) return 'techStack';
    return 'general';
  }

  /**
   * Trigger commit process
   */
  private async triggerCommit(): Promise<void> {
    const autoCommit = vscode.workspace
      .getConfiguration('dimag')
      .get('learning.autoCommit', true);

    if (!autoCommit) {
      // Ask user permission
      const choice = await vscode.window.showInformationMessage(
        `Dimag has learned ${this.queue.length} new patterns. Commit to improve for everyone?`,
        'Yes, Commit',
        'Not Now'
      );

      if (choice !== 'Yes, Commit') {
        return;
      }
    }

    // Extract patterns
    const patterns = this.extractPatterns();

    if (patterns.length === 0) {
      vscode.window.showInformationMessage(
        'No significant patterns found yet. Keep using Dimag!'
      );
      return;
    }

    // Notify about commit (GitCommitter will handle the actual commit)
    vscode.window.showInformationMessage(
      `🧠 Dimag extracted ${patterns.length} new patterns. Committing to improve for everyone...`
    );

    // Store extracted patterns for GitCommitter to pick up
    await this.context.globalState.update('extractedPatterns', patterns);

    // Clear queue
    this.queue = [];
    await this.saveQueue();

    // Trigger Git commit command
    await vscode.commands.executeCommand('dimag.commitLearnings');
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue (for testing)
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }
}
