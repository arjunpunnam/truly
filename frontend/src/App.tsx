import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Settings, HelpCircle, Folder, Sparkles } from 'lucide-react';
import TemplateDetailsPage from './pages/TemplateDetailsPage';
import RulesPage from './pages/RulesPage';
import ExecutePage from './pages/ExecutePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectOverviewPage from './pages/ProjectOverviewPage';
import ProjectSchemasPage from './pages/ProjectSchemasPage';
import ProjectTemplatesPage from './pages/ProjectTemplatesPage';
import ProjectAuditPage from './pages/ProjectAuditPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import { projectApi } from './services/api';
import { RuleProject } from './types';
import './App.css';

function App() {
    const [projects, setProjects] = useState<RuleProject[]>([]);

    useEffect(() => {
        projectApi.getAll()
            .then(setProjects)
            .catch((err) => console.error('Failed to load sidebar projects', err));
    }, []);

    return (
        <BrowserRouter>
            <div className="app-container">
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <div className="logo">
                            <Sparkles size={24} className="logo-icon" />
                            <span>Truly</span>
                        </div>
                        <p className="logo-tagline">Rule Orchestration</p>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-group">
                            <NavLink to="/projects" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                                <Folder size={18} />
                                <span>Projects</span>
                            </NavLink>
                            {projects.length > 0 && (
                                <div className="project-list">
                                    {projects.map(project => (
                                        <NavLink
                                            key={project.id}
                                            to={`/projects/${project.id}`}
                                            className={({ isActive }) => isActive ? 'project-link active' : 'project-link'}
                                        >
                                            {project.name}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="nav-group nav-group-bottom">
                            <NavLink to="/settings" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                                <Settings size={18} />
                                <span>Settings</span>
                            </NavLink>
                            <NavLink to="/help" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                                <HelpCircle size={18} />
                                <span>Help & Docs</span>
                            </NavLink>
                        </div>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="version-tag">v1.2.0</div>
                    </div>
                </aside>

                <main className="main-content">
                    <div className="content-area">
                        <Routes>
                            <Route path="/" element={<ProjectsPage />} />
                            <Route path="/projects" element={<ProjectsPage />} />
                            <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
                                <Route index element={<ProjectOverviewPage />} />
                                <Route path="schemas" element={<ProjectSchemasPage />} />
                                <Route path="templates" element={<ProjectTemplatesPage />} />
                                <Route path="templates/:templateId" element={<TemplateDetailsPage />} />
                                <Route path="rules" element={<RulesPage />} />
                                <Route path="execute" element={<ExecutePage />} />
                                <Route path="dashboard" element={<ProjectDashboardPage />} />
                                <Route path="audit" element={<ProjectAuditPage />} />
                            </Route>
                        </Routes>
                    </div>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
