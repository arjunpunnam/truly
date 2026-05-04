import { BookOpen } from 'lucide-react';

const quickFlow = [
    'Create a project from Projects',
    'Add one or more schemas in Schemas',
    'Create a template and connect input/output schemas',
    'Author rules with conditions and actions',
    'Use Playground to test payloads and review traces',
];

const endpoints = [
    ['GET', '/api/health', 'Backend health check'],
    ['GET', '/api/projects', 'List projects'],
    ['POST', '/api/projects', 'Create a project'],
    ['POST', '/api/projects/{id}/execute', 'Execute rules for a project'],
    ['GET', '/api/projects/{id}/executions', 'Execution history for project'],
];

export default function DocsPage() {
    return (
        <div className="page animate-in">
            <div className="page-header">
                <div>
                    <h1>
                        <BookOpen size={24} />
                        Help & Docs
                    </h1>
                    <p className="text-muted">Product workflow, API basics, and deployment references</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Quick Start Workflow</h3>
                    <ol style={{ paddingLeft: '1.25rem', display: 'grid', gap: 'var(--space-sm)' }}>
                        {quickFlow.map(step => (
                            <li key={step} style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Core API Endpoints</h3>
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        {endpoints.map(([method, path, desc]) => (
                            <div
                                key={`${method}-${path}`}
                                style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)',
                                    display: 'grid',
                                    gridTemplateColumns: '90px 1fr',
                                    gap: 'var(--space-md)'
                                }}
                            >
                                <span className="status-pill active" style={{ width: 'fit-content' }}>{method}</span>
                                <div>
                                    <code style={{ display: 'block', marginBottom: 4 }}>{path}</code>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Deployment References</h3>
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Frontend production URL: <code>https://app.trulyhq.com</code><br />
                            Backend production URL: <code>https://api.trulyhq.com</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
