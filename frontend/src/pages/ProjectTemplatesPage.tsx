import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, Layout, Trash2, ArrowRight, Box, FileText, Pencil } from 'lucide-react';
import { projectApi } from '../services/api';
import { RuleProject, Schema } from '../types';

interface ProjectContext {
    project: RuleProject;
    loadProject: () => Promise<void>;
}

export default function ProjectTemplatesPage() {
    const { project } = useOutletContext<ProjectContext>();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<RuleProject[]>([]);
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<RuleProject | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [inputSchemaIds, setInputSchemaIds] = useState<number[]>([]);
    const [outputSchemaIds, setOutputSchemaIds] = useState<number[]>([]);
    const [allowedOutputTypes, setAllowedOutputTypes] = useState<string[]>(['MODIFY', 'INSERT', 'LOG', 'WEBHOOK']);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [project.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, schemasData] = await Promise.all([
                projectApi.getTemplates(project.id!),
                projectApi.getSchemas(project.id!)
            ]);
            setTemplates(templatesData);
            setSchemas(schemasData);
        } catch (err) {
            console.error('Failed to load data', err);
            setError('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputSchemaIds.length === 0 || outputSchemaIds.length === 0) {
            setError('Please select at least one input and one output schema');
            return;
        }

        try {
            setCreating(true);
            setError(null);
            await projectApi.createTemplate(project.id!, {
                name: newName,
                description: newDesc,
                inputSchemaIds: inputSchemaIds.length > 0 ? inputSchemaIds : undefined,
                outputSchemaIds: outputSchemaIds.length > 0 ? outputSchemaIds : undefined,
                inputSchemaId: inputSchemaIds.length === 1 ? inputSchemaIds[0] : undefined,
                outputSchemaId: outputSchemaIds.length === 1 ? outputSchemaIds[0] : undefined,
                allowedOutputTypes: allowedOutputTypes.length > 0 ? allowedOutputTypes.join(',') : undefined
            });
            setShowCreate(false);
            resetForm();
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create template');
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewDesc('');
        setInputSchemaIds([]);
        setOutputSchemaIds([]);
        setAllowedOutputTypes(['MODIFY', 'INSERT', 'LOG', 'WEBHOOK']);
    };

    const toggleInputSchema = (schemaId: number) => {
        setInputSchemaIds(prev =>
            prev.includes(schemaId)
                ? prev.filter(id => id !== schemaId)
                : [...prev, schemaId]
        );
    };

    const toggleOutputSchema = (schemaId: number) => {
        setOutputSchemaIds(prev =>
            prev.includes(schemaId)
                ? prev.filter(id => id !== schemaId)
                : [...prev, schemaId]
        );
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete template? This will delete all rules inside it.')) return;

        try {
            await projectApi.delete(id);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete template');
        }
    };

    const openEdit = (template: RuleProject, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingTemplate(template);
        setNewName(template.name);
        setNewDesc(template.description || '');
        setInputSchemaIds(template.inputSchemas?.map(s => s.id) || []);
        setOutputSchemaIds(template.outputSchemas?.map(s => s.id) || []);
        setAllowedOutputTypes(template.allowedOutputTypes?.split(',').filter(Boolean) || ['MODIFY', 'INSERT', 'LOG', 'WEBHOOK']);
        setShowEdit(true);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        try {
            setCreating(true);
            setError(null);
            // Use same API but for update - we'll need to add an update endpoint
            // For now, reuse existing template creation flow
            await projectApi.updateTemplate(editingTemplate.id, {
                name: newName,
                description: newDesc,
            });
            setShowEdit(false);
            setEditingTemplate(null);
            resetForm();
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update template');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-lg)'
            }}>
                <h2 style={{ margin: 0 }}>Templates</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreate(true)}
                    disabled={schemas.length === 0}
                >
                    <Plus size={18} />
                    New Template
                </button>
            </div>

            {error && (
                <div className="toast toast-error" style={{ marginBottom: 'var(--space-md)' }}>
                    {error}
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h2>Create Template</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Template Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="e.g., Fraud Detection, Risk Scoring"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        placeholder="Describe what this template does..."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Input Schemas *</label>
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-sm)'
                                    }}>
                                        {schemas.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-md)' }}>
                                                No schemas available. Import schemas first.
                                            </p>
                                        ) : (
                                            schemas.map(schema => (
                                                <label key={schema.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-sm)',
                                                    padding: 'var(--space-xs)',
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={inputSchemaIds.includes(schema.id)}
                                                        onChange={() => toggleInputSchema(schema.id)}
                                                    />
                                                    <span>{schema.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Output Schemas *</label>
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-sm)'
                                    }}>
                                        {schemas.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-md)' }}>
                                                No schemas available. Import schemas first.
                                            </p>
                                        ) : (
                                            schemas.map(schema => (
                                                <label key={schema.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-sm)',
                                                    padding: 'var(--space-xs)',
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={outputSchemaIds.includes(schema.id)}
                                                        onChange={() => toggleOutputSchema(schema.id)}
                                                    />
                                                    <span>{schema.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Allowed Action Types</label>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                        Select which action types can be used in rules created from this template.
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--space-lg)',
                                        flexWrap: 'wrap'
                                    }}>
                                        {[
                                            { value: 'MODIFY', label: 'Modify Field', desc: 'Change attribute values' },
                                            { value: 'INSERT', label: 'Create Fact', desc: 'Insert new facts' },
                                            { value: 'LOG', label: 'Log Message', desc: 'Write to console' },
                                            { value: 'WEBHOOK', label: 'Webhook', desc: 'Call external APIs' }
                                        ].map(action => (
                                            <label key={action.value} style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 'var(--space-xs)',
                                                cursor: 'pointer',
                                                padding: 'var(--space-sm)',
                                                background: allowedOutputTypes.includes(action.value)
                                                    ? 'rgba(99, 102, 241, 0.1)'
                                                    : 'var(--bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: allowedOutputTypes.includes(action.value)
                                                    ? '1px solid var(--primary)'
                                                    : '1px solid var(--border-color)',
                                                minWidth: '140px'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allowedOutputTypes.includes(action.value)}
                                                    onChange={() => {
                                                        setAllowedOutputTypes(prev =>
                                                            prev.includes(action.value)
                                                                ? prev.filter(t => t !== action.value)
                                                                : [...prev, action.value]
                                                        );
                                                    }}
                                                    style={{ marginTop: '2px' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{action.label}</div>
                                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreate(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating || inputSchemaIds.length === 0 || outputSchemaIds.length === 0}
                                >
                                    {creating ? 'Creating...' : 'Create Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {templates.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                    <Layout size={64} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>No templates yet</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                        Create a template from project schemas to define input/output contracts
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreate(true)}
                        disabled={schemas.length === 0}
                    >
                        <Plus size={18} />
                        Create Template
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {templates.map(template => (
                        <div
                            key={template.id}
                            className="card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/projects/${project.id}/templates/${template.id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, marginBottom: 'var(--space-xs)' }}>
                                        {template.name}
                                    </h4>
                                    {template.description && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                                            {template.description}
                                        </p>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--space-lg)',
                                        marginTop: 'var(--space-md)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                            <Box size={16} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {template.inputSchemas?.length || 0} input
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                            <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {template.outputSchemas?.length || 0} output
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => openEdit(template, e)}
                                        title="Edit template"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(template.id, e);
                                        }}
                                        style={{ color: 'var(--error)' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Template Modal */}
            {showEdit && editingTemplate && (
                <div className="modal-backdrop" onClick={() => { setShowEdit(false); setEditingTemplate(null); resetForm(); }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleEdit}>
                            <div className="modal-header">
                                <h3>Edit Template</h3>
                            </div>
                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>
                                        {error}
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowEdit(false); setEditingTemplate(null); resetForm(); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating}
                                >
                                    {creating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
