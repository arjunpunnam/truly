import { useState, useEffect, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Workflow, Plus, Trash2, Code, Power, X, Save, RefreshCw, Copy, ChevronRight, Eye } from 'lucide-react';
import { Schema, Rule, RuleDefinition, ConditionGroup, RuleAction, RuleProject as RuleTemplate } from '../types';
import { schemaApi, ruleApi, projectApi, projectApi as templateApi } from '../services/api';
import RuleBuilder from '../components/RuleBuilder/RuleBuilder';

const emptyConditions: ConditionGroup = { operator: 'all', conditions: [] };

interface ProjectContext {
    project?: RuleTemplate;
    loadProject?: () => Promise<void>;
}

export default function RulesPage() {
    const { projectId } = useParams<{ projectId?: string }>();
    const outletContext = useOutletContext<ProjectContext | undefined>();
    const project = outletContext?.project;
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [templates, setTemplates] = useState<RuleTemplate[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);
    const [expandedRuleId, setExpandedRuleId] = useState<number | 'new' | null>(null);
    const [showDrl, setShowDrl] = useState(false);
    const [drlContent, setDrlContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editor state (single source of truth for the currently expanded rule)
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState(0);
    const [editEnabled, setEditEnabled] = useState(true);
    const [editConditions, setEditConditions] = useState<ConditionGroup>(emptyConditions);
    const [editActions, setEditActions] = useState<RuleAction[]>([]);

    // Advanced Drools options
    const [editActivationGroup, setEditActivationGroup] = useState('');
    const [editLockOnActive, setEditLockOnActive] = useState(false);
    const [editDateEffective, setEditDateEffective] = useState('');
    const [editDateExpires, setEditDateExpires] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    const [previewRuleId, setPreviewRuleId] = useState<number | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            let schemasData: Schema[];
            let templatesData: RuleTemplate[];

            // If in project context, load project schemas and templates
            if (projectId && project) {
                [schemasData, templatesData] = await Promise.all([
                    projectApi.getSchemas(Number(projectId)),
                    projectApi.getTemplates(Number(projectId))
                ]);
            } else {
                // Global context
                [schemasData, templatesData] = await Promise.all([
                    schemaApi.getAll(),
                    templateApi.getAll()
                ]);
            }

            setSchemas(schemasData);
            setTemplates(templatesData);

            // Auto-select first template if available and none selected
            if (templatesData.length > 0 && !selectedTemplateId) {
                const firstTemplate = templatesData[0];
                setSelectedTemplateId(firstTemplate.id);
                // Load rules for the first template
                try {
                    const templateRules = await templateApi.getRules(firstTemplate.id);
                    setRules(templateRules);
                    if (firstTemplate.inputSchemas && firstTemplate.inputSchemas.length > 0) {
                        setSelectedSchemaId(firstTemplate.inputSchemas[0].id);
                    }
                } catch (err) {
                    console.error('Failed to load template rules:', err);
                    setRules([]);
                }
            } else if (selectedTemplateId) {
                // Load rules for the selected template
                try {
                    const templateRules = await templateApi.getRules(selectedTemplateId);
                    setRules(templateRules);
                    const selectedTemplate = templatesData.find(p => p.id === selectedTemplateId);
                    if (selectedTemplate && selectedTemplate.inputSchemas && selectedTemplate.inputSchemas.length > 0) {
                        setSelectedSchemaId(selectedTemplate.inputSchemas[0].id);
                    }
                } catch (err) {
                    console.error('Failed to load template rules:', err);
                    setRules([]);
                }
            } else {
                // No templates, load all rules
                const allRules = await ruleApi.getAll();
                setRules(allRules);
                if (schemasData.length > 0 && !selectedSchemaId) {
                    setSelectedSchemaId(schemasData[0].id);
                }
            }
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const handleFocus = () => loadData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Filter rules by selected template
    const filteredRules = selectedTemplateId
        ? rules.filter(r => r.projectId === selectedTemplateId)
        : rules;

    // Get the selected template and its schemas
    const selectedTemplate = templates.find(p => p.id === selectedTemplateId);
    const selectedSchema = selectedTemplate && selectedTemplate.inputSchemas && selectedTemplate.inputSchemas.length > 0
        ? schemas.find(s => s.id === selectedTemplate.inputSchemas![0].id)
        : schemas.find(s => s.id === selectedSchemaId);

    // Get input and output schemas for the selected template
    const inputSchemas = selectedTemplate && selectedTemplate.inputSchemas
        ? selectedTemplate.inputSchemas.map(schemaInfo => schemas.find(s => s.id === schemaInfo.id)).filter((s): s is Schema => s !== undefined)
        : [];
    const outputSchemas = selectedTemplate && selectedTemplate.outputSchemas
        ? selectedTemplate.outputSchemas.map(schemaInfo => schemas.find(s => s.id === schemaInfo.id)).filter((s): s is Schema => s !== undefined)
        : [];

    // Parse properties from the selected schema's jsonSchema string
    const parsedProperties = useMemo(() => {
        if (!selectedSchema?.jsonSchema) return [];
        try {
            const parsed = JSON.parse(selectedSchema.jsonSchema);
            if (parsed.properties) {
                return Object.entries(parsed.properties).map(([key, val]: [string, any]) => ({
                    name: key,
                    type: val.type || 'string',
                    path: key,
                    properties: val.properties ? Object.entries(val.properties).map(([k, v]: [string, any]) => ({
                        name: k, type: v.type || 'string', path: `${key}.${k}`
                    })) : undefined
                }));
            }
        } catch (e) {
            console.error("Failed to parse schema properties", e);
        }
        return [];
    }, [selectedSchema?.jsonSchema]);

    const toggleExpandRule = (ruleId: number | 'new') => {
        if (expandedRuleId === ruleId) {
            // Collapse
            setExpandedRuleId(null);
            return;
        }

        if (ruleId === 'new') {
            // Allow creating new rule without selected schema - handle in builder
            setEditName('');
            setEditDescription('');
            setEditPriority(0);
            setEditEnabled(true);
            setEditConditions(emptyConditions);
            setEditActions([]);
            // Reset advanced options
            setEditActivationGroup('');
            setEditLockOnActive(false);
            setEditDateEffective('');
            setEditDateExpires('');
            setShowAdvancedOptions(false);
            // maintain current selectedSchemaId if it exists, otherwise it's null
        } else {
            const rule = rules.find(r => r.id === ruleId);
            if (!rule) return;
            setEditName(rule.name);
            setEditDescription(rule.description || '');
            setEditPriority(rule.priority);
            setEditEnabled(rule.enabled);
            setEditConditions(rule.definition?.conditions || emptyConditions);
            setEditActions(rule.definition?.actions || []);
            // Load advanced options
            setEditActivationGroup(rule.activationGroup || rule.definition?.activationGroup || '');
            setEditLockOnActive(rule.lockOnActive || rule.definition?.lockOnActive || false);
            setEditDateEffective(rule.dateEffective || rule.definition?.dateEffective || '');
            setEditDateExpires(rule.dateExpires || rule.definition?.dateExpires || '');
            // Show advanced options if any are set
            setShowAdvancedOptions(
                !!(rule.activationGroup || rule.lockOnActive || rule.dateEffective || rule.dateExpires)
            );
            // Ensure we switch to the rule's schema context
            if (rule.schemaId !== selectedSchemaId) {
                setSelectedSchemaId(rule.schemaId);
            }
        }
        setExpandedRuleId(ruleId);
    };

    const handleRegenerateDrl = async (ruleId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Regenerate DRL for this rule? This will update the generated DRL with the latest transpiler logic.')) return;
        try {
            const updated = await ruleApi.regenerateDrl(ruleId);
            setRules(rules.map(r => r.id === ruleId ? updated : r));
            alert('DRL regenerated successfully!');
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to regenerate DRL';
            if (errorMessage.includes('not found')) {
                setError('Rule not found. The rule may have been deleted. Please refresh the page.');
                // Reload rules to sync with database
                loadData();
            } else {
                setError(errorMessage);
            }
        }
    };

    const handleCloneRule = async (rule: Rule, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Clone the rule by copying its definition
            const clonedName = `${rule.name} (Copy)`;

            // Deep copy conditions and actions to avoid reference issues
            const clonedConditions = rule.definition?.conditions
                ? JSON.parse(JSON.stringify(rule.definition.conditions))
                : emptyConditions;
            const clonedActions = rule.definition?.actions
                ? JSON.parse(JSON.stringify(rule.definition.actions))
                : [];

            // Set editor state with cloned data
            setEditName(clonedName);
            setEditDescription(rule.description || '');
            setEditPriority(rule.priority);
            setEditEnabled(rule.enabled);
            setEditConditions(clonedConditions);
            setEditActions(clonedActions);

            // Set the same schema as the original rule
            if (rule.schemaId) {
                setSelectedSchemaId(rule.schemaId);
            }

            // Set the same template as the original rule
            if (rule.projectId) {
                setSelectedTemplateId(rule.projectId);
            }

            // Expand the editor for the new rule
            setExpandedRuleId('new');
        } catch (err) {
            console.error('Failed to clone rule:', err);
            setError('Failed to clone rule');
        }
    };

    const handleSaveRule = async () => {
        if (!selectedTemplateId || !selectedSchemaId || !editName) return;

        const definition: RuleDefinition = {
            name: editName,
            description: editDescription,
            schemaId: selectedSchemaId,
            projectId: selectedTemplateId,
            priority: editPriority,
            enabled: editEnabled,
            conditions: editConditions,
            actions: editActions,
            // Advanced Drools options
            activationGroup: editActivationGroup || undefined,
            lockOnActive: editLockOnActive || undefined,
            dateEffective: editDateEffective || undefined,
            dateExpires: editDateExpires || undefined,
        };

        try {
            setSaving(true);
            setError(null);

            let savedRule: Rule;
            if (expandedRuleId !== 'new') {
                savedRule = await ruleApi.update(expandedRuleId as number, definition);
                setRules(prev => prev.map(r => r.id === savedRule.id ? savedRule : r));
            } else {
                savedRule = await ruleApi.create(definition);
                setRules(prev => [...prev, savedRule]);
            }

            setExpandedRuleId(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id: number) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            await ruleApi.delete(id);
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete rule');
        }
    };

    const handleToggleRule = async (id: number) => {
        try {
            const updated = await ruleApi.toggle(id);
            setRules(prev => prev.map(r => r.id === id ? updated : r));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to toggle rule');
        }
    };

    const viewDrl = async (id: number) => {
        try {
            const drl = await ruleApi.getDrl(id);
            setDrlContent(drl);
            setShowDrl(true);
        } catch (err: any) {
            setError('Failed to load DRL');
        }
    };

    const renderEditor = () => {
        // If creating new rule and no template selected, show template selector
        if (expandedRuleId === 'new' && !selectedTemplateId) {
            return (
                <div className="inline-editor animate-in">
                    <div className="editor-form card-flat" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)' }}>Select a Template</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                            Templates define the input/output schemas for your rules.
                        </p>
                        {templates.length === 0 ? (
                            <p style={{ color: 'var(--warning)' }}>
                                No templates available. Create a template in the Templates tab first.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: '400px', margin: '0 auto' }}>
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        className="card"
                                        onClick={async () => {
                                            setSelectedTemplateId(template.id);
                                            const templateRules = await templateApi.getRules(template.id);
                                            setRules(templateRules);
                                            if (template.inputSchemas && template.inputSchemas.length > 0) {
                                                setSelectedSchemaId(template.inputSchemas[0].id);
                                            }
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            border: '1px solid var(--border-color)',
                                            transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                            {template.name}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                            {template.inputSchemas?.length || 0} input • {template.outputSchemas?.length || 0} output schemas
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={() => setExpandedRuleId(null)}
                            style={{ marginTop: 'var(--space-lg)' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="inline-editor animate-in">
                <div className="editor-form card-flat">
                    {/* Show selected template */}
                    {expandedRuleId === 'new' && selectedTemplate && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 'var(--space-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <span style={{ fontSize: '0.875rem' }}>
                                Template: <strong>{selectedTemplate.name}</strong>
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setSelectedTemplateId(null)}
                            >
                                Change
                            </button>
                        </div>
                    )}

                    <div className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Rule Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                placeholder="Name your automation rule..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <input
                                type="number"
                                className="form-input"
                                value={editPriority}
                                onChange={e => setEditPriority(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <RuleBuilder
                        inputSchemas={inputSchemas}
                        outputSchemas={outputSchemas}
                        selectedSchemaId={selectedSchemaId}
                        onSchemaChange={(id) => {
                            setSelectedSchemaId(id);
                            // Properties will be updated via selectedSchema which depends on selectedSchemaId
                        }}
                        properties={parsedProperties}
                        conditions={editConditions}
                        actions={editActions}
                        onConditionsChange={setEditConditions}
                        onActionsChange={setEditActions}
                        projectId={selectedTemplateId || undefined}
                    />

                    {/* Advanced Drools Options */}
                    <div className="card-flat" style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)' }}>
                        <button
                            type="button"
                            className="btn btn-link"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            style={{
                                padding: 0,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-xs)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <ChevronRight
                                size={16}
                                style={{
                                    transform: showAdvancedOptions ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.2s'
                                }}
                            />
                            Advanced Options
                        </button>

                        {showAdvancedOptions && (
                            <div className="grid grid-2" style={{ marginTop: 'var(--space-md)', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Activation Group</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editActivationGroup}
                                        onChange={e => setEditActivationGroup(e.target.value)}
                                        placeholder="e.g., claim-decision"
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                        Only one rule in this group will fire (highest priority wins)
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <input
                                            type="checkbox"
                                            checked={editLockOnActive}
                                            onChange={e => setEditLockOnActive(e.target.checked)}
                                        />
                                        Lock on Active
                                    </label>
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                        Rule won't re-fire when facts are modified
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Effective Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editDateEffective}
                                        onChange={e => setEditDateEffective(e.target.value)}
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                        Rule becomes active on this date
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expiry Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editDateExpires}
                                        onChange={e => setEditDateExpires(e.target.value)}
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                                        Rule expires on this date
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="editor-actions">
                        <div className="flex items-center gap-sm">
                            <input
                                type="checkbox"
                                checked={editEnabled}
                                onChange={e => setEditEnabled(e.target.checked)}
                            />
                            <span className="text-sm font-medium">Enable immediately</span>
                        </div>
                        <div className="flex gap-sm">
                            <button className="btn btn-secondary" onClick={() => setExpandedRuleId(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveRule} disabled={saving || !editName || !selectedSchemaId}>
                                {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                                Save Rule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page animate-in">
            <div className="page-header">
                <div>
                    <h1>Automations</h1>
                    <p className="text-muted">Manage your business logic and transaction workflows</p>
                </div>
                <div className="page-actions">
                    <select
                        className="form-select"
                        value={selectedTemplateId || ''}
                        onChange={async e => {
                            const templateId = Number(e.target.value) || null;
                            setSelectedTemplateId(templateId);

                            // Load rules for the selected template
                            if (templateId) {
                                try {
                                    const templateRules = await templateApi.getRules(templateId);
                                    setRules(templateRules);
                                    // Set schema from template's input schemas
                                    const template = templates.find(p => p.id === templateId);
                                    if (template && template.inputSchemas && template.inputSchemas.length > 0) {
                                        setSelectedSchemaId(template.inputSchemas[0].id);
                                    }
                                } catch (err) {
                                    console.error('Failed to load template rules:', err);
                                    setRules([]);
                                }
                            } else {
                                // Load all rules if no template selected
                                const allRules = await ruleApi.getAll();
                                setRules(allRules);
                            }
                        }}
                        style={{ width: 220 }}
                    >
                        <option value="">All Templates</option>
                        {templates.map(template => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSelectedTemplateId(null); // Reset so template selector shows
                            toggleExpandRule('new');
                        }}
                        disabled={expandedRuleId === 'new'}
                    >
                        <Plus size={18} />
                        New Automation
                    </button>
                </div>
            </div>

            {error && (
                <div className="toast toast-error" style={{ marginBottom: 'var(--space-md)' }}>
                    {error}
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="spinner" />
                </div>
            ) : !selectedTemplateId ? (
                <div className="empty-state">
                    <Workflow size={48} />
                    <h3>Select a Template First</h3>
                    <p>Choose a template from the dropdown above to configure rules. Templates define the input/output schemas for your rules.</p>
                    {templates.length === 0 && (
                        <p style={{ color: 'var(--warning)', marginTop: 'var(--space-md)' }}>
                            No templates found. Create a template in the Templates tab first.
                        </p>
                    )}
                </div>
            ) : filteredRules.length === 0 && expandedRuleId !== 'new' ? (
                <div className="empty-state">
                    <Workflow size={48} />
                    <h3>Ready to automate?</h3>
                    <p>
                        Create rules for <strong>{selectedTemplate?.name}</strong> to automate your workflows.
                    </p>
                    <button className="btn btn-primary" onClick={() => toggleExpandRule('new')}>
                        <Plus size={18} />
                        Create First Rule
                    </button>
                </div>
            ) : (
                <div className="rules-list">
                    {/* New Rule Placeholder */}
                    {expandedRuleId === 'new' && (
                        <div className="rule-card expanded new-rule-card">
                            <div className="rule-card-header">
                                <h3 className="rule-name">New Automation Rule</h3>
                            </div>
                            {renderEditor()}
                        </div>
                    )}

                    {filteredRules.map(rule => (
                        <div key={rule.id} className={`rule-card animate-in ${expandedRuleId === rule.id ? 'expanded' : ''}`}>
                            <div className="rule-card-header" onClick={() => { if (expandedRuleId !== rule.id) toggleExpandRule(rule.id) }}>
                                <div className="rule-info">
                                    <div className="rule-title-row">
                                        <h3 className="rule-name">{rule.name}</h3>
                                        <span className={`status-pill ${rule.enabled ? 'active' : 'inactive'}`}>
                                            {rule.enabled ? 'Live' : 'Paused'}
                                        </span>
                                    </div>
                                    <div className="rule-meta">
                                        {rule.schemaName} • Priority {rule.priority}
                                    </div>
                                </div>
                                <div className="rule-actions-menu">
                                    {expandedRuleId !== rule.id ? (
                                        <>
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloneRule(rule, e);
                                                }}
                                                title="Clone rule"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRegenerateDrl(rule.id, e);
                                                }}
                                                title="Regenerate DRL"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpandRule(rule.id);
                                                }}
                                                title="Edit rule"
                                            >
                                                Edit
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedRuleId(null);
                                            }}
                                            title="Close editor"
                                        >
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>

                            {expandedRuleId === rule.id ? (
                                renderEditor()
                            ) : (
                                <>
                                    <div className="rule-card-body" onClick={() => toggleExpandRule(rule.id)}>
                                        <p className="rule-desc">{rule.description || 'No description provided.'}</p>
                                    </div>
                                    <div className="rule-card-footer">
                                        <div className="footer-left">
                                            <button
                                                className={`footer-btn ${previewRuleId === rule.id ? 'active' : ''}`}
                                                onClick={() => setPreviewRuleId(previewRuleId === rule.id ? null : rule.id)}
                                                style={previewRuleId === rule.id ? { background: 'var(--primary)', color: 'white' } : {}}
                                            >
                                                <Eye size={14} /> Preview
                                            </button>
                                            <button className="footer-btn" onClick={() => viewDrl(rule.id)}>
                                                <Code size={14} /> DRL
                                            </button>
                                            <button className="footer-btn" onClick={() => handleToggleRule(rule.id)}>
                                                <Power size={14} /> {rule.enabled ? 'Pause' : 'Resume'}
                                            </button>
                                        </div>
                                        <button className="footer-btn danger" onClick={() => handleDeleteRule(rule.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Inline Rule Preview - just like Execute page */}
                                    {previewRuleId === rule.id && (
                                        <div style={{
                                            marginTop: 'var(--space-md)',
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                                                    {rule.name}
                                                </h4>
                                                <span className={`status-pill ${rule.enabled ? 'active' : 'inactive'}`}>
                                                    {rule.enabled ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            {rule.description && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                                    {rule.description}
                                                </p>
                                            )}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', fontSize: '0.75rem' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Priority:</span>{' '}
                                                    <span style={{ fontWeight: 500 }}>{rule.priority}</span>
                                                </div>
                                                {rule.category && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Category:</span>{' '}
                                                        <span style={{ fontWeight: 500 }}>{rule.category}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {rule.definition?.conditions && (
                                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                        Conditions ({rule.definition.conditions.operator?.toUpperCase() || 'AND'})
                                                    </span>
                                                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {rule.definition.conditions.conditions?.map((c, i) => (
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
                                            {rule.definition?.actions && rule.definition.actions.length > 0 && (
                                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                        Actions ({rule.definition.actions.length})
                                                    </span>
                                                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {rule.definition.actions.map((a, i) => (
                                                            <div key={i} style={{
                                                                fontSize: '0.75rem',
                                                                padding: '4px 8px',
                                                                background: 'rgba(34, 197, 94, 0.1)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                color: 'var(--success-color)'
                                                            }}>
                                                                {a.type}: {a.targetField || a.factType} = {String(a.value)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showDrl && (
                <div className="modal-overlay" onClick={() => setShowDrl(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '90%' }}>
                        <div className="modal-header">
                            <h2>Expert DRL View</h2>
                            <button className="modal-close" onClick={() => setShowDrl(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <pre className="drl-code-block">
                                {drlContent}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
