# Feature: Schema Editing with Rule Impact Analysis

## Overview

Allow users to modify schemas (add, edit, delete attributes) while providing visibility into rule dependencies and automated rule updates when changes are approved.

## User Stories

### US-1: Add New Attribute to Schema
**As a** rule administrator  
**I want to** add new attributes to an existing schema  
**So that** I can extend the data model to support new business requirements

### US-2: Edit Existing Attribute
**As a** rule administrator  
**I want to** modify attribute properties (name, type, constraints)  
**So that** I can correct errors or adjust the data model

### US-3: Delete Attribute from Schema
**As a** rule administrator  
**I want to** remove attributes that are no longer needed  
**So that** the schema remains clean and maintainable

### US-4: View Rule Impact Before Changes
**As a** rule administrator  
**I want to** see which rules are affected by a schema change  
**So that** I can make informed decisions before modifying the schema

### US-5: Propagate Changes to Affected Rules
**As a** rule administrator  
**I want** the system to automatically update affected rules when I approve changes  
**So that** rules remain consistent with the schema

---

## Functional Requirements

### FR-1: Add Attribute
- User can add a new attribute with the following properties:
  - **Name**: Unique alphanumeric identifier (camelCase)
  - **Type**: string, number, integer, boolean, date, enum, array
  - **Description**: Optional description of the attribute
  - **Required**: Boolean flag indicating if the attribute is mandatory
  - **Default Value**: Optional default value
  - **Constraints**: For enums - allowed values; for numbers - min/max

### FR-2: Edit Attribute
- User can modify the following properties of an existing attribute:
  - **Name**: Renaming the attribute
  - **Type**: Changing the data type
  - **Description**: Updating the description
  - **Required**: Toggling mandatory status
  - **Default Value**: Changing the default
  - **Constraints**: Modifying validation rules

### FR-3: Delete Attribute
- User can delete an attribute from the schema
- System prevents deletion if marked as "protected" (future enhancement)

### FR-4: Impact Analysis
When an attribute is modified or deleted, the system must:

1. **Identify Affected Rules**
   - Scan all rules using this schema
   - Check conditions that reference the attribute
   - Check actions that modify the attribute

2. **Generate Impact Report**
   - List of affected rules with:
     - Rule name and ID
     - Location of attribute usage (condition/action)
     - Specific condition/action details
   - Risk assessment (high/medium/low)

3. **Display Warning Modal**
   - Show the impact report before applying changes
   - Require explicit user confirmation

### FR-5: Rule Propagation
When user approves changes, the system must:

1. **For Renamed Attributes**
   - Update all rule conditions referencing the old name
   - Update all rule actions referencing the old name
   - Regenerate DRL for affected rules

2. **For Changed Types**
   - Attempt automatic type coercion where possible
   - Flag rules needing manual review if coercion fails

3. **For Deleted Attributes**
   - Remove conditions referencing the attribute
   - Remove actions referencing the attribute
   - Log changes for audit trail
   - Regenerate DRL for affected rules

---

## API Design

### Endpoints

#### GET `/api/schemas/{id}/attributes`
Returns all attributes for a schema.

**Response:**
```json
{
  "schemaId": 5,
  "schemaName": "ClaimRequest",
  "attributes": [
    {
      "name": "claimAmount",
      "type": "number",
      "description": "Amount of the claim",
      "required": true,
      "defaultValue": null,
      "constraints": { "min": 0 }
    }
  ]
}
```

#### POST `/api/schemas/{id}/attributes`
Add a new attribute to the schema.

**Request:**
```json
{
  "name": "newAttribute",
  "type": "string",
  "description": "Description here",
  "required": false,
  "defaultValue": null
}
```

#### PUT `/api/schemas/{id}/attributes/{attributeName}`
Update an existing attribute.

**Request:**
```json
{
  "name": "renamedAttribute",  // Optional: new name
  "type": "number",            // Optional: new type
  "description": "Updated",    // Optional
  "required": true             // Optional
}
```

#### DELETE `/api/schemas/{id}/attributes/{attributeName}`
Delete an attribute from the schema.

#### GET `/api/schemas/{id}/attributes/{attributeName}/impact`
Get impact analysis for modifying/deleting an attribute.

**Response:**
```json
{
  "attributeName": "claimAmount",
  "affectedRules": [
    {
      "ruleId": 8,
      "ruleName": "Small Claim Auto-Approve",
      "projectId": 6,
      "projectName": "Insurance Claims Rules",
      "usages": [
        {
          "location": "condition",
          "detail": "claimAmount <= 1000"
        }
      ]
    }
  ],
  "totalAffectedRules": 1,
  "riskLevel": "medium"
}
```

#### POST `/api/schemas/{id}/attributes/{attributeName}/apply-changes`
Apply attribute changes and propagate to affected rules.

**Request:**
```json
{
  "changeType": "rename",  // "rename", "retype", "delete"
  "newValue": "claimValue",
  "confirmPropagation": true
}
```

**Response:**
```json
{
  "success": true,
  "updatedRules": [8, 9, 10],
  "failedRules": [],
  "message": "Successfully updated 3 rules"
}
```

---

## UI Design

### Schema Detail Page Enhancement

#### Attributes Table
| Column | Description |
|--------|-------------|
| Name | Attribute name (editable inline or via modal) |
| Type | Data type with dropdown selector |
| Required | Checkbox |
| Description | Text field |
| Actions | Edit, Delete buttons |

#### Add Attribute Button
- Opens modal with attribute form
- Validates uniqueness of attribute name

#### Edit Attribute Flow
1. User clicks "Edit" on an attribute row
2. Modal opens with current values pre-filled
3. If name or type is changed:
   - System fetches impact analysis
   - Shows affected rules in the modal
4. User can:
   - Cancel to abort changes
   - Confirm to apply changes with propagation

#### Delete Attribute Flow
1. User clicks "Delete" on an attribute row
2. System fetches impact analysis
3. If rules are affected:
   - Warning modal shows affected rules
   - User must acknowledge impact
4. If no rules affected:
   - Simple confirmation dialog
5. On confirm, attribute is deleted and rules updated

### Impact Analysis Modal

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ Schema Change Impact                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  You are about to rename attribute:                  │
│  "claimAmount" → "claimValue"                        │
│                                                      │
│  This change affects 3 rules:                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ✓ Small Claim Auto-Approve                     │  │
│  │   Condition: claimAmount <= 1000               │  │
│  │   Will become: claimValue <= 1000              │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ✓ Exceeds Coverage Limit                       │  │
│  │   Condition: claimAmount > coverageLimit       │  │
│  │   Will become: claimValue > coverageLimit      │  │
│  ├────────────────────────────────────────────────┤  │
│  │ ✓ High Value Claim Review                      │  │
│  │   Action: SET claimAmount = ...                │  │
│  │   Will become: SET claimValue = ...            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  All affected rules will be automatically updated.   │
│                                                      │
│  [Cancel]                    [Apply Changes]         │
└──────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Table: `schema_change_log`

```sql
CREATE TABLE schema_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_id INTEGER NOT NULL,
  attribute_name VARCHAR(255) NOT NULL,
  change_type VARCHAR(50) NOT NULL,  -- 'add', 'rename', 'retype', 'delete'
  old_value TEXT,
  new_value TEXT,
  affected_rule_ids TEXT,  -- JSON array of rule IDs
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schema_id) REFERENCES schemas(id)
);
```

---

## Implementation Plan

### Phase 1: Backend API (3-4 days)
1. Create `SchemaAttributeService`
2. Implement CRUD endpoints for attributes
3. Implement impact analysis logic
4. Implement rule propagation logic
5. Add audit logging

### Phase 2: Frontend UI (3-4 days)
1. Enhance Schema detail page with attributes table
2. Create Add/Edit attribute modal
3. Create Impact Analysis modal
4. Implement delete confirmation flow
5. Add loading states and error handling

### Phase 3: Testing & Polish (2 days)
1. Unit tests for propagation logic
2. Integration tests for API endpoints
3. E2E tests for UI flows
4. Edge case handling (orphan conditions, complex nested conditions)

---

## Risk Considerations

| Risk | Mitigation |
|------|------------|
| Complex nested conditions may not update correctly | Validate DRL compilation after propagation; flag failures |
| Type changes may break existing rules | Prevent incompatible type changes; require manual review |
| Concurrent edits could cause conflicts | Add optimistic locking on schema version |
| Large number of affected rules could slow propagation | Process in batches; provide progress indicator |

---

## Success Metrics

- Users can add/edit/delete schema attributes without backend intervention
- Impact analysis shows accurate rule dependencies
- Rule propagation completes successfully in >95% of cases
- Zero data loss during schema modifications

---

## Future Enhancements

1. **Attribute Protection**: Mark certain attributes as "protected" to prevent accidental deletion
2. **Bulk Operations**: Add/modify multiple attributes at once
3. **Version History**: View and rollback schema versions
4. **Type Validation**: Real-time validation during attribute creation
5. **Import/Export**: Export schema definitions to JSON Schema format
