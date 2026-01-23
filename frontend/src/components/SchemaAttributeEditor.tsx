import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { schemaApi, SchemaAttribute, AttributeImpact } from '../services/api';
import './SchemaAttributeEditor.css';

interface SchemaAttributeEditorProps {
    schemaId: number;
    schemaName: string;
    onUpdate?: () => void;
}

type AttributeType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

const ATTRIBUTE_TYPES: { value: AttributeType; label: string }[] = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'integer', label: 'Integer' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' },
];

export default function SchemaAttributeEditor({ schemaId, schemaName, onUpdate }: SchemaAttributeEditorProps) {
    const [attributes, setAttributes] = useState<SchemaAttribute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add attribute form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAttribute, setNewAttribute] = useState<Partial<SchemaAttribute>>({
        name: '',
        type: 'string',
        description: '',
        required: false,
    });

    // Edit attribute state
    const [editingAttribute, setEditingAttribute] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<SchemaAttribute>>({});

    // Impact analysis modal state
    const [impactModal, setImpactModal] = useState<{
        show: boolean;
        attributeName: string;
        changeType: 'rename' | 'retype' | 'delete';
        newName?: string;
        newType?: string;
        impact: AttributeImpact | null;
        loading: boolean;
    }>({
        show: false,
        attributeName: '',
        changeType: 'rename',
        impact: null,
        loading: false,
    });

    const [applying, setApplying] = useState(false);

    useEffect(() => {
        loadAttributes();
    }, [schemaId]);

    async function loadAttributes() {
        try {
            setLoading(true);
            const data = await schemaApi.getAttributes(schemaId);
            setAttributes(data);
            setError(null);
        } catch (err) {
            setError('Failed to load attributes');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddAttribute() {
        if (!newAttribute.name?.trim()) {
            setError('Attribute name is required');
            return;
        }

        try {
            await schemaApi.addAttribute(schemaId, {
                name: newAttribute.name,
                type: newAttribute.type || 'string',
                description: newAttribute.description,
                required: newAttribute.required,
            } as SchemaAttribute);

            await loadAttributes();
            setShowAddForm(false);
            setNewAttribute({ name: '', type: 'string', description: '', required: false });
            onUpdate?.();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add attribute';
            setError(errorMessage);
        }
    }

    async function startEdit(attr: SchemaAttribute) {
        setEditingAttribute(attr.name);
        setEditForm({ ...attr });
    }

    async function cancelEdit() {
        setEditingAttribute(null);
        setEditForm({});
    }

    async function checkImpactAndApply(attributeName: string, changeType: 'rename' | 'retype' | 'delete', newName?: string, newType?: string) {
        setImpactModal({
            show: true,
            attributeName,
            changeType,
            newName,
            newType,
            impact: null,
            loading: true,
        });

        try {
            const impact = await schemaApi.getAttributeImpact(schemaId, attributeName);
            setImpactModal(prev => ({ ...prev, impact, loading: false }));
        } catch (err) {
            console.error('Failed to get impact:', err);
            setImpactModal(prev => ({ ...prev, loading: false }));
        }
    }

    async function handleSaveEdit() {
        if (!editingAttribute || !editForm.name) return;

        const originalAttr = attributes.find(a => a.name === editingAttribute);
        const nameChanged = originalAttr?.name !== editForm.name;
        const typeChanged = originalAttr?.type !== editForm.type;

        if (nameChanged || typeChanged) {
            // Need to check impact first
            const changeType = nameChanged ? 'rename' : 'retype';
            await checkImpactAndApply(
                editingAttribute,
                changeType,
                nameChanged ? editForm.name : undefined,
                typeChanged ? editForm.type : undefined
            );
        } else {
            // No name/type change, just update description or required
            try {
                await schemaApi.updateAttribute(schemaId, editingAttribute, editForm as SchemaAttribute);
                await loadAttributes();
                setEditingAttribute(null);
                setEditForm({});
                onUpdate?.();
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to update attribute';
                setError(errorMessage);
            }
        }
    }

    async function handleDelete(attributeName: string) {
        await checkImpactAndApply(attributeName, 'delete');
    }

    async function confirmApplyChange() {
        if (!impactModal.impact) return;

        setApplying(true);

        try {
            const response = await schemaApi.applyAttributeChange(
                schemaId,
                impactModal.attributeName,
                {
                    changeType: impactModal.changeType,
                    oldName: impactModal.attributeName,
                    newName: impactModal.newName,
                    newType: impactModal.newType,
                    confirmPropagation: true,
                }
            );

            if (response.success) {
                await loadAttributes();
                setEditingAttribute(null);
                setEditForm({});
                onUpdate?.();
            } else {
                setError(response.message);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to apply changes';
            setError(errorMessage);
        } finally {
            setApplying(false);
            setImpactModal({ show: false, attributeName: '', changeType: 'rename', impact: null, loading: false });
        }
    }

    function closeImpactModal() {
        setImpactModal({ show: false, attributeName: '', changeType: 'rename', impact: null, loading: false });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <span className="ml-2 text-surface-400">Loading attributes...</span>
            </div>
        );
    }

    return (
        <div className="schema-attribute-editor">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-100">
                    Attributes for {schemaName}
                </h3>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Attribute
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Add attribute form */}
            {showAddForm && (
                <div className="mb-4 p-4 bg-surface-800 rounded-lg border border-surface-700">
                    <h4 className="text-sm font-medium text-surface-200 mb-3">Add New Attribute</h4>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                value={newAttribute.name || ''}
                                onChange={e => setNewAttribute(prev => ({ ...prev, name: e.target.value }))}
                                className="form-input"
                                placeholder="attributeName"
                            />
                        </div>
                        <div>
                            <label className="form-label">Type</label>
                            <select
                                value={newAttribute.type || 'string'}
                                onChange={e => setNewAttribute(prev => ({ ...prev, type: e.target.value }))}
                                className="form-select"
                            >
                                {ATTRIBUTE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                value={newAttribute.description || ''}
                                onChange={e => setNewAttribute(prev => ({ ...prev, description: e.target.value }))}
                                className="form-input"
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 text-sm text-surface-300">
                                <input
                                    type="checkbox"
                                    checked={newAttribute.required || false}
                                    onChange={e => setNewAttribute(prev => ({ ...prev, required: e.target.checked }))}
                                    className="form-checkbox"
                                />
                                Required
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleAddAttribute} className="btn btn-primary btn-sm">
                            <Check className="h-4 w-4 mr-1" /> Add
                        </button>
                        <button onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm">
                            <X className="h-4 w-4 mr-1" /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Attributes table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-surface-700">
                            <th className="text-left py-2 px-3 text-sm font-medium text-surface-400">Name</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-surface-400">Type</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-surface-400">Description</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-surface-400">Required</th>
                            <th className="text-right py-2 px-3 text-sm font-medium text-surface-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attributes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-surface-400">
                                    No attributes defined. Click "Add Attribute" to create one.
                                </td>
                            </tr>
                        ) : (
                            attributes.map(attr => (
                                <tr key={attr.name} className="border-b border-surface-800 hover:bg-surface-800/50">
                                    {editingAttribute === attr.name ? (
                                        // Edit mode
                                        <>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="text"
                                                    value={editForm.name || ''}
                                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="form-input form-input-sm"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <select
                                                    value={editForm.type || 'string'}
                                                    onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                                                    className="form-select form-select-sm"
                                                >
                                                    {ATTRIBUTE_TYPES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="text"
                                                    value={editForm.description || ''}
                                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                    className="form-input form-input-sm"
                                                />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.required || false}
                                                    onChange={e => setEditForm(prev => ({ ...prev, required: e.target.checked }))}
                                                    className="form-checkbox"
                                                />
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="text-green-400 hover:text-green-300 p-1"
                                                    title="Save"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="text-surface-400 hover:text-surface-300 p-1 ml-2"
                                                    title="Cancel"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        // View mode
                                        <>
                                            <td className="py-2 px-3 text-surface-200 font-medium">{attr.name}</td>
                                            <td className="py-2 px-3">
                                                <span className="px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded text-xs">
                                                    {attr.type}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-surface-400 text-sm">{attr.description || '-'}</td>
                                            <td className="py-2 px-3 text-center">
                                                {attr.required ? (
                                                    <Check className="h-4 w-4 text-green-400 inline" />
                                                ) : (
                                                    <span className="text-surface-500">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <button
                                                    onClick={() => startEdit(attr)}
                                                    className="text-primary-400 hover:text-primary-300 p-1"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(attr.name)}
                                                    className="text-red-400 hover:text-red-300 p-1 ml-2"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Impact Analysis Modal */}
            {impactModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface-900 rounded-xl border border-surface-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                                <AlertTriangle className="h-6 w-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-surface-100">
                                    Schema Change Impact
                                </h3>
                                <p className="text-sm text-surface-400">
                                    {impactModal.changeType === 'rename' && (
                                        <>Renaming attribute: <code className="text-primary-300">{impactModal.attributeName}</code> → <code className="text-primary-300">{impactModal.newName}</code></>
                                    )}
                                    {impactModal.changeType === 'retype' && (
                                        <>Changing type of: <code className="text-primary-300">{impactModal.attributeName}</code> to <code className="text-primary-300">{impactModal.newType}</code></>
                                    )}
                                    {impactModal.changeType === 'delete' && (
                                        <>Deleting attribute: <code className="text-red-300">{impactModal.attributeName}</code></>
                                    )}
                                </p>
                            </div>
                        </div>

                        {impactModal.loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                                <span className="ml-2 text-surface-400">Analyzing impact...</span>
                            </div>
                        ) : impactModal.impact ? (
                            <>
                                {impactModal.impact.totalAffectedRules === 0 ? (
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 mb-4">
                                        <Check className="h-5 w-5 inline mr-2" />
                                        No rules are affected by this change.
                                    </div>
                                ) : (
                                    <>
                                        <div className={`p-4 rounded-lg border mb-4 ${impactModal.impact.riskLevel === 'high' ? 'bg-red-500/10 border-red-500/30' :
                                            impactModal.impact.riskLevel === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                'bg-blue-500/10 border-blue-500/30'
                                            }`}>
                                            <p className="text-sm">
                                                <strong className="text-surface-200">{impactModal.impact.totalAffectedRules}</strong> rule(s) will be affected.
                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs uppercase ${impactModal.impact.riskLevel === 'high' ? 'bg-red-500/20 text-red-300' :
                                                    impactModal.impact.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                                        'bg-blue-500/20 text-blue-300'
                                                    }`}>
                                                    {impactModal.impact.riskLevel} risk
                                                </span>
                                            </p>
                                        </div>

                                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                            {impactModal.impact.affectedRules.map(rule => (
                                                <div key={rule.ruleId} className="p-3 bg-surface-800 rounded-lg border border-surface-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Check className="h-4 w-4 text-green-400" />
                                                        <span className="font-medium text-surface-200">{rule.ruleName}</span>
                                                        <span className="text-xs text-surface-500">({rule.projectName})</span>
                                                    </div>
                                                    <div className="space-y-1 pl-6">
                                                        {rule.usages.map((usage, idx) => (
                                                            <div key={idx} className="text-sm text-surface-400">
                                                                <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${usage.location === 'condition' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                                                                    }`}>
                                                                    {usage.location}
                                                                </span>
                                                                <code className="text-surface-300">{usage.detail}</code>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-sm text-surface-400 mb-4">
                                            {impactModal.changeType === 'delete'
                                                ? 'Affected conditions and actions will be removed from these rules.'
                                                : 'These rules will be automatically updated to use the new attribute name/type.'}
                                        </p>
                                    </>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={closeImpactModal}
                                        className="btn btn-secondary"
                                        disabled={applying}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmApplyChange}
                                        className={`btn ${impactModal.changeType === 'delete' ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}
                                        disabled={applying}
                                    >
                                        {applying ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Applying...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Apply Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-surface-400">Failed to analyze impact.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
