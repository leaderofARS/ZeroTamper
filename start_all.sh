#!/bin/bash

# Clear previous logs
> data.log
> errors.log

echo "Starting WitnessChain services in parallel..."

# Run npm dev (backend + dashboard) in background
(npm run dev >> data.log 2>> errors.log) &
NPM_PID=$!

# Run ML service in background
(cd ml/deepfake-detector && python3 main.py >> ../../data.log 2>> ../../errors.log) &
ML_PID=$!

echo "All services started."
echo "NPM PID: $NPM_PID"
echo "ML Service PID: $ML_PID"
echo "Logs are being written to data.log and errors.log"
echo "Press Ctrl+C to stop all services."

# Wait for all background processes to exit and handle termination
trap "echo 'Stopping services...'; kill $NPM_PID $ML_PID; exit" SIGINT SIGTERM
wait $NPM_PID $ML_PID
