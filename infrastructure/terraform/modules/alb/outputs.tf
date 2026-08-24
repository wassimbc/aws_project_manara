output "dns_name" {
  value = aws_lb.main.dns_name
}

output "arn" {
  value = aws_lb.main.arn
}

output "alb_arn_suffix" {
  value = aws_lb.main.arn_suffix
}

output "http_listener_arn" {
  value = aws_lb_listener.http.arn
}

output "test_listener_arn" {
  value = aws_lb_listener.test.arn
}

output "blue_target_group_arns" {
  value = { for k, v in aws_lb_target_group.blue : k => v.arn }
}

output "green_target_group_arns" {
  value = { for k, v in aws_lb_target_group.green : k => v.arn }
}

output "blue_target_group_names" {
  value = { for k, v in aws_lb_target_group.blue : k => v.name }
}

output "green_target_group_names" {
  value = { for k, v in aws_lb_target_group.green : k => v.name }
}
