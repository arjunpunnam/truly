import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Database, Layout, Workflow, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Zap } from 'lucide-react';
import { RuleProject, Schema, Rule } from '../types';
import { projectApi } from '../services/api';

interface ProjectContext {
    project: RuleProject;
    loadProject: () => Promise<void>;
}

interface Template extends RuleProject {
    rules?: Rule[];
}

export default function ProjectOverviewPage() {
    const { project } = useOutletContext<ProjectContext>();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
    const [expandedSchemas, setExpandedSchemas] = useState(false);

    useEffect(() => {
        loadHierarchy();
    }, [project.id]);

    const loadHierarchy = async () => {
        try {
            setLoading(true);
            const [templatesData, schemasData] = await Promise.all([
                projectApi.getTemplates(project.id!),
                projectApi.getSchemas(project.id!)
            ]);

            // Load rules for each template
            const templatesWithRules = await Promise.all(
                templatesData.map(async (template: RuleProject) => {
                    try {
                        const rules = await projectApi.getRules(template.id!);
                        return { ...template, rules };
                    } catch {
                        return { ...template, rules: [] };
                    }
                })
            );

            setTemplates(templatesWithRules);
            setSchemas(schemasData);
        } catch (err) {
            console.error('Failed to load hierarchy', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleTemplate = (templateId: number) => {
        setExpandedTemplates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(templateId)) {
                newSet.delete(templateId);
            } else {
                newSet.add(templateId);
            }
            return newSet;
        });
    };

    const totalRules = templates.reduce((sum, t) => sum + (t.rules?.length || 0), 0);
    const isEmptyProject = schemas.length === 0 && templates.length === 0 && totalRules === 0;

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                <div className="spinner" />
            </div>
        );
    }

    // Show onboarding workflow for empty projects
    if (isEmptyProject) {
        return (
            <div className="animate-in">
                <div className="card" style={{
                    textAlign: 'center',
                    padding: 'var(--space-2xl)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <Zap size={48} style={{ color: 'var(--primary)', marginBottom: 'var(--space-lg)' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                        Welcome to {project.name}!
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2xl)', maxWidth: '500px', margin: '0 auto var(--space-2xl)' }}>
                        Follow these steps to set up your rule engine project
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-lg)',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        {/* Step 1 */}
                        <div
                            onClick={() => navigate('schemas')}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-lg)',
                                padding: 'var(--space-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '2px solid var(--primary)'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                flexShrink: 0
                            }}>1</div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                    <Database size={18} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontWeight: 600 }}>Define Schemas</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    Create data structures for your input and output contexts
                                </p>
                            </div>
                            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>

                        {/* Step 2 */}
                        <div
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-lg)',
                                padding: 'var(--space-lg)',
                                opacity: 0.6,
                                cursor: 'not-allowed'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                flexShrink: 0
                            }}>2</div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                    <Layout size={18} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ fontWeight: 600 }}>Create Templates (RuleSets)</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    Define contracts that group related rules together
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-lg)',
                                padding: 'var(--space-lg)',
                                opacity: 0.6,
                                cursor: 'not-allowed'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                flexShrink: 0
                            }}>3</div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                    <Workflow size={18} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ fontWeight: 600 }}>Build Rules</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    Create business rules with conditions and actions
                                </p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-lg)',
                                padding: 'var(--space-lg)',
                                opacity: 0.6,
                                cursor: 'not-allowed'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                flexShrink: 0
                            }}>4</div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                    <Zap size={18} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ fontWeight: 600 }}>Execute & Test</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    Test your rules with sample data and view results
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => navigate('schemas')}
                        style={{ marginTop: 'var(--space-2xl)' }}
                    >
                        <Database size={18} />
                        Start with Schemas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 'var(--space-lg)',
            alignItems: 'start'
        }}>
            {/* Left Column - Project Info & Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* Project Information */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Folder size={20} style={{ color: 'var(--primary)' }} />
                        Project Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Name
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{project.name}</div>
                        </div>
                        {project.description && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                    Description
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>{project.description}</div>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                    Created
                                </div>
                                <div>{new Date(project.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                    Last Updated
                                </div>
                                <div>{new Date(project.updatedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Zap size={20} style={{ color: 'var(--warning)' }} />
                        Quick Stats
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 'var(--space-md)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <Database size={24} style={{ color: '#60a5fa', marginBottom: 'var(--space-xs)' }} />
                            <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>{schemas.length}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Schemas</div>
                        </div>
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <Layout size={24} style={{ color: '#a78bfa', marginBottom: 'var(--space-xs)' }} />
                            <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>{templates.length}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Templates</div>
                        </div>
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <Workflow size={24} style={{ color: '#34d399', marginBottom: 'var(--space-xs)' }} />
                            <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>{totalRules}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rules</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Hierarchy Tree */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <FolderOpen size={20} style={{ color: 'var(--primary)' }} />
                    Project Structure
                </h3>

                <div className="hierarchy-tree" style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: '0.875rem'
                }}>
                    {/* Project Root */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        padding: 'var(--space-sm) 0',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}>
                        <Folder size={18} style={{ color: 'var(--primary)' }} />
                        {project.name}
                    </div>

                    {/* Schemas Section */}
                    <div style={{ marginLeft: 'var(--space-lg)' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-xs)',
                                padding: 'var(--space-xs) 0',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                            onClick={() => setExpandedSchemas(!expandedSchemas)}
                        >
                            {expandedSchemas ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Database size={16} style={{ color: '#60a5fa' }} />
                            <span>schemas ({schemas.length})</span>
                        </div>

                        {expandedSchemas && schemas.length > 0 && (
                            <div style={{ marginLeft: 'var(--space-xl)' }}>
                                {schemas.map(schema => (
                                    <div
                                        key={schema.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-xs)',
                                            padding: '4px 0',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => navigate(`/projects/${project.id}/schemas`)}
                                    >
                                        <FileText size={14} style={{ color: '#60a5fa' }} />
                                        <span>{schema.name}</span>
                                        <span style={{
                                            fontSize: '0.6875rem',
                                            background: 'rgba(96, 165, 250, 0.15)',
                                            color: '#60a5fa',
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-full)'
                                        }}>
                                            {schema.properties?.length || 0} props
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Templates Section */}
                    <div style={{ marginLeft: 'var(--space-lg)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            padding: 'var(--space-xs) 0',
                            color: 'var(--text-secondary)'
                        }}>
                            <Layout size={16} style={{ color: '#a78bfa' }} />
                            <span>templates ({templates.length})</span>
                        </div>

                        {templates.map(template => (
                            <div key={template.id} style={{ marginLeft: 'var(--space-xl)' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)',
                                        padding: '4px 0',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)'
                                    }}
                                    onClick={() => toggleTemplate(template.id)}
                                >
                                    {expandedTemplates.has(template.id)
                                        ? <ChevronDown size={14} />
                                        : <ChevronRight size={14} />
                                    }
                                    <Layout size={14} style={{ color: '#a78bfa' }} />
                                    <span>{template.name}</span>
                                    <span style={{
                                        fontSize: '0.6875rem',
                                        background: 'rgba(167, 139, 250, 0.15)',
                                        color: '#a78bfa',
                                        padding: '1px 6px',
                                        borderRadius: 'var(--radius-full)'
                                    }}>
                                        {template.rules?.length || 0} rules
                                    </span>
                                </div>

                                {/* Rules under template */}
                                {expandedTemplates.has(template.id) && template.rules && template.rules.length > 0 && (
                                    <div style={{ marginLeft: 'var(--space-xl)' }}>
                                        {template.rules.map(rule => (
                                            <div
                                                key={rule.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-xs)',
                                                    padding: '3px 0',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => navigate(`/projects/${project.id}/templates/${template.id}`)}
                                            >
                                                <Zap size={12} style={{ color: '#4ade80' }} />
                                                <span style={{ fontSize: '0.8125rem' }}>{rule.name}</span>
                                                <span style={{
                                                    fontSize: '0.625rem',
                                                    background: rule.enabled
                                                        ? 'rgba(74, 222, 128, 0.15)'
                                                        : 'rgba(148, 163, 184, 0.15)',
                                                    color: rule.enabled ? '#4ade80' : '#94a3b8',
                                                    padding: '1px 5px',
                                                    borderRadius: 'var(--radius-full)'
                                                }}>
                                                    {rule.enabled ? 'active' : 'inactive'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
