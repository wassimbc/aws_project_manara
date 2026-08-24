# What this file does:
# Creates one ECR (Elastic Container Registry) repository per microservice.
# ECR is AWS's private Docker image registry.
# When CI/CD builds a new Docker image, it pushes it to ECR.
# When ECS starts a new task, it pulls the image from ECR.
#
# Why ECR instead of Docker Hub?
# 1. Images stay inside AWS (faster pulls, no egress cost)
# 2. IAM controls who can push and pull (no public exposure)
# 3. Image scanning finds security vulnerabilities in your images
# 4. Immutable tags prevent overwriting a deployed image

# Create one repository for each service (auth, orders, notifications)
resource "aws_ecr_repository" "services" {
  for_each = toset(var.service_names)

  # Repository name: project6_auth, project6_orders, project6_notifications
  name = "${var.project_name}_${each.key}"

  # IMMUTABLE means once you push an image with tag :abc123, you cannot
  # overwrite it. This protects production deployments from accidental overwrites.
  image_tag_mutability = "IMMUTABLE"

  # Scan each image for known security vulnerabilities when it is pushed.
  # Results appear in the ECR console and can be viewed with:
  # aws ecr describe-image-scan-findings --repository-name project6_auth --image-id imageTag=<tag>
  image_scanning_configuration {
    scan_on_push = true
  }

  # Encrypt images at rest using AWS managed keys
  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}_${each.key}_ecr"
    Service = each.key
  }
}

# =====================
# Lifecycle Policy
# Automatically deletes old images to save storage costs.
# Keeps the 10 most recent tagged images per repository.
# Untagged images (failed builds) are deleted after 1 day.
# =====================
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        # Rule 1: Delete untagged images after 1 day (cleanup failed builds)
        rulePriority = 1
        description  = "Remove untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        # Rule 2: Keep only the 10 most recent tagged images per service
        rulePriority = 2
        description  = "Keep only 10 most recent tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
