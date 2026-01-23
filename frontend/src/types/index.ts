// Schema types
export interface SchemaProperty {
    name: string;
    path: string;
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
    format?: string;
    description?: string;
    required?: boolean;
    properties?: SchemaProperty[];
    items?: SchemaProperty;
    additionalProperties?: SchemaProperty;
    enumValues?: (string | number | boolean)[];
    defaultValue?: unknown;
    constraints?: Record<string, unknown>;
}

export interface Schema {
    id: number;
    name: string;
    description?: string;
    group?: string;
    projectId?: number;
    version: string;
    source: 'SWAGGER' | 'JSON_SCHEMA' | 'MANUAL';
    properties?: SchemaProperty[];
    jsonSchema?: string;
    createdAt: string;
    updatedAt: string;
}

// Rule types
export interface Condition {
    fact: string;
    operator: string;
    value: unknown;
    valueIsField?: boolean;
    nested?: ConditionGroup;
}

export interface ConditionGroup {
    operator: 'all' | 'any';
    conditions: Condition[];
}

export interface RuleAction {
    type: 'MODIFY' | 'INSERT' | 'RETRACT' | 'LOG' | 'WEBHOOK';
    targetField?: string;
    value?: unknown;
    factType?: string;
    factData?: Record<string, unknown>;
    logMessage?: string;
    webhookUrl?: string;
    webhookMethod?: string;
    webhookHeaders?: Record<string, string>;
    webhookBodyTemplate?: string;
}

export interface RuleDefinition {
    name: string;
    description?: string;
    schemaId: number;
    projectId?: number;
    priority: number;
    enabled: boolean;
    category?: string;
    conditions: ConditionGroup;
    actions: RuleAction[];
    // Advanced Drools parameters
    activationGroup?: string;
    lockOnActive?: boolean;
    dateEffective?: string;
    dateExpires?: string;
}

export interface Rule {
    id: number;
    name: string;
    description?: string;
    schemaId: number;
    schemaName: string;
    projectId?: number;
    enabled: boolean;
    priority: number;
    category?: string;
    definition?: RuleDefinition;
    generatedDrl?: string;
    createdAt: string;
    updatedAt: string;
    // Advanced Drools parameters
    activationGroup?: string;
    lockOnActive?: boolean;
    dateEffective?: string;
    dateExpires?: string;
}

// Execution types
export interface ExecuteRequest {
    schemaId?: number;
    ruleIds?: number[];
    facts: Record<string, unknown>[];
    dryRun?: boolean;
}

export interface FiredRule {
    ruleId: number;
    ruleName: string;
    fireCount: number;
}

export interface WebhookResult {
    url: string;
    statusCode: number;
    response: string;
    success: boolean;
}

export interface ExecuteResponse {
    success: boolean;
    resultFacts: Record<string, unknown>[];
    firedRules: FiredRule[];
    executionTimeMs: number;
    errorMessage?: string;
    webhookResults?: WebhookResult[];
}

// Operator definitions
export const OPERATORS = [
    { value: 'equals', label: 'equals (==)', types: ['all'] },
    { value: 'notEquals', label: 'not equals (!=)', types: ['all'] },
    { value: 'greaterThan', label: 'greater than (>)', types: ['number', 'integer'] },
    { value: 'greaterThanOrEquals', label: 'greater or equal (>=)', types: ['number', 'integer'] },
    { value: 'lessThan', label: 'less than (<)', types: ['number', 'integer'] },
    { value: 'lessThanOrEquals', label: 'less or equal (<=)', types: ['number', 'integer'] },
    { value: 'contains', label: 'contains', types: ['string', 'array'] },
    { value: 'notContains', label: 'not contains', types: ['string', 'array'] },
    { value: 'startsWith', label: 'starts with', types: ['string'] },
    { value: 'endsWith', label: 'ends with', types: ['string'] },
    { value: 'matches', label: 'matches (regex)', types: ['string'] },
    { value: 'memberOf', label: 'member of', types: ['all'] },
    { value: 'notMemberOf', label: 'not member of', types: ['all'] },
    { value: 'isNull', label: 'is null', types: ['all'] },
    { value: 'isNotNull', label: 'is not null', types: ['all'] },
    { value: 'before', label: 'before (date)', types: ['string'] },
    { value: 'after', label: 'after (date)', types: ['string'] },
];

export const getOperatorsForType = (type: string) => {
    return OPERATORS.filter(op => op.types.includes('all') || op.types.includes(type));
};

export interface SchemaInfo {
    id: number;
    name: string;
}

export interface RuleProject {
    id: number;
    name: string;
    description?: string;
    parentProjectId?: number;
    // Multiple schemas support
    inputSchemas?: SchemaInfo[];
    outputSchemas?: SchemaInfo[];
    // Legacy single schema support (for backward compatibility)
    inputSchemaId?: number;
    inputSchemaName?: string;
    outputSchemaId?: number;
    outputSchemaName?: string;
    // Allowed output types for templates (comma-separated: MODIFY,INSERT,LOG,WEBHOOK)
    allowedOutputTypes?: string;
    ruleCount: number;
    templateCount?: number;
    schemaCount?: number;
    createdAt: string;
    updatedAt: string;
    // RuleSet-level Drools parameters
    activationGroup?: string;
    agendaGroup?: string;
    autoFocus?: boolean;
    lockOnActive?: boolean;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    // Multiple schemas support
    inputSchemaIds?: number[];
    outputSchemaIds?: number[];
    // Legacy single schema support (for backward compatibility)
    inputSchemaId?: number;
    outputSchemaId?: number;
    // Allowed output action types (comma-separated: MODIFY,INSERT,LOG,WEBHOOK)
    allowedOutputTypes?: string;
}

// Execution History types
export interface ExecutionHistory {
    id: number;
    projectId?: number;
    projectName?: string;
    inputFacts?: Record<string, unknown>[];
    outputFacts?: Record<string, unknown>[];
    firedRules?: FiredRule[];
    webhookResults?: WebhookResult[];
    success: boolean;
    dryRun: boolean;
    executionTimeMs?: number;
    errorMessage?: string;
    executedAt: string;
}

// Project Audit Log types
export interface ProjectAuditLog {
    id: number;
    projectId: number;
    projectName?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ENABLE' | 'DISABLE' | 'EXECUTE' | 'IMPORT' | 'EXPORT';
    entityType: 'PROJECT' | 'TEMPLATE' | 'RULE' | 'SCHEMA' | 'ATTRIBUTE';
    entityId?: number;
    entityName?: string;
    details?: string;
    previousValue?: string;
    newValue?: string;
    performedBy?: string;
    createdAt: string;
}
