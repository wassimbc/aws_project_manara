# Deployment Guide

## Prerequisites
* AWS CLI installed and configured
* Terraform >= 1.6.0 installed
* Node.js 20 and Docker installed

## Local Deployment with Docker Compose
```bash
cp .env.example .env
docker_compose up __build
```

## AWS Infrastructure Deployment with Terraform
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Update github_repo in terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Teardown / Cleanup
To avoid ongoing AWS charges:
```bash
cd infrastructure/terraform
terraform destroy
```
