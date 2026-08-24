# What this file does:
# IAM (Identity and Access Management) controls what AWS services are allowed to do.
# We create separate roles for each purpose:
#
# 1. ECS Task Execution Role: used by the ECS AGENT (not your code) to:
#    - Pull the Docker image from ECR
#    - Send logs to CloudWatch
#    - Read secrets from Secrets Manager at startup
#
# 2. ECS Task Role: used by YOUR APPLICATION CODE running inside the container to:
#    - Send traces to X-Ray
#    - Read secrets it needs at runtime
#    (Each service gets its own task role with only the permissions it needs)
#
# 3. CodeDeploy Role: allows CodeDeploy to manage ECS services, shift ALB traffic, etc.
#
# 4. CodePipeline Role: allows CodePipeline to orchestrate the CI/CD pipeline.
#
# 5. CodeBuild Role: allows CodeBuild to build images and push to ECR.

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =====================
# ECS Task Execution Role
# ONE role shared by all services. ECS uses this to set up the container.
# =====================

# Trust policy: allows the ECS service to assume this role
data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.project_name}_ecs_execution_role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = {
    Name    = "${var.project_name}_ecs_execution_role"
    Purpose = "ECS agent pulls images, pushes logs, reads secrets"
  }
}

# Allow execution role to pull images from ECR and write logs to CloudWatch
resource "aws_iam_role_policy_attachment" "execution_ecr_cloudwatch" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow execution role to read ANY secret from Secrets Manager.
# In a stricter production setup you would scope this to specific secret ARNs.
resource "aws_iam_role_policy" "execution_secrets" {
  name = "${var.project_name}_execution_secrets_policy"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/*"
      }
    ]
  })
}

# =====================
# ECS Task Roles (one per service)
# These are used by YOUR APPLICATION CODE.
# Each service gets only the permissions it actually needs.
# =====================

resource "aws_iam_role" "task" {
  for_each = toset(var.service_names)

  name               = "${var.project_name}_${each.key}_task_role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = {
    Name    = "${var.project_name}_${each.key}_task_role"
    Service = each.key
    Purpose = "Permissions for application code running in ${each.key} container"
  }
}

# All services need to send traces to X-Ray
resource "aws_iam_role_policy" "task_xray" {
  for_each = aws_iam_role.task

  name = "${var.project_name}_${each.key}_xray_policy"
  role = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ]
        Resource = "*"
      }
    ]
  })
}

# All services can read secrets from Secrets Manager (scoped to project secrets only)
resource "aws_iam_role_policy" "task_secrets" {
  for_each = aws_iam_role.task

  name = "${var.project_name}_${each.key}_secrets_policy"
  role = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/*"
      }
    ]
  })
}

# =====================
# CodeDeploy Role
# CodeDeploy uses this role to create new ECS task sets,
# shift traffic between ALB target groups, and clean up old task sets.
# =====================
data "aws_iam_policy_document" "codedeploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codedeploy.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codedeploy" {
  name               = "${var.project_name}_codedeploy_role"
  assume_role_policy = data.aws_iam_policy_document.codedeploy_assume_role.json
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

# =====================
# CodePipeline Role
# CodePipeline orchestrates the whole CI/CD workflow.
# It needs to read source code from S3/GitHub, start CodeBuild, and trigger CodeDeploy.
# =====================
data "aws_iam_policy_document" "pipeline_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "pipeline" {
  name               = "${var.project_name}_pipeline_role"
  assume_role_policy = data.aws_iam_policy_document.pipeline_assume_role.json
}

resource "aws_iam_role_policy" "pipeline_policy" {
  name = "${var.project_name}_pipeline_policy"
  role = aws_iam_role.pipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:ListBucket"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["codedeploy:CreateDeployment", "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig", "codedeploy:GetApplicationRevision",
        "codedeploy:RegisterApplicationRevision"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [aws_iam_role.execution.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = "*"
      }
    ]
  })
}

# =====================
# CodeBuild Role
# CodeBuild uses this role to compile code, run tests, build Docker images, and push to ECR.
# =====================
data "aws_iam_policy_document" "codebuild_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name               = "${var.project_name}_codebuild_role"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume_role.json
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${var.project_name}_codebuild_policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:ListBucket"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload",
        "ecr:BatchGetImage", "ecr:PutImage"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
        Resource = "*"
      }
    ]
  })
}
