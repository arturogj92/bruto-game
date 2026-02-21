#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
cp /var/www/bruto-game/bruto.db /var/www/bruto-game/backups/bruto_${DATE}.db
# Keep only last 20 backups
ls -t /var/www/bruto-game/backups/bruto_*.db | tail -n +21 | xargs rm -f 2>/dev/null
echo "Backup created: bruto_${DATE}.db"
