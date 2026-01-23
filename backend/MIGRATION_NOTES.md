# Database Migration Notes

## Project-Centric Workflow Migration

This migration adds project hierarchy support to the rule engine.

### Schema Changes

- [x] **`schemas` table**: Add `project_id` column (nullable, foreign key to `rule_projects`)
   - When `project_id` is NULL = global schema (reusable across projects)
   - When `project_id` is set = project-scoped schema

- [x] **`rule_projects` table**: Add `project_id` column (nullable, self-referential foreign key)
   - When `project_id` is NULL = top-level project
   - When `project_id` is set = template within a project

### Migration Strategy

Since JPA is configured with `ddl-auto=update`, the columns will be automatically created on next application startup.

### Data Migration

For existing data:

1. **Existing Schemas**: Keep as global (project_id = NULL)
2. **Existing RuleProjects**: 
   - Option A: Create a default "Global" project and assign all existing templates to it
   - Option B: Keep existing templates as top-level projects (project_id = NULL)

### Manual Migration SQL (if needed)

```sql
-- Add project_id to schemas table
ALTER TABLE schemas ADD COLUMN project_id BIGINT;
CREATE INDEX idx_schemas_project_id ON schemas(project_id);

-- Add project_id to rule_projects table  
ALTER TABLE rule_projects ADD COLUMN project_id BIGINT;
CREATE INDEX idx_rule_projects_project_id ON rule_projects(project_id);

-- Optional: Create default project and migrate existing templates
-- INSERT INTO rule_projects (name, description, created_at, updated_at) 
-- VALUES ('Global', 'Default project for existing templates', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- UPDATE rule_projects SET project_id = (SELECT id FROM rule_projects WHERE name = 'Global') 
-- WHERE project_id IS NULL AND id != (SELECT id FROM rule_projects WHERE name = 'Global');
```

### Backward Compatibility

- Existing global schemas remain accessible
- Existing templates can remain as top-level projects or be migrated to a default project
- API endpoints support both project-scoped and global operations

