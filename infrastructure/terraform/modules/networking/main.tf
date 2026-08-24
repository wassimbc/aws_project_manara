# What this file does:
# Creates the entire network for the project:
# VPC (the private cloud network boundary)
# Public subnets (where the ALB lives, internet-reachable)
# Private subnets (where ECS tasks and Redis live, NOT internet-reachable)
# Internet Gateway (allows traffic from the internet into the public subnets)
# NAT Gateway (allows ECS tasks in private subnets to make outbound internet calls, e.g. to npm)
# Route tables (define where network traffic goes)

# =====================
# VPC
# Think of a VPC like renting a private section of the AWS network.
# Nothing outside can reach it unless you explicitly allow it.
# =====================
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}_vpc"
  }
}

# =====================
# Public Subnets
# Public subnets are connected to the Internet Gateway.
# Resources here can receive traffic from the internet (like the ALB).
# =====================
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  # Resources in this subnet get a public IP automatically.
  # The ALB needs this to be reachable from the internet.
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}_public_subnet_${count.index + 1}"
    Type = "public"
  }
}

# =====================
# Private Subnets
# Private subnets have NO direct connection to the internet.
# ECS tasks and Redis live here for security.
# They can still make OUTBOUND calls through the NAT Gateway.
# =====================
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}_private_subnet_${count.index + 1}"
    Type = "private"
  }
}

# =====================
# Internet Gateway
# The Internet Gateway is the door between the VPC and the public internet.
# Without it, nothing in the VPC can send or receive internet traffic.
# =====================
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}_igw"
  }
}

# =====================
# Elastic IP for NAT Gateway
# The NAT Gateway needs a fixed public IP address.
# An Elastic IP is a static public IP that stays the same even if the NAT Gateway is replaced.
# =====================
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "${var.project_name}_nat_eip"
  }
}

# =====================
# NAT Gateway
# The NAT Gateway lives in the public subnet and allows resources in the private subnet
# to make outbound internet requests (like downloading npm packages during builds)
# without exposing them to inbound internet traffic.
#
# COST NOTE: The NAT Gateway costs $0.045/hour (~$33/month) even with no traffic.
# Set enable_nat_gateway = false in terraform.tfvars when not actively using ECS
# to avoid this charge. You will need to set it back to true before running ECS tasks.
# =====================
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}_nat_gateway"
  }

  depends_on = [aws_internet_gateway.main]
}

# =====================
# Route Table: Public
# Tells resources in public subnets to send internet traffic through the Internet Gateway.
# =====================
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}_public_rt"
  }
}

# Associate both public subnets with the public route table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# =====================
# Route Table: Private
# Tells resources in private subnets to send internet traffic through the NAT Gateway.
# If NAT is disabled, private resources have no outbound internet access.
# =====================
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[0].id
    }
  }

  tags = {
    Name = "${var.project_name}_private_rt"
  }
}

# Associate both private subnets with the private route table
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
