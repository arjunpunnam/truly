import { useState } from 'react';
import { ChevronRight, ChevronDown, Hash, Type, ToggleLeft, List, Braces, Calendar } from 'lucide-react';
import { SchemaProperty } from '../../types';
import './ObjectTree.css';

interface ObjectTreeProps {
    properties: SchemaProperty[];
    onSelect?: (path: string, property: SchemaProperty) => void;
    onAddCondition?: (path: string, property: SchemaProperty) => void;
    onAddAction?: (path: string, property: SchemaProperty) => void;
    selectedPath?: string;
}

interface TreeNodeProps {
    property: SchemaProperty;
    depth: number;
    onSelect?: (path: string, property: SchemaProperty) => void;
    onAddCondition?: (path: string, property: SchemaProperty) => void;
    onAddAction?: (path: string, property: SchemaProperty) => void;
    selectedPath?: string;
    expanded: Set<string>;
    onToggle: (path: string) => void;
}

const getTypeIcon = (type: string, format?: string) => {
    if (format === 'date' || format === 'date-time') return Calendar;
    switch (type) {
        case 'string': return Type;
        case 'number':
        case 'integer': return Hash;
        case 'boolean': return ToggleLeft;
        case 'array': return List;
        case 'object': return Braces;
        default: return Type;
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case 'string': return '#10b981';
        case 'number':
        case 'integer': return '#f59e0b';
        case 'boolean': return '#3b82f6';
        case 'array': return '#8b5cf6';
        case 'object': return '#ec4899';
        default: return '#6b7280';
    }
};

function TreeNode({
    property,
    depth,
    onSelect,
    onAddCondition,
    onAddAction,
    selectedPath,
    expanded,
    onToggle
}: TreeNodeProps) {
    const hasChildren = property.type === 'object' && property.properties && property.properties.length > 0;
    const hasItems = property.type === 'array' && property.items;
    const isExpandable = hasChildren || hasItems;
    const isExpanded = expanded.has(property.path);
    const isSelected = selectedPath === property.path;

    const Icon = getTypeIcon(property.type, property.format);
    const typeColor = getTypeColor(property.type);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpandable) {
            onToggle(property.path);
        }
        if (onSelect) {
            onSelect(property.path, property);
        }
    };

    return (
        <div className="tree-node">
            <div
                className={`tree-node-content ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={handleClick}
            >
                <span className="tree-node-expand">
                    {isExpandable ? (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <span style={{ width: 14 }} />
                    )}
                </span>
                <span className="tree-node-icon" style={{ color: typeColor }}>
                    <Icon size={14} />
                </span>
                <span className="tree-node-name">{property.name}</span>
                <span className="tree-node-type" style={{ color: typeColor }}>
                    {property.type}
                </span>

                <div className="tree-node-actions">
                    {!isExpandable && (
                        <>
                            <button
                                className="tree-action-btn if"
                                onClick={(e) => { e.stopPropagation(); onAddCondition?.(property.path, property); }}
                                title="Add as IF condition"
                            >
                                IF
                            </button>
                            <button
                                className="tree-action-btn then"
                                onClick={(e) => { e.stopPropagation(); onAddAction?.(property.path, property); }}
                                title="Add as THEN action"
                            >
                                THEN
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="tree-node-children">
                    {property.properties!.map((child) => (
                        <TreeNode
                            key={child.path}
                            property={child}
                            depth={depth + 1}
                            onSelect={onSelect}
                            onAddCondition={onAddCondition}
                            onAddAction={onAddAction}
                            selectedPath={selectedPath}
                            expanded={expanded}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}

            {isExpanded && hasItems && (
                <div className="tree-node-children">
                    <TreeNode
                        property={{ ...property.items!, name: '[item]', path: `${property.path}[]` }}
                        depth={depth + 1}
                        onSelect={onSelect}
                        onAddCondition={onAddCondition}
                        onAddAction={onAddAction}
                        selectedPath={selectedPath}
                        expanded={expanded}
                        onToggle={onToggle}
                    />
                </div>
            )}
        </div>
    );
}

export default function ObjectTree({ properties, onSelect, onAddCondition, onAddAction, selectedPath }: ObjectTreeProps) {
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        properties.forEach(p => {
            if (p.type === 'object') initial.add(p.path);
        });
        return initial;
    });

    const handleToggle = (path: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    if (!properties || properties.length === 0) {
        return (
            <div className="object-tree-empty">
                <Braces size={24} />
                <p>No properties defined</p>
            </div>
        );
    }

    return (
        <div className="object-tree">
            {properties.map((property) => (
                <TreeNode
                    key={property.path}
                    property={property}
                    depth={0}
                    onSelect={onSelect}
                    onAddCondition={onAddCondition}
                    onAddAction={onAddAction}
                    selectedPath={selectedPath}
                    expanded={expanded}
                    onToggle={handleToggle}
                />
            ))}
        </div>
    );
}
