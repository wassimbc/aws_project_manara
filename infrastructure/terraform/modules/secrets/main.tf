# What this file does:
# Creates AWS Secrets Manager secrets for sensitive runtime values.
# 1. project6/jwt_secret (used by Auth service to sign tokens)
# 2. project6/redis_password (used to authenticate with ElastiCache Redis)
# 3. project6/internal_service_secret (used for inter microservice authentication)

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

resource "random_password" "internal_secret" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/jwt_secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "redis_password" {
  name                    = "${var.project_name}/redis_password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "redis_password" {
  secret_id     = aws_secretsmanager_secret.redis_password.id
  secret_string = random_password.redis_password.result
}

resource "aws_secretsmanager_secret" "internal_secret" {
  name                    = "${var.project_name}/internal_service_secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "internal_secret" {
  secret_id     = aws_secretsmanager_secret.internal_secret.id
  secret_string = random_password.internal_secret.result
}
