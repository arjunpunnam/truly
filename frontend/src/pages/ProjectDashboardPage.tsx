import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Clock, CheckCircle2, XCircle, Zap, RefreshCw, TrendingUp } from 'lucide-react';
import { projectApi } from '../services/api';
import { RuleProject, ExecutionHistory } from '../types';

interface ProjectContext {
    project: RuleProject;
    loadProject: () => Promise<void>;
}

type TimeFilter = 'all' | '1m' | '1h' | '24h' | '7d';

export default function ProjectDashboardPage() {
    const { project } = useOutletContext<ProjectContext>();
    const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');

    useEffect(() => {
        loadExecutions();
    }, [project.id]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            const data = await projectApi.getExecutionHistory(project.id);
            setExecutions(data);
        } catch (err) {
            console.error('Failed to load executions', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredExecutions = useMemo(() => {
        const now = new Date();
        let cutoff: Date;

        switch (timeFilter) {
            case '1m':
                cutoff = new Date(now.getTime() - 60 * 1000);
                break;
            case '1h':
                cutoff = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                return executions;
        }

        return executions.filter(e => new Date(e.executedAt) >= cutoff);
    }, [executions, timeFilter]);

    const stats = useMemo(() => {
        const total = filteredExecutions.length;
        const successful = filteredExecutions.filter(e => e.success).length;
        const failed = total - successful;
        const avgTime = total > 0
            ? Math.round(filteredExecutions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) / total)
            : 0;
        const totalRulesFired = filteredExecutions.reduce((sum, e) =>
            sum + (e.firedRules?.reduce((s, r) => s + r.fireCount, 0) || 0), 0);

        return { total, successful, failed, avgTime, totalRulesFired };
    }, [filteredExecutions]);

    const timeFilters: { value: TimeFilter; label: string }[] = [
        { value: '1m', label: 'Last Minute' },
        { value: '1h', label: 'Last Hour' },
        { value: '24h', label: 'Last 24h' },
        { value: '7d', label: 'Last 7 Days' },
        { value: 'all', label: 'All Time' },
    ];

    const formatTime = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    if (loading && executions.length === 0) {
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
                    <h2 style={{ margin: 0, marginBottom: 'var(--space-xs)' }}>Execution Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        Monitor rule execution statistics and performance
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {/* Time Filter */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2px',
                        gap: '2px'
                    }}>
                        {timeFilters.map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setTimeFilter(filter.value)}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: timeFilter === filter.value ? 'var(--primary)' : 'transparent',
                                    color: timeFilter === filter.value ? 'white' : 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={loadExecutions}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <Activity size={24} style={{ color: 'var(--primary)', marginBottom: 'var(--space-xs)' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.total}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Total Executions
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <CheckCircle2 size={24} style={{ color: '#4ade80', marginBottom: 'var(--space-xs)' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>
                        {stats.successful}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Successful
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <XCircle size={24} style={{ color: '#f87171', marginBottom: 'var(--space-xs)' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f87171' }}>
                        {stats.failed}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Failed
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <Clock size={24} style={{ color: '#60a5fa', marginBottom: 'var(--space-xs)' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatTime(stats.avgTime)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Avg. Time
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <Zap size={24} style={{ color: '#fbbf24', marginBottom: 'var(--space-xs)' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.totalRulesFired}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Rules Fired
                    </div>
                </div>
            </div>

            {/* Success Rate Bar */}
            {stats.total > 0 && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ fontWeight: 600 }}>Success Rate</span>
                        <span style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: stats.successful / stats.total > 0.9 ? '#4ade80' : stats.successful / stats.total > 0.7 ? '#fbbf24' : '#f87171'
                        }}>
                            {((stats.successful / stats.total) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div style={{
                        height: '8px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(stats.successful / stats.total) * 100}%`,
                            background: stats.successful / stats.total > 0.9 ? '#4ade80' : stats.successful / stats.total > 0.7 ? '#fbbf24' : '#f87171',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width var(--transition-normal)'
                        }} />
                    </div>
                </div>
            )}

            {/* Recent Executions */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <TrendingUp size={18} />
                    Recent Executions
                </h3>

                {filteredExecutions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                        <Activity size={32} style={{ opacity: 0.5, marginBottom: 'var(--space-sm)' }} />
                        <p>No executions in this time period</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredExecutions.slice(0, 20).map(exec => (
                            <div
                                key={exec.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-sm) 0',
                                    borderBottom: '1px solid var(--border-color)'
                                }}
                            >
                                {exec.success ? (
                                    <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
                                ) : (
                                    <XCircle size={18} style={{ color: '#f87171' }} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        {exec.firedRules?.length || 0} rule(s) fired
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {formatDate(exec.executedAt)}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                    fontFamily: "'JetBrains Mono', monospace"
                                }}>
                                    {formatTime(exec.executionTimeMs || 0)}
                                </div>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    background: exec.dryRun ? 'rgba(96, 165, 250, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                                    color: exec.dryRun ? '#60a5fa' : '#4ade80'
                                }}>
                                    {exec.dryRun ? 'DRY RUN' : 'LIVE'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
