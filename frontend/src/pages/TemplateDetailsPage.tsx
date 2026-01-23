
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Box, FileText, Settings, Pencil } from 'lucide-react';
import { projectApi, schemaApi } from '../services/api';
import { RuleProject, Schema } from '../types';

export default function TemplateDetailsPage() {
    const { projectId, templateId: templateIdParam } = useParams<{ projectId: string; templateId: string }>();
    const templateId = Number(templateIdParam);

    const [template, setTemplate] = useState<RuleProject | null>(null);
    const [inputSchemas, setInputSchemas] = useState<Schema[]>([]);
    const [outputSchemas, setOutputSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (templateId) {
            loadTemplate();
        }
    }, [templateId]);

    const loadTemplate = async () => {
        try {
            setLoading(true);
            const p = await projectApi.getById(templateId);
            setTemplate(p);

            // Load all input and output schemas
            const inputSchemaIds = p.inputSchemas?.map(s => s.id) || (p.inputSchemaId ? [p.inputSchemaId] : []);
            const outputSchemaIds = p.outputSchemas?.map(s => s.id) || (p.outputSchemaId ? [p.outputSchemaId] : []);

            const [loadedInputSchemas, loadedOutputSchemas] = await Promise.all([
                Promise.all(inputSchemaIds.map(id => schemaApi.getById(id))),
                Promise.all(outputSchemaIds.map(id => schemaApi.getById(id)))
            ]);

            setInputSchemas(loadedInputSchemas);
            setOutputSchemas(loadedOutputSchemas);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load template');
        } finally {
            setLoading(false);
        }
    };

    const getAllowedActionTypes = () => {
        if (!template?.allowedOutputTypes) return ['MODIFY', 'INSERT', 'LOG', 'WEBHOOK'];
        return template.allowedOutputTypes.split(',').filter(Boolean);
    };

    const actionTypeLabels: Record<string, { label: string; desc: string }> = {
        'MODIFY': { label: 'Modify Field', desc: 'Change attribute values' },
        'INSERT': { label: 'Create Fact', desc: 'Insert new facts' },
        'LOG': { label: 'Log Message', desc: 'Write to console' },
        'WEBHOOK': { label: 'Webhook', desc: 'Call external APIs' }
    };

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (error || !template) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--error)' }}>
                {error || 'Template not found'}
            </div>
        );
    }

    return (
        <div>
            <header style={{ marginBottom: 'var(--space-xl)' }}>
                <Link
                    to={`/projects/${projectId}/templates`}
                    className="btn btn-ghost btn-sm"
                    style={{ marginBottom: 'var(--space-md)' }}
                >
                    <ArrowLeft size={16} /> Back to Templates
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, marginBottom: 'var(--space-xs)', fontSize: '1.75rem', fontWeight: 700 }}>
                            {template.name}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            {template.description || 'No description'}
                        </p>
                    </div>
                    <button className="btn btn-secondary">
                        <Pencil size={16} />
                        Edit Configuration
                    </button>
                </div>
            </header>

            {/* Configuration Cards */}
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                {/* Input Schemas */}
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <div style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(96, 165, 250, 0.15)',
                            color: '#60a5fa'
                        }}>
                            <Box size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Input Schemas</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Source data for rule evaluation
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        {inputSchemas.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No input schemas configured</span>
                        ) : (
                            inputSchemas.map(schema => (
                                <span key={schema.id} className="badge badge-primary" style={{ fontSize: '0.8125rem' }}>
                                    {schema.name}
                                </span>
                            ))
                        )}
                    </div>
                </div>

                {/* Output Schemas */}
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <div style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(167, 139, 250, 0.15)',
                            color: '#a78bfa'
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Output Schemas</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Result produced by rules
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        {outputSchemas.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No output schemas configured</span>
                        ) : (
                            outputSchemas.map(schema => (
                                <span key={schema.id} className="badge badge-secondary" style={{ fontSize: '0.8125rem' }}>
                                    {schema.name}
                                </span>
                            ))
                        )}
                    </div>
                </div>

                {/* Allowed Actions */}
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <div style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(74, 222, 128, 0.15)',
                            color: '#4ade80'
                        }}>
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Allowed Action Types</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Actions that rules can perform
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        {getAllowedActionTypes().map(actionType => {
                            const info = actionTypeLabels[actionType] || { label: actionType, desc: '' };
                            return (
                                <div key={actionType} style={{
                                    padding: 'var(--space-sm) var(--space-md)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{info.label}</div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{info.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Drools Configuration */}
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <div style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24'
                        }}>
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Drools Configuration</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Advanced rule engine settings
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Activation Group
                            </div>
                            <div style={{ fontWeight: 500 }}>
                                {template.activationGroup || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                                Only one rule in this group fires
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Agenda Group
                            </div>
                            <div style={{ fontWeight: 500 }}>
                                {template.agendaGroup || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                                Rules are grouped for selective firing
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Lock on Active
                            </div>
                            <div style={{ fontWeight: 500 }}>
                                {template.lockOnActive ? (
                                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Enabled</span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Disabled</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                                Prevents rule re-firing on modifications
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Auto Focus
                            </div>
                            <div style={{ fontWeight: 500 }}>
                                {template.autoFocus ? (
                                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Enabled</span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Disabled</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                                Auto-activates agenda group on match
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
