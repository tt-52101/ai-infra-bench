#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 -H 0.0.0.0 >> /tmp/nextjs.log 2>&1
  echo "Server died at $(date). Restarting in 2s..." >> /tmp/nextjs.log
  sleep 2
done
