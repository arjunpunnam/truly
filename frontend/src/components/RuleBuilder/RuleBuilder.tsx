import React from 'react';
import { Plus, Trash2, ChevronRight, MessageSquare, Zap, Layers } from 'lucide-react';
import { Condition, ConditionGroup, RuleAction, SchemaProperty, getOperatorsForType, Rule } from '../../types';
import './RuleBuilder.css';

interface RuleBuilderProps {
    schemas?: import('../../types').Schema[];
    inputSchemas?: import('../../types').Schema[]; // Only input schemas for conditions
    outputSchemas?: import('../../types').Schema[]; // Only output schemas for actions
    selectedSchemaId?: number | null;
    onSchemaChange?: (id: number) => void;
    properties: SchemaProperty[];
    conditions: ConditionGroup;
    actions: RuleAction[];
    onConditionsChange: (conditions: ConditionGroup) => void;
    onActionsChange: (actions: RuleAction[]) => void;
    projectId?: number;
    lockedSchemaId?: number;
    lockedOutputSchemaId?: number;
    initialRule?: Rule;
    onSave?: (rule: Rule) => void;
    onCancel?: () => void;
}

const findPropertyByPath = (properties: SchemaProperty[], path: string): SchemaProperty | undefined => {
    for (const prop of properties) {
        if (prop.path === path) return prop;
        if (prop.properties) {
            const found = findPropertyByPath(prop.properties, path);
            if (found) return found;
        }
        if (prop.items) {
            const found = findPropertyByPath([prop.items], path);
            if (found) return found;
        }
    }
    return undefined;
};

export default function RuleBuilder({
    schemas,
    inputSchemas,
    outputSchemas,
    selectedSchemaId,
    onSchemaChange,
    properties,
    conditions,
    actions,
    onConditionsChange,
    onActionsChange,
    lockedOutputSchemaId
}: RuleBuilderProps) {
    // Use inputSchemas for conditions, fallback to schemas for backward compatibility
    const availableInputSchemas = inputSchemas || schemas || [];
    // Use outputSchemas for actions, fallback to schemas for backward compatibility
    const availableOutputSchemas = outputSchemas || schemas || [];

    const addCondition = () => {
        const newCondition: Condition = {
            fact: '',
            operator: 'equals',
            value: '',
        };

        onConditionsChange({
            ...conditions,
            conditions: [...conditions.conditions, newCondition],
        });
    };

    const updateCondition = (index: number, updates: Partial<Condition>) => {
        const newConditions = [...conditions.conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        const newConditions = conditions.conditions.filter((_, i) => i !== index);
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const addNestedCondition = (parentIndex: number) => {
        const newConditions = [...conditions.conditions];
        if (!newConditions[parentIndex].nested) {
            newConditions[parentIndex] = {
                ...newConditions[parentIndex],
                nested: {
                    operator: 'all',
                    conditions: [{
                        fact: '',
                        operator: 'equals',
                        value: '',
                    }]
                }
            };
        } else {
            const nestedGroup = newConditions[parentIndex].nested!;
            nestedGroup.conditions.push({
                fact: '',
                operator: 'equals',
                value: '',
            });
        }
        onConditionsChange({ ...conditions, conditions: newConditions });
    };

    const updateNestedCondition = (parentIndex: number, nestedIndex: number, updates: Partial<Condition>) => {
        const newConditions = [...conditions.conditions];
        const nestedGroup = newConditions[parentIndex].nested;
        if (nestedGroup) {
            const newNestedConditions = [...nestedGroup.conditions];
            newNestedConditions[nestedIndex] = { ...newNestedConditions[nestedIndex], ...updates };
            newConditions[parentIndex] = {
                ...newConditions[parentIndex],
                nested: {
                    ...nestedGroup,
                    conditions: newNestedConditions
                }
            };
            onConditionsChange({ ...conditions, conditions: newConditions });
        }
    };

    const removeNestedCondition = (parentIndex: number, nestedIndex: number) => {
        const newConditions = [...conditions.conditions];
        const nestedGroup = newConditions[parentIndex].nested;
        if (nestedGroup) {
            const newNestedConditions = nestedGroup.conditions.filter((_, i) => i !== nestedIndex);
            if (newNestedConditions.length === 0) {
                // Remove nested group if empty
                const { nested, ...rest } = newConditions[parentIndex];
                newConditions[parentIndex] = rest;
            } else {
                newConditions[parentIndex] = {
                    ...newConditions[parentIndex],
                    nested: {
                        ...nestedGroup,
                        conditions: newNestedConditions
                    }
                };
            }
            onConditionsChange({ ...conditions, conditions: newConditions });
        }
    };

    const updateNestedGroupOperator = (parentIndex: number, operator: 'all' | 'any') => {
        const newConditions = [...conditions.conditions];
        const nestedGroup = newConditions[parentIndex].nested;
        if (nestedGroup) {
            newConditions[parentIndex] = {
                ...newConditions[parentIndex],
                nested: {
                    ...nestedGroup,
                    operator
                }
            };
            onConditionsChange({ ...conditions, conditions: newConditions });
        }
    };

    const addAction = (type: RuleAction['type']) => {
        const newAction: RuleAction = { type };

        switch (type) {
            case 'MODIFY':
                newAction.targetField = '';
                newAction.value = '';
                break;
            case 'INSERT':
                // Default to the first available output schema name if possible
                const defaultSchema = availableOutputSchemas && availableOutputSchemas.length > 0
                    ? availableOutputSchemas[0].name : '';
                newAction.factType = defaultSchema;
                newAction.factData = {};
                break;
            case 'LOG':
                newAction.logMessage = 'New sequence triggered';
                break;
            case 'WEBHOOK':
                newAction.webhookUrl = '';
                newAction.webhookMethod = 'POST';
                break;
        }

        onActionsChange([...actions, newAction]);
    };

    const updateAction = (index: number, updates: Partial<RuleAction>) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        onActionsChange(newActions);
    };

    const removeAction = (index: number) => {
        onActionsChange(actions.filter((_, i) => i !== index));
    };

    const flattenProperties = (props: SchemaProperty[], prefix = ''): string[] => {
        let paths: string[] = [];
        for (const prop of props) {
            // Actually, SchemaProperty usually has 'path' attribute which is full path. Let's use that if available.
            const pathToAdd = prop.path || (prefix ? `${prefix}.${prop.name}` : prop.name);
            paths.push(pathToAdd);

            if (prop.properties) {
                paths = [...paths, ...flattenProperties(prop.properties, pathToAdd)];
            }
            if (prop.items) {
                // For arrays, we might want to suggest the array itself or items properties?
                // Let's suggest items properties with [*] or similar if needed, or just let users recurse. 
                // For simplicity, let's just recurse into items.
                paths = [...paths, ...flattenProperties([prop.items], pathToAdd)];
            }
        }
        return paths;
    };

    return (
        <div className="authoring-container">
            <datalist id="property-list">
                {flattenProperties(properties).map(path => (
                    <option key={path} value={path} />
                ))}
            </datalist>
            <div className="authoring-workspace full-width">
                {/* IF Block */}
                <section className="logic-block-card">
                    <header className="block-header">
                        <div className="block-title">
                            <div className="indicator if-indicator">IF</div>
                            <div>
                                <h4>Setup conditions</h4>
                                <p>Define when this rule should trigger</p>
                            </div>
                        </div>
                        <div className="block-settings">
                            <select
                                className="minimal-select"
                                value={conditions.operator}
                                onChange={(e) => onConditionsChange({ ...conditions, operator: e.target.value as 'all' | 'any' })}
                            >
                                <option value="all">Match ALL conditions</option>
                                <option value="any">Match ANY condition</option>
                            </select>
                        </div>
                    </header>

                    <div className="logic-rows">
                        {conditions.conditions.map((condition, index) => {
                            // Find property just to hint operator types, default to string
                            const prop = findPropertyByPath(properties, condition.fact);
                            const operators = prop ? getOperatorsForType(prop.type) : getOperatorsForType('string');

                            return (
                                <React.Fragment key={index}>
                                    <div className="logic-row animate-in">
                                        {/* Fact Selector (Schema) - Only Input Schemas */}
                                        {availableInputSchemas.length > 0 && onSchemaChange && (
                                            <div className="row-fact" style={{ flex: 1 }}>
                                                <select
                                                    className="minimal-select"
                                                    value={selectedSchemaId || ''}
                                                    onChange={(e) => onSchemaChange(Number(e.target.value))}
                                                    style={{ fontWeight: 600, color: 'var(--accent-primary)' }}
                                                    title="Select from input context schemas only"
                                                >
                                                    <option value="" disabled>Select Input Schema</option>
                                                    {availableInputSchemas.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="row-field">
                                            <input
                                                type="text"
                                                className="minimal-input"
                                                value={condition.fact}
                                                onChange={(e) => updateCondition(index, { fact: e.target.value })}
                                                placeholder="Field name (e.g. status)"
                                                list="property-list"
                                                disabled={!selectedSchemaId}
                                            />
                                        </div>

                                        <select
                                            className="minimal-select row-operator"
                                            value={condition.operator}
                                            onChange={(e) => updateCondition(index, { operator: e.target.value })}
                                        >
                                            {operators.map(op => (
                                                <option key={op.value} value={op.value}>{op.label}</option>
                                            ))}
                                        </select>

                                        {!['isNull', 'isNotNull'].includes(condition.operator) && (() => {
                                            const getInputType = () => {
                                                if (!prop) return 'text';
                                                if (prop.type === 'number' || prop.type === 'integer') return 'number';
                                                if (prop.type === 'boolean') return 'text'; // Will use select
                                                if (prop.format === 'date' || prop.format === 'date-time') return 'date';
                                                if (prop.format === 'time') return 'time';
                                                return 'text';
                                            };

                                            const validateValue = (val: string, propertyType: string, format?: string): boolean => {
                                                if (!val) return true; // Empty is allowed
                                                if (propertyType === 'number' || propertyType === 'integer') {
                                                    return !isNaN(Number(val));
                                                }
                                                if (propertyType === 'boolean') {
                                                    return val === 'true' || val === 'false';
                                                }
                                                if (format === 'date' || format === 'date-time') {
                                                    return !isNaN(Date.parse(val));
                                                }
                                                return true; // String and others are always valid
                                            };

                                            const inputType = getInputType();
                                            const valueStr = String(condition.value || '');
                                            const isValid = validateValue(valueStr, prop?.type || 'string', prop?.format);
                                            const typeLabel = prop
                                                ? `${prop.type}${prop.format ? ` (${prop.format})` : ''}`
                                                : 'string';

                                            if (prop?.type === 'boolean') {
                                                return (
                                                    <select
                                                        className="minimal-select row-value"
                                                        value={valueStr}
                                                        onChange={(e) => updateCondition(index, { value: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value })}
                                                        style={{ minWidth: 100 }}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="true">true</option>
                                                        <option value="false">false</option>
                                                    </select>
                                                );
                                            }

                                            return (
                                                <div style={{ position: 'relative', flex: 2 }}>
                                                    <input
                                                        type={inputType}
                                                        className={`minimal-input row-value ${!isValid ? 'error' : ''}`}
                                                        value={valueStr}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            if (prop?.type === 'number' || prop?.type === 'integer') {
                                                                // For numbers, convert immediately
                                                                const numVal = newVal === '' ? null : Number(newVal);
                                                                if (newVal === '' || !isNaN(numVal!)) {
                                                                    updateCondition(index, { value: prop.type === 'integer' ? (numVal === null ? null : Math.floor(numVal)) : numVal });
                                                                }
                                                            } else {
                                                                updateCondition(index, { value: newVal });
                                                            }
                                                        }}
                                                        placeholder={`Value (${typeLabel})`}
                                                        title={`Expected type: ${typeLabel}`}
                                                        style={{
                                                            borderColor: !isValid ? 'var(--error)' : undefined,
                                                            paddingRight: prop ? '60px' : undefined
                                                        }}
                                                    />
                                                    {prop && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            right: '8px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            fontSize: '0.7rem',
                                                            color: 'var(--text-muted)',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            {typeLabel}
                                                        </span>
                                                    )}
                                                    {!isValid && valueStr && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            left: 0,
                                                            fontSize: '0.7rem',
                                                            color: 'var(--error)',
                                                            marginTop: '2px'
                                                        }}>
                                                            Invalid {typeLabel} value
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                            <button
                                                className="btn-icon"
                                                onClick={() => addNestedCondition(index)}
                                                title="Add nested condition block"
                                            >
                                                <Layers size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => removeCondition(index)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nested Condition Block */}
                                    {condition.nested && (
                                        <div className="nested-condition-block">
                                            <div className="nested-condition-header">
                                                <select
                                                    className="minimal-select"
                                                    value={condition.nested.operator}
                                                    onChange={(e) => updateNestedGroupOperator(index, e.target.value as 'all' | 'any')}
                                                >
                                                    <option value="all">Match ALL nested conditions</option>
                                                    <option value="any">Match ANY nested condition</option>
                                                </select>
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={() => updateCondition(index, { nested: undefined })}
                                                    title="Remove nested condition block"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="nested-condition-rows">
                                                {condition.nested.conditions.length === 0 ? (
                                                    <div className="placeholder-row" onClick={() => addNestedCondition(index)} style={{ padding: 'var(--space-md)' }}>
                                                        <Plus size={16} />
                                                        <span>Add nested condition</span>
                                                    </div>
                                                ) : (
                                                    condition.nested.conditions.map((nestedCondition, nestedIndex) => {
                                                        const nestedProp = findPropertyByPath(properties, nestedCondition.fact);
                                                        const nestedOperators = nestedProp ? getOperatorsForType(nestedProp.type) : getOperatorsForType('string');

                                                        return (
                                                            <div key={nestedIndex} className="nested-condition-row">
                                                                <div className="row-field">
                                                                    <input
                                                                        type="text"
                                                                        className="minimal-input"
                                                                        value={nestedCondition.fact}
                                                                        onChange={(e) => updateNestedCondition(index, nestedIndex, { fact: e.target.value })}
                                                                        placeholder="Field name"
                                                                        list="property-list"
                                                                        disabled={!selectedSchemaId}
                                                                    />
                                                                </div>
                                                                <select
                                                                    className="minimal-select row-operator"
                                                                    value={nestedCondition.operator}
                                                                    onChange={(e) => updateNestedCondition(index, nestedIndex, { operator: e.target.value })}
                                                                >
                                                                    {nestedOperators.map(op => (
                                                                        <option key={op.value} value={op.value}>{op.label}</option>
                                                                    ))}
                                                                </select>
                                                                {!['isNull', 'isNotNull'].includes(nestedCondition.operator) && (() => {
                                                                    const getInputType = () => {
                                                                        if (!nestedProp) return 'text';
                                                                        if (nestedProp.type === 'number' || nestedProp.type === 'integer') return 'number';
                                                                        if (nestedProp.type === 'boolean') return 'text';
                                                                        if (nestedProp.format === 'date' || nestedProp.format === 'date-time') return 'date';
                                                                        if (nestedProp.format === 'time') return 'time';
                                                                        return 'text';
                                                                    };

                                                                    const validateValue = (val: string, propertyType: string, format?: string): boolean => {
                                                                        if (!val) return true;
                                                                        if (propertyType === 'number' || propertyType === 'integer') {
                                                                            return !isNaN(Number(val));
                                                                        }
                                                                        if (propertyType === 'boolean') {
                                                                            return val === 'true' || val === 'false';
                                                                        }
                                                                        if (format === 'date' || format === 'date-time') {
                                                                            return !isNaN(Date.parse(val));
                                                                        }
                                                                        return true;
                                                                    };

                                                                    const inputType = getInputType();
                                                                    const valueStr = String(nestedCondition.value || '');
                                                                    const isValid = validateValue(valueStr, nestedProp?.type || 'string', nestedProp?.format);
                                                                    const typeLabel = nestedProp
                                                                        ? `${nestedProp.type}${nestedProp.format ? ` (${nestedProp.format})` : ''}`
                                                                        : 'string';

                                                                    if (nestedProp?.type === 'boolean') {
                                                                        return (
                                                                            <select
                                                                                className="minimal-select row-value"
                                                                                value={valueStr}
                                                                                onChange={(e) => updateNestedCondition(index, nestedIndex, { value: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value })}
                                                                                style={{ minWidth: 100 }}
                                                                            >
                                                                                <option value="">Select...</option>
                                                                                <option value="true">true</option>
                                                                                <option value="false">false</option>
                                                                            </select>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div style={{ position: 'relative', flex: 2 }}>
                                                                            <input
                                                                                type={inputType}
                                                                                className={`minimal-input row-value ${!isValid ? 'error' : ''}`}
                                                                                value={valueStr}
                                                                                onChange={(e) => {
                                                                                    const newVal = e.target.value;
                                                                                    if (nestedProp?.type === 'number' || nestedProp?.type === 'integer') {
                                                                                        const numVal = newVal === '' ? null : Number(newVal);
                                                                                        if (newVal === '' || !isNaN(numVal!)) {
                                                                                            updateNestedCondition(index, nestedIndex, { value: nestedProp.type === 'integer' ? (numVal === null ? null : Math.floor(numVal)) : numVal });
                                                                                        }
                                                                                    } else {
                                                                                        updateNestedCondition(index, nestedIndex, { value: newVal });
                                                                                    }
                                                                                }}
                                                                                placeholder={`Value (${typeLabel})`}
                                                                                title={`Expected type: ${typeLabel}`}
                                                                                style={{
                                                                                    borderColor: !isValid ? 'var(--error)' : undefined,
                                                                                    paddingRight: nestedProp ? '60px' : undefined
                                                                                }}
                                                                            />
                                                                            {nestedProp && (
                                                                                <span style={{
                                                                                    position: 'absolute',
                                                                                    right: '8px',
                                                                                    top: '50%',
                                                                                    transform: 'translateY(-50%)',
                                                                                    fontSize: '0.7rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    pointerEvents: 'none'
                                                                                }}>
                                                                                    {typeLabel}
                                                                                </span>
                                                                            )}
                                                                            {!isValid && valueStr && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    top: '100%',
                                                                                    left: 0,
                                                                                    fontSize: '0.7rem',
                                                                                    color: 'var(--error)',
                                                                                    marginTop: '2px'
                                                                                }}>
                                                                                    Invalid {typeLabel} value
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <button
                                                                    className="btn-icon danger"
                                                                    onClick={() => removeNestedCondition(index, nestedIndex)}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    }))}
                                                {condition.nested.conditions.length > 0 && (
                                                    <button
                                                        className="add-btn"
                                                        onClick={() => addNestedCondition(index)}
                                                        style={{ marginTop: 'var(--space-xs)' }}
                                                    >
                                                        <Plus size={14} /> Add nested condition
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {conditions.conditions.length === 0 && (
                            <div className="placeholder-row" onClick={addCondition}>
                                <Plus size={18} />
                                <span>Add your first condition to start automation</span>
                            </div>
                        )}
                        {conditions.conditions.length > 0 && (
                            <div className="add-row-trigger">
                                <button className="add-btn" onClick={addCondition}>
                                    <Plus size={16} /> Add condition
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* THEN Block */}
                <section className="logic-block-card">
                    <header className="block-header">
                        <div className="block-title">
                            <div className="indicator then-indicator">THEN</div>
                            <div>
                                <h4>Actions ({actions.length})</h4>
                                <p>Specify the actions to perform</p>
                            </div>
                        </div>
                    </header>

                    <div className="logic-rows">
                        {actions.map((action, index) => (
                            <div key={index} className="logic-row action-row animate-in">
                                {action.type === 'MODIFY' && (() => {
                                    // Get available output schema properties for the dropdown
                                    const getOutputSchemaProperties = (): { path: string; type: string; label: string }[] => {
                                        const result: { path: string; type: string; label: string }[] = [];

                                        for (const schema of availableOutputSchemas) {
                                            let schemaProperties = schema.properties;

                                            // Parse from jsonSchema if properties not available
                                            if ((!schemaProperties || schemaProperties.length === 0) && schema.jsonSchema) {
                                                try {
                                                    const parsed = JSON.parse(schema.jsonSchema);
                                                    if (parsed.properties) {
                                                        schemaProperties = Object.entries(parsed.properties).map(([key, val]: [string, any]) => ({
                                                            name: key,
                                                            type: val.type || 'string',
                                                            path: key,
                                                            items: val.items ? {
                                                                name: 'item',
                                                                type: val.items.type || 'string',
                                                                path: `${key}[]`
                                                            } : undefined,
                                                            properties: val.properties ? Object.entries(val.properties).map(([k, v]: [string, any]) => ({
                                                                name: k,
                                                                type: v.type || 'string',
                                                                path: `${key}.${k}`
                                                            })) : undefined
                                                        }));
                                                    }
                                                } catch (e) {
                                                    console.error('Failed to parse schema', e);
                                                }
                                            }

                                            if (schemaProperties) {
                                                const addProps = (props: SchemaProperty[], prefix = '') => {
                                                    for (const prop of props) {
                                                        const path = prefix ? `${prefix}.${prop.name}` : prop.name;
                                                        result.push({
                                                            path,
                                                            type: prop.type || 'string',
                                                            label: `${schema.name}.${path}`
                                                        });
                                                        if (prop.properties) {
                                                            addProps(prop.properties, path);
                                                        }
                                                    }
                                                };
                                                addProps(schemaProperties);
                                            }
                                        }

                                        return result;
                                    };

                                    const outputProperties = getOutputSchemaProperties();

                                    return (
                                        <div className="action-config">
                                            <span className="action-tag">Change</span>
                                            {outputProperties.length > 0 ? (
                                                <select
                                                    className="minimal-select"
                                                    value={action.targetField || ''}
                                                    onChange={(e) => updateAction(index, { targetField: e.target.value })}
                                                    style={{ flex: 1, minWidth: 200 }}
                                                    title="Select attribute from output schema"
                                                >
                                                    <option value="" disabled>Select target field...</option>
                                                    {outputProperties.map(prop => (
                                                        <option key={prop.path} value={prop.path}>
                                                            {prop.label} ({prop.type})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="minimal-input"
                                                    value={action.targetField || ''}
                                                    onChange={(e) => updateAction(index, { targetField: e.target.value })}
                                                    placeholder="Target field"
                                                    list="output-property-list"
                                                />
                                            )}
                                            <ChevronRight size={18} className="arrow-divider" />
                                            <span className="action-tag">To</span>
                                            {(() => {
                                                // Find the property type of the selected field
                                                const selectedProp = outputProperties.find(p => p.path === action.targetField);
                                                const isArray = selectedProp?.type === 'array';

                                                if (isArray) {
                                                    // Option B - Simple List View
                                                    const arrValue = Array.isArray(action.value) ? action.value : [];

                                                    return (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px',
                                                            flex: 1,
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: 'var(--radius-md)',
                                                            padding: '12px'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                color: 'var(--text-secondary)',
                                                                marginBottom: '4px'
                                                            }}>
                                                                Array Values
                                                            </div>
                                                            {arrValue.map((item: any, itemIdx: number) => (
                                                                <div key={itemIdx} style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px'
                                                                }}>
                                                                    <span style={{
                                                                        fontSize: '0.75rem',
                                                                        color: 'var(--text-muted)',
                                                                        minWidth: '20px'
                                                                    }}>
                                                                        {itemIdx + 1}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        className="minimal-input"
                                                                        value={item !== undefined ? String(item) : ''}
                                                                        onChange={(e) => {
                                                                            const newArr = [...arrValue];
                                                                            newArr[itemIdx] = e.target.value;
                                                                            updateAction(index, { value: newArr });
                                                                        }}
                                                                        placeholder={`Value ${itemIdx + 1}`}
                                                                        style={{ flex: 1 }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newArr = arrValue.filter((_: any, i: number) => i !== itemIdx);
                                                                            updateAction(index, { value: newArr.length ? newArr : undefined });
                                                                        }}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: 'var(--text-muted)',
                                                                            cursor: 'pointer',
                                                                            padding: '4px',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--error)'}
                                                                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                                        title="Remove item"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateAction(index, { value: [...arrValue, ''] });
                                                                }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'var(--primary)',
                                                                    cursor: 'pointer',
                                                                    padding: '4px 0',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 500,
                                                                    textAlign: 'left',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <Plus size={14} /> Add Item
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                // Default: simple text input
                                                return (
                                                    <input
                                                        type="text"
                                                        className="minimal-input"
                                                        value={String(action.value || '')}
                                                        onChange={(e) => updateAction(index, { value: e.target.value })}
                                                        placeholder="New value"
                                                    />
                                                );
                                            })()}
                                        </div>
                                    );
                                })()}

                                {action.type === 'INSERT' && (
                                    <div className="action-config" style={{ flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'stretch' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span className="action-tag">Create</span>
                                            {lockedOutputSchemaId ? (
                                                <div className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-mono text-sm border border-purple-500/30">
                                                    {availableOutputSchemas?.find(s => s.id === lockedOutputSchemaId)?.name || action.factType || 'Output Schema'}
                                                </div>
                                            ) : (
                                                availableOutputSchemas && availableOutputSchemas.length > 0 ? (
                                                    <select
                                                        className="minimal-select"
                                                        value={action.factType || ''}
                                                        onChange={(e) => {
                                                            updateAction(index, {
                                                                factType: e.target.value,
                                                                factData: {} // Reset factData when schema changes
                                                            });
                                                        }}
                                                        title="Select from output context schemas only"
                                                        style={{ flex: 1 }}
                                                    >
                                                        <option value="" disabled>Select Output Schema</option>
                                                        {availableOutputSchemas.map(s => (
                                                            <option key={s.id} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="minimal-input"
                                                        value={action.factType || ''}
                                                        onChange={(e) => updateAction(index, { factType: e.target.value })}
                                                        placeholder="Output Schema Name"
                                                        disabled
                                                        title="No output schemas available"
                                                        style={{ flex: 1 }}
                                                    />
                                                )
                                            )}
                                        </div>

                                        {/* Show property inputs when schema is selected */}
                                        {action.factType && (() => {
                                            const selectedSchema = availableOutputSchemas?.find(s => s.name === action.factType);
                                            if (!selectedSchema) {
                                                return null;
                                            }

                                            // Parse properties from jsonSchema if not already available
                                            let schemaProperties = selectedSchema.properties;
                                            if ((!schemaProperties || schemaProperties.length === 0) && selectedSchema.jsonSchema) {
                                                try {
                                                    const parsed = JSON.parse(selectedSchema.jsonSchema);
                                                    if (parsed.properties) {
                                                        schemaProperties = Object.entries(parsed.properties).map(([key, val]: [string, any]) => ({
                                                            name: key,
                                                            type: val.type || 'string',
                                                            path: key,
                                                            properties: val.properties ? Object.entries(val.properties).map(([k, v]: [string, any]) => ({
                                                                name: k,
                                                                type: v.type || 'string',
                                                                path: `${key}.${k}`
                                                            })) : undefined
                                                        }));
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to parse schema properties", e);
                                                }
                                            }

                                            if (!schemaProperties || schemaProperties.length === 0) {
                                                return (
                                                    <div style={{
                                                        marginTop: 'var(--space-sm)',
                                                        padding: 'var(--space-sm)',
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)'
                                                    }}>
                                                        No properties defined for this schema
                                                    </div>
                                                );
                                            }

                                            const renderPropertyInput = (prop: SchemaProperty, path: string = prop.name) => {
                                                const currentValue = action.factData?.[path];
                                                const inputId = `insert-${index}-${path}`;

                                                return (
                                                    <div key={path} style={{ marginTop: 'var(--space-sm)' }}>
                                                        <label
                                                            htmlFor={inputId}
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                color: 'var(--text-secondary)',
                                                                marginBottom: '4px'
                                                            }}
                                                        >
                                                            {prop.name} {prop.type && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({prop.type})</span>}
                                                        </label>
                                                        {prop.type === 'boolean' ? (
                                                            <select
                                                                id={inputId}
                                                                className="minimal-select"
                                                                value={currentValue === true ? 'true' : currentValue === false ? 'false' : ''}
                                                                onChange={(e) => {
                                                                    const newFactData = { ...(action.factData || {}) };
                                                                    if (e.target.value === '') {
                                                                        delete newFactData[path];
                                                                    } else {
                                                                        newFactData[path] = e.target.value === 'true';
                                                                    }
                                                                    updateAction(index, { factData: newFactData });
                                                                }}
                                                            >
                                                                <option value="">Not set</option>
                                                                <option value="true">true</option>
                                                                <option value="false">false</option>
                                                            </select>
                                                        ) : prop.type === 'number' || prop.type === 'integer' ? (
                                                            <input
                                                                id={inputId}
                                                                type="number"
                                                                className="minimal-input"
                                                                value={currentValue !== undefined ? String(currentValue) : ''}
                                                                onChange={(e) => {
                                                                    const newFactData = { ...(action.factData || {}) };
                                                                    if (e.target.value === '') {
                                                                        delete newFactData[path];
                                                                    } else {
                                                                        newFactData[path] = prop.type === 'integer'
                                                                            ? parseInt(e.target.value, 10)
                                                                            : parseFloat(e.target.value);
                                                                    }
                                                                    updateAction(index, { factData: newFactData });
                                                                }}
                                                                placeholder={`Enter ${prop.name}...`}
                                                            />
                                                        ) : prop.type === 'array' ? (
                                                            // Array input - allow adding multiple values
                                                            <div style={{
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-md)',
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--bg-secondary)'
                                                            }}>
                                                                {(Array.isArray(currentValue) ? currentValue : []).map((item: any, itemIdx: number) => {
                                                                    const arrLen = Array.isArray(currentValue) ? currentValue.length : 0;
                                                                    return (
                                                                        <div key={itemIdx} style={{
                                                                            display: 'flex',
                                                                            gap: 'var(--space-xs)',
                                                                            marginBottom: itemIdx < arrLen - 1 ? 'var(--space-xs)' : 0
                                                                        }}>
                                                                            <input
                                                                                type={prop.items?.type === 'number' || prop.items?.type === 'integer' ? 'number' : 'text'}
                                                                                className="minimal-input"
                                                                                style={{ flex: 1 }}
                                                                                value={item !== undefined ? String(item) : ''}
                                                                                onChange={(e) => {
                                                                                    const newFactData = { ...(action.factData || {}) };
                                                                                    const arr = Array.isArray(newFactData[path]) ? [...newFactData[path]] : [];
                                                                                    if (prop.items?.type === 'number') {
                                                                                        arr[itemIdx] = parseFloat(e.target.value);
                                                                                    } else if (prop.items?.type === 'integer') {
                                                                                        arr[itemIdx] = parseInt(e.target.value, 10);
                                                                                    } else {
                                                                                        arr[itemIdx] = e.target.value;
                                                                                    }
                                                                                    newFactData[path] = arr;
                                                                                    updateAction(index, { factData: newFactData });
                                                                                }}
                                                                                placeholder={`Value ${itemIdx + 1}...`}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-ghost btn-sm"
                                                                                style={{ color: 'var(--error)', padding: '4px' }}
                                                                                onClick={() => {
                                                                                    const newFactData = { ...(action.factData || {}) };
                                                                                    const arr = Array.isArray(newFactData[path]) ? [...newFactData[path]] : [];
                                                                                    arr.splice(itemIdx, 1);
                                                                                    if (arr.length === 0) {
                                                                                        delete newFactData[path];
                                                                                    } else {
                                                                                        newFactData[path] = arr;
                                                                                    }
                                                                                    updateAction(index, { factData: newFactData });
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm"
                                                                    style={{ marginTop: 'var(--space-xs)' }}
                                                                    onClick={() => {
                                                                        const newFactData = { ...(action.factData || {}) };
                                                                        const arr = Array.isArray(newFactData[path]) ? [...newFactData[path]] : [];
                                                                        arr.push(prop.items?.type === 'number' || prop.items?.type === 'integer' ? 0 : '');
                                                                        newFactData[path] = arr;
                                                                        updateAction(index, { factData: newFactData });
                                                                    }}
                                                                >
                                                                    + Add {prop.items?.type || 'item'}
                                                                </button>
                                                            </div>
                                                        ) : prop.properties ? (
                                                            // Nested object - show nested properties
                                                            <div style={{
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--bg-secondary)',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--border-color)'
                                                            }}>
                                                                {prop.properties.map(nestedProp =>
                                                                    renderPropertyInput(nestedProp, `${path}.${nestedProp.name}`)
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                id={inputId}
                                                                type="text"
                                                                className="minimal-input"
                                                                value={currentValue !== undefined ? String(currentValue) : ''}
                                                                onChange={(e) => {
                                                                    const newFactData = { ...(action.factData || {}) };
                                                                    if (e.target.value === '') {
                                                                        delete newFactData[path];
                                                                    } else {
                                                                        newFactData[path] = e.target.value;
                                                                    }
                                                                    updateAction(index, { factData: newFactData });
                                                                }}
                                                                placeholder={`Enter ${prop.name}...`}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div style={{
                                                    marginTop: 'var(--space-sm)',
                                                    padding: 'var(--space-md)',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        color: 'var(--text-muted)',
                                                        marginBottom: 'var(--space-sm)'
                                                    }}>
                                                        Fact Attributes
                                                    </label>
                                                    {schemaProperties.map(prop => renderPropertyInput(prop))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {action.type === 'LOG' && (
                                    <div className="action-config">
                                        <MessageSquare size={18} className="action-icon" />
                                        <span className="action-tag">Log</span>
                                        <input
                                            type="text"
                                            className="minimal-input"
                                            value={action.logMessage || ''}
                                            onChange={(e) => updateAction(index, { logMessage: e.target.value })}
                                            placeholder="Message to log..."
                                        />
                                    </div>
                                )}

                                {action.type === 'WEBHOOK' && (
                                    <div className="action-config">
                                        <Zap size={18} className="action-icon" />
                                        <select
                                            className="minimal-select"
                                            value={action.webhookMethod || 'POST'}
                                            onChange={(e) => updateAction(index, { webhookMethod: e.target.value })}
                                        >
                                            <option value="POST">POST</option>
                                            <option value="GET">GET</option>
                                        </select>
                                        <input
                                            type="text"
                                            className="minimal-input"
                                            value={action.webhookUrl || ''}
                                            onChange={(e) => updateAction(index, { webhookUrl: e.target.value })}
                                            placeholder="Endpoint URL"
                                        />
                                    </div>
                                )}

                                <button className="btn-icon danger" onClick={() => removeAction(index)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        <div className="add-action-trigger">
                            <button className="add-btn" onClick={() => addAction('MODIFY')}>
                                <Plus size={16} /> Add action
                            </button>
                            <button className="add-btn" onClick={() => addAction('INSERT')}>
                                <Plus size={16} /> Create Fact
                            </button>
                            <button className="add-btn" onClick={() => addAction('LOG')}>
                                <Plus size={16} /> Add log
                            </button>
                            <button className="add-btn" onClick={() => addAction('WEBHOOK')}>
                                <Plus size={16} /> Add webhook
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
