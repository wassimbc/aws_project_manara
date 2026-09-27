# What this file does:
# Variables are the configuration knobs for the entire infrastructure.
# You change values here (or in terraform.tfvars) instead of editing the module files.
# This makes the infrastructure reusable across environments (dev, staging, prod).

# =====================
# Core settings
# =====================

variable "aws_region" {
  description = "The AWS region where all resources will be created. Must be eu-north-1 (Stockholm)."
  type        = string
  default     = "eu-north-1"
}

variable "project_name" {
  description = "Short name for the project. Used as a prefix in all resource names. No hyphens allowed."
  type        = string
  default     = "project6"
}

variable "environment" {
  description = "The environment name (dev, staging, prod). Used in resource names and tags."
  type        = string
  default     = "dev"
}

# =====================
# Networking
# =====================

variable "vpc_cidr" {
  description = "The IP address range for the VPC. 10.0.0.0/16 gives us 65,536 IP addresses."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Two AZs for high availability in eu-north-1."
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b"]
}

variable "public_subnet_cidrs" {
  description = "IP ranges for public subnets (one per AZ). The ALB lives here."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "IP ranges for private subnets (one per AZ). ECS tasks and Redis live here."
  type        = list(string)
  default     = ["10.0.128.0/20", "10.0.144.0/20"]
}

variable "enable_nat_gateway" {
  description = "Whether to create a NAT Gateway. Set to false when not actively using ECS to save the $0.045/hour NAT cost."
  type        = bool
  default     = true
}

# =====================
# ECS sizing
# =====================

variable "ecs_task_cpu" {
  description = "CPU units for each ECS task. 256 = 0.25 vCPU. Minimum for Fargate is 256."
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory in MB for each ECS task. 512 is the minimum for 256 CPU units."
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "How many copies of each service to run. 1 saves cost, 2 gives high availability."
  type        = number
  default     = 1
}

# =====================
# Redis
# =====================

variable "redis_node_type" {
  description = "The ElastiCache instance type. cache.t3.micro is the cheapest option."
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_engine_version" {
  description = "Redis version to use."
  type        = string
  default     = "7.1"
}

# =====================
# CI/CD
# =====================

variable "github_repo" {
  description = "The GitHub repository in owner/repo format. Example: myusername/aws-project-manara"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "The Git branch that triggers the CI/CD pipeline on push."
  type        = string
  default     = "main"
}

# =====================
# Services
# =====================

variable "service_names" {
  description = "Names of the three microservices. Must match Docker image names."
  type        = list(string)
  default     = ["auth", "orders", "notifications"]
}

variable "service_ports" {
  description = "The port each service listens on. Must match the port in the Dockerfile."
  type        = map(number)
  default = {
    auth          = 3001
    orders        = 3002
    notifications = 3003
  }
}

variable "cloudmap_namespace" {
  description = "The private DNS namespace for service discovery. Services find each other at <name>.<namespace>."
  type        = string
  default     = "project6.local"
}

variable "log_retention_days" {
  description = "How many days to keep CloudWatch logs. 7 days is the minimum and cheapest option."
  type        = number
  default     = 7
}
