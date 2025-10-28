/**
 * MemoryEngine - Integration with Dimag MCP Tools
 * Connects VS Code extension to all 30+ Dimag MCP tools
 */

import * as vscode from 'vscode';

export interface MemoryEngineConfig {
  projectPath?: string;
  autoValidate?: boolean;
  enableLearning?: boolean;
}

export class MemoryEngine {
  private context: vscode.ExtensionContext;
  private config: MemoryEngineConfig;

  constructor(context: vscode.ExtensionContext, config: MemoryEngineConfig = {}) {
    this.context = context;
    this.config = {
      projectPath: config.projectPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      autoValidate: config.autoValidate !== false,
      enableLearning: config.enableLearning !== false
    };
  }

  // ============================================================================
  // MEMORY MANAGEMENT TOOLS
  // ============================================================================

  /**
   * Validate a suggestion/action against project memory
   */
  async validateSuggestion(suggestion: string, context?: string): Promise<{
    valid: boolean;
    conflicts?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__validate_suggestion',
        { suggestion, context }
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to validate suggestion:', error);
      return { valid: true, warnings: ['Memory validation unavailable'] };
    }
  }

  /**
   * Add a new memory/decision to the project
   */
  async addMemory(params: {
    layer: 'STRATEGIC' | 'ARCHITECTURAL' | 'TACTICAL' | 'IMPLEMENTATION';
    decision: string;
    reason: string;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
    context?: string;
    reviewInterval?: string;
    tags?: string[];
  }): Promise<{ success: boolean; memoryId?: string }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__add_memory',
        params
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to add memory:', error);
      return { success: false };
    }
  }

  /**
   * Get all memories for the project
   */
  async getAllMemories(layer?: string): Promise<any[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_all_memories',
        layer ? { layer } : {}
      );
      return (result as any)?.memories || [];
    } catch (error: any) {
      console.error('Failed to get memories:', error);
      return [];
    }
  }

  /**
   * Search memories by keyword
   */
  async searchMemories(query: string): Promise<any[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__search_memories',
        { query }
      );
      return (result as any)?.memories || [];
    } catch (error: any) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  /**
   * Search relevant memories for project audit
   */
  async searchRelevant(audit: any): Promise<any[]> {
    // Search for memories related to audit findings
    const query = `${audit.projectType} ${audit.framework}`;
    return await this.searchMemories(query);
  }

  /**
   * Update an existing memory
   */
  async updateMemory(memoryId: string, updates: {
    decision?: string;
    reason?: string;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<{ success: boolean }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__update_memory',
        { memoryId, ...updates }
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update memory:', error);
      return { success: false };
    }
  }

  /**
   * Record an adaptation/change to a memory
   */
  async addAdaptation(params: {
    memoryId: string;
    change: string;
    reason: string;
    type: 'ENHANCEMENT' | 'DEVIATION' | 'REFINEMENT';
    approvedBy: 'USER' | 'AUTO';
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__add_adaptation',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to add adaptation:', error);
      return { success: false };
    }
  }

  /**
   * Get memories that are due for review
   */
  async getReviewsDue(): Promise<any[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_reviews_due',
        {}
      );
      return (result as any)?.memories || [];
    } catch (error: any) {
      console.error('Failed to get reviews due:', error);
      return [];
    }
  }

  // ============================================================================
  // FILE STATUS TOOLS
  // ============================================================================

  /**
   * Set or update the status of a file
   */
  async setFileStatus(params: {
    filePath: string;
    status: 'CURRENT' | 'DEPRECATED' | 'IN_PROGRESS' | 'ARCHIVED';
    reason: string;
    replacedBy?: string;
    phaseCompleted?: string;
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__set_file_status',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to set file status:', error);
      return { success: false };
    }
  }

  /**
   * Get the status of a file
   */
  async getFileStatus(filePath: string): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_file_status',
        { filePath }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to get file status:', error);
      return null;
    }
  }

  /**
   * Get all tracked files and their statuses
   */
  async getAllFiles(status?: string): Promise<any[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_all_files',
        status ? { status } : {}
      );
      return (result as any)?.files || [];
    } catch (error: any) {
      console.error('Failed to get all files:', error);
      return [];
    }
  }

  // ============================================================================
  // PROJECT VISION TOOLS
  // ============================================================================

  /**
   * Set or update the project vision
   */
  async setProjectVision(params: {
    projectName: string;
    vision: string;
    oneYearGoal: string;
    architecture?: any;
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__set_project_vision',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to set project vision:', error);
      return { success: false };
    }
  }

  /**
   * Get the project vision and current status
   */
  async getProjectVision(): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_project_vision',
        {}
      );
      return result;
    } catch (error: any) {
      console.error('Failed to get project vision:', error);
      return null;
    }
  }

  /**
   * Update the current project phase
   */
  async updatePhase(params: {
    phaseNumber: number;
    name: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'BLOCKED';
    percentComplete: number;
    description: string;
    blockers?: string[];
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__update_phase',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update phase:', error);
      return { success: false };
    }
  }

  // ============================================================================
  // REQUIREMENTS & SCOPE TOOLS
  // ============================================================================

  /**
   * Add a requirement to project scope
   */
  async addRequirement(params: {
    description: string;
    category: 'FEATURE' | 'API' | 'UI' | 'PERFORMANCE' | 'INFRASTRUCTURE';
    source: string;
    priority: 'MUST_HAVE' | 'SHOULD_HAVE' | 'NICE_TO_HAVE';
    notes?: string;
  }): Promise<{ success: boolean; requirementId?: string }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__add_requirement',
        params
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to add requirement:', error);
      return { success: false };
    }
  }

  /**
   * Validate if a feature is in documented scope
   */
  async validateFeatureScope(featureName: string, featureDescription?: string): Promise<{
    inScope: boolean;
    conflicts?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__validate_feature_scope',
        { featureName, featureDescription }
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to validate feature scope:', error);
      return { inScope: true, warnings: ['Scope validation unavailable'] };
    }
  }

  /**
   * Get all project requirements/scope
   */
  async getAllRequirements(filters?: {
    category?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_all_requirements',
        filters || {}
      );
      return (result as any)?.requirements || [];
    } catch (error: any) {
      console.error('Failed to get requirements:', error);
      return [];
    }
  }

  // ============================================================================
  // CRITICAL DECISIONS & BRAINSTORMING
  // ============================================================================

  /**
   * Check if a decision requires brainstorming
   */
  async checkCriticalDecision(decisionType: string): Promise<{
    requiresBrainstorming: boolean;
    categories?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__check_critical_decision',
        { decisionType }
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to check critical decision:', error);
      return { requiresBrainstorming: false };
    }
  }

  /**
   * Manage brainstorming sessions
   */
  async brainstormSession(params: {
    action: 'start' | 'add' | 'commit' | 'list';
    topic?: string;
    thought?: string;
    tags?: string[];
  }): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__brainstorm_session',
        params
      );
      return result;
    } catch (error: any) {
      console.error('Failed to manage brainstorm session:', error);
      return null;
    }
  }

  // ============================================================================
  // DESIGN SYSTEM TOOLS
  // ============================================================================

  /**
   * Get the complete design system
   */
  async getDesignSystem(): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_design_system',
        {}
      );
      return result;
    } catch (error: any) {
      console.error('Failed to get design system:', error);
      return null;
    }
  }

  /**
   * Validate a UI component against the design system
   */
  async validateUIComponent(params: {
    componentName?: string;
    color?: string;
    spacing?: string;
  }): Promise<{
    valid: boolean;
    violations?: string[];
    suggestions?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__validate_ui_component',
        params
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to validate UI component:', error);
      return { valid: true, violations: [] };
    }
  }

  /**
   * Add a design token to the design system
   */
  async addDesignToken(params: {
    name: string;
    value: string;
    category: 'COLOR' | 'SPACING' | 'TYPOGRAPHY' | 'BORDER_RADIUS' | 'SHADOW' | 'BREAKPOINT';
    usage: string;
    platform?: 'mobile' | 'web' | 'both';
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__add_design_token',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to add design token:', error);
      return { success: false };
    }
  }

  /**
   * Add a component pattern to the design system
   */
  async addComponentPattern(params: {
    name: string;
    category: 'BUTTON' | 'INPUT' | 'CARD' | 'MODAL' | 'NAVIGATION' | 'LAYOUT' | 'OTHER';
    description: string;
    filePath: string;
    usage: string;
    variants?: string[];
    props?: string[];
  }): Promise<{ success: boolean }> {
    try {
      await vscode.commands.executeCommand(
        'mcp__dimag__add_component_pattern',
        params
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to add component pattern:', error);
      return { success: false };
    }
  }

  // ============================================================================
  // AUDIT & ANALYSIS TOOLS
  // ============================================================================

  /**
   * Conduct a comprehensive CTO-level audit of an existing project
   */
  async auditProject(projectPath?: string, saveReport?: boolean): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__audit_project',
        {
          projectPath: projectPath || this.config.projectPath,
          saveReport: saveReport !== false
        }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to audit project:', error);
      return null;
    }
  }

  /**
   * Perform full dependency analysis
   */
  async analyzeDependencies(projectPath?: string): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__analyze_dependencies',
        { projectPath: projectPath || this.config.projectPath }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to analyze dependencies:', error);
      return null;
    }
  }

  /**
   * Get intelligent CTO-level development strategy
   */
  async getCTOStrategy(projectPath?: string): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_cto_strategy',
        { projectPath: projectPath || this.config.projectPath }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to get CTO strategy:', error);
      return null;
    }
  }

  // ============================================================================
  // DEPLOYMENT & VALIDATION TOOLS
  // ============================================================================

  /**
   * Validate framework + platform compatibility BEFORE implementation
   */
  async validateDeploymentStack(params: {
    framework: string;
    platform: string;
    projectPath?: string;
  }): Promise<{
    compatible: boolean;
    requirements?: any;
    warnings?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__validate_deployment_stack',
        {
          ...params,
          projectPath: params.projectPath || this.config.projectPath
        }
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to validate deployment stack:', error);
      return { compatible: true, warnings: ['Validation unavailable'] };
    }
  }

  /**
   * Validate component usage
   */
  async validateComponentUsage(params: {
    projectPath?: string;
    componentPath?: string;
    componentsDir?: string;
  }): Promise<{
    valid: boolean;
    unusedComponents?: string[];
    warnings?: string[];
  }> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__validate_component_usage',
        {
          projectPath: params.projectPath || this.config.projectPath,
          componentPath: params.componentPath,
          componentsDir: params.componentsDir
        }
      );
      return result as any;
    } catch (error: any) {
      console.error('Failed to validate component usage:', error);
      return { valid: true, unusedComponents: [] };
    }
  }

  // ============================================================================
  // AUTONOMOUS WORKFLOWS
  // ============================================================================

  /**
   * Analyze project and improve autonomously
   */
  async autonomousAnalyzeImprove(params: {
    projectPath?: string;
    permissionLevel?: 'ASK_UPFRONT' | 'ASK_PER_PHASE' | 'ASK_CRITICAL_ONLY' | 'FULL_AUTO';
  }): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__autonomous_analyze_improve',
        {
          projectPath: params.projectPath || this.config.projectPath,
          permissionLevel: params.permissionLevel || 'ASK_PER_PHASE'
        }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to run autonomous analyze:', error);
      return null;
    }
  }

  /**
   * Create new project autonomously
   */
  async autonomousCreateProject(params: {
    description: string;
    uniqueFeatures?: string[];
    permissionLevel?: 'ASK_UPFRONT' | 'ASK_PER_PHASE' | 'ASK_CRITICAL_ONLY' | 'FULL_AUTO';
  }): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__autonomous_create_project',
        {
          ...params,
          permissionLevel: params.permissionLevel || 'ASK_PER_PHASE'
        }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to run autonomous create:', error);
      return null;
    }
  }

  /**
   * Activate Dimag autonomous mode
   */
  async activateDimag(projectPath?: string): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__activate_dimag',
        { projectPath: projectPath || this.config.projectPath }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to activate Dimag:', error);
      return null;
    }
  }

  /**
   * Deactivate Dimag
   */
  async deactivateDimag(): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__deactivate_dimag',
        {}
      );
      return result;
    } catch (error: any) {
      console.error('Failed to deactivate Dimag:', error);
      return null;
    }
  }

  /**
   * Detect user intent
   */
  async detectIntent(userMessage: string): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__detect_intent',
        { userMessage }
      );
      return result;
    } catch (error: any) {
      console.error('Failed to detect intent:', error);
      return null;
    }
  }

  /**
   * Get activation status
   */
  async getActivationStatus(): Promise<any> {
    try {
      const result = await vscode.commands.executeCommand(
        'mcp__dimag__get_activation_status',
        {}
      );
      return result;
    } catch (error: any) {
      console.error('Failed to get activation status:', error);
      return null;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if MemoryEngine is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getActivationStatus();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get MemoryEngine statistics
   */
  async getStats(): Promise<{
    totalMemories: number;
    totalRequirements: number;
    totalFiles: number;
    reviewsDue: number;
    activated: boolean;
  }> {
    try {
      const [memories, requirements, files, reviews, status] = await Promise.all([
        this.getAllMemories(),
        this.getAllRequirements(),
        this.getAllFiles(),
        this.getReviewsDue(),
        this.getActivationStatus()
      ]);

      return {
        totalMemories: memories.length,
        totalRequirements: requirements.length,
        totalFiles: files.length,
        reviewsDue: reviews.length,
        activated: (status as any)?.activated || false
      };
    } catch (error: any) {
      console.error('Failed to get MemoryEngine stats:', error);
      return {
        totalMemories: 0,
        totalRequirements: 0,
        totalFiles: 0,
        reviewsDue: 0,
        activated: false
      };
    }
  }
}
