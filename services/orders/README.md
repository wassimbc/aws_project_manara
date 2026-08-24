# Orders Microservice

## Overview
The Orders service handles order CRUD operations and demonstrates inter microservice communication.
It validates user sessions by calling the Auth microservice via Cloud Map DNS (`auth.project6.local:3001`).
When order state changes, it notifies the Notifications microservice via Cloud Map DNS (`notifications.project6.local:3003`).

## Environment Variables
* `PORT` Default 3002
* `REDIS_HOST` Redis hostname
* `REDIS_PORT` Redis port 6379
* `REDIS_PASSWORD` Redis password
* `INTERNAL_SERVICE_SECRET` Shared secret for internal service communication
* `AUTH_SERVICE_URL` `http://auth.project6.local:3001`
* `NOTIFICATIONS_SERVICE_URL` `http://notifications.project6.local:3003`

## Endpoints
* `GET /health` Public health check
* `GET /api/orders` List orders for authenticated user
* `GET /api/orders/:id` Get single order details
* `POST /api/orders` Create new order
* `PUT /api/orders/:id` Update order status or items
* `DELETE /api/orders/:id` Cancel order
