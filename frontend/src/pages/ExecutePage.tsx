import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Play, CheckCircle, XCircle, Clock, Zap, Workflow, History, ChevronDown, ChevronUp, Target, Eye } from 'lucide-react';
import { RuleProject, Schema, ExecuteResponse, FiredRule, SchemaProperty, ExecutionHistory, Rule } from '../types';
import { projectApi, schemaApi, ruleApi } from '../services/api';


interface ProjectContext {
    project?: RuleProject;
    loadProject?: () => Promise<void>;
}

// Helper function to generate default value based on property type
const getDefaultValue = (prop: SchemaProperty): unknown => {
    if (prop.defaultValue !== undefined) {
        return prop.defaultValue;
    }

    switch (prop.type) {
        case 'string':
            return '';
        case 'number':
        case 'integer':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return [];
        case 'object':
            if (prop.properties && prop.properties.length > 0) {
                const obj: Record<string, unknown> = {};
                prop.properties.forEach(p => {
                    obj[p.name] = getDefaultValue(p);
                });
                return obj;
            }
            return {};
        default:
            return null;
    }
};

// Generate JSON template from schema properties
const generateJsonTemplate = (schemas: Schema[]): string => {
    if (schemas.length === 0) {
        return '[\n  {\n    \n  }\n]';
    }

    // Use the first input schema to generate the template
    const schema = schemas[0];
    let properties: SchemaProperty[] = [];

    // Try to get properties from schema object
    if (schema.properties && schema.properties.length > 0) {
        properties = schema.properties;
    } else if (schema.jsonSchema) {
        // Parse from jsonSchema
        try {
            const parsed = JSON.parse(schema.jsonSchema);
            if (parsed.properties) {
                properties = Object.entries(parsed.properties).map(([key, val]: [string, any]) => ({
                    name: key,
                    type: val.type || 'string',
                    path: key,
                    required: parsed.required?.includes(key),
                    properties: val.properties ? Object.entries(val.properties).map(([k, v]: [string, any]) => ({
                        name: k,
                        type: v.type || 'string',
                        path: `${key}.${k}`,
                        required: val.required?.includes(k)
                    })) : undefined,
                    items: val.items ? {
                        name: 'item',
                        type: val.items.type || 'string',
                        path: `${key}[0]`
                    } : undefined,
                    enumValues: val.enum,
                    defaultValue: val.default
                }));
            }
        } catch (e) {
            console.error('Failed to parse jsonSchema', e);
        }
    }

    // Generate template object
    const template: Record<string, unknown> = {};
    properties.forEach(prop => {
        template[prop.name] = getDefaultValue(prop);
    });

    // Format as pretty JSON array
    return JSON.stringify([template], null, 2);
};

export default function ExecutePage() {
    const { projectId } = useParams<{ projectId?: string }>();
    const outletContext = useOutletContext<ProjectContext | undefined>();
    const contextProject = outletContext?.project;

    // Templates are projects with a parentProjectId (they contain the rules)
    const [templates, setTemplates] = useState<RuleProject[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
        projectId ? Number(projectId) : null
    );
    const [selectedTemplate, setSelectedTemplate] = useState<RuleProject | null>(
        contextProject || null
    );
    const [inputSchemas, setInputSchemas] = useState<Schema[]>([]);
    const [factsJson, setFactsJson] = useState('[\n  {\n    \n  }\n]');
    const [dryRun, setDryRun] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ExecuteResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
    const [rules, setRules] = useState<Rule[]>([]);
    const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
    const [loadingMatchPayload, setLoadingMatchPayload] = useState(false);
    const [showRulePreview, setShowRulePreview] = useState(false);

    // Load all templates (projects that have rules - i.e., child projects)
    useEffect(() => {
        if (projectId && contextProject) {
            // If in project context, check if it's a template (has parentProjectId)
            // or load its templates
            if (contextProject.parentProjectId) {
                // It's a template itself
                setSelectedTemplateId(Number(projectId));
                setSelectedTemplate(contextProject);
                setTemplates([contextProject]);
            } else {
                // It's a parent project - load its templates
                projectApi.getTemplates(Number(projectId)).then(loadedTemplates => {
                    setTemplates(loadedTemplates);
                    if (loadedTemplates.length === 1) {
                        // Auto-select if only one template
                        setSelectedTemplateId(loadedTemplates[0].id);
                    }
                }).catch(console.error);
            }
        } else {
            // Load all projects and extract templates
            const loadTemplates = async () => {
                try {
                    const allProjects = await projectApi.getAll();
                    // Get templates for each parent project
                    const templatesPromises = allProjects.map(p =>
                        projectApi.getTemplates(p.id).catch(() => [])
                    );
                    const templatesArrays = await Promise.all(templatesPromises);
                    const allTemplates = templatesArrays.flat();
                    setTemplates(allTemplates);
                } catch (err) {
                    console.error('Failed to load templates:', err);
                }
            };
            loadTemplates();

            const handleFocus = () => loadTemplates();
            window.addEventListener('focus', handleFocus);
            return () => window.removeEventListener('focus', handleFocus);
        }
    }, [projectId, contextProject]);

    useEffect(() => {
        if (selectedTemplateId) {
            const template = templates.find(t => t.id === selectedTemplateId);
            setSelectedTemplate(template || null);

            // Load input schemas for the selected template
            if (template && template.inputSchemas && template.inputSchemas.length > 0) {
                Promise.all(template.inputSchemas.map(schemaInfo =>
                    schemaApi.getById(schemaInfo.id)
                )).then(loadedSchemas => {
                    setInputSchemas(loadedSchemas);
                    // Generate and populate JSON template
                    const jsonTemplate = generateJsonTemplate(loadedSchemas);
                    setFactsJson(jsonTemplate);
                }).catch(console.error);
            } else {
                setInputSchemas([]);
                setFactsJson('[\n  {\n    \n  }\n]');
            }

            // Load rules for the template
            projectApi.getRules(selectedTemplateId).then(setRules).catch(console.error);
        } else {
            setSelectedTemplate(null);
            setInputSchemas([]);
            setFactsJson('[\n  {\n    \n  }\n]');
            setRules([]);
        }
    }, [selectedTemplateId, templates]);

    // Handler to generate matching payload for a rule
    const handleGenerateMatchPayload = async () => {
        if (!selectedRuleId) {
            setError('Please select a rule first');
            return;
        }

        try {
            setLoadingMatchPayload(true);
            setError(null);
            const payload = await ruleApi.getMatchPayload(selectedRuleId);

            // The backend will set the factType based on the rule's schema,
            // so we just need to send the raw fact data as an array
            setFactsJson(JSON.stringify([payload], null, 2));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to generate matching payload');
        } finally {
            setLoadingMatchPayload(false);
        }
    };

    const handleExecute = async () => {
        if (!selectedTemplateId) {
            setError('Please select a template');
            return;
        }

        let facts: Record<string, unknown>[];
        try {
            facts = JSON.parse(factsJson);
            if (!Array.isArray(facts)) {
                facts = [facts];
            }
        } catch (e) {
            setError('Invalid JSON. Please check your facts input.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const response = await projectApi.execute(selectedTemplateId!, {
                facts,
                dryRun,
            });

            setResult(response);

            // Reload execution history after successful execution (unless dry run)
            if (!dryRun && response.success && selectedTemplateId) {
                loadExecutionHistory(selectedTemplateId);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Execution failed');
        } finally {
            setLoading(false);
        }
    };

    const loadExecutionHistory = async (projectId: number) => {
        try {
            setLoadingHistory(true);
            const history = await projectApi.getExecutionHistory(projectId);
            setExecutionHistory(history);
        } catch (err) {
            console.error('Failed to load execution history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (selectedTemplateId && showHistory) {
            loadExecutionHistory(selectedTemplateId);
        }
    }, [selectedTemplateId, showHistory]);

    return (
        <div className="page animate-in">
            <div className="page-header">
                <div>
                    <h1>Rule Execution</h1>
                    <p className="text-muted">Execute rules for a template with test data</p>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: 'var(--space-2xl)' }}>
                {/* Input Section */}
                <div className="card shadow-sm">
                    <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                        <h3 className="text-lg">Input Configuration</h3>
                        <span className="status-pill active">JSON Mode</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rule Template</label>
                        <select
                            className="form-select"
                            value={selectedTemplateId || ''}
                            onChange={e => setSelectedTemplateId(Number(e.target.value) || null)}
                        >
                            <option value="">Choose a template to execute...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {selectedTemplate && (
                            <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                {selectedTemplate.description || 'No description'}
                            </p>
                        )}
                    </div>

                    {inputSchemas.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Input Context Schemas</label>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 'var(--space-xs)',
                                padding: 'var(--space-sm)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                {inputSchemas.map(schema => (
                                    <span
                                        key={schema.id}
                                        className="status-pill active"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {schema.name}
                                    </span>
                                ))}
                            </div>
                            <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                Facts should match the structure of these input schemas
                            </p>
                        </div>
                    )}

                    {/* Match This Rule Section */}
                    {rules.length > 0 && (
                        <div className="form-group" style={{
                            padding: 'var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08) 0%, rgba(167, 139, 250, 0.08) 100%)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                <Target size={18} style={{ color: 'var(--accent-primary)' }} />
                                <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Match This Rule</label>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                Generate test payload that satisfies a specific rule's conditions
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'stretch' }}>
                                <select
                                    className="form-select"
                                    value={selectedRuleId || ''}
                                    onChange={e => {
                                        setSelectedRuleId(Number(e.target.value) || null);
                                        setShowRulePreview(false);
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select a rule to match...</option>
                                    {rules.filter(r => r.enabled).map(rule => (
                                        <option key={rule.id} value={rule.id}>{rule.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setShowRulePreview(!showRulePreview)}
                                    disabled={!selectedRuleId}
                                    title="Preview Rule Conditions"
                                    style={{ padding: '8px 12px' }}
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleGenerateMatchPayload}
                                    disabled={!selectedRuleId || loadingMatchPayload}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {loadingMatchPayload ? (
                                        <div className="spinner" style={{ width: 14, height: 14 }} />
                                    ) : (
                                        <>
                                            <Target size={14} />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Rule Preview Panel */}
                            {showRulePreview && selectedRuleId && (() => {
                                const selectedRule = rules.find(r => r.id === selectedRuleId);
                                if (!selectedRule) return null;

                                return (
                                    <div style={{
                                        marginTop: 'var(--space-md)',
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                                                {selectedRule.name}
                                            </h4>
                                            <span className={`status-pill ${selectedRule.enabled ? 'active' : 'inactive'}`}>
                                                {selectedRule.enabled ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {selectedRule.description && (
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                                {selectedRule.description}
                                            </p>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', fontSize: '0.75rem' }}>
                                            <div>
                                                <span style={{ color: 'var(--text-muted)' }}>Priority:</span>{' '}
                                                <span style={{ fontWeight: 500 }}>{selectedRule.priority}</span>
                                            </div>
                                            {selectedRule.category && (
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Category:</span>{' '}
                                                    <span style={{ fontWeight: 500 }}>{selectedRule.category}</span>
                                                </div>
                                            )}
                                        </div>
                                        {selectedRule.definition?.conditions && (
                                            <div style={{ marginTop: 'var(--space-sm)' }}>
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                    Conditions ({selectedRule.definition.conditions.operator?.toUpperCase() || 'AND'})
                                                </span>
                                                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {selectedRule.definition.conditions.conditions?.map((c, i) => (
                                                        <div key={i} style={{
                                                            fontSize: '0.75rem',
                                                            padding: '4px 8px',
                                                            background: 'var(--bg-secondary)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontFamily: 'monospace'
                                                        }}>
                                                            {c.fact} <strong>{c.operator}</strong> {String(c.value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedRule.definition?.actions && selectedRule.definition.actions.length > 0 && (
                                            <div style={{ marginTop: 'var(--space-sm)' }}>
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                    Actions ({selectedRule.definition.actions.length})
                                                </span>
                                                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {selectedRule.definition.actions.map((a, i) => (
                                                        <div key={i} style={{
                                                            fontSize: '0.75rem',
                                                            padding: '4px 8px',
                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            color: 'var(--success-color)'
                                                        }}>
                                                            {a.type}: {a.targetField} = {String(a.value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                            <label className="form-label">Fact Sequences (Array)</label>
                            {inputSchemas.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const template = generateJsonTemplate(inputSchemas);
                                        setFactsJson(template);
                                    }}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-hover)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    Reset Template
                                </button>
                            )}
                        </div>
                        <div className="editor-container">
                            <textarea
                                className="form-textarea"
                                value={factsJson}
                                onChange={e => setFactsJson(e.target.value)}
                                placeholder='[\n  { "orderId": 1, "total": 1500 }\n]'
                                style={{ minHeight: 320, fontFamily: 'monospace' }}
                            />
                        </div>
                        {inputSchemas.length > 0 && (
                            <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                Template pre-filled based on input schema structure. Edit values as needed.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="flex items-center gap-sm cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={dryRun}
                                onChange={e => setDryRun(e.target.checked)}
                            />
                            <span className="text-sm font-medium">Dry Run Mode</span>
                        </label>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleExecute}
                            disabled={!selectedTemplateId || loading}
                            style={{ minWidth: 160 }}
                        >
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    <Zap size={18} />
                                    Execute
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="toast toast-error" style={{ marginTop: 'var(--space-lg)' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Results Section */}
                <div className="card shadow-sm">
                    <h3 className="text-lg" style={{ marginBottom: 'var(--space-xl)' }}>Execution Traces</h3>

                    {result ? (
                        <div className="animate-in">
                            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                                <div className="stat-item">
                                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Status</label>
                                    <div className={`status-pill ${result.success ? 'active' : 'inactive'}`} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                                        {result.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        {result.success ? 'Completed' : 'Failed'}
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Runtime</label>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={14} /> {result.executionTimeMs}ms
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Fired</label>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{result.firedRules?.length || 0} Rules</div>
                                </div>
                            </div>

                            {result.errorMessage && (
                                <div className="toast toast-error" style={{ marginBottom: 'var(--space-lg)' }}>
                                    {result.errorMessage}
                                </div>
                            )}

                            {result.firedRules && result.firedRules.length > 0 && (
                                <div className="trace-section" style={{ marginBottom: 'var(--space-lg)' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>Fired Rule Log</label>
                                    <div className="trace-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {result.firedRules.map((fr: FiredRule, i: number) => (
                                            <div key={i} className="trace-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 500 }}>
                                                    <Workflow size={14} color="var(--accent-primary)" />
                                                    {fr.ruleName}
                                                </div>
                                                <span className="status-pill active">x{fr.fireCount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="trace-section" style={{ marginBottom: 'var(--space-lg)' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>State Snapshot</label>
                                <pre className="drl-code-block" style={{ fontSize: '0.75rem', padding: 'var(--space-md)' }}>
                                    {JSON.stringify(result.resultFacts, null, 2)}
                                </pre>
                            </div>

                            {result.webhookResults && result.webhookResults.length > 0 && (
                                <div className="trace-section">
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>Network Traces</label>
                                    <div className="webhook-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {result.webhookResults.map((wr, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                                <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{wr.url}</span>
                                                <span className={`status-pill ${wr.success ? 'active' : 'inactive'}`}>
                                                    {wr.statusCode || 'N/A'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                            <Play size={40} className="text-muted" style={{ marginBottom: 'var(--space-md)' }} />
                            <h4>No Active Traces</h4>
                            <p className="text-muted">Select a project and provide facts to see the execution flow.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Execution History Section */}
            {selectedTemplateId && (
                <div className="card shadow-sm" style={{ marginTop: 'var(--space-xl)' }}>
                    <div
                        className="card-header-flex"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: showHistory ? 'var(--space-md)' : 0,
                            cursor: 'pointer',
                            padding: 'var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background var(--transition-fast)'
                        }}
                        onClick={() => setShowHistory(!showHistory)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <History size={20} />
                            <h3 className="text-lg" style={{ margin: 0 }}>Execution History</h3>
                            {executionHistory.length > 0 && (
                                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                    {executionHistory.length}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </div>

                    {showHistory && (
                        <div style={{ padding: 'var(--space-md)' }}>
                            {loadingHistory ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} />
                                </div>
                            ) : executionHistory.length === 0 ? (
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <History size={40} className="text-muted" style={{ marginBottom: 'var(--space-md)' }} />
                                    <h4>No Execution History</h4>
                                    <p className="text-muted">Execute rules to see execution history here.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {executionHistory.map(history => (
                                        <div
                                            key={history.id}
                                            style={{
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 'var(--space-md)',
                                                background: expandedHistoryId === history.id ? 'var(--bg-hover)' : 'var(--card-bg)',
                                                transition: 'all var(--transition-fast)',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setExpandedHistoryId(expandedHistoryId === history.id ? null : history.id)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    {history.success ? (
                                                        <CheckCircle size={18} style={{ color: 'var(--success-color)' }} />
                                                    ) : (
                                                        <XCircle size={18} style={{ color: 'var(--error-color)' }} />
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                                            {new Date(history.executedAt).toLocaleString()}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {history.firedRules?.length || 0} rule{(history.firedRules?.length || 0) !== 1 ? 's' : ''} fired
                                                            {history.dryRun && <span> • Dry Run</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                    {history.executionTimeMs != null && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                            {history.executionTimeMs}ms
                                                        </span>
                                                    )}
                                                    {expandedHistoryId === history.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {expandedHistoryId === history.id && (
                                                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                                                    {/* Fired Rules */}
                                                    {history.firedRules && history.firedRules.length > 0 && (
                                                        <div style={{ marginBottom: 'var(--space-md)' }}>
                                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                                                Fired Rules ({history.firedRules.length})
                                                            </h4>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                                                {history.firedRules.map((rule, idx) => (
                                                                    <div key={idx} style={{
                                                                        padding: 'var(--space-xs) var(--space-sm)',
                                                                        background: 'var(--bg-secondary)',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        fontSize: '0.8125rem'
                                                                    }}>
                                                                        <strong>{rule.ruleName}</strong> (fired {rule.fireCount} time{rule.fireCount !== 1 ? 's' : ''})
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Input Facts */}
                                                    {history.inputFacts && (
                                                        <div style={{ marginBottom: 'var(--space-md)' }}>
                                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                                                Input Facts
                                                            </h4>
                                                            <pre style={{
                                                                fontSize: '0.75rem',
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--bg-primary)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                overflow: 'auto',
                                                                maxHeight: '200px',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                {JSON.stringify(history.inputFacts, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {/* Output Facts */}
                                                    {history.outputFacts && (
                                                        <div style={{ marginBottom: 'var(--space-md)' }}>
                                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                                                Output Facts
                                                            </h4>
                                                            <pre style={{
                                                                fontSize: '0.75rem',
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--bg-primary)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                overflow: 'auto',
                                                                maxHeight: '200px',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                {JSON.stringify(history.outputFacts, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {/* Error Message */}
                                                    {history.errorMessage && (
                                                        <div style={{
                                                            padding: 'var(--space-sm)',
                                                            background: 'var(--error-bg)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            color: 'var(--error-color)',
                                                            fontSize: '0.8125rem'
                                                        }}>
                                                            <strong>Error:</strong> {history.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
