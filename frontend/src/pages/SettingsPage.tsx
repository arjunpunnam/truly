import { Copy, Settings } from 'lucide-react';

const runtimeVars = [
    ['SPRING_PROFILES_ACTIVE', 'production,postgresql', 'Active Spring profiles'],
    ['SERVER_PORT', '8092', 'Backend listener port'],
    ['APP_CORS_ALLOWED_ORIGINS', 'https://app.trulyhq.com', 'Comma-separated allowed frontend origins'],
    ['POSTGRES_HOST', 'db.internal', 'Postgres host for backend'],
    ['POSTGRES_PORT', '5432', 'Postgres port'],
    ['POSTGRES_DB', 'truly', 'Postgres database name'],
    ['POSTGRES_USER', 'truly', 'Postgres database user'],
    ['POSTGRES_PASSWORD', '***', 'Postgres database password'],
];

const startupCommands = [
    ['Backend', 'cd backend && mvn spring-boot:run'],
    ['Frontend', 'cd frontend && npm run dev'],
    ['Free backend 8092', 'lsof -ti :8092 | xargs kill -9 2>/dev/null'],
];

export default function SettingsPage() {
    const copyText = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    return (
        <div className="page animate-in">
            <div className="page-header">
                <div>
                    <h1>
                        <Settings size={24} />
                        Settings
                    </h1>
                    <p className="text-muted">Runtime configuration and local startup controls</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Local Startup</h3>
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        {startupCommands.map(([label, command]) => (
                            <div
                                key={label}
                                style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-md)',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
                                    <code style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{command}</code>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => copyText(command)}>
                                    <Copy size={14} />
                                    Copy
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Backend Environment</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '10px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variable</th>
                                    <th style={{ padding: '10px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Example</th>
                                    <th style={{ padding: '10px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runtimeVars.map(([key, value, purpose]) => (
                                    <tr key={key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '12px 8px', fontSize: '0.875rem', fontWeight: 600 }}>{key}</td>
                                        <td style={{ padding: '12px 8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            <code>{value}</code>
                                        </td>
                                        <td style={{ padding: '12px 8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{purpose}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
