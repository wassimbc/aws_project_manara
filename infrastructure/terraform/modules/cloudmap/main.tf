# What this file does:
# Creates an AWS Cloud Map private DNS namespace (e.g. project6.local).
# Registers service discovery records for auth, orders, and notifications.
# ECS tasks automatically register their IP addresses here on startup.

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = var.cloudmap_namespace
  description = "Private DNS namespace for ECS microservices service discovery"
  vpc         = var.vpc_id
}

resource "aws_service_discovery_service" "services" {
  for_each = toset(var.service_names)

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
