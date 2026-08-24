# What this file does:
# Creates the internet-facing Application Load Balancer (ALB).
# Creates two Target Groups per service (blue and green) for CodeDeploy deployments.
# Defines path-based routing listener rules.

resource "aws_lb" "main" {
  name               = "${var.project_name}_alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}_alb"
  }
}

# Target Groups: Blue (Active)
resource "aws_lb_target_group" "blue" {
  for_each = toset(var.service_names)

  name        = "${var.project_name}_${each.key}_blue_tg"
  port        = var.service_ports[each.key]
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name    = "${var.project_name}_${each.key}_blue_tg"
    Service = each.key
    Color   = "blue"
  }
}

# Target Groups: Green (Replacement during deployment)
resource "aws_lb_target_group" "green" {
  for_each = toset(var.service_names)

  name        = "${var.project_name}_${each.key}_green_tg"
  port        = var.service_ports[each.key]
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name    = "${var.project_name}_${each.key}_green_tg"
    Service = each.key
    Color   = "green"
  }
}

# Production HTTP Listener (Port 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue["auth"].arn
  }
}

# Test Listener (Port 8080) for CodeDeploy validation during blue green deployment
resource "aws_lb_listener" "test" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green["auth"].arn
  }
}

# Path-based listener rules on production listener (Port 80)
resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue["auth"].arn
  }

  condition {
    path_pattern {
      values = ["/api/auth/*", "/api/auth"]
    }
  }
}

resource "aws_lb_listener_rule" "orders" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue["orders"].arn
  }

  condition {
    path_pattern {
      values = ["/api/orders/*", "/api/orders"]
    }
  }
}

resource "aws_lb_listener_rule" "notifications" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue["notifications"].arn
  }

  condition {
    path_pattern {
      values = ["/api/notifications/*", "/api/notifications"]
    }
  }
}
