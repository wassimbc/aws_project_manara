output "execution_role_arn" {
  value = aws_iam_role.execution.arn
}

output "execution_role_arns" {
  value = { for k in var.service_names : k => aws_iam_role.execution.arn }
}

output "task_role_arns" {
  value = { for k, v in aws_iam_role.task : k => v.arn }
}

output "codedeploy_role_arn" {
  value = aws_iam_role.codedeploy.arn
}

output "pipeline_role_arn" {
  value = aws_iam_role.pipeline.arn
}

output "codebuild_role_arn" {
  value = aws_iam_role.codebuild.arn
}
