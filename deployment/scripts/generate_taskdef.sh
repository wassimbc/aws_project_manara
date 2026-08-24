#!/usr/bin/env bash

# What this file does:
# Replaces the <IMAGE_URI> placeholder in task definition templates
# with the newly built ECR image tag during CodeBuild execution.

SERVICE_NAME=$1
IMAGE_TAG=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Usage: generate_taskdef.sh <service_name> <image_tag>"
  exit 1
fi

TASKDEF_TEMPLATE="deployment/task_definitions/${SERVICE_NAME}_taskdef.json"
FULL_IMAGE_URI="${ECR_REGISTRY}/project6_${SERVICE_NAME}:${IMAGE_TAG}"

echo "Rendering task definition for ${SERVICE_NAME} with image ${FULL_IMAGE_URI}"

sed "s|<IMAGE_URI>|${FULL_IMAGE_URI}|g" "${TASKDEF_TEMPLATE}" > "deployment/task_definitions/${SERVICE_NAME}_taskdef_rendered.json"

echo "Rendered task definition written to deployment/task_definitions/${SERVICE_NAME}_taskdef_rendered.json"
