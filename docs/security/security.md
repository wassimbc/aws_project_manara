# Security Architecture and Controls

## Security Model Overview
* Network Security: ECS tasks and Redis run strictly inside private subnets without public IP addresses.
* IAM Security: Least privilege execution and task roles. AdministratorAccess is avoided.
* Secrets Management: Sensitive values (JWT secret, Redis password, internal service secret) stored in AWS Secrets Manager and injected directly into containers by ECS.
* Container Security: Docker containers run under non_root users (`appuser`) using `dumb_init` for PID 1 process isolation. ECR image scanning enabled.
* Data Protection: Passwords hashed with bcrypt (cost factor 10). JWT tokens stored and validated in Redis.
