# What this file does:
# Creates an Amazon ElastiCache Redis deployment in private subnets.
# Uses single node cache.t3.micro for cost optimization.
# Protected by redis_sg security group (only ECS tasks can connect).

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}_redis_subnet_group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-redis"
  description          = "ElastiCache Redis cluster with Transit Encryption for ${var.project_name}"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.redis_sg_id]

  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  tags = {
    Name = "${var.project_name}_redis_cluster"
  }
}
