#!/bin/bash
set -e

# Create log directories
mkdir -p /var/log/truly /var/log/supervisor

# Print startup banner
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ████████╗██████╗ ██╗   ██╗██╗  ██╗   ██╗                  ║"
echo "║   ╚══██╔══╝██╔══██╗██║   ██║██║  ╚██╗ ██╔╝                  ║"
echo "║      ██║   ██████╔╝██║   ██║██║   ╚████╔╝                   ║"
echo "║      ██║   ██╔══██╗██║   ██║██║    ╚██╔╝                    ║"
echo "║      ██║   ██║  ██║╚██████╔╝███████╗██║                     ║"
echo "║      ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝                     ║"
echo "║                                                              ║"
echo "║   Visual Rule Engine - Open Source Edition                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Starting Truly Rule Engine..."
echo ""
echo "Configuration:"
echo "  • Database: ${SPRING_PROFILES_ACTIVE:-sqlite}"
echo "  • Data Path: ${SQLITE_PATH:-/data/ruleengine.db}"
echo "  • Java Opts: ${JAVA_OPTS:--Xms256m -Xmx512m}"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""

# Start supervisor (which manages both nginx and the backend)
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
