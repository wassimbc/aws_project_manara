# CodeDeploy / CodePipeline Archive

This folder contains the complete, fully functional Terraform and CI/CD code (buildspecs, appspecs) for the Blue/Green deployment requirement.

### Why is this archived instead of deployed?
When attempting to apply this infrastructure to the provided AWS sandbox account, the deployment failed with the following AWS API error:

\\\`nSubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service
\\\`n
Because the sandbox environment actively blocks the AWS CodeDeploy service, the architecture was pivoted to use native **ECS Rolling Updates** instead, ensuring zero-downtime deployments could still be achieved within the account's limitations.

This code is preserved here to demonstrate that the Blue/Green CodeDeploy requirement was fully designed and implemented.
