# Multi-Tenancy Architecture with SQLite

This document describes Truly's multi-tenant architecture using a **database-per-tenant** strategy with SQLite.

---

## Table of Contents

- [Overview](#overview)
- [Why SQLite for Multi-Tenancy?](#why-sqlite-for-multi-tenancy)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Database Management](#database-management)
- [API Design](#api-design)
- [Security Considerations](#security-considerations)
- [Scaling Strategy](#scaling-strategy)
- [Migration Path](#migration-path)

---

## Overview

Truly uses a **database-per-tenant** isolation model where each tenant (organization) gets their own SQLite database file. This provides:

- **Complete data isolation** - No risk of data leakage between tenants
- **Simple backups** - Each tenant's data is a single file
- **Easy tenant deletion** - Just delete the database file
- **Zero shared state** - No `tenant_id` filters required in queries
- **Portable** - Tenant databases can be moved/exported easily

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRULY CLOUD                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Request Router                               │
│           (Extracts tenant from JWT/API Key)                    │
├───────────┬───────────┬───────────┬───────────┬─────────────────┤
│  Tenant A │  Tenant B │  Tenant C │  Tenant D │     ...         │
│   .db     │   .db     │   .db     │   .db     │                 │
├───────────┴───────────┴───────────┴───────────┴─────────────────┤
│              Shared Application Server                          │
│         (Spring Boot + Drools Rule Engine)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why SQLite for Multi-Tenancy?

### Advantages

| Benefit | Description |
|---------|-------------|
| **Zero Ops Overhead** | No database server to manage, monitor, or scale |
| **Perfect Isolation** | Each tenant is a completely separate file |
| **Cost Efficient** | No per-tenant database server costs |
| **Instant Provisioning** | New tenant = create empty file |
| **Simple Disaster Recovery** | Backup = copy file; Restore = replace file |
| **Predictable Performance** | No noisy neighbor issues |
| **Easy Development** | Same setup for OSS and Cloud |

### When SQLite Works Well

✅ **Ideal for Truly because:**
- Read-heavy workload (rule queries, schema lookups)
- Write operations are infrequent (rule creation/updates)
- Data per tenant is typically < 1GB
- Concurrent writes per tenant are rare
- Most operations are atomic transactions

### Limitations to Consider

| Limitation | Mitigation |
|------------|------------|
| Single writer at a time | Use WAL mode for better concurrency |
| No built-in replication | Use Litestream for continuous replication |
| File-based | Store on fast NVMe SSD or remote storage |
| Connection overhead | Use connection pooling per tenant |

---

## Architecture

### Directory Structure

```
~/.ruleengine/
├── data/
│   ├── tenants/
│   │   ├── tenant_abc123.db       # Tenant A's database
│   │   ├── tenant_def456.db       # Tenant B's database
│   │   ├── tenant_ghi789.db       # Tenant C's database
│   │   └── ...
│   ├── master.db                  # Tenant registry & billing
│   └── backups/
│       ├── tenant_abc123_2026-01-21.db
│       └── ...
```

### Master Database Schema

The master database stores tenant metadata (not business data):

```sql
-- master.db schema

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,              -- UUID
    slug TEXT UNIQUE NOT NULL,        -- URL-friendly identifier
    name TEXT NOT NULL,               -- Display name
    plan TEXT DEFAULT 'free',         -- free, team, business, enterprise
    status TEXT DEFAULT 'active',     -- active, suspended, deleted
    owner_user_id TEXT NOT NULL,      -- References users table
    database_path TEXT NOT NULL,      -- Path to tenant's SQLite file
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- UUID
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_memberships (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'member',       -- owner, admin, editor, viewer
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);

CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    key_hash TEXT NOT NULL,           -- Hashed API key
    name TEXT,
    permissions TEXT,                 -- JSON array of permissions
    last_used_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usage_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    metric TEXT NOT NULL,             -- executions, api_calls, storage_bytes
    value INTEGER NOT NULL,
    period TEXT NOT NULL,             -- 2026-01
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, metric, period)
);
```

### Tenant Database Schema

Each tenant database contains all the existing Truly tables:

```sql
-- tenant_*.db schema (same as current single-tenant schema)

-- rule_projects, rules, schemas, execution_history, etc.
-- No tenant_id columns needed - entire database belongs to one tenant
```

---

## Implementation Details

### 1. Tenant Context Resolution

```java
// TenantContext.java - Thread-local tenant holder
public class TenantContext {
    private static final ThreadLocal<String> currentTenant = new InheritableThreadLocal<>();
    
    public static void setTenantId(String tenantId) {
        currentTenant.set(tenantId);
    }
    
    public static String getTenantId() {
        return currentTenant.get();
    }
    
    public static void clear() {
        currentTenant.remove();
    }
}
```

### 2. Tenant Interceptor

```java
// TenantInterceptor.java - Extract tenant from request
@Component
public class TenantInterceptor implements HandlerInterceptor {
    
    private final TenantService tenantService;
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                             HttpServletResponse response, 
                             Object handler) {
        String tenantId = extractTenantId(request);
        
        if (tenantId == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        
        TenantContext.setTenantId(tenantId);
        return true;
    }
    
    private String extractTenantId(HttpServletRequest request) {
        // Option 1: From JWT token
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return extractTenantFromJwt(authHeader.substring(7));
        }
        
        // Option 2: From API Key
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null) {
            return tenantService.getTenantIdByApiKey(apiKey);
        }
        
        // Option 3: From subdomain (e.g., acme.truly.io)
        String host = request.getHeader("Host");
        if (host != null && host.contains(".")) {
            return extractTenantFromSubdomain(host);
        }
        
        return null;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, 
                                HttpServletResponse response, 
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
```

### 3. Dynamic DataSource Routing

```java
// TenantRoutingDataSource.java
public class TenantRoutingDataSource extends AbstractRoutingDataSource {
    
    private final TenantDatabaseManager dbManager;
    
    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantId();
    }
    
    @Override
    protected DataSource determineTargetDataSource() {
        String tenantId = TenantContext.getTenantId();
        
        if (tenantId == null) {
            throw new TenantNotResolvedException("No tenant context");
        }
        
        return dbManager.getDataSourceForTenant(tenantId);
    }
}
```

### 4. Tenant Database Manager

```java
// TenantDatabaseManager.java
@Service
public class TenantDatabaseManager {
    
    private final ConcurrentHashMap<String, HikariDataSource> dataSources = 
        new ConcurrentHashMap<>();
    
    private final String tenantsDir;
    
    public TenantDatabaseManager(@Value("${truly.tenants.dir}") String dir) {
        this.tenantsDir = dir;
    }
    
    public DataSource getDataSourceForTenant(String tenantId) {
        return dataSources.computeIfAbsent(tenantId, this::createDataSource);
    }
    
    private HikariDataSource createDataSource(String tenantId) {
        String dbPath = tenantsDir + "/tenant_" + tenantId + ".db";
        
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:sqlite:" + dbPath);
        config.setDriverClassName("org.sqlite.JDBC");
        config.setMaximumPoolSize(5);  // SQLite: keep small
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);
        
        // SQLite optimizations
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("synchronous", "NORMAL");
        config.addDataSourceProperty("cache_size", "-20000"); // 20MB cache
        
        return new HikariDataSource(config);
    }
    
    public void createTenantDatabase(String tenantId) {
        String dbPath = tenantsDir + "/tenant_" + tenantId + ".db";
        File dbFile = new File(dbPath);
        
        if (!dbFile.exists()) {
            // Create new database and run migrations
            DataSource ds = getDataSourceForTenant(tenantId);
            runMigrations(ds);
        }
    }
    
    public void deleteTenantDatabase(String tenantId) {
        // Close connection pool
        HikariDataSource ds = dataSources.remove(tenantId);
        if (ds != null) {
            ds.close();
        }
        
        // Archive then delete file
        String dbPath = tenantsDir + "/tenant_" + tenantId + ".db";
        Files.move(Path.of(dbPath), Path.of(backupsDir + "/deleted_" + tenantId + ".db"));
    }
    
    public void evictIdleConnections() {
        // Periodically close pools for inactive tenants
        dataSources.entrySet().removeIf(entry -> {
            HikariDataSource ds = entry.getValue();
            if (ds.getHikariPoolMXBean().getActiveConnections() == 0 
                && lastAccessTime(entry.getKey()) > 30_MINUTES) {
                ds.close();
                return true;
            }
            return false;
        });
    }
}
```

### 5. Configuration

```yaml
# application-multitenant.yml

truly:
  multitenancy:
    enabled: true
    master-db: ${user.home}/.ruleengine/data/master.db
    tenants-dir: ${user.home}/.ruleengine/data/tenants
    
  sqlite:
    journal-mode: WAL
    synchronous: NORMAL
    cache-size: 20000  # KB
    
spring:
  datasource:
    # Master database for tenant registry
    url: jdbc:sqlite:${truly.multitenancy.master-db}
    driver-class-name: org.sqlite.JDBC
```

---

## Database Management

### Tenant Provisioning

```java
// TenantProvisioningService.java
@Service
public class TenantProvisioningService {
    
    public Tenant createTenant(CreateTenantRequest request) {
        // 1. Generate tenant ID
        String tenantId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        
        // 2. Create database file
        dbManager.createTenantDatabase(tenantId);
        
        // 3. Register in master database
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setSlug(request.getSlug());
        tenant.setName(request.getName());
        tenant.setDatabasePath("tenants/tenant_" + tenantId + ".db");
        tenant.setOwnerUserId(request.getUserId());
        
        tenantRepository.save(tenant);
        
        // 4. Create default membership
        membershipService.addMember(tenantId, request.getUserId(), "owner");
        
        return tenant;
    }
}
```

### Backup Strategy

```bash
#!/bin/bash
# backup-tenants.sh - Run daily via cron

TENANTS_DIR=~/.ruleengine/data/tenants
BACKUP_DIR=~/.ruleengine/data/backups
DATE=$(date +%Y-%m-%d)

# Backup each tenant database
for db in "$TENANTS_DIR"/*.db; do
    tenant=$(basename "$db" .db)
    sqlite3 "$db" ".backup '$BACKUP_DIR/${tenant}_${DATE}.db'"
done

# Cleanup backups older than 30 days
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
```

### Continuous Replication with Litestream

```yaml
# litestream.yml
dbs:
  - path: /data/tenants/tenant_abc123.db
    replicas:
      - type: s3
        bucket: truly-backups
        path: tenants/abc123
        
  # Dynamic configuration for each tenant
```

---

## API Design

### Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client  │────▶│  API Gateway │────▶│  Auth Check  │────▶│ Tenant DB   │
│          │     │              │     │              │     │             │
│ + JWT    │     │ Extract      │     │ Validate     │     │ Route to    │
│ + API Key│     │ tenant_id    │     │ permissions  │     │ correct DB  │
└──────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

### Request Headers

```http
# Option 1: JWT Token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
# JWT payload contains: { "tenant_id": "abc123", "user_id": "...", "role": "admin" }

# Option 2: API Key (for programmatic access)
X-API-Key: truly_sk_live_abc123_xyzSecretKey

# Option 3: Tenant Header (internal/admin use)
X-Tenant-ID: abc123
```

### Tenant Creation API

```http
POST /api/v1/tenants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme",
  "owner_email": "admin@acme.com"
}

Response:
{
  "id": "abc123",
  "name": "Acme Corporation",
  "slug": "acme",
  "database_url": "truly.io/acme",
  "api_key": "truly_sk_live_abc123_...",
  "created_at": "2026-01-21T10:00:00Z"
}
```

---

## Security Considerations

### 1. Tenant Isolation

```java
// Every request MUST have valid tenant context
@Aspect
@Component
public class TenantSecurityAspect {
    
    @Before("@within(org.springframework.web.bind.annotation.RestController)")
    public void validateTenantContext(JoinPoint jp) {
        if (TenantContext.getTenantId() == null) {
            throw new SecurityException("Tenant context required");
        }
    }
}
```

### 2. Path Traversal Prevention

```java
// Validate tenant ID to prevent directory traversal
public void validateTenantId(String tenantId) {
    if (!tenantId.matches("^[a-z0-9]{12}$")) {
        throw new InvalidTenantException("Invalid tenant ID format");
    }
}
```

### 3. File System Permissions

```bash
# Restrict access to database files
chmod 700 ~/.ruleengine/data/tenants
chown -R truly:truly ~/.ruleengine/data/tenants
```

### 4. API Key Security

```java
// Store only hashed API keys
public String createApiKey(String tenantId, String name) {
    String rawKey = "truly_sk_live_" + tenantId + "_" + generateSecureRandom(32);
    String hashedKey = BCrypt.hashpw(rawKey, BCrypt.gensalt(12));
    
    apiKeyRepository.save(new ApiKey(tenantId, hashedKey, name));
    
    return rawKey; // Return only once, never stored
}
```

---

## Scaling Strategy

### Horizontal Scaling

```
                    Load Balancer
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
  ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
  │ App 1   │      │ App 2   │      │ App 3   │
  │         │      │         │      │         │
  └────┬────┘      └────┬────┘      └────┬────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Shared Storage    │
              │   (NFS / EFS / GCS) │
              │                     │
              │  tenants/*.db       │
              └─────────────────────┘
```

### Performance Tiers

| Tenant Size | Strategy |
|-------------|----------|
| **Small** (< 100 rules) | Shared app server, shared storage |
| **Medium** (100-1000 rules) | Dedicated connection pool, SSD storage |
| **Large** (1000+ rules) | Dedicated app instance, local NVMe |
| **Enterprise** | Dedicated infrastructure + PostgreSQL option |

### Connection Pool Management

```java
// Limit total connections across all tenants
@Scheduled(fixedRate = 60000)
public void manageConnectionPools() {
    int totalConnections = dataSources.values().stream()
        .mapToInt(ds -> ds.getHikariPoolMXBean().getTotalConnections())
        .sum();
    
    if (totalConnections > MAX_TOTAL_CONNECTIONS) {
        evictLeastRecentlyUsedPools();
    }
}
```

---

## Migration Path

### Phase 1: OSS (Current)

Single SQLite database, no multi-tenancy.

### Phase 2: Soft Multi-Tenancy

Add `tenant_id` column to tables (backward compatible with OSS).

```sql
-- Migration
ALTER TABLE rule_projects ADD COLUMN tenant_id TEXT DEFAULT 'default';
ALTER TABLE schemas ADD COLUMN tenant_id TEXT DEFAULT 'default';
ALTER TABLE rules ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- Create indexes
CREATE INDEX idx_rule_projects_tenant ON rule_projects(tenant_id);
```

### Phase 3: Database-per-Tenant

Full isolation with separate SQLite files.

```java
// Migration script
public void migrateToPerTenantDbs() {
    List<String> tenantIds = masterDb.query("SELECT DISTINCT tenant_id FROM tenants");
    
    for (String tenantId : tenantIds) {
        // Create tenant database
        createTenantDatabase(tenantId);
        
        // Copy data
        copyDataForTenant(sharedDb, tenantId, getTenantDb(tenantId));
        
        // Verify
        verifyMigration(tenantId);
    }
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRULY_MULTITENANCY_ENABLED` | `false` | Enable multi-tenant mode |
| `TRULY_MASTER_DB` | `~/.ruleengine/data/master.db` | Master database path |
| `TRULY_TENANTS_DIR` | `~/.ruleengine/data/tenants` | Tenant databases directory |
| `TRULY_MAX_TENANTS_CACHED` | `100` | Max tenant connections in memory |
| `TRULY_TENANT_IDLE_TIMEOUT` | `30m` | Evict idle tenant connections |

---

## Summary

SQLite-based multi-tenancy provides:

1. **Complete data isolation** without schema complexity
2. **Simple operations** - backup, restore, delete are file operations
3. **Cost efficiency** - no per-tenant database costs
4. **Easy migration** - from OSS to Cloud with minimal changes
5. **Predictable scaling** - add storage, not database servers

This architecture supports the transition from open-source single-tenant to SaaS multi-tenant while keeping SQLite as the database engine.
