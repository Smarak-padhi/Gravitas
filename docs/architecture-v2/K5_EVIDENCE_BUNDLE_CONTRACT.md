# GRAVITAS K5 — EVIDENCE BUNDLE & MANIFEST CONTRACT
## Formal Specification of EvidenceBundles, Manifest Determinism, and Integrity Digests

**Wave**: K5  
**Status**: APPROVED_AND_FROZEN  

---

### 1. Foundational Integrity & Trust Invariants

```
HASH != SIGNATURE
HASH != EXTERNAL_TRUST
HASH != IMMUTABILITY
EVIDENCE_BUNDLE != TRUSTED_EVIDENCE
```

An integrity digest in GRAVITAS K5 is strictly **change-detection metadata relative to a reference digest**. It does not prove who authored the bytes, does not verify signatures, and does not confer external trustworthiness.

All EvidenceBundles are typed with:
```ts
trustStatus: 'NOT_TRUSTED_EVIDENCE'
```

---

### 2. EvidenceManifest Structure & Canonical Serialization

The `EvidenceManifest` schema captures all artifacts, criterion revisions, and evidence IDs:

```ts
export interface EvidenceManifest {
  readonly bundleVersion: 'k5-bundle-1'
  readonly bundleId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly verificationPlanId: string
  readonly verificationReportId: string
  readonly criterionRevisions: readonly { criterionId: string; revision: number }[]
  readonly evidenceIds: readonly string[]
  readonly artifacts: readonly ManifestArtifactEntry[]
  readonly environmentRef: { platform: string; nodeVersion: string }
  readonly createdAt: string
}
```

#### Deterministic Ordering Rules
To guarantee reproducible core digests across different execution orderings:
1. `criterionRevisions` are sorted ascending by `criterionId`.
2. `evidenceIds` are sorted lexicographically.
3. `artifacts` are sorted ascending by `path`.
4. `manifestCore` strips volatile metadata (`bundleId`, `createdAt`).
5. `canonicalJson` recursively sorts all object keys.

---

### 3. Digest Semantics (`IntegrityDigest`)

```ts
export interface IntegrityDigest {
  readonly algorithm: 'sha256'
  readonly digestHex: string
  readonly byteLength: number
  readonly semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST'
  readonly isDigitalSignature: false
  readonly confersExternalTrust: false
  readonly confersImmutability: false
}
```

---

### 4. Tamper Detection Operations

- **Artifact Tamper Detection**: `compareToReferenceDigest(currentBytes, referenceDigest)` returns `CONTENT_CHANGED_RELATIVE_TO_REFERENCE_DIGEST` if file bytes differ.
- **Manifest Tamper Detection**: `verifyManifestAgainstReference(manifest, referenceDigest)` returns `INTEGRITY_MISMATCH_RELATIVE_TO_REFERENCE_DIGEST` if any covered field was modified.
