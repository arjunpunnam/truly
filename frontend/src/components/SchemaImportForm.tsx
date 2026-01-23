import { useState, useRef, useCallback } from 'react';
import { Upload, CheckSquare, Square } from 'lucide-react';
import { schemaApi } from '../services/api';


interface SchemaImportFormProps {
    projectId?: number;
    onSuccess?: () => void;
}

export default function SchemaImportForm({ projectId, onSuccess }: SchemaImportFormProps) {
    const [importType, setImportType] = useState<'manual' | 'openapi' | 'json-schema' | 'example'>('manual');
    const [importName, setImportName] = useState('');
    const [importContent, setImportContent] = useState('');
    const [importGroup, setImportGroup] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [previewEntities, setPreviewEntities] = useState<string[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    const [entitySearchTerm, setEntitySearchTerm] = useState('');
    const [_uploadFile, setUploadFile] = useState<File | null>(null);

    // Manual schema creation state
    interface ManualAttribute {
        name: string;
        type: string;
        description: string;
    }
    const [manualAttributes, setManualAttributes] = useState<ManualAttribute[]>([
        { name: '', type: 'string', description: '' }
    ]);


    const isScanningRef = useRef(false);

    const handlePreview = useCallback(async () => {
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setImporting(true);
        setError(null);

        try {
            const contentToScan = importContent;
            if (!contentToScan || !contentToScan.trim()) {
                setError('Please provide OpenAPI content to scan');
                return;
            }

            const preview = await schemaApi.previewOpenApi(contentToScan);
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

            setPreviewEntities(entities);
            if (entities.length > 0) {
                setStep(2);
            } else {
                setError('No entities found in OpenAPI specification');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to preview OpenAPI');
        } finally {
            setImporting(false);
            isScanningRef.current = false;
        }
    }, [importContent]);

    const handleImport = async () => {
        if (importType === 'openapi' && step === 1) {
            await handlePreview();
            return;
        }

        const trimmedName = importName?.trim();

        // Validation based on import type
        if (!trimmedName) {
            setError('Please provide a schema name');
            return;
        }

        if (importType === 'manual') {
            const validAttributes = manualAttributes.filter(a => a.name.trim());
            if (validAttributes.length === 0) {
                setError('Please add at least one attribute');
                return;
            }
        } else {
            const trimmedContent = importContent?.trim();
            if (!trimmedContent) {
                setError('Please provide schema content');
                return;
            }
        }

        try {
            setImporting(true);
            setError(null);

            const groupValue = importGroup?.trim() || undefined;

            switch (importType) {
                case 'manual':
                    // Convert manualAttributes to JSON Schema format
                    const properties: Record<string, any> = {};
                    const validAttributes = manualAttributes.filter(a => a.name.trim());
                    validAttributes.forEach(attr => {
                        properties[attr.name.trim()] = {
                            type: attr.type,
                            description: attr.description || undefined
                        };
                    });
                    const jsonSchemaContent = JSON.stringify({
                        type: 'object',
                        properties
                    }, null, 2);
                    await schemaApi.importJsonSchema(trimmedName, jsonSchemaContent, groupValue, projectId);
                    break;
                case 'openapi':
                    await schemaApi.importOpenApi(trimmedName, importContent.trim(), selectedEntities, groupValue, projectId);
                    break;
                case 'json-schema':
                    await schemaApi.importJsonSchema(trimmedName, importContent.trim(), groupValue, projectId);
                    break;
                case 'example':
                    await schemaApi.inferFromExample(trimmedName, importContent.trim(), groupValue, projectId);
                    break;
            }

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to import schema');
        } finally {
            setImporting(false);
        }
    };

    const filteredEntities = previewEntities.filter(e =>
        e.toLowerCase().includes(entitySearchTerm.toLowerCase())
    );

    const selectAllEntities = () => {
        setSelectedEntities([...filteredEntities]);
    };

    const deselectAllEntities = () => {
        setSelectedEntities([]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {error && (
                <div className="toast toast-error">
                    {error}
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Schema Source</label>
                <div className="tabs">
                    <button
                        type="button"
                        className={`tab ${importType === 'manual' ? 'active' : ''}`}
                        onClick={() => {
                            setImportType('manual');
                            setStep(1);
                        }}
                    >
                        ✏️ Create New
                    </button>
                    <button
                        type="button"
                        className={`tab ${importType === 'openapi' ? 'active' : ''}`}
                        onClick={() => {
                            setImportType('openapi');
                            setStep(1);
                            setPreviewEntities([]);
                            setSelectedEntities([]);
                        }}
                    >
                        OpenAPI/Swagger
                    </button>
                    <button
                        type="button"
                        className={`tab ${importType === 'json-schema' ? 'active' : ''}`}
                        onClick={() => {
                            setImportType('json-schema');
                            setStep(1);
                        }}
                    >
                        JSON Schema
                    </button>
                    <button
                        type="button"
                        className={`tab ${importType === 'example' ? 'active' : ''}`}
                        onClick={() => {
                            setImportType('example');
                            setStep(1);
                        }}
                    >
                        JSON Example
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                    <label className="form-label">Schema Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={importName}
                        onChange={e => setImportName(e.target.value)}
                        placeholder="e.g., Order, Customer"
                        data-testid="schema-name-input"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Group (Optional)</label>
                    <input
                        type="text"
                        className="form-input"
                        value={importGroup}
                        onChange={e => setImportGroup(e.target.value)}
                        placeholder="e.g., E-commerce"
                    />
                </div>
            </div>

            {/* Manual Schema Builder */}
            {importType === 'manual' && (
                <div className="form-group">
                    <label className="form-label">Attributes</label>
                    <div style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-secondary)'
                    }}>
                        {manualAttributes.map((attr, idx) => (
                            <div key={idx} style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 2fr auto',
                                gap: 'var(--space-sm)',
                                marginBottom: idx < manualAttributes.length - 1 ? 'var(--space-sm)' : 0
                            }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Attribute name"
                                    value={attr.name}
                                    onChange={e => {
                                        const updated = [...manualAttributes];
                                        updated[idx].name = e.target.value;
                                        setManualAttributes(updated);
                                    }}
                                />
                                <select
                                    className="form-input"
                                    value={attr.type}
                                    onChange={e => {
                                        const updated = [...manualAttributes];
                                        updated[idx].type = e.target.value;
                                        setManualAttributes(updated);
                                    }}
                                >
                                    <option value="string">String</option>
                                    <option value="integer">Integer</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="array">Array</option>
                                    <option value="object">Object</option>
                                </select>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Description (optional)"
                                    value={attr.description}
                                    onChange={e => {
                                        const updated = [...manualAttributes];
                                        updated[idx].description = e.target.value;
                                        setManualAttributes(updated);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        if (manualAttributes.length > 1) {
                                            setManualAttributes(manualAttributes.filter((_, i) => i !== idx));
                                        }
                                    }}
                                    disabled={manualAttributes.length <= 1}
                                    style={{ color: 'var(--error)' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setManualAttributes([...manualAttributes, { name: '', type: 'string', description: '' }])}
                            style={{ marginTop: 'var(--space-sm)' }}
                        >
                            + Add Attribute
                        </button>
                    </div>
                </div>
            )}

            {/* Content Import Section */}
            {importType !== 'manual' && (
                <div className="form-group">
                    <label className="form-label">
                        {importType === 'openapi' && 'OpenAPI/Swagger Content'}
                        {importType === 'json-schema' && 'JSON Schema Content'}
                        {importType === 'example' && 'JSON Example'}
                    </label>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
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
                                    } catch (err) {
                                        setError('Failed to read file');
                                    }
                                }
                            }}
                            style={{ display: 'none' }}
                            id="schema-file-upload"
                        />
                        <label htmlFor="schema-file-upload" className="btn btn-secondary btn-sm">
                            <Upload size={16} />
                            Upload File
                        </label>
                    </div>
                    <textarea
                        className="form-textarea"
                        value={importContent}
                        onChange={e => setImportContent(e.target.value)}
                        placeholder={
                            importType === 'example'
                                ? '{\n  "orderId": 123,\n  "total": 99.99\n}'
                                : importType === 'json-schema'
                                    ? '{\n  "type": "object",\n  "properties": {\n    "orderId": { "type": "integer" }\n  }\n}'
                                    : 'Paste OpenAPI YAML/JSON content here...'
                        }
                        style={{ minHeight: '300px', fontFamily: 'monospace' }}
                        data-testid="schema-content-textarea"
                    />
                </div>
            )}

            {importType === 'openapi' && step === 2 && previewEntities.length > 0 && (
                <div className="form-group">
                    <label className="form-label">Select Entities to Import</label>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search entities..."
                            value={entitySearchTerm}
                            onChange={e => setEntitySearchTerm(e.target.value)}
                            style={{ marginBottom: 'var(--space-sm)' }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllEntities}>
                                <CheckSquare size={14} />
                                All
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={deselectAllEntities}>
                                <Square size={14} />
                                None
                            </button>
                        </div>
                    </div>
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm)'
                    }}>
                        {filteredEntities.map(entity => (
                            <label key={entity} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xs)' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedEntities.includes(entity)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedEntities([...selectedEntities, entity]);
                                        } else {
                                            setSelectedEntities(selectedEntities.filter(e => e !== entity));
                                        }
                                    }}
                                />
                                <span>{entity}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                        setImportName('');
                        setImportContent('');
                        setImportGroup('');
                        setStep(1);
                        setPreviewEntities([]);
                        setSelectedEntities([]);
                        setManualAttributes([{ name: '', type: 'string', description: '' }]);
                    }}
                >
                    Reset
                </button>
                {importType === 'openapi' && step === 1 ? (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePreview}
                        disabled={importing || !importContent.trim()}
                    >
                        {importing ? 'Scanning...' : 'Scan Entities'}
                    </button>
                ) : importType === 'manual' ? (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={importing || !importName.trim() || manualAttributes.filter(a => a.name.trim()).length === 0}
                    >
                        {importing ? 'Creating...' : 'Create Schema'}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={importing || !importName.trim() || !importContent.trim() || (importType === 'openapi' && selectedEntities.length === 0)}
                    >
                        {importing ? 'Importing...' : 'Import Schema'}
                    </button>
                )}
            </div>
        </div>
    );
}

