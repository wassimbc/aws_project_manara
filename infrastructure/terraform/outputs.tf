# What this file does:
# Outputs are values that Terraform prints after a successful apply.
# They give you the important addresses and IDs you need to actually use the system.
# You can also reference outputs from other Terraform configurations.

# The DNS name of the Application Load Balancer.
# This is the address you use to send requests to your services.
# Example: project6-alb-123456789.us-east-1.elb.amazonaws.com
output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer. Use this to test the services."
  value       = module.alb.dns_name
}

# The URL of the Auth service through the ALB
output "auth_service_url" {
  description = "Full URL to reach the Auth service through the ALB."
  value       = "http://${module.alb.dns_name}/api/auth"
}

# The URL of the Orders service through the ALB
output "orders_service_url" {
  description = "Full URL to reach the Orders service through the ALB."
  value       = "http://${module.alb.dns_name}/api/orders"
}

# The URL of the Notifications service through the ALB
output "notifications_service_url" {
  description = "Full URL to reach the Notifications service through the ALB."
  value       = "http://${module.alb.dns_name}/api/notifications"
}

# The name of the ECS cluster
output "ecs_cluster_name" {
  description = "Name of the ECS cluster. Use this with AWS CLI commands to manage services."
  value       = module.ecs.cluster_name
}

# ECR repository URLs for each service
output "ecr_repository_urls" {
  description = "ECR image repository URLs. Used in buildspec.yml to push and pull images."
  value       = module.ecr.repository_urls
}

# The Redis endpoint (host) that services connect to
output "redis_host" {
  description = "The Redis endpoint address. Used in ECS task environment variables."
  value       = module.redis.redis_host
  sensitive   = true
}

# The name of the CodePipeline pipeline
output "pipeline_name" {
  description = "Name of the CodePipeline pipeline. Use this to check pipeline status in AWS Console."
  value       = module.codepipeline.pipeline_name
}

# The VPC ID
output "vpc_id" {
  description = "The VPC ID. Useful for debugging networking issues."
  value       = module.networking.vpc_id
}

# Secret ARNs for reference
output "secret_arns" {
  description = "ARNs of the Secrets Manager secrets. Use these to update secret values."
  value       = module.secrets.secret_arns
  sensitive   = true
}
