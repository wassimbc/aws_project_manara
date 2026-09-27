output "app_names" {
  value = { for k, v in aws_codedeploy_app.services : k => v.name }
}

output "deployment_group_names" {
  value = { for k, v in aws_codedeploy_deployment_group.services : k => v.deployment_group_name }
}
