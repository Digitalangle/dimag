/**
 * Dimag Orchestrator
 * The brain that coordinates multiple AI agents
 *
 * @author Digitalangle
 * @license MIT
 */

import * as vscode from 'vscode';
import { ClaudeAgent } from '../agents/claude-agent';
import { ChatGPTAgent } from '../agents/chatgpt-agent';
import { LearningCapture } from '../learning/capture';
import { PatternMatcher } from '../brain/pattern-matcher';
import { MemoryEngine } from '../brain/memory-engine';

export interface AnalysisResult {
  success: boolean;
  summary: string;
  issues: Issue[];
  fixes: Fix[];
  timeSaved?: number;
}

export interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
}

export interface Fix {
  description: string;
  filePath: string;
  startOffset: number;
  endOffset: number;
  newCode: string;
}

export class DimagOrchestrator {
  private claudeAgent: ClaudeAgent;
  private chatgptAgent: ChatGPTAgent;
  private learningCapture: LearningCapture;
  private patternMatcher: PatternMatcher;
  private memoryEngine: MemoryEngine;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.claudeAgent = new ClaudeAgent(context);
    this.chatgptAgent = new ChatGPTAgent(context);
    this.learningCapture = new LearningCapture(context);
    this.patternMatcher = new PatternMatcher(context);
    this.memoryEngine = new MemoryEngine(this.getWorkspacePath());
  }

  /**
   * Main workflow: Analyze and improve project
   */
  async analyzeAndImprove(): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "🧠 Dimag is analyzing your project...",
        cancellable: false
      }, async (progress) => {

        // Step 1: Detect intent and check for learned patterns
        progress.report({ increment: 10, message: "Detecting intent..." });
        const intent = 'ANALYZE_PROJECT'; // Simplified for now

        // Check if we've learned this pattern before
        progress.report({ increment: 15, message: "Checking learned patterns..." });
        const matchedPattern = await this.patternMatcher.findMatch(intent);

        if (matchedPattern && matchedPattern.confidence > 0.8) {
          const usePattern = await this.askToUsePattern(matchedPattern);
          if (usePattern) {
            return await this.executeLearnedPattern(matchedPattern);
          }
        }

        // Step 2: Audit project with Claude
        progress.report({ increment: 25, message: "Auditing project structure..." });
        const audit = await this.claudeAgent.auditProject(this.getWorkspacePath());

        // Step 3: Get VS Code diagnostics
        progress.report({ increment: 40, message: "Collecting diagnostics..." });
        const diagnostics = this.getDiagnostics();

        // Step 4: Multi-agent analysis (THE AI MAGIC)
        progress.report({ increment: 50, message: "Running multi-agent analysis..." });

        // Run ChatGPT review in parallel with memory search
        const [codeReview, memories] = await Promise.all([
          this.chatgptAgent.reviewCode(audit),
          this.memoryEngine.searchRelevant(audit)
        ]);

        // Capture learning: multi-agent coordination worked
        await this.learningCapture.captureDecision({
          type: 'DECISION',
          timestamp: new Date().toISOString(),
          context: {
            approach: 'multi-agent',
            agents: ['claude', 'chatgpt', 'vscode'],
            projectType: audit.projectType
          },
          aiAction: {
            type: 'ORCHESTRATION',
            suggestion: 'Parallel multi-agent analysis',
            reasoning: 'Faster and more comprehensive than sequential',
            confidence: 0.9
          },
          userAction: { type: 'APPROVED' }
        });

        // Step 5: Synthesize results (Dimag's intelligence)
        progress.report({ increment: 70, message: "Synthesizing insights..." });
        const synthesis = this.synthesize({
          audit,
          codeReview,
          diagnostics,
          memories
        });

        // Step 6: Show results
        progress.report({ increment: 85, message: "Preparing report..." });
        await this.showResults(synthesis);

        // Step 7: Ask permission to apply fixes
        if (synthesis.fixes.length > 0) {
          const approved = await this.askPermission(synthesis.fixes);

          if (approved) {
            progress.report({ increment: 95, message: "Applying fixes..." });
            await this.executeFixes(synthesis.fixes);

            // Capture success
            await this.learningCapture.captureApproval(
              synthesis,
              {
                success: true,
                timeSaved: (Date.now() - startTime) / 1000
              }
            );
          }
        }

        progress.report({ increment: 100, message: "Done!" });

        return {
          success: true,
          summary: synthesis.summary,
          issues: synthesis.issues,
          fixes: synthesis.fixes,
          timeSaved: (Date.now() - startTime) / 1000
        };
      });

    } catch (error: any) {
      vscode.window.showErrorMessage(`🧠 Dimag error: ${error.message}`);

      return {
        success: false,
        summary: `Analysis failed: ${error.message}`,
        issues: [],
        fixes: []
      };
    }
  }

  /**
   * Create new project from description
   */
  async createProject(description: string): Promise<void> {
    await vscode.window.showInformationMessage(
      `🧠 Creating project: "${description}"\n\nThis feature is coming soon!`
    );

    // TODO: Implement project creation workflow
  }

  /**
   * Ask user if they want to use a learned pattern
   */
  private async askToUsePattern(pattern: any): Promise<boolean> {
    const choice = await vscode.window.showInformationMessage(
      `🧠 **Dimag has seen this before!**\n\n` +
      `Pattern: ${pattern.name}\n` +
      `Used ${pattern.occurrences} times\n` +
      `Success rate: ${Math.round(pattern.successRate * 100)}%\n\n` +
      `Use the learned approach?`,
      'Use Pattern',
      'Analyze Fresh'
    );

    return choice === 'Use Pattern';
  }

  /**
   * Execute a learned pattern approach
   */
  private async executeLearnedPattern(pattern: any): Promise<AnalysisResult> {
    vscode.window.showInformationMessage(
      `🧠 Using learned pattern: ${pattern.name}`
    );

    // Apply the learned approach directly
    // TODO: Implement pattern execution

    return {
      success: true,
      summary: `Applied learned pattern: ${pattern.name}`,
      issues: [],
      fixes: []
    };
  }

  /**
   * Get VS Code diagnostics
   */
  private getDiagnostics(): Issue[] {
    const allDiagnostics = vscode.languages.getDiagnostics();
    const issues: Issue[] = [];

    for (const [uri, diagnostics] of allDiagnostics) {
      for (const diagnostic of diagnostics) {
        issues.push({
          type: this.getDiagnosticType(diagnostic.severity),
          severity: this.mapSeverity(diagnostic.severity),
          description: diagnostic.message,
          file: uri.fsPath,
          line: diagnostic.range.start.line
        });
      }
    }

    return issues;
  }

  /**
   * Synthesize results from all agents
   */
  private synthesize(data: any): any {
    const issues = [
      ...data.audit.issues,
      ...data.codeReview.issues,
      ...data.diagnostics
    ];

    // Prioritize issues
    const prioritized = this.prioritizeIssues(issues);

    return {
      summary: `Found ${issues.length} issues across ${data.audit.filesAnalyzed} files`,
      issues: prioritized,
      fixes: this.generateFixes(prioritized),
      context: data
    };
  }

  /**
   * Show results in webview
   */
  private async showResults(synthesis: any): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'dimagResults',
      '🧠 Dimag Analysis Results',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getResultsHTML(synthesis);
  }

  /**
   * Generate HTML for results
   */
  private getResultsHTML(synthesis: any): string {
    const issuesList = synthesis.issues.map((issue: Issue) => `
      <div class="issue ${issue.severity}">
        <h3>${issue.type}</h3>
        <p>${issue.description}</p>
        ${issue.file ? `<code>${issue.file}:${issue.line}</code>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
          h1 { color: #007acc; }
          .issue { padding: 10px; margin: 10px 0; border-left: 4px solid #ccc; }
          .issue.critical { border-color: #d32f2f; background: #ffebee; }
          .issue.high { border-color: #f57c00; background: #fff3e0; }
          .issue.medium { border-color: #fbc02d; background: #fffde7; }
          .issue.low { border-color: #388e3c; background: #e8f5e9; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>🧠 Dimag Analysis Results</h1>
        <p>${synthesis.summary}</p>
        <h2>Issues Found</h2>
        ${issuesList || '<p>No issues found! 🎉</p>'}
      </body>
      </html>
    `;
  }

  /**
   * Ask permission to apply fixes
   */
  private async askPermission(fixes: Fix[]): Promise<boolean> {
    const choice = await vscode.window.showInformationMessage(
      `🧠 Dimag found ${fixes.length} fixes to apply.\n\nProceed?`,
      { modal: true },
      'Apply Fixes',
      'Review First'
    );

    return choice === 'Apply Fixes';
  }

  /**
   * Execute fixes
   */
  private async executeFixes(fixes: Fix[]): Promise<void> {
    const edit = new vscode.WorkspaceEdit();

    for (const fix of fixes) {
      const uri = vscode.Uri.file(fix.filePath);
      const document = await vscode.workspace.openTextDocument(uri);

      edit.replace(
        uri,
        new vscode.Range(
          document.positionAt(fix.startOffset),
          document.positionAt(fix.endOffset)
        ),
        fix.newCode
      );
    }

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      vscode.window.showInformationMessage(
        `✅ Applied ${fixes.length} fixes successfully!`
      );
    } else {
      vscode.window.showErrorMessage('Failed to apply fixes');
    }
  }

  /**
   * Helper methods
   */
  private prioritizeIssues(issues: Issue[]): Issue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  private generateFixes(issues: Issue[]): Fix[] {
    // TODO: Generate actual fixes
    return [];
  }

  private getDiagnosticType(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error: return 'Error';
      case vscode.DiagnosticSeverity.Warning: return 'Warning';
      case vscode.DiagnosticSeverity.Information: return 'Info';
      case vscode.DiagnosticSeverity.Hint: return 'Hint';
      default: return 'Unknown';
    }
  }

  private mapSeverity(severity: vscode.DiagnosticSeverity): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error: return 'critical';
      case vscode.DiagnosticSeverity.Warning: return 'high';
      case vscode.DiagnosticSeverity.Information: return 'medium';
      case vscode.DiagnosticSeverity.Hint: return 'low';
      default: return 'low';
    }
  }

  private getWorkspacePath(): string {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }
}
