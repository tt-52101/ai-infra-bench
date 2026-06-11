#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js server..."
  npx next dev -p 3000 -H 0.0.0.0 2>&1
  echo "Server crashed. Restarting in 3 seconds..."
  sleep 3
done
