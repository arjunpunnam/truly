import React, { useState, useEffect } from 'react';
import { Plus, Folder, Database, Layout, Workflow, Trash2, ArrowRight } from 'lucide-react';
import { projectApi } from '../services/api';
import { RuleProject } from '../types';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<RuleProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await projectApi.getAll();
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects', err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            setCreating(true);
            setError(null);
            await projectApi.create({
                name: newName,
                description: newDesc || undefined,
            });
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            loadProjects();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete project? This will delete all templates and rules inside it.')) return;

        try {
            await projectApi.delete(id);
            loadProjects();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete project');
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>
                        <Workflow size={32} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '12px', color: 'var(--accent-primary)' }} />
                        Truly Projects
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Manage your rule orchestration projects, schemas, and logic.
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus size={18} />
                        New Project
                    </button>
                </div>
            </div>

            {/* Workflow Guide */}
            {!projects.length && !loading && (
                <div style={{
                    background: 'linear-gradient(135deg, var(--bg-secondary) 0%, #f8fafc 100%)',
                    padding: 'var(--space-xl)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    marginBottom: 'var(--space-2xl)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <h3 style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>How to use Truly</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--space-lg)',
                        position: 'relative'
                    }}>
                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '48px', height: '48px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-md)',
                                boxShadow: 'var(--shadow-glow)'
                            }}>1</div>
                            <h4 style={{ marginBottom: 'var(--space-xs)' }}>Create Project</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Start by creating a container for your rules and schemas.
                            </p>
                        </div>

                        <Link to="/schemas" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, cursor: 'pointer' }}>
                                <div style={{
                                    width: '48px', height: '48px',
                                    background: 'var(--bg-secondary)',
                                    border: '2px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto var(--space-md)',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >2</div>
                                <h4 style={{ marginBottom: 'var(--space-xs)' }}>Define Schemas</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Import JSON schemas to define your data structure.
                                </p>
                            </div>
                        </Link>

                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '48px', height: '48px',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-md)'
                            }}>3</div>
                            <h4 style={{ marginBottom: 'var(--space-xs)' }}>Create Templates</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                (Optional) Define reusable rule patterns.
                            </p>
                        </div>

                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '48px', height: '48px',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-md)'
                            }}>4</div>
                            <h4 style={{ marginBottom: 'var(--space-xs)' }}>Build Rules</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Use the visual builder to create logic.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="toast toast-error" style={{ marginBottom: 'var(--space-md)' }}>
                    {error}
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Create New Project</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Project Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="e.g., Fraud Mitigation, Risk Assessment"
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
                                        placeholder="Describe what this project is for..."
                                        rows={3}
                                    />
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
                                    disabled={creating || !newName.trim()}
                                >
                                    {creating ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {projects.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                    <Folder size={64} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                    <h2 style={{ marginBottom: 'var(--space-sm)' }}>No projects yet</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                        Create a project to organize your schemas, templates, and rules
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} />
                        Create your first project
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-lg)'
                }}>
                    {projects.map(project => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="card" style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: 'var(--space-md)'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{
                                            margin: 0,
                                            marginBottom: 'var(--space-xs)',
                                            fontSize: '1.25rem',
                                            fontWeight: 600
                                        }}>
                                            {project.name}
                                        </h3>
                                        {project.description && (
                                            <p style={{
                                                color: 'var(--text-muted)',
                                                fontSize: '0.875rem',
                                                margin: 0,
                                                marginTop: 'var(--space-xs)'
                                            }}>
                                                {project.description}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(project.id, e);
                                        }}
                                        style={{
                                            padding: '4px',
                                            color: 'var(--error)',
                                            flexShrink: 0
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 'var(--space-md)',
                                    marginTop: 'auto',
                                    paddingTop: 'var(--space-md)',
                                    borderTop: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Database size={20} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Schemas
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
                                            {project.schemaCount || 0}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <Layout size={20} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Templates
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
                                            {project.templateCount || 0}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <Workflow size={20} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Rules
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
                                            {project.ruleCount || 0}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'var(--space-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    color: 'var(--primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}>
                                    Open Project
                                    <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
