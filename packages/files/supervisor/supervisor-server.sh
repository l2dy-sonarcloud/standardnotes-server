#!/bin/bash

set -euo pipefail

sh supervisor/wait-for.sh $DB_HOST $DB_PORT
sh supervisor/wait-for.sh $REDIS_HOST $REDIS_PORT
node supervisor/entrypoint-server.js
