import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Upload, Database, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import { schemaApi, projectApi } from '../services/api';
import { Schema, RuleProject } from '../types';
import SchemaImportForm from '../components/SchemaImportForm';
import SchemaAttributeEditor from '../components/SchemaAttributeEditor';

interface ProjectContext {
    project: RuleProject;
    loadProject: () => Promise<void>;
}

export default function ProjectSchemasPage() {
    const { project } = useOutletContext<ProjectContext>();
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [globalSchemas, setGlobalSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImport, setShowImport] = useState(false);
    const [viewMode, setViewMode] = useState<'project' | 'global' | 'all'>('all');
    const [expandedSchema, setExpandedSchema] = useState<number | null>(null);


    useEffect(() => {
        if (project.id) {
            loadSchemas();
        }
    }, [project.id]);

    const loadSchemas = async () => {
        try {
            setLoading(true);
            const [projectSchemasData, globalSchemasData] = await Promise.all([
                projectApi.getSchemas(project.id!),
                schemaApi.getAll().then(all => all.filter(s => !s.projectId))
            ]);
            setSchemas(projectSchemasData);
            setGlobalSchemas(globalSchemasData);
        } catch (err) {
            console.error('Failed to load schemas', err);

        } finally {
            setLoading(false);
        }
    };

    const toggleSchema = (schemaId: number) => {
        setExpandedSchema(prev => prev === schemaId ? null : schemaId);
    };



    const displayedSchemas = viewMode === 'project'
        ? schemas.filter(s => s.projectId === project.id)
        : viewMode === 'global'
            ? globalSchemas
            : [...schemas.filter(s => s.projectId === project.id), ...globalSchemas];

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
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <button
                        className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('all')}
                    >
                        All Schemas
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === 'project' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('project')}
                    >
                        <Database size={16} />
                        Project Schemas ({schemas.filter(s => s.projectId === project.id).length})
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === 'global' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('global')}
                    >
                        <Globe size={16} />
                        Global Schemas ({globalSchemas.length})
                    </button>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowImport(true)}
                >
                    <Plus size={18} />
                    Add Schema
                </button>
            </div>

            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
                        <div className="modal-header">
                            <h2>Add Schema to Project</h2>
                            <button className="modal-close" onClick={() => setShowImport(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'auto' }}>
                            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-muted)' }}>
                                Create a new schema or import from OpenAPI, JSON Schema, or JSON example.
                            </p>
                            <SchemaImportForm
                                projectId={project.id}
                                onSuccess={() => {
                                    setShowImport(false);
                                    loadSchemas();
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {displayedSchemas.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                    <Database size={64} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>
                        {viewMode === 'project' ? 'No project schemas yet' :
                            viewMode === 'global' ? 'No global schemas available' :
                                'No schemas available'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                        {viewMode === 'project'
                            ? 'Import schemas into this project to get started'
                            : 'Import schemas to make them available'}
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                        <Upload size={18} />
                        Import Schema
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {displayedSchemas.map(schema => (
                        <div key={schema.id} className="card" style={{ overflow: 'hidden' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    cursor: 'pointer'
                                }}
                                onClick={() => toggleSchema(schema.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                                    <div style={{ paddingTop: '2px' }}>
                                        {expandedSchema === schema.id ? (
                                            <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                                        ) : (
                                            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, marginBottom: 'var(--space-xs)' }}>
                                            {schema.name}
                                            {schema.projectId === project.id && (
                                                <span className="badge badge-info" style={{ marginLeft: 'var(--space-xs)', fontSize: '0.75rem' }}>
                                                    Project
                                                </span>
                                            )}
                                            {!schema.projectId && (
                                                <span className="badge badge-info" style={{ marginLeft: 'var(--space-xs)', fontSize: '0.75rem' }}>
                                                    Global
                                                </span>
                                            )}
                                        </h4>
                                        {schema.description && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                                                {schema.description}
                                            </p>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            gap: 'var(--space-md)',
                                            marginTop: 'var(--space-sm)',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <span>Source: {schema.source}</span>
                                            {schema.group && <span>Group: {schema.group}</span>}
                                            <span>{schema.properties?.length || 0} properties</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded attribute editor */}
                            {expandedSchema === schema.id && (
                                <div style={{
                                    marginTop: 'var(--space-lg)',
                                    paddingTop: 'var(--space-lg)',
                                    borderTop: '1px solid var(--border-color)'
                                }}>
                                    <SchemaAttributeEditor
                                        schemaId={schema.id}
                                        schemaName={schema.name}
                                        onUpdate={() => loadSchemas()}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

