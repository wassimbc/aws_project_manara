# What this file does:
# Terraform providers tell Terraform which cloud APIs to use.
# We use the AWS provider (to create AWS resources) and the Random provider
# (to generate unique suffixes for S3 bucket names, which must be globally unique).

terraform {
  # The minimum Terraform version this configuration requires
  required_version = ">= 1.6.0"

  required_providers {
    # AWS provider: creates all AWS resources (VPC, ECS, ALB, etc.)
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Random provider: generates random strings for unique resource names
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # OPTIONAL: Remote state backend.
  # Uncomment this block to store Terraform state in S3 instead of locally.
  # S3 state is required for team environments so everyone shares the same state file.
  # For a solo project, local state is fine.
  #
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket-name"
  #   key            = "project6/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform_state_lock"
  #   encrypt        = true
  # }
}

# Configure the AWS provider with the region from our variable.
# Credentials are read from the standard AWS credential chain:
# 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
# 2. Shared credentials file (~/.aws/credentials)
# 3. IAM role (automatically used when running on EC2 or CodeBuild)
# Never hardcode credentials in this file.
provider "aws" {
  region = var.aws_region

  # Tag every resource with project info automatically.
  # This helps you find and clean up resources later.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "random" {}
