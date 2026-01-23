import { useState, useEffect, useRef, useCallback } from 'react';
import { FileJson, Plus, Upload, Trash2, Eye, RefreshCw, ChevronRight, Database, ArrowLeft, Edit2, Save, X, Search, CheckSquare, Square, ChevronDown, Copy, Layers } from 'lucide-react';
import { Schema, SchemaProperty } from '../types';
import { schemaApi } from '../services/api';
import ObjectTree from '../components/ObjectTree/ObjectTree';

export default function SchemasPage() {
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importType, setImportType] = useState<'openapi' | 'json-schema' | 'example'>('openapi');
    const [importName, setImportName] = useState('');
    const [importContent, setImportContent] = useState('');
    const [importGroup, setImportGroup] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [previewEntities, setPreviewEntities] = useState<string[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    
    // Derived state for button enablement - more reliable than inline condition
    const canImport = (() => {
        if (importing) return false;
        if (importType === 'openapi') {
            if (step === 1) {
                return !!(importContent && importContent.trim());
            } else {
                return selectedEntities.length > 0;
            }
        } else {
            // JSON Schema or Example
            return !!(importName && importName.trim() && importContent && importContent.trim());
        }
    })();
    const [editingSchema, setEditingSchema] = useState<Schema | null>(null);
    const [customFields, setCustomFields] = useState<SchemaProperty[]>([]);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'>('string');
    const [savingSchema, setSavingSchema] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isScanningRef = useRef(false);
    const [entitySearchTerm, setEntitySearchTerm] = useState('');
    const [expandedSchemas, setExpandedSchemas] = useState<Set<number>>(new Set());
    const [schemaSearchTerm, setSchemaSearchTerm] = useState('');
    const [schemaFilter, setSchemaFilter] = useState<'all' | 'SWAGGER' | 'JSON_SCHEMA' | 'MANUAL'>('all');
    const [groupFilter, setGroupFilter] = useState<string>('all');

    const loadSchemas = async () => {
        try {
            setLoading(true);
            const data = await schemaApi.getAll();
            setSchemas(data);
        } catch (err) {
            setError('Failed to load schemas');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchemas();
    }, []);

    const handlePreview = useCallback(async (content?: string, autoScan = false) => {
        // Prevent multiple simultaneous scans
        if (isScanningRef.current) {
            return;
        }
        
        isScanningRef.current = true;
        setImporting(true);
        setError(null);
        
        try {
            const contentToScan = content || importContent;
            if (!contentToScan || !contentToScan.trim()) {
                setError('Please provide OpenAPI content to scan');
                return;
            }
            
            const preview = await schemaApi.previewOpenApi(contentToScan);
            
            // Safely extract entities from response
            let entities: string[] = [];
            if (preview && typeof preview === 'object') {
                if (Array.isArray(preview.entities)) {
                    entities = preview.entities.filter((e: any) => typeof e === 'string');
                } else if (Array.isArray(preview)) {
                    entities = preview.filter((e: any) => typeof e === 'string');
                } else if ((preview as any).entities && Array.isArray((preview as any).entities)) {
                    entities = (preview as any).entities.filter((e: any) => typeof e === 'string');
                }
            }
            
            // Update state safely
            setPreviewEntities(entities);
            
            if (entities.length > 0) {
                setSelectedEntities([...entities]);
                setStep(2);
            } else {
                setSelectedEntities([]);
                if (!autoScan) {
                    setError('No entities found in OpenAPI specification');
                }
            }
        } catch (err: any) {
            console.error('Preview error:', err);
            setPreviewEntities([]);
            setSelectedEntities([]);
            
            if (!autoScan) {
                const errorMessage = err?.response?.data?.message 
                    || (typeof err?.response?.data === 'string' ? err.response.data : null)
                    || err?.message
                    || 'Failed to parse OpenAPI. Please check the console for details.';
                setError(errorMessage);
            }
        } finally {
            setImporting(false);
            isScanningRef.current = false;
        }
    }, [importContent]);

    // Auto-scan when OpenAPI content changes - DISABLED to prevent crashes
    // User must manually click "Scan Entities" button
    useEffect(() => {
        // Only clear entities when switching away from OpenAPI
        if (importType !== 'openapi') {
            setPreviewEntities([]);
            setSelectedEntities([]);
        }
        
        // Clear any pending timeouts
        return () => {
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        };
    }, [importType]);

    const toggleEntity = (entity: string) => {
        try {
            if (!entity || typeof entity !== 'string') {
                console.warn('Invalid entity:', entity);
                return;
            }
            setSelectedEntities(prev => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return prevArray.includes(entity)
                    ? prevArray.filter(e => e !== entity)
                    : [...prevArray, entity];
            });
        } catch (err) {
            console.error('Error toggling entity:', err);
        }
    };

    const selectAllEntities = () => {
        // If there's a search term, only select filtered entities
        if (entitySearchTerm) {
            const filtered = filteredEntities;
            setSelectedEntities(prev => {
                const newSelection = new Set(prev);
                filtered.forEach(entity => newSelection.add(entity));
                return Array.from(newSelection);
            });
        } else {
            // Select all entities
            setSelectedEntities([...previewEntities]);
        }
    };

    const deselectAllEntities = () => {
        // If there's a search term, only deselect filtered entities
        if (entitySearchTerm) {
            const filtered = filteredEntities;
            setSelectedEntities(prev => prev.filter(e => !filtered.includes(e)));
        } else {
            // Deselect all entities
            setSelectedEntities([]);
        }
    };

    const filteredEntities = (previewEntities || []).filter(entity => {
        try {
            return entity && typeof entity === 'string' && entity.toLowerCase().includes((entitySearchTerm || '').toLowerCase());
        } catch (err) {
            console.error('Error filtering entities:', err);
            return true; // Show all if filter fails
        }
    });

    const handleImport = async () => {
        // For OpenAPI step 1, always call preview
        if (importType === 'openapi' && step === 1) {
            console.log('Scanning entities...', { importContent: importContent?.substring(0, 50) });
            await handlePreview();
            return;
        }

        // Validate inputs with trimmed values
        const trimmedName = importName?.trim();
        const trimmedContent = importContent?.trim();
        
        if (!trimmedName || !trimmedContent) {
            setError('Please fill in both schema name and content');
            return;
        }

        try {
            setImporting(true);
            setError(null);

            let newSchemas: Schema[] = [];
            const groupValue = importGroup?.trim() || undefined;
            switch (importType) {
                case 'openapi':
                    console.log('Importing OpenAPI entities:', { 
                        name: importName, 
                        selectedEntities: selectedEntities,
                        count: selectedEntities.length,
                        group: groupValue
                    });
                    newSchemas = await schemaApi.importOpenApi(importName, importContent, selectedEntities, groupValue);
                    console.log('Successfully imported schemas:', newSchemas);
                    break;
                case 'json-schema':
                    const s1 = await schemaApi.importJsonSchema(importName, importContent, groupValue);
                    newSchemas = [s1];
                    break;
                case 'example':
                    const s2 = await schemaApi.inferFromExample(importName, importContent, groupValue);
                    newSchemas = [s2];
                    break;
            }

            setSchemas(prev => [...prev, ...newSchemas]);
            setShowImportModal(false);
            setStep(1);
            setImportName('');
            setImportContent('');
            setImportGroup('');
            setUploadFile(null);
            setSelectedEntities([]);
            setPreviewEntities([]);
            setEntitySearchTerm('');
            if (newSchemas.length > 0) {
                setSelectedSchema(newSchemas[0]);
            }
        } catch (err: any) {
            const serverMessage = err.response?.data?.message
                || (typeof err.response?.data === 'string' ? err.response.data : null)
                || err.message
                || 'Failed to import schema';
            setError(serverMessage);
            console.error('Import Error:', err);
        } finally {
            setImporting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this schema?')) return;

        try {
            await schemaApi.delete(id);
            setSchemas(prev => prev.filter(s => s.id !== id));
            if (selectedSchema?.id === id) {
                setSelectedSchema(null);
            }
            setExpandedSchemas(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete schema');
        }
    };

    const handleCopySchemaJson = (schema: Schema) => {
        try {
            if (schema.jsonSchema) {
                navigator.clipboard.writeText(schema.jsonSchema);
                // Could show a toast notification here
            }
        } catch (err) {
            console.error('Failed to copy schema JSON:', err);
        }
    };

    // Get unique groups for filter dropdown
    const availableGroups = Array.from(new Set(schemas.map(s => s.group).filter(Boolean))) as string[];
    
    // Filter and search schemas
    const filteredSchemas = schemas.filter(schema => {
        const matchesSearch = !schemaSearchTerm || 
            schema.name.toLowerCase().includes(schemaSearchTerm.toLowerCase()) ||
            (schema.description && schema.description.toLowerCase().includes(schemaSearchTerm.toLowerCase())) ||
            (schema.group && schema.group.toLowerCase().includes(schemaSearchTerm.toLowerCase()));
        const matchesFilter = schemaFilter === 'all' || schema.source === schemaFilter;
        const matchesGroup = groupFilter === 'all' || (groupFilter === 'ungrouped' && !schema.group) || schema.group === groupFilter;
        return matchesSearch && matchesFilter && matchesGroup;
    });
    
    // Group schemas by group for display
    const groupedSchemas = filteredSchemas.reduce((acc, schema) => {
        const group = schema.group || 'Ungrouped';
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(schema);
        return acc;
    }, {} as Record<string, Schema[]>);
    
    const sortedGroups = Object.keys(groupedSchemas).sort((a, b) => {
        if (a === 'Ungrouped') return 1;
        if (b === 'Ungrouped') return -1;
        return a.localeCompare(b);
    });

    // Calculate statistics
    const schemaStats = {
        total: schemas.length,
        swagger: schemas.filter(s => s.source === 'SWAGGER').length,
        jsonSchema: schemas.filter(s => s.source === 'JSON_SCHEMA').length,
        manual: schemas.filter(s => s.source === 'MANUAL').length,
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>
                    <FileJson size={28} />
                    Schemas
                </h1>
                <div className="page-actions">
                    <button className="btn btn-ghost" onClick={loadSchemas}>
                        <RefreshCw size={18} />
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowImportModal(true)}
                        data-testid="import-schema-button-main"
                    >
                        <Upload size={18} />
                        Import Schema
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
            ) : (
                <div className="split-view">
                    <div className="split-view-sidebar">
                        {/* Search and Filter Section */}
                        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ marginBottom: 'var(--space-sm)' }}>
                                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                                    Schemas ({schemas.length})
                                </h4>
                                {/* Statistics */}
                                {schemas.length > 0 && (
                                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: 'var(--space-xs)' }}>
                                        {schemaStats.swagger > 0 && (
                                            <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                                                {schemaStats.swagger} Swagger
                                            </span>
                                        )}
                                        {schemaStats.jsonSchema > 0 && (
                                            <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                                                {schemaStats.jsonSchema} JSON
                                            </span>
                                        )}
                                        {schemaStats.manual > 0 && (
                                            <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                                                {schemaStats.manual} Manual
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Search Input */}
                            <div style={{ position: 'relative', marginBottom: 'var(--space-sm)' }}>
                                <Search size={14} style={{ position: 'absolute', left: 'var(--space-sm)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search schemas..."
                                    value={schemaSearchTerm}
                                    onChange={(e) => setSchemaSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-xs) var(--space-xs) var(--space-xs) 2rem',
                                        fontSize: '0.8125rem',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                            
                            {/* Group Filter */}
                            {availableGroups.length > 0 && (
                                <div style={{ marginBottom: 'var(--space-sm)' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                                        Group
                                    </label>
                                    <select
                                        value={groupFilter}
                                        onChange={(e) => setGroupFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-xs)',
                                            fontSize: '0.8125rem',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <option value="all">All Groups</option>
                                        <option value="ungrouped">Ungrouped</option>
                                        {availableGroups.map(group => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {/* Filter Buttons */}
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                                <button
                                    className={`btn btn-sm ${schemaFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setSchemaFilter('all')}
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                    All
                                </button>
                                <button
                                    className={`btn btn-sm ${schemaFilter === 'SWAGGER' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setSchemaFilter('SWAGGER')}
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                    Swagger
                                </button>
                                <button
                                    className={`btn btn-sm ${schemaFilter === 'JSON_SCHEMA' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setSchemaFilter('JSON_SCHEMA')}
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                    JSON
                                </button>
                                <button
                                    className={`btn btn-sm ${schemaFilter === 'MANUAL' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setSchemaFilter('MANUAL')}
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {schemas.length === 0 ? (
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <FileJson size={48} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                                    <p style={{ marginBottom: 'var(--space-sm)' }}>No schemas yet</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                                        Import schemas from OpenAPI, JSON Schema, or create them manually
                                    </p>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowImportModal(true)}>
                                        <Plus size={16} />
                                        Import your first schema
                                    </button>
                                </div>
                            ) : filteredSchemas.length === 0 ? (
                                <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                                    <Search size={32} style={{ opacity: 0.5, marginBottom: 'var(--space-sm)' }} />
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        No schemas match your search
                                    </p>
                                </div>
                            ) : (
                                sortedGroups.map(groupName => (
                                    <div key={groupName}>
                                        {sortedGroups.length > 1 && (
                                            <div style={{ 
                                                padding: 'var(--space-sm) var(--space-md)', 
                                                background: 'var(--bg-secondary)',
                                                borderBottom: '1px solid var(--border-color)',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {groupName} ({groupedSchemas[groupName].length})
                                            </div>
                                        )}
                                        {groupedSchemas[groupName].map(schema => {
                                            const isExpanded = expandedSchemas.has(schema.id);
                                            return (
                                                <div key={schema.id}>
                                                    <div
                                                        className={`schema-item ${selectedSchema?.id === schema.id ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setSelectedSchema(schema);
                                                            setExpandedSchemas(prev => {
                                                                const newSet = new Set(prev);
                                                                if (newSet.has(schema.id)) {
                                                                    newSet.delete(schema.id);
                                                                } else {
                                                                    newSet.add(schema.id);
                                                                }
                                                                return newSet;
                                                            });
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                                                            {isExpanded ? (
                                                                <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                            ) : (
                                                                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                            )}
                                                            <div className="schema-item-info" style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: '2px' }}>
                                                                    <span className="schema-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {schema.name}
                                                                    </span>
                                                                    <span className={`badge badge-info`} style={{ 
                                                                        fontSize: '0.6875rem', 
                                                                        padding: '2px 6px',
                                                                        flexShrink: 0,
                                                                        textTransform: 'capitalize'
                                                                    }}>
                                                                        {schema.source.toLowerCase().replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    <span>{schema.properties?.length || 0} properties</span>
                                                                    {schema.updatedAt && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{new Date(schema.updatedAt).toLocaleDateString()}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    handleCopySchemaJson(schema);
                                                                }}
                                                                title="Copy schema JSON"
                                                                style={{ padding: '4px' }}
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    handleDelete(schema.id); 
                                                                }}
                                                                title="Delete schema"
                                                                style={{ padding: '4px', color: 'var(--error)' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div style={{ 
                                                            padding: 'var(--space-md)', 
                                                            background: 'var(--bg-secondary)',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            borderTop: '1px solid var(--border-color)'
                                                        }}>
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center',
                                                                marginBottom: 'var(--space-sm)' 
                                                            }}>
                                                                <div>
                                                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                        Attributes
                                                                    </span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'var(--space-xs)' }}>
                                                                        ({schema.properties?.length || 0} properties)
                                                                    </span>
                                                                </div>
                                                                {schema.description && (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                        {schema.description}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ 
                                                                maxHeight: '400px', 
                                                                overflow: 'auto',
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--bg-primary)',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                {schema.properties && schema.properties.length > 0 ? (
                                                                    <ObjectTree properties={schema.properties} />
                                                                ) : (
                                                                    <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                                        <Layers size={24} style={{ opacity: 0.5, marginBottom: 'var(--space-sm)' }} />
                                                                        <p style={{ fontSize: '0.875rem' }}>No properties defined</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="split-view-main">
                        {selectedSchema ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                    <div>
                                        <h3 style={{ margin: 0 }}>{selectedSchema.name}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                                            Version {selectedSchema.version} • {selectedSchema.source}
                                            {selectedSchema.description && (
                                                <> • {selectedSchema.description}</>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setEditingSchema(selectedSchema);
                                            // Merge existing properties with any new custom fields
                                            const existingProps = selectedSchema.properties || [];
                                            setCustomFields([...existingProps]);
                                        }}
                                    >
                                        <Edit2 size={16} />
                                        Edit Schema
                                    </button>
                                </div>
                                
                                <div style={{ flex: 1, overflow: 'auto', marginTop: 'var(--space-lg)' }}>
                                    <div style={{ marginBottom: 'var(--space-md)' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            Attributes
                                        </h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                                            {selectedSchema.properties?.length || 0} properties
                                        </p>
                                    </div>
                                    <ObjectTree properties={selectedSchema.properties || []} />
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Eye size={32} />
                                <p>Click on a schema to view its attributes</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)} style={{ padding: '20px' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ 
                        maxWidth: '95vw', 
                        width: '1400px', 
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div className="modal-header" style={{ flexShrink: 0 }}>
                            <h2>Import Schema</h2>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ 
                            flex: 1, 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-md)'
                        }}>
                            {step === 1 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', height: '100%', overflow: 'hidden' }}>
                                    {/* Left Side - Input */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflow: 'hidden' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', flexShrink: 0 }}>
                                            <div className="form-group">
                                                <label className="form-label">Schema Name</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={importName}
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        setImportName(value);
                                                        // Clear error when user types
                                                        if (error && value.trim()) {
                                                            setError(null);
                                                        }
                                                    }}
                                                    onBlur={e => {
                                                        // Trim on blur for cleaner data
                                                        const trimmed = e.target.value.trim();
                                                        if (trimmed !== importName) {
                                                            setImportName(trimmed);
                                                        }
                                                    }}
                                                    placeholder="e.g., Order, Customer, Product"
                                                    data-testid="schema-name-input"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Group (Optional)</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={importGroup}
                                                    onChange={e => setImportGroup(e.target.value)}
                                                    onBlur={e => {
                                                        const trimmed = e.target.value.trim();
                                                        if (trimmed !== importGroup) {
                                                            setImportGroup(trimmed);
                                                        }
                                                    }}
                                                    placeholder="e.g., E-commerce, Finance"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ flexShrink: 0 }}>
                                            <label className="form-label">Import Type</label>
                                            <div className="tabs">
                                                <button
                                                    type="button"
                                                    className={`tab ${importType === 'openapi' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setImportType('openapi');
                                                        setStep(1);
                                                        setPreviewEntities([]);
                                                        setSelectedEntities([]);
                                                    }}
                                                    data-testid="import-type-openapi"
                                                >
                                                    OpenAPI/Swagger
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`tab ${importType === 'json-schema' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setImportType('json-schema');
                                                        setStep(1);
                                                        setPreviewEntities([]);
                                                        setSelectedEntities([]);
                                                    }}
                                                    data-testid="import-type-json-schema"
                                                >
                                                    JSON Schema
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`tab ${importType === 'example' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setImportType('example');
                                                        setStep(1);
                                                        setPreviewEntities([]);
                                                        setSelectedEntities([]);
                                                    }}
                                                    data-testid="import-type-example"
                                                >
                                                    JSON Example
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <label className="form-label">
                                                {importType === 'openapi' && 'OpenAPI/Swagger Content'}
                                                {importType === 'json-schema' && 'JSON Schema Content'}
                                                {importType === 'example' && 'JSON Example'}
                                            </label>
                                            <div style={{ marginBottom: 'var(--space-sm)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexShrink: 0 }}>
                                                <input
                                                    type="file"
                                                    accept={importType === 'openapi' ? '.json,.yaml,.yml' : '.json'}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setUploadFile(file);
                                                            try {
                                                                const text = await file.text();
                                                                setImportContent(text);
                                                                setError(null);
                                                                // Don't auto-scan - user must click "Scan Entities"
                                                            } catch (err) {
                                                                setError('Failed to read file');
                                                            }
                                                        }
                                                    }}
                                                    style={{ display: 'none' }}
                                                    id="schema-file-upload"
                                                />
                                                <label htmlFor="schema-file-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Upload size={16} />
                                                    Upload File
                                                </label>
                                                {uploadFile && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                        {uploadFile.name}
                                                    </span>
                                                )}
                                            </div>
                                            <textarea
                                                className="form-textarea"
                                                value={importContent}
                                                onChange={e => {
                                                    try {
                                                        const newContent = e.target.value;
                                                        setImportContent(newContent);
                                                        setUploadFile(null);
                                                        // Clear preview entities when content changes
                                                        if (importType === 'openapi') {
                                                            setPreviewEntities([]);
                                                            setSelectedEntities([]);
                                                            setError(null);
                                                        }
                                                        // Clear error when user types
                                                        if (error && newContent.trim()) {
                                                            setError(null);
                                                        }
                                                    } catch (err) {
                                                        console.error('Error updating content:', err);
                                                        // Don't crash - just log the error
                                                    }
                                                }}
                                                data-testid="schema-content-textarea"
                                                onBlur={async (e) => {
                                                    const value = e.target.value.trim();
                                                    
                                                    // Check if it's a URL first
                                                    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
                                                        setFetchingUrl(true);
                                                        setError(null);
                                                        try {
                                                            const response = await fetch(value);
                                                            if (!response.ok) {
                                                                throw new Error(`Failed to fetch: ${response.statusText}`);
                                                            }
                                                            const text = await response.text();
                                                            setImportContent(text);
                                                            // Don't auto-scan - user must click "Scan Entities"
                                                        } catch (err: any) {
                                                            setError(`Failed to fetch URL: ${err.message}`);
                                                        } finally {
                                                            setFetchingUrl(false);
                                                        }
                                                    } else if (value !== importContent && value.length > 0) {
                                                        // Trim on blur for cleaner data (but preserve structure)
                                                        setImportContent(value);
                                                    }
                                                }}
                                                placeholder={
                                                    importType === 'example'
                                                        ? '{\n  "orderId": 123,\n  "total": 99.99,\n  "customer": {\n    "name": "John",\n    "tier": "GOLD"\n  }\n}'
                                                        : importType === 'json-schema'
                                                            ? 'Paste JSON Schema here, or paste a URL:\nhttps://example.com/schema.json\n\nExample:\n{\n  "type": "object",\n  "properties": {\n    "orderId": { "type": "integer" },\n    "total": { "type": "number" }\n  }\n}'
                                                            : 'Paste OpenAPI YAML/JSON content here, or paste a URL:\nhttps://petstore.swagger.io/v2/swagger.json\n\nBlur the field to auto-fetch from URL'
                                                }
                                                style={{ 
                                                    flex: 1,
                                                    minHeight: '400px',
                                                    fontFamily: 'monospace', 
                                                    fontSize: '0.8125rem',
                                                    resize: 'none'
                                                }}
                                            />
                                            {fetchingUrl && (
                                                <div style={{ marginTop: 'var(--space-sm)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                    <div className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: '8px' }} />
                                                    Fetching from URL...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - Preview/Entities */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 'var(--space-md)',
                                        borderLeft: '1px solid var(--border-color)',
                                        paddingLeft: 'var(--space-lg)',
                                        overflow: 'hidden'
                                    }}>
                                        <div>
                                            <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1rem' }}>
                                                {previewEntities.length > 0 ? 'Discovered Entities' : 'Preview'}
                                            </h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
                                                {previewEntities.length > 0 
                                                    ? `Found ${previewEntities.length} entity/entities. Select them below to import.`
                                                    : importType === 'openapi' 
                                                        ? 'Enter OpenAPI/Swagger content, URL, or upload a file. Click "Scan Entities" to see available schemas.'
                                                        : importType === 'json-schema' 
                                                            ? 'Enter JSON Schema content, URL, or upload a file. The schema will be parsed automatically.'
                                                            : 'Enter a JSON example object. The schema will be inferred from the structure.'
                                                }
                                            </p>
                                        </div>
                                        
                                        {previewEntities.length > 0 ? (
                                            <div style={{ 
                                                flex: 1, 
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 'var(--space-md)'
                                            }}>
                                                {/* Selection Header with Search and Controls */}
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 'var(--space-sm)',
                                                    paddingBottom: 'var(--space-sm)',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}>
                                                    {/* Selection Count and Info */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: 'var(--space-sm)'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--space-xs)',
                                                            fontSize: '0.875rem',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                {selectedEntities.length}
                                                            </span>
                                                            <span>of</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                {previewEntities.length}
                                                            </span>
                                                            <span>selected</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={selectAllEntities}
                                                                style={{ 
                                                                    fontSize: '0.8125rem', 
                                                                    padding: 'var(--space-xs) var(--space-sm)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 'var(--space-xs)'
                                                                }}
                                                            >
                                                                <CheckSquare size={14} />
                                                                All
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={deselectAllEntities}
                                                                style={{ 
                                                                    fontSize: '0.8125rem', 
                                                                    padding: 'var(--space-xs) var(--space-sm)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 'var(--space-xs)'
                                                                }}
                                                            >
                                                                <Square size={14} />
                                                                None
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Search Input */}
                                                    <div style={{ position: 'relative' }}>
                                                        <Search size={16} style={{ 
                                                            position: 'absolute', 
                                                            left: 'var(--space-sm)', 
                                                            top: '50%', 
                                                            transform: 'translateY(-50%)', 
                                                            color: 'var(--text-muted)',
                                                            pointerEvents: 'none'
                                                        }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search entities..."
                                                            value={entitySearchTerm}
                                                            onChange={(e) => setEntitySearchTerm(e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: 'var(--space-sm) var(--space-sm) var(--space-sm) 2.5rem',
                                                                fontSize: '0.875rem',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-md)',
                                                                background: 'var(--bg-secondary)',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        />
                                                        {entitySearchTerm && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEntitySearchTerm('')}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 'var(--space-sm)',
                                                                    top: '50%',
                                                                    transform: 'translateY(-50%)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Entity List */}
                                                {filteredEntities.length === 0 ? (
                                                    <div style={{ 
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: 'var(--space-xl)',
                                                        color: 'var(--text-muted)',
                                                        textAlign: 'center'
                                                    }}>
                                                        <Search size={32} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                                                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                                            No entities match "{entitySearchTerm}"
                                                        </p>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => setEntitySearchTerm('')}
                                                            style={{ marginTop: 'var(--space-sm)' }}
                                                        >
                                                            Clear search
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ 
                                                        flex: 1, 
                                                        overflow: 'auto',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 'var(--space-xs)'
                                                    }}>
                                                        {filteredEntities.map(entity => {
                                                            const isSelected = selectedEntities.includes(entity);
                                                            return (
                                                                <label
                                                                    key={entity}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        padding: 'var(--space-md)',
                                                                        background: isSelected 
                                                                            ? 'var(--accent-glow)' 
                                                                            : 'var(--card-bg)',
                                                                        border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                                        borderRadius: 'var(--radius-md)',
                                                                        transition: 'all var(--transition-fast)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 'var(--space-md)',
                                                                        position: 'relative',
                                                                        userSelect: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isSelected) {
                                                                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                                                                            e.currentTarget.style.background = 'var(--bg-hover)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isSelected) {
                                                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                            e.currentTarget.style.background = 'var(--card-bg)';
                                                                        }
                                                                    }}
                                                                >
                                                                    {/* Checkbox */}
                                                                    <div style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        minWidth: '20px',
                                                                        border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        background: isSelected ? 'var(--primary-color)' : 'transparent',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all var(--transition-fast)',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {isSelected && (
                                                                            <span style={{
                                                                                color: 'white',
                                                                                fontSize: '12px',
                                                                                fontWeight: 'bold',
                                                                                lineHeight: 1
                                                                            }}>✓</span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Entity Icon */}
                                                                    <div style={{
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        background: isSelected 
                                                                            ? 'rgba(var(--primary-color-rgb), 0.1)' 
                                                                            : 'var(--bg-hover)',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        color: 'var(--primary-color)',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        <Database size={18} />
                                                                    </div>
                                                                    
                                                                    {/* Entity Name */}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ 
                                                                            fontWeight: 600,
                                                                            fontSize: '0.9375rem',
                                                                            color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                            marginBottom: '2px',
                                                                            wordBreak: 'break-word'
                                                                        }}>
                                                                            {entity}
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div style={{
                                                                                fontSize: '0.75rem',
                                                                                color: 'var(--text-muted)',
                                                                                marginTop: '2px'
                                                                            }}>
                                                                                Will be imported
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleEntity(entity)}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : importing && importType === 'openapi' ? (
                                            <div style={{ 
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto var(--space-md)' }} />
                                                    <p>Scanning for entities...</p>
                                                </div>
                                            </div>
                                        ) : importContent && importContent.trim() ? (
                                            <div style={{ 
                                                flex: 1, 
                                                overflow: 'auto',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 'var(--space-md)'
                                            }}>
                                                {importType === 'openapi' && previewEntities.length === 0 && (
                                                    <div style={{ 
                                                        marginBottom: 'var(--space-sm)', 
                                                        padding: 'var(--space-sm)', 
                                                        background: 'var(--accent-glow)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.875rem',
                                                        color: 'var(--text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-sm)'
                                                    }}>
                                                        <Database size={16} />
                                                        <span>Click "Scan Entities" or wait for auto-scan to discover entities...</span>
                                                    </div>
                                                )}
                                                <div style={{ 
                                                    fontSize: '0.75rem', 
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {importContent.length > 2000 
                                                        ? importContent.substring(0, 2000) + '\n\n... (content truncated for preview)'
                                                        : importContent
                                                    }
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ 
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <FileJson size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                                                    <p>Content will appear here</p>
                                                    {importType === 'openapi' && (
                                                        <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>
                                                            Click "Scan Entities" after entering content
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="entity-selection" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 'var(--space-md)' }}>
                                    {/* Header with Info and Selection Count */}
                                    <div style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--accent-glow)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            marginBottom: 'var(--space-xs)'
                                        }}>
                                            <Database size={18} style={{ color: 'var(--primary-color)' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                                                Select Entities to Import
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                            marginTop: 'var(--space-xs)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)'
                                        }}>
                                            <span>
                                                Found <strong style={{ color: 'var(--text-primary)' }}>{previewEntities.length}</strong> entities
                                            </span>
                                            <span style={{ color: 'var(--border-color)' }}>•</span>
                                            <span>
                                                <strong style={{ color: 'var(--primary-color)' }}>{selectedEntities.length}</strong> selected
                                            </span>
                                        </div>
                                    </div>

                                    {/* Search and Selection Controls */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-sm)',
                                        paddingBottom: 'var(--space-sm)',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        {/* Search Input */}
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ 
                                                position: 'absolute', 
                                                left: 'var(--space-sm)', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                color: 'var(--text-muted)',
                                                pointerEvents: 'none'
                                            }} />
                                            <input
                                                type="text"
                                                placeholder="Search entities..."
                                                value={entitySearchTerm}
                                                onChange={(e) => setEntitySearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--space-sm) var(--space-sm) var(--space-sm) 2.5rem',
                                                    fontSize: '0.875rem',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            {entitySearchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEntitySearchTerm('')}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 'var(--space-sm)',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Selection Actions */}
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={selectAllEntities}
                                                style={{ 
                                                    fontSize: '0.8125rem', 
                                                    padding: 'var(--space-xs) var(--space-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-xs)'
                                                }}
                                            >
                                                <CheckSquare size={14} />
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={deselectAllEntities}
                                                style={{ 
                                                    fontSize: '0.8125rem', 
                                                    padding: 'var(--space-xs) var(--space-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-xs)'
                                                }}
                                            >
                                                <Square size={14} />
                                                Deselect All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Entity List */}
                                    {previewEntities.length === 0 ? (
                                        <div style={{ 
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 'var(--space-xl)',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center'
                                        }}>
                                            <Database size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.3 }} />
                                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500, marginBottom: 'var(--space-xs)' }}>
                                                No entities found
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                Please go back and scan again
                                            </p>
                                        </div>
                                    ) : filteredEntities.length === 0 ? (
                                        <div style={{ 
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 'var(--space-xl)',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center'
                                        }}>
                                            <Search size={32} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500, marginBottom: 'var(--space-xs)' }}>
                                                No entities match "{entitySearchTerm}"
                                            </p>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setEntitySearchTerm('')}
                                                style={{ marginTop: 'var(--space-sm)' }}
                                            >
                                                Clear search
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            flex: 1, 
                                            overflow: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--space-xs)'
                                        }}>
                                            {filteredEntities.map(entity => {
                                                const isSelected = selectedEntities.includes(entity);
                                                return (
                                                    <label
                                                        key={entity}
                                                        style={{
                                                            cursor: 'pointer',
                                                            padding: 'var(--space-md)',
                                                            background: isSelected 
                                                                ? 'var(--accent-glow)' 
                                                                : 'var(--card-bg)',
                                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                            borderRadius: 'var(--radius-md)',
                                                            transition: 'all var(--transition-fast)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--space-md)',
                                                            position: 'relative',
                                                            userSelect: 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                                                e.currentTarget.style.background = 'var(--bg-hover)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                e.currentTarget.style.background = 'var(--card-bg)';
                                                            }
                                                        }}
                                                    >
                                                        {/* Checkbox */}
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            minWidth: '20px',
                                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: isSelected ? 'var(--primary-color)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all var(--transition-fast)',
                                                            flexShrink: 0
                                                        }}>
                                                            {isSelected && (
                                                                <span style={{
                                                                    color: 'white',
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold',
                                                                    lineHeight: 1
                                                                }}>✓</span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Entity Icon */}
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: isSelected 
                                                                ? 'rgba(var(--primary-color-rgb), 0.1)' 
                                                                : 'var(--bg-hover)',
                                                            borderRadius: 'var(--radius-md)',
                                                            color: 'var(--primary-color)',
                                                            flexShrink: 0
                                                        }}>
                                                            <Database size={18} />
                                                        </div>
                                                        
                                                        {/* Entity Name */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ 
                                                                fontWeight: 600,
                                                                fontSize: '0.9375rem',
                                                                color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                marginBottom: '2px',
                                                                wordBreak: 'break-word'
                                                            }}>
                                                                {entity}
                                                            </div>
                                                            {isSelected && (
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '2px'
                                                                }}>
                                                                    Will be imported
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleEntity(entity)}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <div className="modal-footer-left">
                                {step === 2 && (
                                    <button className="btn btn-ghost" onClick={() => setStep(1)}>
                                        <ArrowLeft size={18} />
                                        Back
                                    </button>
                                )}
                            </div>
                            <div className="modal-footer-right">
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowImportModal(false);
                                    setStep(1);
                                    setImportContent('');
                                    setUploadFile(null);
                                    setError(null);
                                    setEntitySearchTerm('');
                                    setPreviewEntities([]);
                                    setSelectedEntities([]);
                                }}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={async (e) => {
                                        try {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            // Validate before proceeding
                                            if (importType !== 'openapi' && (!importName?.trim() || !importContent?.trim())) {
                                                setError('Please fill in both schema name and content');
                                                return;
                                            }
                                            
                                            if (importType === 'openapi' && step === 1) {
                                                // Manual scan trigger
                                                if (!importContent || !importContent.trim()) {
                                                    setError('Please provide OpenAPI content to scan');
                                                    return;
                                                }
                                                
                                                try {
                                                    await handlePreview(importContent, false);
                                                } catch (err: any) {
                                                    console.error('Error in handlePreview:', err);
                                                    setError(err?.message || 'Failed to scan entities. Please check the console for details.');
                                                }
                                            } else {
                                                try {
                                                    await handleImport();
                                                } catch (err: any) {
                                                    console.error('Error in handleImport:', err);
                                                    setError(err?.message || 'Failed to import. Please check the console for details.');
                                                }
                                            }
                                        } catch (err: any) {
                                            console.error('Unexpected error in button click:', err);
                                            setError('An unexpected error occurred. Please check the console for details.');
                                        }
                                    }}
                                    disabled={!canImport}
                                    data-testid="import-schema-button"
                                    title={!canImport ? 
                                        (importType === 'openapi' && step === 1 ? 'Please provide OpenAPI content' :
                                         importType === 'openapi' && step === 2 ? 'Please select at least one entity' :
                                         'Please fill in schema name and content') : 
                                        'Import schema'}
                                >
                                    {importing ? <div className="spinner" style={{ width: 16, height: 16 }} /> :
                                        importType === 'openapi' && step === 1 ? <ChevronRight size={18} /> : <Plus size={18} />}
                                    {importing && importType === 'openapi' && step === 1 ? 'Scanning...' :
                                        importType === 'openapi' && step === 1 ? 'Scan Entities' :
                                        importType === 'openapi' && step === 2 ? `Import ${selectedEntities.length} Entities` : 'Import Schema'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Schema Modal */}
            {editingSchema && (
                <div className="modal-overlay" onClick={() => setEditingSchema(null)}>
                    <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Schema: {editingSchema.name}</h2>
                            <button className="modal-close" onClick={() => setEditingSchema(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Group (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editingSchema.group || ''}
                                    onChange={e => {
                                        setEditingSchema({ ...editingSchema, group: e.target.value });
                                    }}
                                    onBlur={e => {
                                        const trimmed = e.target.value.trim();
                                        if (trimmed !== editingSchema.group) {
                                            setEditingSchema({ ...editingSchema, group: trimmed || undefined });
                                        }
                                    }}
                                    placeholder="e.g., E-commerce, Finance"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Add Custom Field</label>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Field name"
                                        value={newFieldName}
                                        onChange={e => setNewFieldName(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        className="form-select"
                                        value={newFieldType}
                                        onChange={e => setNewFieldType(e.target.value as any)}
                                        style={{ width: '150px' }}
                                    >
                                        <option value="string">string</option>
                                        <option value="number">number</option>
                                        <option value="integer">integer</option>
                                        <option value="boolean">boolean</option>
                                        <option value="object">object</option>
                                        <option value="array">array</option>
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (newFieldName.trim()) {
                                                const newField: SchemaProperty = {
                                                    name: newFieldName.trim(),
                                                    path: newFieldName.trim(),
                                                    type: newFieldType,
                                                    description: '',
                                                    required: false
                                                };
                                                setCustomFields([...customFields, newField]);
                                                setNewFieldName('');
                                            }
                                        }}
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Schema Fields</label>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)' }}>
                                    {customFields.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                                            No fields yet. Add custom fields above.
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                            {customFields.map((field, index) => (
                                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 500 }}>{field.name}</span>
                                                        <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-sm)' }}>({field.type})</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => {
                                                            setCustomFields(customFields.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingSchema(null)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    try {
                                        setSavingSchema(true);
                                        // Convert customFields to schema format
                                        const schemaDefinition: SchemaProperty = {
                                            name: editingSchema.name,
                                            path: '',
                                            type: 'object',
                                            properties: customFields
                                        };
                                        await schemaApi.update(editingSchema.id, {
                                            schema: schemaDefinition,
                                            group: editingSchema.group
                                        });
                                        await loadSchemas();
                                        setEditingSchema(null);
                                    } catch (err: any) {
                                        setError(err.response?.data?.message || 'Failed to update schema');
                                    } finally {
                                        setSavingSchema(false);
                                    }
                                }}
                                disabled={savingSchema}
                            >
                                <Save size={16} />
                                {savingSchema ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .schema-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          transition: background var(--transition-fast);
        }
        .schema-item:hover {
          background: var(--bg-hover);
        }
        .schema-item.selected {
          background: var(--accent-glow);
        }
        .schema-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .schema-item-name {
          font-weight: 500;
        }
        .schema-item-source {
          font-size: 0.6875rem;
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-footer-right {
          display: flex;
          gap: var(--space-sm);
        }

        .info-alert {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--accent-glow);
          color: var(--primary-color);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
        }

        .entity-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--space-sm);
          max-height: 400px;
          overflow-y: auto;
          padding: 2px;
        }

        .entity-select-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-lg);
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          min-height: 120px;
          justify-content: center;
        }

        .entity-select-card:hover {
          border-color: var(--primary-color);
          background: var(--bg-hover);
          transform: translateY(-2px);
        }

        .entity-select-card.selected {
          border-color: var(--primary-color);
          background: var(--accent-glow);
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .entity-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-sm);
          color: var(--primary-color);
          position: relative;
        }

        .card-check {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          background: var(--primary-color);
          color: white;
          border-radius: 50%;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--card-bg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .entity-card-name {
          font-size: 0.875rem;
          font-weight: 500;
          text-align: center;
          word-break: break-word;
          line-height: 1.4;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
        </div>
    );
}
