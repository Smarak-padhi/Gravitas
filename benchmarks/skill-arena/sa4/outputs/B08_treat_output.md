# Engineering Specification: User Service Decoupling & Event Migration

## 0. Gate Verification & State Locks
- Target: Monolithic User Service -> Event-Driven Microservice
- Invariant: Zero customer data loss; zero downtime during cutover; continuous fallback.

## Phase 1: Context Framing & Ambiguity Scoping
- **Deliverables**: SPEC-01 Contract defining event schemas and write idempotency keys.
- **Ambiguity Gate**: Score must be < 0.15 before Phase 2.
- **Halt Trigger**: Unresolved schema conflicts on legacy user metadata fields.

## Phase 2: Design Contract & Dual-Write Architecture
- **Wave 2A**: Kafka Outbox pattern table inside monolithic DB (ACID guaranteed).
- **Wave 2B**: CDC Debezium connector streaming outbox events to Kafka broker.
- **Gate Criteria**: 100% outbox event publication with guaranteed at-least-once delivery.

## Phase 3: Shadow Consumer & Forensic Parity Audit
- **Wave 3A**: Deploy new decoupled User Service in shadow read-only mode.
- **Wave 3B**: Continuous reconciliation loop comparing shadow state against monolith SQL.
- **Parity Gate**: 1,000,000 consecutive transactions with zero parity mismatch over 72 hours.
- **Rollback Condition**: Any drift > 0 transactions halts progression and reverts shadow consumer.

## Phase 4: Canary Traffic Cutover & Monolith Decommissioning
- **Wave 4A**: 5% read traffic shift via routing proxy.
- **Wave 4B**: 25% -> 50% -> 100% phased cutover with 15-minute soak intervals.
- **Wave 4C**: Write cutover using dual-run rollback feature flag.
- **Final Verification**: UAT sign-off matrix across authentication, session revocation, and data safety.