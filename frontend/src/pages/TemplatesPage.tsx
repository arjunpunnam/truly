import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Box, ArrowRight, Layout, Activity, Code, Database } from 'lucide-react';
import { projectApi, schemaApi } from '../services/api';
import { RuleProject, Schema } from '../types';
import { Link } from 'react-router-dom';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<RuleProject[]>([]);
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Create Form State
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [inputSchemaIds, setInputSchemaIds] = useState<number[]>([]);
    const [outputSchemaIds, setOutputSchemaIds] = useState<number[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, schemasData] = await Promise.all([
                projectApi.getAll(),
                schemaApi.getAll()
            ]);
            setTemplates(templatesData);
            setSchemas(schemasData);
        } catch (err) {
            console.error('Failed to load data', err);
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
            await projectApi.create({
                name: newName,
                description: newDesc,
                inputSchemaIds: inputSchemaIds.length > 0 ? inputSchemaIds : undefined,
                outputSchemaIds: outputSchemaIds.length > 0 ? outputSchemaIds : undefined,
                // Legacy support
                inputSchemaId: inputSchemaIds.length === 1 ? inputSchemaIds[0] : undefined,
                outputSchemaId: outputSchemaIds.length === 1 ? outputSchemaIds[0] : undefined
            });
            setShowCreate(false);
            resetForm();
            loadData(); // Reload all data to get the new template

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
            setTemplates(templates.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page-container animate-in">
            <header className="page-header">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Templates
                    </h1>
                    <p className="text-gray-400 mt-1">Manage rule collections with defined contracts</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreate(true)}
                    disabled={schemas.length === 0}
                    title={schemas.length === 0 ? 'Create schemas first before creating a template' : ''}
                >
                    <Plus size={18} />
                    New Template
                </button>
            </header>

            {showCreate && (
                <div className="mb-8 p-6 card-flat bg-gray-900/50 border border-gray-800 rounded-xl animate-in">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Box size={20} className="text-blue-400" />
                            Create New Rule Template
                        </h3>
                        <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">Close</button>
                    </div>

                    {schemas.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="p-3 bg-yellow-500/10 rounded-full w-fit mx-auto mb-4 text-yellow-500">
                                <Database size={24} />
                            </div>
                            <h4 className="text-lg font-medium text-white mb-2">No Schemas Found</h4>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                You need to define at least two Data Schemas (one for input, one for output) before you can create a Rule Template.
                            </p>
                            <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
                                <Database size={18} />
                                Go to Schemas
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Template Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="e.g. Credit Risk Scoring"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description (Optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        placeholder="What is this template for?"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                    <Code size={16} /> Define Contracts
                                </h4>
                                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start">
                                    <div className="form-group">
                                        <label className="form-label">Input Context (Request) - Select Multiple</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-900/50">
                                            {schemas.map(s => (
                                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={inputSchemaIds.includes(s.id)}
                                                        onChange={() => toggleInputSchema(s.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm text-gray-300">{s.name} (v{s.version})</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {inputSchemaIds.length > 0 
                                                ? `${inputSchemaIds.length} schema(s) selected`
                                                : 'Select one or more input schemas'}
                                        </p>
                                    </div>

                                    <div className="pt-8 text-gray-600">
                                        <ArrowRight size={24} />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Output Context (Response) - Select Multiple</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-900/50">
                                            {schemas.map(s => (
                                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={outputSchemaIds.includes(s.id)}
                                                        onChange={() => toggleOutputSchema(s.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm text-gray-300">{s.name} (v{s.version})</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {outputSchemaIds.length > 0 
                                                ? `${outputSchemaIds.length} schema(s) selected`
                                                : 'Select one or more output schemas'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Template'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <Link to={`/templates/${template.id}`} key={template.id} className="block group">
                        <div className="card h-full hover:border-blue-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                    <Layout size={24} />
                                </div>
                                <button
                                    onClick={(e) => handleDelete(template.id, e)}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                {template.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-6 line-clamp-2 min-h-[40px]">
                                {template.description || 'No description provided'}
                            </p>

                            <div className="space-y-3">
                                <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-800">
                                    <span className="block mb-1">Input:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {template.inputSchemas && template.inputSchemas.length > 0 ? (
                                            template.inputSchemas.map(s => (
                                                <span key={s.id} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                                    {s.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="font-medium text-gray-300">{template.inputSchemaName || 'N/A'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-800">
                                    <span className="block mb-1">Output:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {template.outputSchemas && template.outputSchemas.length > 0 ? (
                                            template.outputSchemas.map(s => (
                                                <span key={s.id} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                                    {s.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="font-medium text-gray-300">{template.outputSchemaName || 'N/A'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <Activity size={14} />
                                    {template.ruleCount} Rules
                                </span>
                                <span>
                                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}

                {templates.length === 0 && !showCreate && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-xl">
                        {schemas.length === 0 ? (
                            <>
                                <Database size={48} className="mx-auto text-gray-600 mb-4" />
                                <h3 className="text-lg font-medium text-gray-300 mb-2">Start by Creating Schemas</h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    Before creating a template, you need to define your data schemas. 
                                    Schemas define the structure of your input and output data.
                                </p>
                                <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
                                    <Database size={18} />
                                    Go to Schemas
                                </Link>
                            </>
                        ) : (
                            <>
                                <Box size={48} className="mx-auto text-gray-600 mb-4" />
                                <h3 className="text-lg font-medium text-gray-300 mb-2">No templates yet</h3>
                                <p className="text-gray-500 mb-6">
                                    Create a template to define shared input/output contracts for your rules.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                                    <Plus size={18} />
                                    Create First Template
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
