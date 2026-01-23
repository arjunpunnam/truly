# Technical Specification: Rule Projects & Contracts

## 1. Overview
This feature introduces **Rule Projects** (also serving as "Templates") to the Rule Engine. A Rule Project is a container for a set of rules that share a common **Input Contract (Request)** and **Output Contract (Response)**. 

### Goals
- **Type Safety**: Enforce that all rules in a group operate on the same Input Type and produce the same Output Type.
- **Authoring Simplicity**: When authoring a rule inside a project, the LHS (Conditions) automatically scopes to the Input Schema, and the RHS (Actions) automatically scopes to creating/modifying the Output Schema.
- **Deployment Unit**: The Project becomes the unit of deployment and versioning (Foundation for future requirements).

## 2. Domain Model

### 2.1 New Entity: `RuleProject`
Represents a collection of rules with defined boundaries.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Primary Key |
| `name` | String | User-friendly name (e.g., "Credit Risk Scoring") |
| `slug` | String | URL-friendly identifier (unique per tenant) |
| `description` | String | Optional description |
| `input_schema_id` | Long | FK to `Schema`. Defines the "Request" object. |
| `output_schema_id` | Long | FK to `Schema`. Defines the "Response" object. |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 2.2 Updates to `Rule` Entity
Rules will now optionally belong to a Project.
- **New Field**: `project_id` (Long, FK to `RuleProject`, Nullable for backwards compatibility/ad-hoc rules).
- **Behavior**: If `project_id` is set, `schema_id` (the rule's primary fact type) is implicitly the project's `input_schema_id`.

### 2.3 ER Diagram
```
[Schema] 1 <--- * [RuleProject] 1 ---> * [Rule]
     ^                  |
     |                  |
     +------------------+ (Input Schema)
     |
     +------------------+ (Output Schema)
```

## 3. API Specification

### 3.1 Project Management
- **POST** `/api/projects`: Create a new project.
  - Body: `{ "name": "...", "inputSchemaId": 1, "outputSchemaId": 2 }`
- **GET** `/api/projects`: List all projects.
- **GET** `/api/projects/{id}`: Get project details.
- **PUT** `/api/projects/{id}`: Update project metadata.

### 3.2 Rule Management within Projects
- **POST** `/api/projects/{id}/rules`: Create a rule specifically for this project.
  - *Validation*: Ensures rule conditions use Input Schema fields.
- **GET** `/api/projects/{id}/rules`: Get all rules for the project.

### 3.3 Execution
- **POST** `/api/projects/{id}/execute`: Execute the ruleset for a specific project.
  - Body: `{ "facts": { ... } }` (Typed to input schema)
  - *Response*: Returns the constructed Output object (Typed to output schema).

## 4. Runtime & Transpilation Changes

### 4.1 Drools Context
When transpiling rules for a **Project**, we need a strict execution mode:
1. **Input Fact**: We insert **one** `DynamicFact` of type `InputSchema`.
2. **Output Fact**: We explicitly `insert` a new `DynamicFact` of type `OutputSchema` at the start of the session (or allow rules to do it).
   - *Decision*: To ensure "Deterministic Response", the engine should arguably inject an empty Output object at start, and rules just `modify` it. Or rules `insert` it.
   - *Chosen Approach*: Rules `insert` the output fact if it implies "creation" (e.g. creating a Risk Score). Or, if the Project implies "Validation", rules might just modify a `ValidationResult` object injected by the system.
   - *Refined Approach for this Iteration*: We will stick to the **Create Fact** pattern we just built. The user's template idea suggests: "Here is your Request. define logic to Create this Response."

## 5. UI/UX Changes

### 5.1 Dashboard (New)
- **Projects View**: Cards showing active projects.
- **Create Project Wizard**:
  1. Name & Description.
  2. Select Input Schema (from existing Schemas).
  3. Select Output Schema (from existing Schemas).

### 5.2 Project Details Page
- Validates Input/Output schemas exist.
- Shows list of Rules in this project.
- "Add Rule" button is context-aware.

### 5.3 Context-Aware Rule Builder
- **IF Block**: Automatically locked to `Input Schema`. No need to select "Fact Type".
- **THEN Block**: Originally defaults to `Output Schema`.
  - Added Action: `Create Result` (Shortcut to `INSERT OutputSchema`).

## 6. Migration Plan
1. **Database**: Add `rule_project` table. Add `project_id` to `rules` table.
2. **Backward Compatibility**: Existing rules have `project_id = null`. They continue to work as "Global/Ad-hoc" rules.
3. **Frontend**: Introduce new top-level navigation "Projects". Keep "Rules" (All) for restricted/admin view or legacy support.
