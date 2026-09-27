# What this file does:
# The main entry point for the Terraform configuration.
# It calls each module in the right order, passing outputs from one module
# as inputs to the next (for example, the VPC ID from networking goes into security groups).

# =====================
# Random suffix for globally unique names
# S3 bucket names must be unique across all AWS accounts worldwide.
# This generates a short random string to attach to names.
# =====================
resource "random_id" "suffix" {
  byte_length = 4
}

# =====================
# Module: Networking
# Creates the VPC, subnets, Internet Gateway, NAT Gateway, and route tables.
# Everything else goes inside this network.
# =====================
module "networking" {
  source = "./modules/networking"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway   = var.enable_nat_gateway
}

# =====================
# Module: Security Groups
# Creates the firewall rules that control which services can talk to which.
# The ALB SG is the only one allowed to receive traffic from the internet.
# =====================
module "security" {
  source = "./modules/security"

  project_name  = var.project_name
  environment   = var.environment
  vpc_id        = module.networking.vpc_id
  service_ports = var.service_ports
}

# =====================
# Module: IAM
# Creates the IAM roles and policies that control what AWS services can do.
# ECS tasks need permission to pull images from ECR, write logs to CloudWatch,
# and read secrets from Secrets Manager.
# =====================
module "iam" {
  source = "./modules/iam"

  project_name  = var.project_name
  environment   = var.environment
  aws_region    = var.aws_region
  service_names = var.service_names
}

# =====================
# Module: ECR (Elastic Container Registry)
# Creates the private Docker image repositories where CI/CD pushes images.
# ECS pulls images from here when starting new containers.
# =====================
module "ecr" {
  source = "./modules/ecr"

  project_name  = var.project_name
  environment   = var.environment
  service_names = var.service_names
}

# =====================
# Module: Secrets Manager
# Creates the secure storage for sensitive values (JWT secret, Redis password, internal secret).
# ECS task definitions reference these secrets by ARN so the values are
# injected at runtime and never stored in the task definition or source code.
# =====================
module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment
}

# =====================
# Module: Cloud Map
# Creates the private DNS namespace (project6.local) so services can find
# each other by name instead of hardcoded IP addresses.
# ECS automatically registers each task with Cloud Map when it starts.
# =====================
module "cloudmap" {
  source = "./modules/cloudmap"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  cloudmap_namespace = var.cloudmap_namespace
  service_names      = var.service_names
}

# =====================
# Module: Redis (ElastiCache)
# Creates a single Redis instance in the private subnet.
# All three services use Redis to store data.
# Redis must be private so it cannot be accessed from the internet.
# =====================
module "redis" {
  source = "./modules/redis"

  project_name         = var.project_name
  environment          = var.environment
  private_subnet_ids   = module.networking.private_subnet_ids
  redis_sg_id          = module.security.redis_sg_id
  redis_node_type      = var.redis_node_type
  redis_engine_version = var.redis_engine_version
  redis_password_arn   = module.secrets.redis_password_arn
}

# =====================
# Module: ALB (Application Load Balancer)
# Creates the internet-facing load balancer that receives requests from users.
# Routes /api/auth/* to Auth, /api/orders/* to Orders, /api/notifications/* to Notifications.
# =====================
module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id
  service_names     = var.service_names
  service_ports     = var.service_ports
}

# =====================
# Module: ECS (Elastic Container Service)
# Creates the Fargate cluster and runs one container per service.
# Each container is configured with environment variables and secrets.
# =====================
module "ecs" {
  source = "./modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  cluster_name          = "${var.project_name}_cluster"
  service_names         = var.service_names
  service_ports         = var.service_ports
  private_subnet_ids    = module.networking.private_subnet_ids
  ecs_sg_id             = module.security.ecs_sg_id
  task_cpu              = var.ecs_task_cpu
  task_memory           = var.ecs_task_memory
  desired_count         = var.ecs_desired_count
  log_retention_days    = var.log_retention_days
  ecr_repository_urls   = module.ecr.repository_urls
  execution_role_arns   = module.iam.execution_role_arns
  task_role_arns        = module.iam.task_role_arns
  cloudmap_service_arns = module.cloudmap.service_arns
  redis_host            = module.redis.redis_host
  redis_port            = module.redis.redis_port
  secrets               = module.secrets.secret_arns
  alb_target_group_arns = module.alb.blue_target_group_arns
  cloudmap_namespace    = var.cloudmap_namespace
}



# =====================
# Module: Monitoring
# Creates CloudWatch alarms that watch for problems.
# If the ALB gets too many 5xx errors or ECS CPU is too high,
# an alarm fires which can trigger an automatic deployment rollback.
# =====================
module "monitoring" {
  source = "./modules/monitoring"

  project_name       = var.project_name
  environment        = var.environment
  service_names      = var.service_names
  alb_arn_suffix     = module.alb.alb_arn_suffix
  ecs_cluster_name   = module.ecs.cluster_name
  ecs_service_names  = module.ecs.service_names
  target_group_arns  = module.alb.blue_target_group_arns
  log_retention_days = var.log_retention_days
}
