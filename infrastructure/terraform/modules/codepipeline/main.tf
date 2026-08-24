# What this file does:
# Creates the S3 artifact bucket, CodeBuild projects, and CodePipeline pipeline.

resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project_name}_pipeline_artifacts_${var.random_suffix}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}_artifacts_bucket"
  }
}

resource "aws_codebuild_project" "services" {
  for_each     = toset(var.service_names)
  name         = "${var.project_name}_build_${each.key}"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ECR_REGISTRY"
      value = split("/", var.ecr_repository_urls[each.key])[0]
    }

    environment_variable {
      name  = "SERVICE_NAME"
      value = each.key
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "ci_cd/buildspec_${each.key}.yml"
  }
}

resource "aws_codepipeline" "main" {
  name     = "${var.project_name}_pipeline"
  role_arn = var.pipeline_role_arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Repo   = var.github_repo
        Branch = var.github_branch
      }
    }
  }

  stage {
    name = "Build"

    dynamic "action" {
      for_each = toset(var.service_names)
      content {
        name             = "Build_${action.value}"
        category         = "Build"
        owner            = "AWS"
        provider         = "CodeBuild"
        input_artifacts  = ["source_output"]
        output_artifacts = ["build_output_${action.value}"]
        version          = "1"
        configuration = {
          ProjectName = aws_codebuild_project.services[action.value].name
        }
      }
    }
  }

  stage {
    name = "Deploy"

    dynamic "action" {
      for_each = toset(var.service_names)
      content {
        name            = "Deploy_${action.value}"
        category        = "Deploy"
        owner           = "AWS"
        provider        = "CodeDeployToECS"
        input_artifacts = ["build_output_${action.value}"]
        version         = "1"

        configuration = {
          ApplicationName                = var.codedeploy_app_names[action.value]
          DeploymentGroupName            = var.codedeploy_group_names[action.value]
          TaskDefinitionTemplateArtifact = "build_output_${action.value}"
          TaskDefinitionTemplatePath     = "deployment/task_definitions/${action.value}_taskdef.json"
          AppSpecTemplateArtifact        = "build_output_${action.value}"
          AppSpecTemplatePath            = "deployment/appspec/${action.value}_appspec.yml"
        }
      }
    }
  }
}
