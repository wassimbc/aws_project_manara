# Troubleshooting Guide

## Common Issues and Diagnostics

### 1. ECS Tasks failing health check
* Check CloudWatch logs under `/project6/auth`, `/project6/orders`, `/project6/notifications`.
* Verify Redis connectivity from private subnet.
* Verify security group rules allowing ingress from ALB SG.

### 2. Service Discovery Resolution Failure
* Confirm CloudMap namespace `project6.local` exists.
* Verify task is registered in CloudMap service discovery.
* Check security group allows TCP traffic between ECS tasks.

### 3. CodeDeploy Blue Green Deployment Rollback
* Check target group health status on port 8080 test listener.
* Review CodeDeploy deployment logs in AWS Console.
