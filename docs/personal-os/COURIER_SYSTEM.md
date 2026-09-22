# Gravitas Courier Digital Logistics Subsystem (Wave 12C.5)

## 1. Principles of the Courier Subsystem

The Courier Subsystem is Gravitas's deterministic digital logistics engine. It manages file intake, asset streaming, repository cloning, archive extraction, format conversion, and cryptographic hash verification.

$$\text{Courier Subsystem} = \text{Deterministic High-Throughput I/O Worker Pool}$$

### Fundamental Invariant:
**NO LLM PROCESS REMAINS OCCUPIED WHILE A 12GB DATASET DOWNLOADS.**  
Reasoning roles determine *what* should be retrieved and enqueue a structured job; the LLM subprocess terminates immediately, and the Courier service executes the I/O asynchronously.

---

## 2. Supported Courier Job Types

| Job Type | Description | Target Operations | Verification Method |
| :--- | :--- | :--- | :--- |
| **`DownloadJob`** | Streams remote file via HTTP/HTTPS/S3 into local staging area. | Model weights, datasets, research PDFs, media assets. | SHA256 checksum comparison. |
| **`CloneJob`** | Performs bounded git clone or shallow fetch of external repository. | Dependency repos, template boilerplates. | Git commit SHA verification. |
| **`ExtractJob`** | Safely unpacks zip, tar.gz, or 7z archives with path-traversal guards. | Compressed datasets, SDK packages. | File count & uncompressed byte verification. |
| **`ChecksumJob`** | Calculates cryptographic digests of local files. | Verifying dataset integrity, release artifacts. | Computes SHA256 / SHA512 hash. |
| **`ConvertJob`** | Executes deterministic CLI conversions (e.g., ffmpeg, pandoc). | Audio transcoding, PDF to markdown, image optimization. | Non-zero exit code check. |
| **`IndexJob`** | Parses markdown/code and builds local BM25 or embedding indexes. | Documentation search index, codebase symbols. | Vector/symbol entry count check. |
| **`ArchiveJob`** | Compresses and moves old run evidence to cold storage. | Evidence manifests older than 30 days. | Archive hash validation. |

---

## 3. Job Lifecycle & Evidence Manifest

Every Courier job follows a strict finite state lifecycle:

```
  ┌──────────┐
  │  QUEUED  │ ──► Enqueued by Reasoning Role or User Command
  └────┬─────┘
       │ Worker pool dispatches
       ▼
  ┌──────────┐
  │ RUNNING  │ ──► High-speed streaming to staging/downloads/
  └────┬─────┘
       │ Stream closed
       ▼
  ┌──────────┐
  │VERIFYING │ ──► Computing sha256 checksum, checking path safety
  └────┬─────┘
       ├───────────────────────┬───────────────────────┐
       │ Hash matches          │ Hash mismatch / I/O err
       ▼                       ▼
 ┌───────────┐           ┌───────────┐
 │ COMPLETED │           │  FAILED   │
 └───────────┘           └───────────┘
```

### The Courier Evidence Record
```typescript
export interface CourierEvidenceRecord {
  readonly jobId: string
  readonly jobType: 'DOWNLOAD' | 'CLONE' | 'EXTRACT' | 'CHECKSUM' | 'CONVERT'
  readonly sourceUri: string
  readonly destinationPath: string
  readonly sizeBytes: number
  readonly expectedSha256?: string
  readonly computedSha256: string
  readonly isChecksumVerified: boolean
  readonly startedAt: string
  readonly completedAt: string
  readonly executionDurationMs: number
}
```
