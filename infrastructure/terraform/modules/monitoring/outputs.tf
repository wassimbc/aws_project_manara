output "alb_5xx_alarm_arn" {
  value = aws_cloudwatch_metric_alarm.alb_5xx.arn
}
