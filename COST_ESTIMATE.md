# AWS Project 6 Cost Breakdown and Minimization Guide

## Free Tier and Cost Awareness
This project is configured specifically for AWS Free Tier and low cost operation.

## Itemized Estimated Costs (Active Deployment)

| Resource | Configuration | Monthly Cost | Cost Notes |
| -------- | ------------- | ------------ | ---------- |
| ECS Fargate | 3 tasks x 0.25 vCPU x 0.5 GB | ~$15 | Free tier includes 750 hours Fargate |
| Application Load Balancer | 1 ALB | ~$18 | Free tier includes 750 hours ALB |
| ElastiCache Redis | cache.t3.micro | ~$15 | Free tier includes 750 hours t3.micro Redis |
| NAT Gateway | 1 NAT Gateway | ~$32 | Hourly charge plus data processing |
| ECR | 3 Repositories | ~$1 | Free tier includes 500 MB storage |
| CodePipeline | 1 Active Pipeline | ~$1 | Free tier includes 1 active pipeline per month |
| CodeBuild | ~100 build minutes | ~$1 | Free tier includes 100 build minutes per month |
| CloudWatch | 7 day retention, 3 alarms | ~$2 | Free tier includes 5 GB logs and 10 alarms |
| Secrets Manager | 3 Secrets | ~$1 | $0.40 per secret per month |

Total estimated monthly cost when actively running: **~$86 per month**

## Cost Minimization Strategy
1. Disable NAT Gateway when not actively running builds (`enable_nat_gateway = false` in `terraform.tfvars`).
2. Set ECS desired task count to 1 (`ecs_desired_count = 1`).
3. Set CloudWatch log retention to 7 days.
4. Run `terraform destroy` when done testing to teardown all resources completely.
