/**
 * Learning Capture System
 * Captures user decisions for learning
 */

import * as vscode from 'vscode';

export interface LearningEvent {
  type: 'DECISION' | 'CORRECTION' | 'APPROVAL' | 'REJECTION';
  timestamp: string;
  context: any;
  aiAction: any;
  userAction: any;
  outcome?: any;
}

export class LearningCapture {
  private context: vscode.ExtensionContext;
  private queue: LearningEvent[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async captureDecision(event: LearningEvent): Promise<void> {
    this.queue.push(event);
    await this.context.globalState.update('learningQueue', this.queue);

    // Check if should commit
    if (this.queue.length >= 10) {
      // TODO: Trigger commit
    }
  }

  async captureApproval(suggestion: any, outcome: any): Promise<void> {
    await this.captureDecision({
      type: 'APPROVAL',
      timestamp: new Date().toISOString(),
      context: {},
      aiAction: { suggestion },
      userAction: { type: 'APPROVED' },
      outcome
    });
  }
}
