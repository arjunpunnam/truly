#!/bin/bash

# Kill background processes on exit
trap 'kill 0' SIGINT

echo "Starting Backend..."
cd backend
mvn spring-boot:run &

echo "Starting Frontend..."
cd ../frontend
npm run dev

# Wait for both processes
wait
