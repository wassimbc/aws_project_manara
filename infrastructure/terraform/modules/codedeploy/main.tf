# What this file does:
# Creates CodeDeploy deployment groups for blue green deployment on ECS Fargate.

resource "aws_codedeploy_app" "services" {
  for_each         = toset(var.service_names)
  name             = "${var.project_name}_${each.key}_app"
  compute_platform = "ECS"
}

resource "aws_codedeploy_deployment_group" "services" {
  for_each               = toset(var.service_names)
  app_name               = aws_codedeploy_app.services[each.key].name
  deployment_group_name  = "${var.project_name}_${each.key}_dg"
  service_role_arn       = var.codedeploy_role_arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.ecs_service_names[each.key]
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.alb_listener_arn]
      }

      test_traffic_route {
        listener_arns = [var.alb_test_listener_arn]
      }

      target_group {
        name = var.blue_target_group_names[each.key]
      }

      target_group {
        name = var.green_target_group_names[each.key]
      }
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }
}
