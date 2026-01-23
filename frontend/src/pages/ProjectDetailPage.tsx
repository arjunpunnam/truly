import { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Database, Layout, FileText, Play, BarChart3, Clock, Activity } from 'lucide-react';
import { projectApi } from '../services/api';
import { RuleProject } from '../types';

export default function ProjectDetailPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const id = Number(projectId);

    const [project, setProject] = useState<RuleProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('overview');

    useEffect(() => {
        if (id) {
            loadProject();
        }
    }, [id]);

    useEffect(() => {
        // Determine active tab from route
        const path = location.pathname;
        if (path.includes('/schemas')) {
            setActiveTab('schemas');
        } else if (path.includes('/templates')) {
            setActiveTab('templates');
        } else if (path.includes('/rules')) {
            setActiveTab('rules');
        } else if (path.includes('/execute')) {
            setActiveTab('execute');
        } else if (path.includes('/audit')) {
            setActiveTab('audit');
        } else if (path.includes('/dashboard')) {
            setActiveTab('dashboard');
        } else {
            setActiveTab('overview');
        }
    }, [location.pathname]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const data = await projectApi.getById(id);
            setProject(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3, path: '' },
        { id: 'schemas', label: 'Schemas', icon: Database, path: '/schemas' },
        { id: 'templates', label: 'Templates', icon: Layout, path: '/templates' },
        { id: 'rules', label: 'Rules', icon: FileText, path: '/rules' },
        { id: 'execute', label: 'Execute', icon: Play, path: '/execute' },
        { id: 'dashboard', label: 'Dashboard', icon: Activity, path: '/dashboard' },
        { id: 'audit', label: 'Audit', icon: Clock, path: '/audit' },
    ];

    if (loading) {
        return (
            <div className="page">
                <div className="flex justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="page">
                <div className="page-header">
                    <Link to="/projects" className="btn btn-ghost btn-sm">
                        <ArrowLeft size={16} />
                        Back to Projects
                    </Link>
                </div>
                <div className="empty-state">
                    <p style={{ color: 'var(--error)' }}>{error || 'Project not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <Link to="/projects" className="btn btn-ghost btn-sm">
                        <ArrowLeft size={16} />
                        Projects
                    </Link>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                            {project.name}
                        </h1>
                        {project.description && (
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                {project.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                gap: 'var(--space-sm)'
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const path = `/projects/${id}${tab.path}`;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                navigate(path);
                            }}
                            className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                borderRadius: 0,
                                borderBottomLeftRadius: 'var(--radius-md)',
                                borderBottomRightRadius: 'var(--radius-md)',
                                marginBottom: '-1px'
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <Outlet context={{ project, loadProject }} />
        </div>
    );
}

