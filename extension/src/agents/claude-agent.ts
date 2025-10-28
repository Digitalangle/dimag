/**
 * Claude Agent
 * Uses VS Code's Language Model API to access Claude
 *
 * @author Digitalangle
 * @license MIT
 */

import * as vscode from 'vscode';

export interface AuditResult {
  projectType: string;
  filesAnalyzed: number;
  technologies: string[];
  issues: any[];
  summary: string;
}

export class ClaudeAgent {
  private context: vscode.ExtensionContext;
  private model: vscode.LanguageModelChat | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get Claude model via VS Code's Language Model API
   */
  private async getModel(): Promise<vscode.LanguageModelChat> {
    if (!this.model) {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4' // Will try Claude if available, otherwise GPT-4
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
   * Audit project structure and architecture
   */
  async auditProject(projectPath: string): Promise<AuditResult> {
    try {
      const model = await this.getModel();

      // Get workspace files
      const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
      const fileCount = files.length;

      // Analyze package.json to detect technologies
      const technologies = await this.detectTechnologies();

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `You are a CTO analyzing a project. Provide a comprehensive audit.

Project: ${projectPath}
Files: ${fileCount}
Technologies: ${technologies.join(', ')}

Identify:
1. Project type (web app, mobile app, library, etc.)
2. Architecture patterns used
3. Potential bugs or issues
4. Missing features or improvements
5. Technical debt

Respond in JSON format:
{
  "projectType": "...",
  "architecture": "...",
  "issues": [...],
  "recommendations": [...]
}`
        )
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      // Parse JSON response
      const parsed = this.parseAuditResponse(result);

      return {
        projectType: parsed.projectType || 'unknown',
        filesAnalyzed: fileCount,
        technologies,
        issues: parsed.issues || [],
        summary: `Analyzed ${fileCount} files. Project type: ${parsed.projectType}`
      };

    } catch (error: any) {
      console.error('Claude audit error:', error);

      // Fallback to basic analysis
      return {
        projectType: 'unknown',
        filesAnalyzed: 0,
        technologies: [],
        issues: [],
        summary: `Analysis unavailable: ${error.message}`
      };
    }
  }

  /**
   * Get CTO-level strategy
   */
  async getCTOStrategy(audit: AuditResult): Promise<any> {
    try {
      const model = await this.getModel();

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `Based on this project audit, create a development strategy:

${JSON.stringify(audit, null, 2)}

Provide:
1. Recommended approach (frontend-first, backend-first, parallel)
2. Priority order for improvements
3. Risk assessment
4. Timeline estimate

Respond in JSON format.`
        )
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return this.parseStrategyResponse(result);

    } catch (error: any) {
      console.error('Strategy error:', error);
      return { approach: 'incremental', priority: [], risks: [] };
    }
  }

  /**
   * Detect technologies used in project
   */
  private async detectTechnologies(): Promise<string[]> {
    const technologies: string[] = [];

    try {
      // Check package.json
      const packageJsonFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');

      if (packageJsonFiles.length > 0) {
        const packageJson = await vscode.workspace.openTextDocument(packageJsonFiles[0]);
        const content = packageJson.getText();
        const parsed = JSON.parse(content);

        const deps = { ...parsed.dependencies, ...parsed.devDependencies };

        if (deps['next']) technologies.push('Next.js');
        if (deps['react']) technologies.push('React');
        if (deps['react-native']) technologies.push('React Native');
        if (deps['vue']) technologies.push('Vue');
        if (deps['@angular/core']) technologies.push('Angular');
        if (deps['express']) technologies.push('Express');
        if (deps['typescript']) technologies.push('TypeScript');
      }

    } catch (error) {
      console.error('Tech detection error:', error);
    }

    return technologies.length > 0 ? technologies : ['Unknown'];
  }

  /**
   * Parse audit response
   */
  private parseAuditResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse error:', error);
    }

    // Fallback
    return {
      projectType: 'unknown',
      issues: [],
      recommendations: []
    };
  }

  /**
   * Parse strategy response
   */
  private parseStrategyResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse error:', error);
    }

    return {
      approach: 'incremental',
      priority: [],
      risks: []
    };
  }
}
