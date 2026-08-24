# What this file does:
# Creates CloudWatch alarms for health monitoring and deployment rollbacks.

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}_alb_5xx_alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alarm when ALB target 5xx error count exceeds 10 in 1 minute"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  for_each            = toset(var.service_names)
  alarm_name          = "${var.project_name}_${each.key}_cpu_high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when ${each.key} ECS task CPU utilization exceeds 80 percent"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_names[each.key]
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  for_each            = toset(var.service_names)
  alarm_name          = "${var.project_name}_${each.key}_memory_high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when ${each.key} ECS task memory utilization exceeds 80 percent"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_names[each.key]
  }
}
