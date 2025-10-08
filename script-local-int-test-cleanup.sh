#!/bin/bash

PID_FILE=".port-forward-pids"

if [ ! -f "$PID_FILE" ]; then
    echo "Error: PID file '$PID_FILE' not found."
    exit 1
fi

echo "Stopping port-forward processes..."

while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "Killed process $pid"
    else
        echo "Process $pid not running"
    fi
done < "$PID_FILE"

rm "$PID_FILE"
echo "Cleanup complete. PID file removed."
