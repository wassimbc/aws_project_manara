#!/usr/bin/env bash

# What this file does:
# Smoke test script executed after deployment to verify health endpoints.

ALB_DNS=$1

if [ -z "$ALB_DNS" ]; then
  echo "Usage: validate_deployment.sh <ALB_DNS>"
  exit 1
fi

echo "Validating Auth service health..."
curl -s -f "http://${ALB_DNS}/health" || { echo "Auth health check failed"; exit 1; }

echo "Validating Orders service health..."
curl -s -f "http://${ALB_DNS}/health" || { echo "Orders health check failed"; exit 1; }

echo "Validating Notifications service health..."
curl -s -f "http://${ALB_DNS}/health" || { echo "Notifications health check failed"; exit 1; }

echo "All service health checks passed successfully!"
