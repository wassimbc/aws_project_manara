variable "project_name" { type = string }
variable "environment" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "redis_sg_id" { type = string }
variable "redis_node_type" { type = string }
variable "redis_engine_version" { type = string }
variable "redis_password_arn" { type = string }
