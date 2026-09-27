output "pipeline_name" {
  value = aws_codepipeline.main.name
}

output "artifact_bucket_name" {
  value = aws_s3_bucket.artifacts.bucket
}
