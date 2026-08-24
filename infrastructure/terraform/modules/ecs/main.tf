# What this file does:
# Creates the ECS Fargate Cluster, Task Definitions, CloudWatch Log Groups, and ECS Services.
# Configures CODE_DEPLOY deployment controller for blue green deployment.
# Integrates with Cloud Map for private service discovery.

resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = var.cluster_name
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(var.service_names)
  name              = "/${var.project_name}/${each.key}"
  retention_in_days = var.log_retention_days

  tags = {
    Name    = "/${var.project_name}/${each.key}"
    Service = each.key
  }
}

# Task Definitions
resource "aws_ecs_task_definition" "services" {
  for_each                 = toset(var.service_names)
  family                   = "${var.project_name}_${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.execution_role_arns[each.key]
  task_role_arn            = var.task_role_arns[each.key]

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.ecr_repository_urls[each.key]}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.service_ports[each.key]
          hostPort      = var.service_ports[each.key]
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT", value = tostring(var.service_ports[each.key]) },
        { name = "NODE_ENV", value = var.environment },
        { name = "SERVICE_NAME", value = each.key },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "REDIS_PORT", value = tostring(var.redis_port) },
        { name = "AUTH_SERVICE_URL", value = "http://auth.${var.cloudmap_namespace}:3001" },
        { name = "NOTIFICATIONS_SERVICE_URL", value = "http://notifications.${var.cloudmap_namespace}:3003" }
      ]

      secrets = [
        {
          name      = "JWT_SECRET"
          valueFrom = var.secrets["jwt_secret"]
        },
        {
          name      = "REDIS_PASSWORD"
          valueFrom = var.secrets["redis_password"]
        },
        {
          name      = "INTERNAL_SERVICE_SECRET"
          valueFrom = var.secrets["internal_secret"]
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/${var.project_name}/${each.key}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# ECS Services
resource "aws_ecs_service" "services" {
  for_each        = toset(var.service_names)
  name            = "${var.project_name}_${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns[each.key]
    container_name   = each.key
    container_port   = var.service_ports[each.key]
  }

  service_registries {
    registry_arn = var.cloudmap_service_arns[each.key]
  }

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  lifecycle {
    ignore_changes = [
      task_definition,
      load_balancer
    ]
  }
}
