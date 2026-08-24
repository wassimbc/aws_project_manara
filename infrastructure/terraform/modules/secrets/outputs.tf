output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt_secret.arn
}

output "redis_password_arn" {
  value = aws_secretsmanager_secret.redis_password.arn
}

output "internal_secret_arn" {
  value = aws_secretsmanager_secret.internal_secret.arn
}

output "secret_arns" {
  value = {
    jwt_secret      = aws_secretsmanager_secret.jwt_secret.arn
    redis_password  = aws_secretsmanager_secret.redis_password.arn
    internal_secret = aws_secretsmanager_secret.internal_secret.arn
  }
}
