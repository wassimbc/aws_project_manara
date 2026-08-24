#!/usr/bin/env bash

# Smoke test script for end to end API validation on AWS.

ALB_DNS=$1

if [ -z "$ALB_DNS" ]; then
  echo "Usage: smoke.sh <ALB_DNS_NAME>"
  exit 1
fi

BASE_URL="http://${ALB_DNS}"

echo "1. Checking Auth Health..."
curl -s "${BASE_URL}/health"

echo -e "\n2. Registering test user..."
REGISTER_RES=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content_Type: application/json" \
  -d '{"email":"smoke_test_user@example.com","password":"smoketestpassword123"}')
echo "${REGISTER_RES}"

echo -e "\n3. Logging in..."
LOGIN_RES=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content_Type: application/json" \
  -d '{"email":"smoke_test_user@example.com","password":"smoketestpassword123"}')
echo "${LOGIN_RES}"

TOKEN=$(echo "${LOGIN_RES}" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$TOKEN" ]; then
  echo -e "\n4. Creating order with authenticated token..."
  ORDER_RES=$(curl -s -X POST "${BASE_URL}/api/orders" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content_Type: application/json" \
    -d '{"items":[{"name":"Demo Item","quantity":2,"price":49.99}]}')
  echo "${ORDER_RES}"
fi

echo -e "\nSmoke test sequence completed."
