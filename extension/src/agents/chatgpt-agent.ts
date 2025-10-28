/**
 * ChatGPT Agent
 * Stub implementation - will use vscode.lm API
 */

import * as vscode from 'vscode';

export class ChatGPTAgent {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async reviewCode(audit: any): Promise<any> {
    // TODO: Implement ChatGPT code review
    return {
      issues: [],
      recommendations: []
    };
  }
}
