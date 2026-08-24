# What this file does:
# Security Groups are virtual firewalls. Each resource (ALB, ECS tasks, Redis)
# gets its own security group that defines exactly which traffic it allows in and out.
# The pattern: internet -> ALB SG -> ECS SG -> Redis SG
# Each layer only accepts traffic from the layer above it.

# =====================
# ALB Security Group
# The ALB is the only resource allowed to receive traffic from the internet.
# Port 80 for HTTP (we use HTTP since HTTPS requires a domain name and ACM certificate).
# =====================
resource "aws_security_group" "alb" {
  name        = "${var.project_name}_alb_sg"
  description = "Controls inbound traffic to the Application Load Balancer from the internet"
  vpc_id      = var.vpc_id

  # Allow HTTP from anywhere on the internet
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow test listener port (used during blue/green deployment to test the new version)
  ingress {
    description = "Test listener for CodeDeploy blue/green validation"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound (the ALB needs to forward requests to ECS tasks)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}_alb_sg"
  }
}

# =====================
# ECS Security Group
# ECS tasks only accept traffic from the ALB (no direct internet access).
# They also need to communicate with each other (service-to-service calls via Cloud Map).
# =====================
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}_ecs_sg"
  description = "Controls traffic to ECS Fargate tasks. Only ALB and other ECS tasks can reach them."
  vpc_id      = var.vpc_id

  # Allow Auth service port from ALB only
  ingress {
    description     = "Auth service port from ALB"
    from_port       = var.service_ports["auth"]
    to_port         = var.service_ports["auth"]
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow Orders service port from ALB only
  ingress {
    description     = "Orders service port from ALB"
    from_port       = var.service_ports["orders"]
    to_port         = var.service_ports["orders"]
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow Notifications service port from ALB only
  ingress {
    description     = "Notifications service port from ALB"
    from_port       = var.service_ports["notifications"]
    to_port         = var.service_ports["notifications"]
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all traffic between ECS tasks (service-to-service calls via Cloud Map DNS)
  # For example, Orders calls Notifications using notifications.project6.local
  ingress {
    description = "Service to service communication within ECS security group"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Allow all outbound traffic (needed for: npm installs, calling AWS APIs, calling other services)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}_ecs_sg"
  }
}

# =====================
# Redis Security Group
# Redis only accepts connections from ECS tasks. No direct internet access.
# This means even if someone got your Redis password, they could not reach Redis from outside AWS.
# =====================
resource "aws_security_group" "redis" {
  name        = "${var.project_name}_redis_sg"
  description = "Controls traffic to ElastiCache Redis. Only ECS tasks can connect."
  vpc_id      = var.vpc_id

  # Allow Redis port from ECS tasks only
  ingress {
    description     = "Redis port from ECS tasks only"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  # Allow all outbound (Redis needs to respond to queries)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}_redis_sg"
  }
}
