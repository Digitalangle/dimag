/**
 * Pattern Matcher
 * Matches current context against learned patterns
 */

import * as vscode from 'vscode';
import { LearningSync } from '../learning/sync';

export interface PatternMatch {
  pattern: any;
  confidence: number;
  reasoning: string;
  applicability: number; // 0-1 score
}

export class PatternMatcher {
  private context: vscode.ExtensionContext;
  private learningSync: LearningSync;
  private cachedPatterns: any[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(context: vscode.ExtensionContext, learningSync: LearningSync) {
    this.context = context;
    this.learningSync = learningSync;
  }

  /**
   * Find matching pattern for given intent and context
   */
  async findMatch(intent: string, context?: any): Promise<PatternMatch | null> {
    const patterns = await this.getPatterns();

    if (patterns.length === 0) {
      return null;
    }

    // Detect current project context
    const projectContext = context || await this.detectProjectContext();

    // Find best matching pattern
    const matches = patterns
      .map(pattern => this.scorePattern(pattern, intent, projectContext))
      .filter(match => match.confidence > 0.6) // Only consider high-confidence matches
      .sort((a, b) => b.confidence - a.confidence);

    return matches[0] || null;
  }

  /**
   * Find all matching patterns (not just the best)
   */
  async findAllMatches(intent: string, context?: any): Promise<PatternMatch[]> {
    const patterns = await this.getPatterns();

    if (patterns.length === 0) {
      return [];
    }

    const projectContext = context || await this.detectProjectContext();

    return patterns
      .map(pattern => this.scorePattern(pattern, intent, projectContext))
      .filter(match => match.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Score a pattern against current context
   */
  private scorePattern(pattern: any, intent: string, projectContext: any): PatternMatch {
    let score = 0;
    const reasons: string[] = [];

    // Check project type match
    if (pattern.pattern.context.projectType && projectContext.projectType) {
      if (pattern.pattern.context.projectType === projectContext.projectType) {
        score += 0.3;
        reasons.push(`Same project type: ${projectContext.projectType}`);
      }
    }

    // Check technology overlap
    if (pattern.pattern.context.technologies && projectContext.technologies) {
      const patternTechs = new Set(pattern.pattern.context.technologies);
      const projectTechs = new Set(projectContext.technologies);
      const intersection = [...patternTechs].filter(t => projectTechs.has(t));
      const overlapRatio = intersection.length / Math.max(patternTechs.size, projectTechs.size);

      if (overlapRatio > 0) {
        score += overlapRatio * 0.4;
        reasons.push(`Technology overlap: ${Math.round(overlapRatio * 100)}% (${intersection.join(', ')})`);
      }
    }

    // Check problem type similarity
    if (pattern.pattern.context.problemType && projectContext.problemType) {
      if (this.areSimilarProblemTypes(pattern.pattern.context.problemType, projectContext.problemType)) {
        score += 0.2;
        reasons.push(`Similar problem: ${projectContext.problemType}`);
      }
    }

    // Check intent match
    if (pattern.pattern.solution?.approach) {
      const intentLower = intent.toLowerCase();
      const approachLower = pattern.pattern.solution.approach.toLowerCase();

      if (intentLower.includes(approachLower) || approachLower.includes(intentLower)) {
        score += 0.1;
        reasons.push(`Intent matches approach`);
      }
    }

    // Factor in pattern's historical confidence
    const historicalConfidence = pattern.pattern.confidence || 0.5;
    score = score * 0.7 + historicalConfidence * 0.3;

    // Calculate applicability (how well the solution fits)
    const applicability = this.calculateApplicability(pattern, projectContext);

    return {
      pattern,
      confidence: Math.min(score, 1),
      reasoning: reasons.join(', '),
      applicability
    };
  }

  /**
   * Check if two problem types are similar
   */
  private areSimilarProblemTypes(type1: string, type2: string): boolean {
    const t1 = type1.toLowerCase();
    const t2 = type2.toLowerCase();

    // Exact match
    if (t1 === t2) return true;

    // Category matches
    const categories = [
      ['deployment', 'deploy', 'hosting', 'production'],
      ['error', 'bug', 'exception', 'crash'],
      ['performance', 'slow', 'optimization'],
      ['architecture', 'design', 'structure'],
      ['testing', 'test', 'qa']
    ];

    for (const category of categories) {
      const t1InCategory = category.some(keyword => t1.includes(keyword));
      const t2InCategory = category.some(keyword => t2.includes(keyword));

      if (t1InCategory && t2InCategory) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate how applicable a solution is to current context
   */
  private calculateApplicability(pattern: any, projectContext: any): number {
    let score = 0.5; // Base score

    // Check if solution requires technologies we have
    if (pattern.pattern.solution?.requiredTechnologies) {
      const required = new Set(pattern.pattern.solution.requiredTechnologies);
      const available = new Set(projectContext.technologies || []);
      const hasAll = [...required].every(t => available.has(t));

      score = hasAll ? 0.9 : 0.3;
    }

    // Check pattern's success rate
    if (pattern.metadata?.successRate) {
      score = score * 0.6 + pattern.metadata.successRate * 0.4;
    }

    return score;
  }

  /**
   * Detect current project context
   */
  private async detectProjectContext(): Promise<any> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      return {};
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const technologies = await this.detectTechnologies(rootPath);
    const projectType = this.inferProjectType(technologies);

    return {
      projectType,
      technologies,
      rootPath
    };
  }

  /**
   * Detect technologies in project
   */
  private async detectTechnologies(rootPath: string): Promise<string[]> {
    const technologies: Set<string> = new Set();

    try {
      // Check package.json
      const packageJsonFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);

      if (packageJsonFiles.length > 0) {
        const content = await vscode.workspace.fs.readFile(packageJsonFiles[0]);
        const packageJson = JSON.parse(content.toString());

        // Check dependencies
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Detect frameworks
        if (allDeps['next']) technologies.add('Next.js');
        if (allDeps['react']) technologies.add('React');
        if (allDeps['vue']) technologies.add('Vue');
        if (allDeps['@angular/core']) technologies.add('Angular');
        if (allDeps['express']) technologies.add('Express');
        if (allDeps['fastify']) technologies.add('Fastify');
        if (allDeps['typescript']) technologies.add('TypeScript');
        if (allDeps['tailwindcss']) technologies.add('Tailwind');
        if (allDeps['aws-cdk']) technologies.add('AWS CDK');
        if (allDeps['@cloudflare/workers-types']) technologies.add('Cloudflare Workers');
      }

      // Check for specific files
      const files = await vscode.workspace.findFiles('**/*.{py,go,rs,java}', '**/node_modules/**', 5);

      for (const file of files) {
        const ext = file.fsPath.split('.').pop();
        if (ext === 'py') technologies.add('Python');
        if (ext === 'go') technologies.add('Go');
        if (ext === 'rs') technologies.add('Rust');
        if (ext === 'java') technologies.add('Java');
      }
    } catch (error) {
      console.error('Failed to detect technologies:', error);
    }

    return Array.from(technologies);
  }

  /**
   * Infer project type from technologies
   */
  private inferProjectType(technologies: string[]): string {
    if (technologies.includes('Next.js')) return 'Next.js App';
    if (technologies.includes('React')) return 'React App';
    if (technologies.includes('Vue')) return 'Vue App';
    if (technologies.includes('Angular')) return 'Angular App';
    if (technologies.includes('Express') || technologies.includes('Fastify')) return 'Node.js Backend';
    if (technologies.includes('Python')) return 'Python App';
    if (technologies.includes('Go')) return 'Go App';
    if (technologies.includes('Rust')) return 'Rust App';
    if (technologies.includes('Java')) return 'Java App';

    return 'Unknown';
  }

  /**
   * Get patterns (with caching)
   */
  private async getPatterns(): Promise<any[]> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cachedPatterns.length > 0 && now < this.cacheExpiry) {
      return this.cachedPatterns;
    }

    // Load fresh patterns
    this.cachedPatterns = await this.learningSync.loadAllPatterns();
    this.cacheExpiry = now + this.CACHE_TTL;

    return this.cachedPatterns;
  }

  /**
   * Reload patterns (force cache refresh)
   */
  async reloadPatterns(): Promise<void> {
    this.cachedPatterns = await this.learningSync.loadAllPatterns();
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    console.log(`Reloaded ${this.cachedPatterns.length} patterns`);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalPatterns: number;
    patternsByCategory: Record<string, number>;
    cacheExpiry: number;
  }> {
    const patterns = await this.getPatterns();

    const byCategory = patterns.reduce((acc, p) => {
      const category = p.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatterns: patterns.length,
      patternsByCategory: byCategory,
      cacheExpiry: this.cacheExpiry
    };
  }
}
