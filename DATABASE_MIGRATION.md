# Database Migration Guide

## Problem
The database was using a relative path (`./data/ruleengine.mv.db`) which could change depending on where the application runs from, causing data loss on restart.

## Solution
The database has been moved to a persistent location in your home directory:
- **New Location**: `~/.ruleengine/data/ruleengine.mv.db`
- This location persists regardless of where you run the application from
- The directory is created automatically on first startup

## Setup (No Migration Needed)

Since you've lost data, you don't need to migrate anything. Just:

1. **Restart the backend server** - The database directory will be created automatically at `~/.ruleengine/data/`
2. **Start creating your schemas and projects** - They will be saved to the new persistent location
3. **Your data will now persist** across restarts

## Migration Steps (Only if you have existing data)

**Note**: If you don't have existing data, skip this section and just restart the server.

If you have data in the old location (`backend/data/ruleengine.mv.db`), you can migrate it:

1. **Stop the backend server**

2. **Check if the old database exists**:
   ```bash
   ls -la backend/data/ruleengine.mv.db
   ```

3. **If it exists, copy it**:
   ```bash
   mkdir -p ~/.ruleengine/data
   cp backend/data/ruleengine.mv.db ~/.ruleengine/data/ruleengine.mv.db
   ```

4. **Restart the backend server**

The application will now use the new persistent location.

## Verification

After restarting, you can verify the database location:
- Check that the file exists: `ls -la ~/.ruleengine/data/`
- The database file should be: `ruleengine.mv.db`

## Database Location by Profile

- **H2 Profile**: `~/.ruleengine/data/ruleengine.mv.db`
- **SQLite Profile**: `~/.ruleengine/data/ruleengine.db` (or custom path via `SQLITE_PATH` env var)

## Notes

- The old `backend/data/` directory is no longer used
- You can safely delete `backend/data/` if you've migrated your data
- The new location is outside the project directory, so it won't be affected by git operations

