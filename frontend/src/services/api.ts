import axios from 'axios';
import { Schema, Rule, RuleDefinition, ExecuteRequest, ExecuteResponse, ExecutionHistory } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Schema API
export const schemaApi = {
    getAll: () => api.get<Schema[]>('/schemas').then(r => r.data),

    getById: (id: number) => api.get<Schema>(`/schemas/${id}`).then(r => r.data),

    previewOpenApi: (content: string) =>
        api.post<{ name: string; entities: string[] }>('/schemas/import/openapi/preview', { content }).then(r => r.data),

    importOpenApi: (name: string, content: string, selectedEntities?: string[], group?: string, projectId?: number) =>
        api.post<Schema[]>('/schemas/import/openapi/content', { name, content, selectedEntities, group, projectId }).then(r => r.data),

    importJsonSchema: (name: string, content: string, group?: string, projectId?: number) =>
        api.post<Schema>('/schemas/import/json-schema/content', { name, content, group, projectId }).then(r => r.data),

    inferFromExample: (name: string, example: string, group?: string, projectId?: number) =>
        api.post<Schema>('/schemas/import/example', { name, example, group, projectId }).then(r => r.data),

    create: (data: { name: string; description?: string; group?: string; projectId?: number; schema: unknown }) =>
        api.post<Schema>('/schemas/manual', data).then(r => r.data),

    update: (id: number, data: { name?: string; description?: string; group?: string; projectId?: number; schema?: unknown }) =>
        api.put<Schema>(`/schemas/${id}`, data).then(r => r.data),

    delete: (id: number) => api.delete(`/schemas/${id}`),

    // Schema attribute methods
    getAttributes: (schemaId: number) =>
        api.get<SchemaAttribute[]>(`/schemas/${schemaId}/attributes`).then(r => r.data),

    addAttribute: (schemaId: number, attribute: SchemaAttribute) =>
        api.post<SchemaAttribute>(`/schemas/${schemaId}/attributes`, attribute).then(r => r.data),

    updateAttribute: (schemaId: number, attributeName: string, attribute: SchemaAttribute) =>
        api.put<SchemaAttribute>(`/schemas/${schemaId}/attributes/${attributeName}`, attribute).then(r => r.data),

    deleteAttribute: (schemaId: number, attributeName: string) =>
        api.delete(`/schemas/${schemaId}/attributes/${attributeName}`),

    getAttributeImpact: (schemaId: number, attributeName: string) =>
        api.get<AttributeImpact>(`/schemas/${schemaId}/attributes/${attributeName}/impact`).then(r => r.data),

    applyAttributeChange: (schemaId: number, attributeName: string, request: ApplyAttributeChangeRequest) =>
        api.post<ApplyAttributeChangeResponse>(`/schemas/${schemaId}/attributes/${attributeName}/apply-changes`, request).then(r => r.data),
};

// Types for schema attributes
export interface SchemaAttribute {
    name: string;
    path?: string;
    type: string;
    format?: string;
    description?: string;
    required?: boolean;
    enumValues?: unknown[];
    defaultValue?: unknown;
    constraints?: Record<string, unknown>;
}

export interface AttributeImpact {
    attributeName: string;
    schemaName: string;
    schemaId: number;
    affectedRules: AffectedRule[];
    totalAffectedRules: number;
    riskLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface AffectedRule {
    ruleId: number;
    ruleName: string;
    projectId: number;
    projectName: string;
    usages: { location: string; detail: string }[];
}

export interface ApplyAttributeChangeRequest {
    changeType: 'rename' | 'retype' | 'delete';
    oldName: string;
    newName?: string;
    newType?: string;
    confirmPropagation: boolean;
}

export interface ApplyAttributeChangeResponse {
    success: boolean;
    message: string;
    updatedRuleIds: number[];
    failedRuleIds: number[];
    errors: string[];
}


// Rule API
export const ruleApi = {
    getAll: (schemaId?: number) =>
        api.get<Rule[]>('/rules', { params: schemaId ? { schemaId } : {} }).then(r => r.data),

    getById: (id: number) => api.get<Rule>(`/rules/${id}`).then(r => r.data),

    create: (definition: RuleDefinition) =>
        api.post<Rule>('/rules', definition).then(r => r.data),

    update: (id: number, definition: RuleDefinition) =>
        api.put<Rule>(`/rules/${id}`, definition).then(r => r.data),

    delete: (id: number) => api.delete(`/rules/${id}`),

    toggle: (id: number) => api.post<Rule>(`/rules/${id}/toggle`).then(r => r.data),

    getDrl: (id: number) =>
        api.get<string>(`/rules/${id}/drl`, { responseType: 'text' }).then(r => r.data),

    execute: (request: ExecuteRequest) =>
        api.post<ExecuteResponse>('/rules/execute', request).then(r => r.data),

    regenerateDrl: (id: number) =>
        api.post<Rule>(`/rules/${id}/regenerate`).then(r => r.data),

    getMatchPayload: (id: number) =>
        api.get<Record<string, unknown>>(`/rules/${id}/match-payload`).then(r => r.data),
};

// Project API
export const projectApi = {
    getAll: () => api.get<import('../types').RuleProject[]>('/projects').then(r => r.data),

    getById: (id: number) => api.get<import('../types').RuleProject>(`/projects/${id}`).then(r => r.data),

    create: (data: import('../types').CreateProjectRequest) =>
        api.post<import('../types').RuleProject>('/projects', data).then(r => r.data),

    delete: (id: number) => api.delete(`/projects/${id}`),

    getRules: (id: number) => api.get<import('../types').Rule[]>(`/projects/${id}/rules`).then(r => r.data),

    execute: (id: number, request: ExecuteRequest) =>
        api.post<ExecuteResponse>(`/projects/${id}/execute`, request).then(r => r.data),

    getExecutionHistory: (id: number) =>
        api.get<ExecutionHistory[]>(`/projects/${id}/executions`).then(r => r.data),

    getAllExecutionHistory: () =>
        api.get<ExecutionHistory[]>('/projects/executions').then(r => r.data),

    getExecutionHistoryById: (executionId: number) =>
        api.get<ExecutionHistory>(`/projects/executions/${executionId}`).then(r => r.data),

    // Project-scoped schema methods
    getSchemas: (projectId: number) => api.get<Schema[]>(`/projects/${projectId}/schemas`).then(r => r.data),

    // Project-scoped template methods
    getTemplates: (projectId: number) => api.get<import('../types').RuleProject[]>(`/projects/${projectId}/templates`).then(r => r.data),

    createTemplate: (projectId: number, data: import('../types').CreateProjectRequest) =>
        api.post<import('../types').RuleProject>(`/projects/${projectId}/templates`, data).then(r => r.data),

    // Project audit log methods
    getAuditLogs: (projectId: number) =>
        api.get<import('../types').ProjectAuditLog[]>(`/projects/${projectId}/audit`).then(r => r.data),

    getAuditLogsPaged: (projectId: number, page: number = 0, size: number = 20) =>
        api.get<{ content: import('../types').ProjectAuditLog[], totalElements: number, totalPages: number }>(
            `/projects/${projectId}/audit/paged`, { params: { page, size } }
        ).then(r => r.data),

    // Update a template (name/description)
    updateTemplate: (templateId: number, data: { name: string; description?: string }) =>
        api.put<import('../types').RuleProject>(`/projects/${templateId}`, data).then(r => r.data),
};

export default api;
