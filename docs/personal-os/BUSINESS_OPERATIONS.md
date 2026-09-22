# Gravitas Business Operations & Algoryxz Pipeline Architecture (Wave 12C.5)

## 1. Ethical Commercial Operations

The Business Operations subsystem (the Algoryxz Pipeline) provides structured market research, commercial opportunity analysis, and tailored client outreach preparation. 

### Core Ethical & Professional Guardrails
1. **STRICT PROHIBITION ON MASS SPAM:** Gravitas strictly prohibits automated bulk email blasting, scraping phone directories, cold robocalling, or mass social media DM automation.
2. **ZERO FABRICATED CLAIMS:** Gravitas never fabricates statistics, invented testimonials, false performance metrics, or deceptive claims about a prospect's business.
3. **MANDATORY HUMAN APPROVAL FOR ALL OUTREACH:** An agent role can author and refine outreach drafts, but **only the human operator can authorize dispatching an external communication**.

---

## 2. Epistemic Separation: Facts vs. Analysis vs. Suggestions

To maintain absolute credibility, all business research folios and lead dossiers strictly separate raw observations from synthetic interpretations:

| Category | Definition | Permitted Language Pattern | Forbidden Language Pattern |
| :--- | :--- | :--- | :--- |
| **`OBSERVED FACT`** | Verifiable, publicly documented evidence found on domain or registry. | `"Domain example.com has no mobile responsive viewport meta tag."` | `"The website is broken and losing traffic."` |
| **`TECHNICAL ANALYSIS`**| Professional technical evaluation of observed facts. | `"Users on mobile viewports will experience horizontal clipping and unscaled text."` | `"The company is losing 70% of potential buyers."` |
| **`STRATEGIC SUGGESTION`**| Concrete, value-first technical solution proposed. | `"A responsive CSS overhaul or Next.js rebuild would resolve mobile layout issues."` | `"You must hire us immediately to survive."` |

---

## 3. The 6-Stage Algoryxz Pipeline

```
  [ 1. Business Research Goal ]
       │ e.g., "Research specialty coffee roasters in Pacific Northwest without e-commerce"
       ▼
  [ 2. Lead Researcher ] ── (role:business:lead-researcher)
       │ Performs public web searches, verifies domain status, checks digital presence
       ▼
  [ 3. Evidence-Backed Lead Dossier ] ── (Stored in Structured Domain Memory)
       │ Contains business name, public website URL, tech stack, observed gaps, citations
       ▼
  [ 4. Opportunity Analyst ] ── (role:business:opportunity-analyst)
       │ Analyzes business fit, evaluates technical feasibility, drafts value proposition
       ▼
  [ 5. Outreach Drafter ] ── (role:business:outreach-drafter)
       │ Authors highly personalized, value-first draft communication
       ▼
  ┌────────────────────────────────────────────────────────┐
  │ 6. HUMAN APPROVAL PLINTH (Mezzanine Governance Gate)  │
  │    Operator reviews dossier, edits text, clicks:       │
  │    [ APPROVE & SEND ] or [ REJECT / ARCHIVE ]         │
  └───────────────────────────┬────────────────────────────┘
                              │ Human Approval Token Emitted
                              ▼
  [ 7. Connector Dispatch & CRM State Transition ]
       Email/Messaging connector dispatches message; records timestamped thread.
```

---

## 4. The Lead Dossier Schema

```typescript
export interface LeadDossier {
  readonly leadId: string
  readonly businessName: string
  readonly websiteUrl: string
  readonly industry: string
  readonly location: string

  /** Observed facts with source URLs and extraction timestamps */
  readonly observedFacts: ReadonlyArray<{
    readonly fact: string
    readonly sourceUrl: string
    readonly capturedAt: string
  }>

  /** Concrete technical gaps identified */
  readonly technicalOpportunities: ReadonlyArray<{
    readonly area: 'MOBILE_UX' | 'PERFORMANCE' | 'ECOMMERCE' | 'API_INTEGRATION'
    readonly description: string
    readonly estimatedImpact: string
  }>

  /** Outreach drafting status */
  readonly outreachStatus: 'UNCONTACTED' | 'DRAFT_PREPARED' | 'WAITING_APPROVAL' | 'SENT' | 'REPLIED' | 'ARCHIVED'
  readonly candidateDraftText?: string
}
```
