# Product Goals & Requirements

## 1. Primary Goals
- **Enterprise-grade, cloud-native rule engine** that is:
  - Deterministic
  - Explainable
  - Safe to deploy frequently
  - Designed for high rule churn, not just high throughput
  - Optimized for business logic agility, not developer-only usage

### Non-Goals
- Not a full BPM/workflow engine
- Not a general-purpose programming language
- Not a black-box ML decision system

## 2. Core Use Cases
- **Real-time decisioning**: Fraud, pricing, eligibility, risk scoring
- **Request-level evaluation**: With metrics (rules fired, execution time)
- **Rule authoring by non-engineers**: UI-driven rule builder
- **Safe guardrails and validation**
- **Frequent deployments**: Multiple deployments per day, Zero downtime, Parallel deployments
- **Multi-tenant SaaS**: Tenant isolation, Versioned rules per tenant, Future monetization via SaaS

## 3. Functional Requirements

### 3.1 Rule Definition Model
- **Rule Structure**:
  ```json
  {
    "id": "rule-123",
    "name": "High Risk Customer",
    "salience": 10,
    "enabled": true,
    "noLoop": true,
    "multipleOutputsAllowed": false,
    "conditions": { "conditionBlock": {} },
    "actions": { "actionBlock": {} }
  }
  ```
- **Requirements**:
  - Nested `conditionBlock` support (AND / OR / NOT)
  - Explicit schema references at property level
  - Strong typing for Operators, Data types, Collections

### 3.2 Condition Evaluation
- **Requirements**:
  - Support Simple comparisons, Cross-fact comparisons, Collection lookups
  - Short-circuit evaluation
  - Deterministic ordering
- **Advanced**:
  - Rule parser optimizations (Condition normalization, Redundancy elimination, Merge similar conditions)
  - Pluggable evaluators

### 3.3 Action Execution
- **Requirements**:
  - Support multiple action types: Mutations, Enrichment, External calls (async, guarded)
  - Idempotent action execution
  - Transaction boundaries per rule group

## 4. Rule Grouping & Execution

### 4.1 Rule Groups
- `ruleGroups`
- Priority ordering
- Salience within group
- `noLoop` enforcement
- Ability to stop evaluation early

### 4.2 Execution Modes
- Synchronous (request/response)
- Asynchronous (event-driven)
- Dry-run / simulation mode

## 5. Deployment & Versioning (Major Pain Point)

### 5.1 Rule Versioning
- Immutable rule versions
- Logical versioning: `draft` -> `validated` -> `deployed` -> `deprecated`

### 5.2 Deployment Model
- **Required**:
  - Staging tables
  - Deployment metadata capturing (Rules added/modified/deleted)
  - Ability to run parallel deployments
  - Rollback in < 1 minute

### 5.3 Hot Reload
- Reload rules without restarting engine
- Atomic switch per tenant

## 6. Observability & Explainability

### 6.1 Metrics
- Rules evaluated
- Rules fired
- Execution time per rule
- Condition hit ratio

### 6.2 Explain API
- **Structure**:
  ```json
  {
    "ruleId": "rule-123",
    "matched": true,
    "matchedConditions": [...],
    "failedConditions": [...]
  }
  ```
- **Must**: Human-readable explanations, Deterministic replay

## 7. Schema & Validation

### 7.1 Schema Registry
- Central schema definitions
- Versioned schemas
- Swagger/OpenAPI compatibility

### 7.2 Validation
- Move logic like `isValidForUpdate`, `isValidUpdateStatus` into schema-level validation

## 8. SaaS & Multi-Tenancy
- **Tenant Isolation**: Hard isolation at Rule storage and Execution context. No cross-tenant schema leakage.
- **Limits**: Rule count per tenant, Execution quotas, Deployment rate limits

## 9. Performance Requirements
- Data size: < 100k rows
- P95 latency: < 50ms per evaluation (in-memory)
- Cold start < 2 seconds

## 10. Security & Governance
- **RBAC**: Author, Reviewer, Deployer
- Approval workflows
- Full audit trail
- Immutable deployment history

## 11. Technology Constraints
- **Backend**: Java 17, Spring Boot 3, Drools executable model OR custom engine
- **API Layer**: REST + future gRPC, JSON logging
- **UI**: React-based rule builder, Schema-driven UI generation

## 12. Differentiators
- Native SaaS multi-tenancy
- First-class deployment tracking
- Explainability as a core feature
- UI-first schema-driven authoring
- Safe parallel deployments

## 13. Future Extensions
- Rule simulation with historical data
- Canary rule deployments
- Cost-based rule optimization
- ML-assisted rule suggestions
