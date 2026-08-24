variable "project_name" { type = string }
variable "environment" { type = string }
variable "service_names" { type = list(string) }
variable "alb_arn_suffix" { type = string }
variable "ecs_cluster_name" { type = string }
variable "ecs_service_names" { type = map(string) }
variable "target_group_arns" { type = map(string) }
variable "log_retention_days" { type = number }
