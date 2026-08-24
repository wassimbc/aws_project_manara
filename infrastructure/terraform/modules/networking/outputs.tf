output "vpc_id" {
  description = "The ID of the VPC. Passed to security groups, ECS, and ALB."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets. Used by the ALB."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets. Used by ECS tasks and Redis."
  value       = aws_subnet.private[*].id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC."
  value       = aws_vpc.main.cidr_block
}
