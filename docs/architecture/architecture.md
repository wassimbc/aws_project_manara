# Architecture Documentation

## Target System Architecture
The application consists of three Node.js TypeScript microservices:
* Auth Service (handles login, registration, JWT tokens, Redis sessions)
* Orders Service (handles order placement and lookup)
* Notifications Service (processes internal notification messages)

## Network Isolation
* Public Subnets: Host the Application Load Balancer
* Private Subnets: Host ECS Fargate Tasks and ElastiCache Redis
* Security Groups: ALB SG accepts HTTP from 0.0.0.0/0, ECS SG accepts traffic only from ALB SG, Redis SG accepts traffic only from ECS SG.

## Microservice Communication
* Client to Service: Client -> ALB -> Path routing -> ECS Task
* Service to Service: Orders Service -> AWS Cloud Map DNS (`notifications.project6.local`) -> Notifications Service
* Orders Service -> AWS Cloud Map DNS (`auth.project6.local`) -> Auth Service
