import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, FileText, Layout, Database, Zap, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectApi } from '../services/api';
import { RuleProject, ProjectAuditLog } from '../types';

interface ProjectContext {
    project: RuleProject;
    loadProject: () => Promise<void>;
}

export default function ProjectAuditPage() {
    const { project } = useOutletContext<ProjectContext>();
    const [auditLogs, setAuditLogs] = useState<ProjectAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 15;

    useEffect(() => {
        loadAuditLogs();
    }, [project.id, page]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const data = await projectApi.getAuditLogsPaged(project.id, page, pageSize);
            setAuditLogs(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (entityType: string) => {
        switch (entityType) {
            case 'PROJECT': return <Zap size={14} style={{ color: '#4ade80' }} />;
            case 'TEMPLATE': return <Layout size={14} style={{ color: '#a78bfa' }} />;
            case 'RULE': return <FileText size={14} style={{ color: '#60a5fa' }} />;
            case 'SCHEMA': return <Database size={14} style={{ color: '#fbbf24' }} />;
            default: return <FileText size={14} style={{ color: 'var(--text-muted)' }} />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return '#4ade80';
            case 'UPDATE': return '#60a5fa';
            case 'DELETE': return '#f87171';
            case 'ENABLE': return '#4ade80';
            case 'DISABLE': return '#94a3b8';
            case 'EXECUTE': return '#a78bfa';
            default: return 'var(--text-muted)';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading && auditLogs.length === 0) {
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
                <div>
                    <h2 style={{ margin: 0, marginBottom: 'var(--space-xs)' }}>Audit Log</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        Track all changes made to this project
                    </p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={loadAuditLogs}
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {auditLogs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <Clock size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                    <h3 style={{ marginBottom: 'var(--space-xs)' }}>No audit logs yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Changes to rules, schemas, and templates will be tracked here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '2px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)'
                                }}>
                                    <th style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)'
                                    }}>Time</th>
                                    <th style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)'
                                    }}>Action</th>
                                    <th style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)'
                                    }}>Entity</th>
                                    <th style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)'
                                    }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id} style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background var(--transition-fast)'
                                    }}>
                                        <td style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            whiteSpace: 'nowrap',
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                <Clock size={12} />
                                                {formatDate(log.createdAt)}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                background: `${getActionColor(log.action)}20`,
                                                color: getActionColor(log.action)
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                {getEntityIcon(log.entityType)}
                                                <span style={{
                                                    fontSize: '0.6875rem',
                                                    color: 'var(--text-muted)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {log.entityType}
                                                </span>
                                                {log.entityName && (
                                                    <span style={{
                                                        fontWeight: 500,
                                                        fontSize: '0.875rem',
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        {log.entityName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: 'var(--space-sm) var(--space-md)',
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {log.details || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 'var(--space-md)',
                            padding: 'var(--space-sm) 0'
                        }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    fontSize: '0.875rem'
                                }}>
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
