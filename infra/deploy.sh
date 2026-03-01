#!/usr/bin/env bash
# =============================================================================
# Corsair — Deploy to AWS ECS
# =============================================================================
# Usage: ./infra/deploy.sh
#
# Required environment variables:
#   AWS_ACCOUNT_ID   — AWS account ID
#   AWS_REGION       — AWS region (default: us-east-1)
#   ECR_REGISTRY     — ECR registry URL (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com)
#   ECS_CLUSTER      — ECS cluster name (default: corsair)
#   ECS_SERVICE      — ECS service name (default: corsair)
# =============================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${ECS_CLUSTER:-corsair}"
ECS_SERVICE="${ECS_SERVICE:-corsair}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [ -z "${ECR_REGISTRY:-}" ]; then
  echo "Error: ECR_REGISTRY is not set"
  exit 1
fi

if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
  echo "Error: AWS_ACCOUNT_ID is not set"
  exit 1
fi

echo "=== Corsair Deploy ==="
echo "Region:   $AWS_REGION"
echo "Cluster:  $ECS_CLUSTER"
echo "Service:  $ECS_SERVICE"
echo "Registry: $ECR_REGISTRY"
echo "Tag:      $IMAGE_TAG"
echo ""

# Step 1: Authenticate with ECR
echo "→ Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Step 2: Build the Docker image
echo "→ Building Docker image..."
docker build -t corsair:"$IMAGE_TAG" .

# Step 3: Tag for ECR
echo "→ Tagging image..."
docker tag corsair:"$IMAGE_TAG" "$ECR_REGISTRY/corsair:$IMAGE_TAG"

# Step 4: Push to ECR
echo "→ Pushing to ECR..."
docker push "$ECR_REGISTRY/corsair:$IMAGE_TAG"

# Step 5: Register new task definition
echo "→ Registering task definition..."
TASK_DEF=$(sed \
  -e "s|\${AWS_ACCOUNT_ID}|$AWS_ACCOUNT_ID|g" \
  -e "s|\${AWS_REGION}|$AWS_REGION|g" \
  -e "s|\${ECR_REGISTRY}|$ECR_REGISTRY|g" \
  infra/ecs-task-definition.json)

TASK_DEF_ARN=$(echo "$TASK_DEF" | aws ecs register-task-definition \
  --region "$AWS_REGION" \
  --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "  Task definition: $TASK_DEF_ARN"

# Step 6: Update ECS service
echo "→ Updating ECS service..."
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$TASK_DEF_ARN" \
  --force-new-deployment \
  --query 'service.serviceName' \
  --output text

echo ""
echo "=== Deploy complete ==="
echo "Monitor: aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION"
