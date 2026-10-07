# Service Migration Plan: Monolith to Event-Driven

## 1. Overview
This document describes the migration of User Service from the monolithic database to Kafka-based event streaming.

## 2. Steps
1. Setup Kafka cluster in production.
2. Introduce dual-writing in Monolith to both PostgreSQL and Kafka.
3. Deploy new microservice reading from Kafka.
4. Verify data parity by comparing database records.
5. Cut over traffic to microservice.
6. Decommission monolith user routes.

## 3. Rollback
If errors occur during step 4, revert feature flag and stop Kafka consumer.