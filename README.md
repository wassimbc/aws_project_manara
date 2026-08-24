# AWS Project 6 Containerized Microservices with ECS Fargate

## Overview
Production style implementation of a containerized microservices application running on Amazon ECS Fargate, Amazon ElastiCache Redis, AWS Cloud Map, and Application Load Balancer with AWS CodePipeline blue green deployments.

The project demonstrates migrating a monolithic Node.js application into three independent microservices:
* Auth Microservice
* Orders Microservice
* Notifications Microservice

## Architecture Diagram

```
                         Internet
                            |
                            v
                Application Load Balancer
               (Public Subnets AZ_a and AZ_b)
                            |
           +----------------+----------------+
           |                |                |
           v                v                v
      /api/auth/*      /api/orders/*   /api/notifications/*
           |                |                |
           v                v                v
      ECS Fargate      ECS Fargate      ECS Fargate
      Auth Service     Orders Service   Notifications Service
           |                |                |
           +----------------+----------------+
                            |
                    AWS Cloud Map DNS
                     (project6.local)
                            |
                    ElastiCache Redis
                  (Private Subnets)
```

Editable diagrams available under:
* `diagrams/architecture.mmd` (Mermaid format)
* `diagrams/architecture.drawio` (draw.io XML format)

## AWS Services Used

| AWS Service | Purpose |
| ----------- | ------- |
| ECS Fargate | Serverless container orchestration for private microservices |
| ECR | Private Docker container image registry with vulnerability scanning |
| Application Load Balancer | External path based routing and health checks |
| AWS Cloud Map | Private DNS service discovery (`project6.local`) |
| Secrets Manager | Secure storage and ECS container injection of sensitive configuration |
| ElastiCache Redis | In memory session store and shared application cache |
| CodePipeline | End to end CI CD pipeline orchestration |
| CodeBuild | Automated build, test, and Docker image creation |
| CodeDeploy | ECS blue green deployment with traffic shifting and rollback |
| AWS X_Ray | Distributed tracing across microservice boundaries |
| CloudWatch | Log aggregation and metric alarms for monitoring |
| VPC | Multi AZ isolated network infrastructure |
| IAM | Least privilege task execution and service role access control |

## Architecture Decisions
1. ECS Fargate: Eliminates server management while maintaining task isolation inside private subnets.
2. AWS Cloud Map: Replaces hardcoded IP addresses with internal DNS hostnames (`auth.project6.local`, `notifications.project6.local`).
3. ElastiCache Redis: Decouples session state from individual ECS container tasks, enabling stateless scaling.
4. Secrets Manager: Prevents hardcoded passwords or API keys in code repositories.

## Networking Architecture
* VPC CIDR: `10.0.0.0/16`
* Public Subnets: `10.0.1.0/24` (AZ a), `10.0.2.0/24` (AZ b)
* Private Subnets: `10.0.11.0/24` (AZ a), `10.0.12.0/24` (AZ b)
* Security Group Layering: Internet -> ALB SG -> ECS SG -> Redis SG

## Microservices Design
* Auth Service (Port 3001): User registration, password hashing with bcrypt, JWT token issuing, Redis session management.
* Orders Service (Port 3002): Order management, validates auth by calling Auth service via Cloud Map DNS, dispatches notifications via Cloud Map DNS.
* Notifications Service (Port 3003): Internal notification processing, protected by internal secret header.

## Service Discovery (AWS Cloud Map)
ECS tasks auto register with Cloud Map namespace `project6.local`. Microservices resolve each other using DNS:
* `http://auth.project6.local:3001`
* `http://notifications.project6.local:3003`

## Secrets Management
Secrets created in AWS Secrets Manager:
* `project6/jwt_secret`
* `project6/redis_password`
* `project6/internal_service_secret`

ECS task definitions reference secret ARNs in container environment declarations.

## CI CD and Blue Green Deployments
CodePipeline triggers on push to GitHub. CodeBuild compiles TypeScript, runs Jest tests, builds Docker images, and pushes to ECR. CodeDeploy provisions a new Green task set, conducts health checks on port 8080 test listener, shifts traffic on production listener port 80, and terminates Blue task set upon success.

## Local Development
Start local containers:
```bash
cp .env.example .env
docker_compose up __build
```

## AWS Infrastructure Deployment
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Teardown
```bash
cd infrastructure/terraform
terraform destroy
```

## Testing
Run tests locally per service:
```bash
cd services/auth && npm test
cd services/orders && npm test
cd services/notifications && npm test
```

Run AWS smoke test script:
```bash
bash tests/smoke/smoke.sh <ALB_DNS_NAME>
```

## Manara Learning Outcomes Mapping

### Outcome 1: Docker Images, ECR, and ECS Task Definitions
* Implemented: Multi stage Dockerfiles, ECR repositories (`project6_auth`, `project6_orders`, `project6_notifications`), ECS task definitions.
* How it works: CodeBuild builds Docker images tagged with git SHA, pushes to ECR with image scanning, and updates task definitions.
* Repository location: `services/*/Dockerfile`, `infrastructure/terraform/modules/ecr`, `deployment/task_definitions/`
* Demonstration: Inspect ECR repositories in AWS console or run `aws ecr describe_images`.

### Outcome 2: ECS Fargate Services with IAM Task and Execution Roles
* Implemented: Fargate launch type with separate execution roles (ECR pull, CloudWatch logs, Secrets Manager) and task roles (X_Ray, runtime access).
* How it works: Tasks run in private subnets with least privilege IAM permissions.
* Repository location: `infrastructure/terraform/modules/ecs`, `infrastructure/terraform/modules/iam`
* Demonstration: Inspect IAM roles attached to running ECS tasks in AWS Console.

### Outcome 3: Service to Service Communication via Cloud Map DNS
* Implemented: Private DNS namespace `project6.local` with service registrations for `auth`, `orders`, `notifications`.
* How it works: Orders service resolves `http://notifications.project6.local:3003` without hardcoded container IPs.
* Repository location: `infrastructure/terraform/modules/cloudmap`, `services/orders/src/services/notifications_client.ts`
* Demonstration: Observe inter service logs in CloudWatch demonstrating DNS resolution and HTTP calls.

### Outcome 4: ALB Path Based Routing Rules
* Implemented: Internet facing ALB with path pattern listener rules routing `/api/auth/*`, `/api/orders/*`, `/api/notifications/*`.
* How it works: ALB receives external requests and forwards to appropriate ECS target group.
* Repository location: `infrastructure/terraform/modules/alb`
* Demonstration: Send curl requests to ALB DNS at different path prefixes.

### Outcome 5: Blue Green Deployments via CodeDeploy
* Implemented: CodeDeploy deployment groups for ECS with dual target groups (Blue/Green), test listener port 8080, and automatic rollback.
* How it works: CodeDeploy provisions Green task set, validates health, shifts production traffic, and cleans up Blue task set.
* Repository location: `infrastructure/terraform/modules/codedeploy`, `deployment/appspec/`
* Demonstration: Trigger pipeline push and observe blue green traffic shifting in CodeDeploy console.

### Outcome 6: Secrets Management with AWS Secrets Manager
* Implemented: Secrets Manager secrets for JWT secret, Redis password, and internal service secret.
* How it works: ECS execution role fetches secret values at runtime and injects them as container environment variables without hardcoded credentials in source control.
* Repository location: `infrastructure/terraform/modules/secrets`, `infrastructure/terraform/modules/ecs`
* Demonstration: View ECS task definition JSON in AWS Console confirming values are injected via `secrets` ARNs.
