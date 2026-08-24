# Notifications Microservice

## Overview
The Notifications microservice processes notifications triggered by internal services like Orders.
It receives requests dispatched via Cloud Map service discovery (`notifications.project6.local:3003`).

## Security
Creation endpoints are protected by `x_internal_secret` header verification.

## Endpoints
* `GET /health` Public health check
* `POST /api/notifications` Create notification (Requires internal secret header)
* `GET /api/notifications/:id` Get single notification
* `GET /api/notifications/user/:userId` List user notifications
