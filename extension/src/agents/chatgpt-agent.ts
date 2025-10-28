/**
 * ChatGPT Agent
 * Provides code review and quality analysis using VS Code Language Model API
 */

import * as vscode from 'vscode';

export interface CodeReviewResult {
  quality: {
    score: number; // 0-100
    summary: string;
  };
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    file?: string;
    line?: number;
    suggestion?: string;
  }>;
  recommendations: Array<{
    category: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>;
  bestPractices: string[];
  securityConcerns: string[];
}

export class ChatGPTAgent {
  private context: vscode.ExtensionContext;
  private model: vscode.LanguageModelChat | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get or select the language model
   */
  private async getModel(): Promise<vscode.LanguageModelChat> {
    if (!this.model) {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4'
      });

      if (models.length === 0) {
        throw new Error(
          'No AI models available. Please install GitHub Copilot or sign in.'
        );
      }

      this.model = models[0];
    }

    return this.model;
  }

  /**
   * Review code quality based on audit
   */
  async reviewCode(audit: any): Promise<CodeReviewResult> {
    try {
      const model = await this.getModel();

      // Get diagnostics from VS Code
      const diagnostics = vscode.languages.getDiagnostics();

      // Analyze key files
      const keyFiles = await this.getKeyFiles();

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `You are an expert code reviewer. Provide comprehensive code review.

**Project Audit:**
${JSON.stringify(audit, null, 2)}

**VS Code Diagnostics:**
${this.formatDiagnostics(diagnostics)}

**Key Files Analyzed:**
${keyFiles.map(f => `- ${f.path}`).join('\n')}

Provide your review in JSON format:
{
  "quality": {
    "score": <number 0-100>,
    "summary": "<overall quality assessment>"
  },
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "<issue category>",
      "description": "<issue description>",
      "file": "<file path if applicable>",
      "suggestion": "<how to fix>"
    }
  ],
  "recommendations": [
    {
      "category": "<recommendation category>",
      "description": "<detailed recommendation>",
      "impact": "high|medium|low",
      "effort": "high|medium|low"
    }
  ],
  "bestPractices": ["<practice 1>", "<practice 2>"],
  "securityConcerns": ["<concern 1>", "<concern 2>"]
}`
        )
      ];

      const response = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return this.parseReviewResponse(result);
    } catch (error: any) {
      console.error('ChatGPT code review failed:', error);

      // Return basic review from diagnostics
      return this.generateBasicReview(audit);
    }
  }

  /**
   * Review specific files for issues
   */
  async reviewFiles(files: string[]): Promise<CodeReviewResult> {
    try {
      const model = await this.getModel();

      const fileContents = await Promise.all(
        files.slice(0, 5).map(async (file) => {
          try {
            const uri = vscode.Uri.file(file);
            const content = await vscode.workspace.fs.readFile(uri);
            return {
              path: file,
              content: content.toString().slice(0, 5000) // Limit to 5000 chars
            };
          } catch {
            return null;
          }
        })
      );

      const validFiles = fileContents.filter(Boolean);

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `Review these files for code quality, security, and best practices:

${validFiles.map(f => `
**File: ${f!.path}**
\`\`\`
${f!.content}
\`\`\`
`).join('\n')}

Provide review in JSON format with issues, recommendations, best practices, and security concerns.`
        )
      ];

      const response = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return this.parseReviewResponse(result);
    } catch (error) {
      console.error('File review failed:', error);
      return this.generateBasicReview({});
    }
  }

  /**
   * Analyze code patterns and suggest improvements
   */
  async analyzePatterns(projectPath: string): Promise<{
    patterns: string[];
    antiPatterns: string[];
    suggestions: string[];
  }> {
    try {
      const model = await this.getModel();

      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        20
      );

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `Analyze code patterns in this project:

**Project:** ${projectPath}
**Files:** ${files.length}

Identify:
1. Good patterns being used
2. Anti-patterns to avoid
3. Improvement suggestions

Respond in JSON: {"patterns": [], "antiPatterns": [], "suggestions": []}`
        )
      ];

      const response = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return this.parsePatternResponse(result);
    } catch (error) {
      console.error('Pattern analysis failed:', error);
      return {
        patterns: [],
        antiPatterns: [],
        suggestions: []
      };
    }
  }

  /**
   * Format diagnostics for AI review
   */
  private formatDiagnostics(diagnostics: ReadonlyArray<[vscode.Uri, vscode.Diagnostic[]]>): string {
    if (diagnostics.length === 0) {
      return 'No diagnostics found';
    }

    const lines: string[] = [];

    for (const [uri, fileDiagnostics] of diagnostics.slice(0, 10)) {
      const errors = fileDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
      const warnings = fileDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);

      if (errors.length > 0 || warnings.length > 0) {
        lines.push(`${uri.fsPath}: ${errors.length} errors, ${warnings.length} warnings`);
      }
    }

    return lines.join('\n') || 'No significant issues';
  }

  /**
   * Get key files for review
   */
  private async getKeyFiles(): Promise<Array<{ path: string; importance: string }>> {
    const keyFiles: Array<{ path: string; importance: string }> = [];

    // Package.json
    const packageJsons = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);
    if (packageJsons.length > 0) {
      keyFiles.push({ path: packageJsons[0].fsPath, importance: 'high' });
    }

    // Config files
    const configs = await vscode.workspace.findFiles(
      '**/{tsconfig.json,next.config.js,vite.config.ts}',
      '**/node_modules/**',
      3
    );
    configs.forEach(uri => keyFiles.push({ path: uri.fsPath, importance: 'medium' }));

    // Main entry points
    const entries = await vscode.workspace.findFiles(
      '**/{index.ts,index.tsx,main.ts,app.ts,server.ts}',
      '**/node_modules/**',
      5
    );
    entries.forEach(uri => keyFiles.push({ path: uri.fsPath, importance: 'high' }));

    return keyFiles;
  }

  /**
   * Parse AI review response
   */
  private parseReviewResponse(response: string): CodeReviewResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          quality: parsed.quality || { score: 70, summary: 'No assessment' },
          issues: parsed.issues || [],
          recommendations: parsed.recommendations || [],
          bestPractices: parsed.bestPractices || [],
          securityConcerns: parsed.securityConcerns || []
        };
      }

      // Fallback: parse plain text
      return this.parsePlainTextReview(response);
    } catch (error) {
      console.error('Failed to parse review response:', error);
      return this.generateBasicReview({});
    }
  }

  /**
   * Parse plain text review
   */
  private parsePlainTextReview(text: string): CodeReviewResult {
    const issues: any[] = [];
    const recommendations: any[] = [];

    // Extract issues
    const issueRegex = /(?:issue|problem|error):\s*(.+)/gi;
    let match;

    while ((match = issueRegex.exec(text)) !== null) {
      issues.push({
        severity: 'medium',
        category: 'general',
        description: match[1].trim(),
        suggestion: ''
      });
    }

    // Extract recommendations
    const recRegex = /(?:recommend|suggest):\s*(.+)/gi;

    while ((match = recRegex.exec(text)) !== null) {
      recommendations.push({
        category: 'improvement',
        description: match[1].trim(),
        impact: 'medium',
        effort: 'medium'
      });
    }

    return {
      quality: { score: 70, summary: 'Analysis completed' },
      issues,
      recommendations,
      bestPractices: [],
      securityConcerns: []
    };
  }

  /**
   * Parse pattern analysis response
   */
  private parsePatternResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        patterns: [],
        antiPatterns: [],
        suggestions: []
      };
    } catch {
      return {
        patterns: [],
        antiPatterns: [],
        suggestions: []
      };
    }
  }

  /**
   * Generate basic review from diagnostics
   */
  private generateBasicReview(audit: any): CodeReviewResult {
    const diagnostics = vscode.languages.getDiagnostics();
    const issues: any[] = [];

    for (const [uri, fileDiagnostics] of diagnostics.slice(0, 10)) {
      for (const diag of fileDiagnostics.slice(0, 5)) {
        issues.push({
          severity: this.mapDiagnosticSeverity(diag.severity),
          category: 'diagnostic',
          description: diag.message,
          file: uri.fsPath,
          line: diag.range.start.line,
          suggestion: ''
        });
      }
    }

    const errorCount = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const score = Math.max(0, 100 - errorCount * 10);

    return {
      quality: {
        score,
        summary: `${errorCount} critical issues found. ${issues.length} total issues.`
      },
      issues,
      recommendations: [],
      bestPractices: [],
      securityConcerns: []
    };
  }

  /**
   * Map VS Code diagnostic severity to our severity levels
   */
  private mapDiagnosticSeverity(severity: vscode.DiagnosticSeverity): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'high';
      case vscode.DiagnosticSeverity.Warning:
        return 'medium';
      case vscode.DiagnosticSeverity.Information:
        return 'low';
      case vscode.DiagnosticSeverity.Hint:
        return 'low';
      default:
        return 'medium';
    }
  }
}

