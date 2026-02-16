#!/bin/bash

# DEV_SWITCH.sh - Toggle Truly between Local SQLite and Multi-Tenant Local Turso

MODE=$1

if [ "$MODE" == "sqlite" ]; then
    echo "Switching to Local SQLite (Single Tenant)..."
    export SPRING_PROFILES_ACTIVE=sqlite
    export DB_TYPE=sqlite
    echo "Setting SPRING_PROFILES_ACTIVE=sqlite"
    # Update .env if it exists
    if [ -f .env ]; then
        sed -i '' 's/SPRING_PROFILES_ACTIVE=.*/SPRING_PROFILES_ACTIVE=sqlite/' .env
        sed -i '' 's/DB_TYPE=.*/DB_TYPE=sqlite/' .env
    fi
elif [ "$MODE" == "turso" ]; then
    echo "Switching to Multi-Tenant Local Turso (sqld)..."
    export SPRING_PROFILES_ACTIVE=local-turso
    export DB_TYPE=local-turso
    echo "Setting SPRING_PROFILES_ACTIVE=local-turso"
    # Update .env if it exists
    if [ -f .env ]; then
        sed -i '' 's/SPRING_PROFILES_ACTIVE=.*/SPRING_PROFILES_ACTIVE=local-turso/' .env
        sed -i '' 's/DB_TYPE=.*/DB_TYPE=local-turso/' .env
        # Ensure Turso variables are set for local sqld
        if ! grep -q "TURSO_DATABASE_URL" .env; then
            echo "TURSO_DATABASE_URL=jdbc:dbeaver:libsql:http://localhost:8080" >> .env
            echo "TURSO_AUTH_TOKEN=" >> .env
        fi
    fi
    # Ensure sqld is running
    docker-compose up -d sqld
else
    echo "Usage: ./DEV_SWITCH.sh [sqlite|turso]"
    exit 1
fi

echo "Done. Please restart your backend server."
