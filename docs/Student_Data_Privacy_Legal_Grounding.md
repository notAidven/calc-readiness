# Student Data Privacy — What the Law Requires, What Is Industry Practice, and What This Repo Chose (v0.1)

> **Status: RESEARCH + GROUNDING NOTE. NOT LEGAL ADVICE, and nothing in it is a substitute for counsel.** I am not a lawyer and this is not a legal opinion. What it establishes is the *factual* ground a lawyer would need before answering: which regimes plausibly attach given who this product's users actually are, what each regime's operative text says, what AWS's current contract actually commits to, and — separately — what `docs/Photo_Work_Upload_Scope.md` §6 chose for itself. Those are three different things and this note keeps them apart on every page.
>
> **Documentation only. No code was changed.** Every repo fact below was measured on `integration` at **`47ae7aa1`** on 2026-08-05 and each one names the file and line it came from. Every external source was read on **2026-08-05** and is linked inline and in §11. Where I quote a statute, regulation or vendor contract, the words in quotation marks are theirs; everything else is my reading and is marked as such.
>
> **Provenance, because the tree moved while this was being written.** The measurements were first taken at `da781d1f`; #636 then landed on `integration`, so — per `.cursor/rules/qa-verification.mdc`, *"a finding expires when the tree moves"* — **every** citation and grep in §2 was **re-run at `47ae7aa1`** rather than carried forward. Outcome: **30 of 30 file:line citations resolve to the quoted text**, and every grep returns what §2 reports (the two that are not empty return exactly the one expected hit each, both named in place). #636 touched only `apps/web/src/city/three/**` and two design-ref READMEs, none of which this note cites — but that was checked *after* re-running, not used as a reason to skip it.
>
> **A naming convention, because two documents both have a section 6.** Throughout this note, **`Scope §6`** and **`Scope §3.5`** mean those sections of `docs/Photo_Work_Upload_Scope.md`. A bare **§N** always means a section of *this* note.
>
> **It answers a question the owner asked verbatim:** *"im not really sure what our policy on privacy should be - whats like the real policy on this?"*
>
> **The headline: on the repo's own stated audience, COPPA very likely does not attach, FERPA does not reach this product directly, and the law does not forbid any of the three routes on the table — including Bedrock. `Photo_Work_Upload_Scope.md` §6 is stricter than the law requires, which is a legitimate posture but was never verified as an external constraint, and Scope §3.5 escalated it into one.** §8 separates what the law forecloses from what the posture forecloses, because conflating those two lists is what killed a feature route.
>
> **This note deliberately does not rewrite Scope §6.** That posture is the owner's to change once informed, and §8.4 sets out what changing it would take.

---

## 0. Why this note exists

`docs/Photo_Work_Upload_Scope.md` §6 states a regulatory posture and then, in its own last sentence on the subject, concedes what it is:

> *"**Regulatory posture:** COPPA (users under 13 → verifiable parental consent, data minimization, deletion rights) and FERPA-style education-record handling (access limited to the student and authorized adults; no third-party sharing). **This is a chosen posture to confirm with counsel, not legal advice.**"*
> — `docs/Photo_Work_Upload_Scope.md:99`, quoted at `47ae7aa1`

Nothing in the repo records that confirmation ever happening. Fourteen lines earlier in the same file, that unconfirmed posture is already being cited as a hard external constraint:

> *"Sending student photos to a third-party model is **third-party sharing of student PII**, which the **§6 COPPA/FERPA posture forbids**. v2 therefore **REQUIRES** either (a) an **education-compliant provider** under a signed DPA with **no-retention / no-training** terms, or (b) **self-hosted / on-device OCR** that keeps images inside our trust boundary. Absent one of these, v2 does not ship — this is *the* gating dependency, not an implementation detail."*
> — `docs/Photo_Work_Upload_Scope.md:75`

That sentence does the work of a legal finding while resting on a self-described non-finding, and `apps/web/src/work-upload/README.md:72-76` repeats it into the shipped code's documentation. The escalation is the problem this note is written to undo — not by relaxing the rule, but by establishing what the rule actually is so the owner can choose deliberately.

---

## 1. Bottom line, in six sentences

1. **The repo's stated audience is college-entry, not children.** Four separate documents describe the user as an incoming STEM freshman or a community-college/adult learner; no document anywhere describes a K-12 or under-13 user (§2.1, measured).
2. **The product collects no age, anywhere.** Cognito requires exactly one attribute — email — and the sign-up form asks for email and password only. There is no birthdate field, no age gate and no parental-consent flow in the tree (§2.2, measured).
3. **On those two facts COPPA's core obligations very likely do not attach**, because COPPA reaches operators of services *directed to children* or with *actual knowledge* they are collecting from an under-13, and this product is neither on its stated design (§3). That is a conclusion about the product as documented, and §3.4 says exactly what would change it.
4. **FERPA does not bind this product at all today**, because FERPA binds federally funded educational institutions and reaches vendors only through the school-official exception — which requires a school to be the customer. The repo records no school, district or institutional customer anywhere; that is not a "no", it is a **blank**, and it is the single most consequential blank in the file (§2.3, §4).
5. **The state student-privacy statutes are the ones that would actually bite, and only if he sells to institutions** — and California has a bill in committee *right now* that would extend them to higher education and ban training generative AI on covered student information (§5).
6. **On the subprocessor question the law is permissive and AWS's contract is unusually good, but the folklore in this repo is wrong in both directions**: AWS's published sub-processor list names no Bedrock model provider, and Bedrock is excluded from the Service Terms clause that lets AWS train on customer content — but Bedrock is *not* categorically zero-retention, and the marketing page that says so is contradicted by AWS's own Service Terms and abuse-detection documentation (§6 below).

---

## 2. The facts about THIS product, from the repo

Everything in this section is a measurement at `47ae7aa1`, not a recollection. Evidence type is named per item, per `.cursor/rules/qa-verification.mdc`.

### 2.1 How old are the users? — **ANSWERED by the repo: college entry, 17-18+**

*Evidence type: quotation from the tree at the current tip.*

| Where | What it says |
|---|---|
| `docs/PRD_Full.md:52` | *"**"Maya," incoming STEM freshman, placed into (or nervous about) Calculus I.**"* |
| `docs/PRD_Full.md:69` | *"As an underprepared incoming calculus student, I take a short diagnostic…"* |
| `docs/Game_Visual_Design_Brief.md:50` | *"**Primary persona — "Maya," an incoming STEM freshman placed into (or anxious about) Calculus I.**"* |
| `docs/One_Pager.md:5` | *"most **incoming STEM students** who struggle in Calculus I are not weak at calculus, they are weak at the *prerequisites*"* |
| `docs/BrainLift_Game_Design.md:3` | *"underprepared, math-anxious **community-college and adult** audience"* |
| `docs/BrainLift_Game_Design.md:73` | *"Gamification is **not a children's tool** that our **college-age**, underprepared audience will find condescending"* |

That last row matters more than it looks. `BrainLift_Game_Design.md` §2.5 is an entire researched subsection arguing that the design should work for **adults**, with the meta-analytic evidence to match. The audience question is not an oversight in this repo; it is a considered position taken twice, in a product document and in a design-research document, and both land in the same place.

**No document in `docs/` describes a K-12, middle-school or under-13 user.** Measured: `rg -c -i -e 'middle school' -e '\b9th grade' -e '\b10th grade' -e '\b11th grade' -e '\b12th grade' -e 'high schooler' docs/` returns **zero files** at `47ae7aa1`. (A looser grep for bare `9th`/`11th` does match, on *"11th century sacred music"* in an era-art brief and on Bronze-Age lesson content — noise, not an audience statement.)

**Reading (mine, not the repo's):** pre-calculus readiness is taken here as *calculus-entry* readiness, and the whole product frame — placement into Calculus I, a pre/post instrument, a controlled study after handoff — is a higher-education frame. A 12-year-old is not the user this product was designed for. That is the finding COPPA turns on.

### 2.2 Is age collected anywhere? — **ANSWERED: no, nowhere**

*Evidence type: exhaustive grep of the tree at the current tip, literal output quoted.*

```
$ git rev-parse HEAD
47ae7aa16650fa16e33029b244eb321abadbe015

$ rg -c -i -e 'birthdate' -e 'birth_date' -e 'date_of_birth' -e '\bdob\b' \
       -e 'age_gate' -e 'parental' -e 'guardian' -e 'verifiable consent' \
       -g '!node_modules' -g '!package-lock.json' \
       -g '!docs/Student_Data_Privacy_Legal_Grounding.md' .
./docs/Photo_Work_Upload_Scope.md:1
```

*(The last exclusion is this note itself, which discusses all eight terms and would otherwise match seven times. It is excluded so the command reproduces identically on this branch as it did on `integration`, where the file does not exist.)*

**One match in the entire tree**, and it is the words *"verifiable parental consent"* inside Scope §6's description of COPPA — a sentence *about* the law, not a mechanism implementing it. There is no birthdate field, no age gate, no parental-consent flow and no under-13 branch anywhere in the codebase.

Corroborated at the two places age would have to be collected if it were collected at all:

- **Cognito** — `infra/lib/calc-readiness-stack.ts:106`: `standardAttributes: { email: { required: true, mutable: false } }`. Email is the only standard attribute configured, required or otherwise. Sign-in alias is email; recovery is `EMAIL_ONLY` (`:104`, `:114`).
- **The sign-up form** — `apps/web/src/auth/AuthGate.tsx` renders exactly three inputs across its three states: email (`:99`), password (`:123`), and an emailed confirmation code (`:111`). Nothing else is asked.

**Also absent, and worth stating because he will need them either way:** there is no privacy policy and no terms of service anywhere in the tree. A grep for `privacy polic|terms of service|terms of use|SOPIPA|GDPR|CCPA` across the whole repo returns exactly one hit, in `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`, about Suno's music licence. That is unrelated.

### 2.3 Who is the customer, schools or families? — **THE REPO DOES NOT SAY. This is a blank, not an answer.**

*Evidence type: exhaustive grep for the vocabulary a school-sales product would necessarily contain, plus a read of the planning documents.*

Counts of files containing each term, whole tree, excluding `node_modules`, the lockfile, binary art blobs and `output/`:

| Term | Files | Term | Files |
|---|---|---|---|
| `school district` | **0** | `LMS` (case-sensitive) | **0** |
| `school official` | **0** | `LTI` (case-sensitive) | **0** |
| `student roster` | **0** | `B2B` (case-sensitive) | **0** |
| `class roster` | **0** | `B2C` (case-sensitive) | **0** |
| `enrollment` | **0** | `Clever` (the rostering vendor) | **0**¹ |
| `superintendent` | **0** | `ClassLink` | **0** |
| `site licen` / `seat licen` | **0** | `go-to-market` | **0** |

¹ Eleven case-insensitive `clever` matches across nine files, and every one is the ordinary English adjective — `clever`, `cleverer`, `cleverness` (e.g. `apps/web/src/catchup/ringLayout.ts:19`, *"it does not try to be clever"*). None refer to the rostering platform.

There is **no business model, no pricing, no distribution plan and no named customer anywhere in the repo.** The nearest things to a customer signal:

- `docs/MVP_Definition.md:64` — the efficacy study is deferred: *"the control-vs-treatment comparison happens **after handoff**."* Someone receives this product later; who is not recorded.
- `docs/Architecture.md:225` — a teacher appears exactly once, as an explicitly off-roadmap hypothetical: *"only matters for a multi-viewer case like a teacher watching live."*
- `docs/Photo_Work_Upload_Scope.md:133` — *"**NO tutor/teacher dashboard.**"* A v1 non-goal.
- Every `tutor` in the lesson code is the in-game NPC advisor, not a human.

**This blank is load-bearing and I want to be blunt about it.** Section 4 and Section 5 both turn on it: FERPA reaches a vendor *only* through a school, and the state student-privacy statutes bind operators *designed or marketed for school purposes*. Direct-to-consumer, most of §5 is inert. Sold to a community college, most of §5 activates at once and §5.2's pending California bill activates with it. **The most valuable thing the owner can do for this question costs him one sentence and no engineering: write down who the customer is.** Until that sentence exists, half of this note is conditional.

### 2.4 What is already collected, and where it already goes

*Evidence type: read of the infrastructure and schema at the current tip.*

This is the baseline any new decision should be judged against, and it is smaller than one might fear.

- **Directly identifying data: an email address, in Cognito.** That is the whole of it (`calc-readiness-stack.ts:102-116`).
- **Everything else keys on a pseudonymous `student_id uuid`, which is the Cognito `sub`.** `db/migrations/0001_core_contracts.sql:1-7` is explicit: *"`student_id` is the Cognito `sub` (a uuid), supplied by the server."* No name, no school, no age, no address column exists in any migration.
- **What is stored against that id:** per-node `placement_estimate` and `mastery` (`student_node_state`), immutable graded responses including the learner's literal `raw_answer jsonb` (`assessment_item_response`), and an append-only `raw_response_log` carrying `raw_answer`, `hints_used`, `time_on_item_ms` and an optional `misconception_tag`.
- **Where it physically sits:** Aurora Serverless v2 behind the RDS Data API, reached only by one Lambda; a private `siteBucket` for the SPA; CloudFront in front. Region defaults to `us-east-1` (`docs/Deployment.md:74`).

**So AWS is already the processor for every student answer, every identity and every progress record in this product.** That is not a proposal; it is the deployed architecture. Any argument about whether AWS may see a student photograph has to reckon with the fact that AWS already sees the student's identity, their answers and their mistakes.

### 2.5 What happens to a photograph today — **nothing leaves the browser**

*Evidence type: read of the shipped module and of the infrastructure it would need.*

The photo-upload UI **has** shipped (`apps/web/src/work-upload/WorkUpload.tsx`), attached to the `revealed` state of lesson practice. But the storage behind it has not:

- `apps/web/src/work-upload/store.ts:129-131` — `createWorkUploadStore()` returns `new InMemoryWorkUploadStore()` **unconditionally**. There is no environment branch.
- The module docstring says what that means (`store.ts:72-74`): *"Holds the artifact Blob + a `blob:` preview URL in memory for the session; **nothing is persisted and nothing leaves the page**."*
- `PresignedWorkUploadStore` exists but is constructed **only** in its own test file. Grep for it across the tree returns hits in `presigned.ts` (its definition), `index.ts` (the barrel), `store.ts` (two comments), the README, and `workUploadStore.browser.test.tsx`. No production call site.
- There is no uploads bucket: the only `s3.Bucket` in `infra/lib/calc-readiness-stack.ts` is `siteBucket` at `:200`.
- There is no `work_upload` table: `rg -c -i 'work_upload' db/` exits 1 with no matches.

**Practical consequence, and it is a gift.** The retention window, the deletion path, the EXIF strip and the access-control model for student photographs are all still on the drawing board. `validation.ts:4-6` already flags this honestly — the client-side `image/*` and 10 MB checks are *"a friendly first gate, not a security boundary — the real presign Lambda MUST re-check type + size server-side (and strip EXIF/geolocation) before storing."* Nothing has to be unwound. §7 is a design brief, not a remediation.

---

## 3. COPPA — what it requires, and whether it attaches here

### 3.1 The law (quoted)

COPPA is implemented by the FTC's Children's Online Privacy Protection Rule, **16 CFR part 312**. The Rule was substantially amended in 2025: effective **June 23, 2025**, with a general compliance date of **April 22, 2026** — *"Except with respect to Sec. 312.11(d)(1), (d)(4), and (g), regulated entities have until April 22, 2026 to comply"* ([90 FR 16918](https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf)). **That date has passed.** The amended Rule is fully in force today. All quotations below are from the [current eCFR text of 16 CFR 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312), retrieved via the eCFR API at the title's most recent issue date, **2026-08-03**.

**Who it binds** (§ 312.3):

> *"It shall be unlawful for any operator of a website or online service **directed to children**, or any operator that has **actual knowledge** that it is collecting or maintaining personal information from a child, to collect personal information from a child in a manner that violates the regulations prescribed under this part."*

**"Child" means an individual under the age of 13** (§ 312.2). Not 18. Not 16.

**What "directed to children" turns on** (§ 312.2) — a multifactor test the Commission applies to *"subject matter, visual content, use of animated characters or child-oriented activities and incentives, music or other audio content, age of models, presence of child celebrities…"*, and now also *"competent and reliable empirical evidence regarding audience composition and evidence regarding the intended audience, including marketing or promotional materials or plans, representations to consumers or to third parties…"*

**What an operator must do if it is covered** (§ 312.3): post notice (§ 312.4); obtain verifiable parental consent before collection, use or disclosure (§ 312.5); give parents review and deletion rights (§ 312.6); not condition participation on excess collection (§ 312.7); maintain reasonable security (§ 312.8). Two 2025 additions are worth naming because they are the ones that catch people:

- **§ 312.10 retention** — *"Personal information collected online from a child may not be retained indefinitely. At a minimum, the operator must establish, implement, and maintain a **written data retention policy** that sets forth the purposes for which children's personal information is collected, the business need for retaining such information, and a timeframe for deletion."* And that policy must be published in the online notice.
- **§ 312.8(b) security program** — a *"written information security program"* with a named coordinator, at-least-annual risk assessments, testing, and annual review.

Also new in 2025, and directly relevant to photographs: **personal information now expressly includes** *"(8) A photograph, video, or audio file where such file contains a child's image or voice"* and *"(10) A biometric identifier that can be used for the automated or semi-automated recognition of an individual, such as… facial templates; or faceprints"* (§ 312.2).

### 3.2 Does it attach to this product? — **Very likely not, on the repo's own facts**

**My reading, and it is a reading:** COPPA's two triggers are *directed to children* and *actual knowledge*.

- **Directed to children — almost certainly no.** The subject matter is Calculus I prerequisites. The documented intended audience is an incoming STEM freshman and a community-college/adult cohort (§2.1). The 2025 amendments made *"evidence regarding the intended audience, including marketing or promotional materials or plans"* an express factor, and this repo's internal statement of intended audience is unambiguous and repeated. The city-builder game frame is the one fact that cuts the other way — *"use of animated characters or child-oriented activities"* is a listed factor — but `Game_Visual_Design_Brief.md:68` bans *"manipulative free-to-play mechanics"* and the whole visual brief is pitched at an anxious adult, not a child. On balance this reads as a general-audience or adult-directed service.
- **Actual knowledge — no, and structurally so.** The product asks for nothing but an email address (§2.2). It has no mechanism by which it could acquire actual knowledge that a given user is under 13.

**Therefore COPPA's core obligations — verifiable parental consent, direct notice to parents, the parental review-and-delete right — very likely do not attach.** That is the honest reading of the Rule against the documented facts, and it is the single largest correction this note makes to Scope §6's posture.

### 3.3 The service-provider carve-out — the mechanism that makes vendor processing lawful

This matters even in the world where COPPA *does* attach, because it is the exact mechanism Scope §6's "no third-party sharing" rule misunderstands.

COPPA does not prohibit an operator from using vendors. It defines them out of the prohibition. **Two definitions in § 312.2 do the work:**

> ***Disclose*** *or* ***disclosure*** *means, with respect to personal information: (1) The release of personal information collected by an operator from a child in identifiable form for any purpose, **except where an operator provides such information to a person who provides support for the internal operations of the website or online service**…*

> ***Third party*** *means any person who is not: (1) An operator with respect to the collection or maintenance of personal information on the website or online service; or (2) **A person who provides support for the internal operations of the website or online service and who does not use or disclose information protected under this part for any other purpose**.*

And **"support for the internal operations"** is defined to include *"(i) Maintain or analyze the functioning of the website or online service"*, *"(iii) Authenticate users of, or personalize the content on, the website or online service"*, and *"(v) Protect the security or integrity of the user, website, or online service"* — subject to a proviso that the information *"cannot be used or disclosed to contact a specific individual… to amass a profile on a specific individual, or for any other purpose."*

**Read that against the deployed architecture.** AWS already provides support for the internal operations of this service: Cognito authenticates users, Aurora maintains their state, Lambda analyses their answers. Under COPPA's own definitions **AWS is not a "third party" and sending data to AWS is not a "disclosure."** That is not a loophole; it is how every COPPA-covered online service in existence is lawfully built, because none of them run on hardware they own.

The condition attached is real and is the thing to hold AWS to: the vendor must *"not use or disclose information protected under this part for any other purpose."* §6 below explains why AWS's Bedrock terms satisfy exactly that condition, and §6.5 explains how to make it enforceable rather than promised.

Two further COPPA obligations survive and would apply to any vendor arrangement if COPPA attached:

- **§ 312.8(c)** — before releasing children's personal information to a service provider, the operator *"must take reasonable steps to determine that such entities are capable of maintaining the confidentiality, security, and integrity of the information and must obtain **written assurances**."* The AWS Customer Agreement, Service Terms and DPA are those written assurances.
- **§ 312.5(a)(2)** — a parent must be able to consent to collection and use *without* consenting to third-party disclosure, *"unless such disclosure is integral to the website or online service."* This is why the internal-operations characterisation matters rather than being a technicality.

### 3.4 What would change the answer

**Say this to counsel, because it is the version of the question that is actually live:** *"We do not target under-13s and do not collect age. What is our exposure if some sign up anyway?"* My reading of the mechanics:

1. **A single under-13 user does not retroactively make the service child-directed.** The "directed to" test is about the service; the "actual knowledge" test is about the user. But the moment the product *learns* a user is under 13 — a support email from a parent, a self-report in a free-text field, a school telling you — § 312.3's second limb engages for that user.
2. **The mixed-audience route exists and is the standard industry answer.** § 312.2 defines a *"Mixed audience website or online service"* — child-directed under the multifactor test but not primarily targeting children — which may screen with a neutral age question and then, per § 312.2, *"shall not be deemed directed to children with regard to any visitor not identified as under 13."* The Rule requires the screen be *"done in a neutral manner that does not default to a set age or encourage visitors to falsify age information."*
3. **Adding an age question is a decision with a cost.** It creates a place where actual knowledge can arrive, and then you must handle it. Today the product has neither the knowledge nor the obligation. **Industry practice** for a general-audience adult service is either a neutral date-of-birth gate at sign-up with an under-13 block, or a terms-of-service minimum age with no collection. Which is right here is a business judgement informed by counsel, not a technical one.
4. **The FTC has not codified a school-consent pathway.** Worth knowing before anyone assumes one exists. In the 2025 amendments the Commission expressly declined: *"To avoid making amendments to the COPPA Rule that may conflict with potential amendments to DOE's FERPA regulations, the Commission is **not finalizing the proposed amendments to the Rule related to ed tech and the role of schools at this time**. The Commission will continue to enforce COPPA in the ed tech context consistent with its existing guidance"* ([90 FR 16918](https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf)). The operative guidance remains the FTC's [May 2022 Policy Statement on Education Technology and COPPA](https://www.ftc.gov/legal-library/browse/policy-statement-federal-trade-commission-education-technology-childrens-online-privacy-protection), which permits school authorization only for data limited to the educational purpose and controlled by the school, and states that *"ed tech companies are prohibited from using such information for any commercial purpose."* **This only matters if he sells to K-12 schools with under-13 pupils, which is neither the stated audience nor a recorded plan.**

---

## 4. FERPA — what it requires, and why it does not reach this product today

### 4.1 Who FERPA binds

FERPA (20 U.S.C. § 1232g; 34 CFR part 99) binds **educational agencies and institutions that receive federal funding**. It does not bind vendors directly, and it creates no private right of action. A direct-to-consumer product with no institutional customer is simply outside it.

One detail matters for this product's specific audience, and it is the opposite of what most people assume about student privacy: FERPA rights belong to the *parent* only until the student turns 18 **or enrols in a postsecondary institution at any age**, at which point they transfer to the student as an *"eligible student"* ([AWS's own FERPA summary](https://aws.amazon.com/compliance/ferpa/) states this correctly). For an incoming-freshman cohort the rights holder is the **student**, not a parent. If FERPA ever applies here, the access and amendment rights run to the learner.

### 4.2 The school-official exception, and its four conditions

If a school or college *is* the customer, FERPA reaches the vendor through **34 CFR § 99.31(a)(1)(i)(B)**, which lets an institution treat an outside party as a "school official":

> *"A contractor, consultant, volunteer, or other party to whom an agency or institution has outsourced institutional services or functions may be considered a school official under this paragraph provided that the outside party— (1) Performs an institutional service or function for which the agency or institution would otherwise use employees; (2) **Is under the direct control of the agency or institution with respect to the use and maintenance of education records**; and (3) Is subject to the requirements of § 99.33(a) governing the use and redisclosure of personally identifiable information from education records."*

The Department of Education's own vendor guidance adds the fourth, which lives in § 99.31(a)(1)(i)(A): the vendor must meet the criteria in the school's **annual notification of FERPA rights** for being a school official with a legitimate educational interest ([ED, *Responsibilities of Third-Party Service Providers under FERPA*](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf); [ED, *Who is a "school official" under FERPA?*](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa)).

**The two conditions that actually decide vendor cases:**

- **Direct control.** ED's guidance: the school *"may require transparency about how student data obtained or collected under a contract or agreement are used, plans for data security and confidentiality of PII, and evidence that the school or district retains direct control with respect to the use and maintenance of PII at all times."* Practitioner commentary is consistent that this is the condition most ed-tech contracts fail, and that a licence permitting the vendor to improve its own models on the data is not direct control.
- **No redisclosure.** Under § 99.33(a), PII may be used *"only for the purposes for which the disclosure was made"*, and the vendor *"may not re-disclose PII from education records to other parties, unless the provider has specific authorization from the school or district to do so and it is otherwise permitted by FERPA."*

### 4.3 What that means for a model vendor

**My reading:** the school-official exception is not hostile to using a cloud AI service. It is hostile to using one on terms that let the vendor keep, share or learn from the data. A subprocessor arrangement satisfies it when the contract (a) confines processing to the contracted purpose, (b) forbids onward disclosure, (c) forbids use for the vendor's own model training, and (d) provides for deletion on termination — and when the school can see that it does.

Those are exactly the four things §6 evaluates AWS's Bedrock terms against.

**Status here, stated plainly: FERPA does not currently reach this product**, because no educational institution is a customer (§2.3, and the finding there is a blank rather than a denial). If one becomes the customer, the school-official exception is the mechanism, and it is a **contracting** exercise rather than an engineering one.

---

## 5. State student-privacy law — the part people miss

This is where the real teeth are, and where the well-known name is now out of date.

### 5.1 SOPIPA is now KOPIPA, and it is **K-12 only**

California's Student Online Personal Information Protection Act, Cal. Bus. & Prof. Code **§ 22584**, is the model most other states copied. It has been renamed the **K-12 Pupil Online Personal Information Protection Act (KOPIPA)** and its scope is on its face limited to K-12: it binds an *"operator"* with **actual knowledge** that its service *"is used primarily for K-12 school purposes and was designed and marketed for K-12 school purposes"*, and *"'Pupil' means a student enrolled in a K-12 course of instruction."*

It prohibits targeted advertising, amassing a non-educational profile, and selling student data; it requires reasonable security and deletion at a school's request. Its definition of *"covered information"* expressly includes **photographs**. And § 22584(j) carves out general-audience services entirely.

**Two consequences for this product, and they point in opposite directions:**

1. **On the repo's stated audience, KOPIPA does not apply.** Higher education is outside it. The Assembly's own committee analysis of the amending bill says so in as many words: *"Because KOPIPA and ELPIPA only cover the preschool, pre-kindergarten, and K-12 students, online companies in the **higher education technology space** can collect and sell student personal information obtained through student, parent, and teacher use of online sites used for higher education purposes"* ([AB 1159 Assembly committee analysis](https://apcp.assembly.ca.gov/system/files/2026-01/ab-1159-addis-apcp-analysis.pdf)).
2. **The K-12 gap is being closed right now**, which is §5.2.

### 5.2 The live one: California AB 1159, which would create HESIPA — **in committee as of today**

*This is the single most decision-relevant statute in this note and it is not yet law.*

**[AB 1159 (Addis)](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1159)** would enact the **Higher Education Student Information Protection Act (HESIPA)**, new Cal. Bus. & Prof. Code ch. 22.2.6 (§ 22587 et seq.). **Status read 2026-08-05: OPEN, in the Senate Committee on Appropriations, last amended in the Senate on 2026-08-03 — two days ago — with a committee hearing set for 2026-08-10.** It is **not enacted**, and if it is, *"This chapter shall become operative on July 1, 2027."*

Why it matters here more than anything else in §5:

- **It covers exactly this product's stated audience.** *"'Student' means a student enrolled in a higher education institution."*
- **Its trigger is broader than KOPIPA's.** KOPIPA needs a service *"used primarily"* for K-12 purposes and *"designed and marketed"* for them. HESIPA § 22587(a)(11)(A) reads: *"'Operator' means the operator, or an entity working on behalf of the operator, … with actual knowledge that the site, service, or application **is used for** higher educational purposes and **was designed or marketed** for higher educational purposes."* **Used** rather than *used primarily*; **or** rather than *and*. A product that markets itself as calculus-readiness for incoming college students would have a hard time arguing it was not designed for higher-education purposes.
- **Covered information expressly includes photographs**, and *"documents"*, and *"test results"*, and *"grades"*.
- **It would ban training generative AI on that information outright.** § 22587(b)(5): an operator shall not *"Use covered information, including persistent unique identifiers, created or gathered by the operator's site, service, or application **to train a generative artificial intelligence system or service or develop an artificial intelligence system**."* There is no purpose exception to that clause.
- **But it expressly permits subprocessors, on three conditions.** § 22587(b)(4)(E) allows disclosure *"to a service provider, provided the operator contractually (i) prohibits the service provider from using any covered information for any purpose other than providing the contracted service to, or on behalf of, the operator, (ii) prohibits the service provider from disclosing any covered information provided by the operator with subsequent third parties, and (iii) requires the service provider to implement and maintain reasonable security procedures and practices."*
- **And it expressly permits using the data to run and improve your own product.** § 22587(c): *"Subdivision (b) does not prohibit the operator's use of information for maintaining, developing, supporting, improving, or diagnosing the operator's site, service, or application."*
- **It would create a private right of action** for a student *"actually harmed"* by non-compliance.

**My reading of what that means for the Bedrock decision, if HESIPA passes as currently amended:** the three conditions in (b)(4)(E) are a nearly verbatim description of what §6 below shows AWS's Bedrock terms already commit to, so a Bedrock call would sit inside the service-provider exception rather than outside it. The clause that would bite is (b)(5) — but (b)(5) prohibits *training a model on* student data, which is precisely what nobody is proposing and precisely what §6.2 shows AWS contractually excludes for Bedrock. **The bill, if enacted, would make the distinction between *inference on* and *training on* student data legally load-bearing rather than merely good hygiene.** That distinction should therefore be written into whatever posture replaces Scope §6, and it should be enforced technically (§6.5) rather than asserted.

### 5.3 The other states

Roughly **47 states plus DC** have enacted student-privacy legislation since 2014, and **more than 20** have adopted SOPIPA-model statutes binding vendors directly rather than through the school. The two that most often force contract language:

- **New York Education Law § 2-d** and Part 121 of the Commissioner's Regulations require an educational agency's contract with a third-party contractor to carry specific terms: alignment to the **NIST Cybersecurity Framework**, breach notice within **seven days** of discovery, use limited to contract purposes, no redisclosure without consent, and — the clause that reaches Bedrock — a requirement that any **subcontractor be contractually bound to the same data-protection obligations**.
- **Colorado's Student Data Transparency and Security Act (HB 16-1423)** imposes non-negotiable contract terms on "School Service Contract Providers": educational-purpose-only use, no sale, no targeted advertising, no non-educational profiling, secure destruction on termination, and subcontractors held to the same standard.

**The common shape**, which is what to design to rather than memorising fifty statutes: no commercial use, no sale, no targeted advertising, no non-educational profiling, reasonable security, deletion on request or termination, a written agreement with mandated terms, and **subcontractor flow-down**.

**Status here: none of these bind this product today**, because all of them are triggered by a school relationship the repo does not record (§2.3). All of them activate the day one does. The subcontractor flow-down clauses are the ones that would need an answer about Bedrock, and §6 below is that answer.

### 5.4 Two non-student laws that could still reach a photograph

Worth naming because they do **not** depend on the school question, and because photographs are the one artefact that triggers them.

- **Illinois BIPA (740 ILCS 14).** *"Biometric identifier"* means *"a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry"* and **expressly excludes photographs**. But the well-litigated position is that a **face-geometry scan derived from a photograph** is covered. BIPA is the only US biometric statute with a **private right of action** ($1,000 negligent / $5,000 intentional per violation, plus fees), narrowed but not removed by Public Act 103-0769, effective 2024-08-02, which made repeated collection of the same identifier by the same method a single violation. **My reading:** asking a vision model *"what mathematics is written on this page"* is not a face-geometry scan and BIPA very likely does not reach it. But a photograph of a teenager's homework can contain their face, and the distance between "the model reads the maths" and "something in the pipeline detects a face" is a design decision, not a law of nature. This is a question for counsel and a reason to crop, blur or discourage faces at ingest (§7). Texas CUBI and Washington's biometric statute are similar in substance without the private right of action.
- **Comprehensive state privacy law — probably not yet, on size.** CCPA applies to a for-profit doing business in California that meets one of three thresholds: annual gross revenue over **$26,625,000** (the CPI-adjusted figure; the statute still reads $25M), buying/selling/sharing the personal information of **100,000+** California consumers or households, or deriving **50%+** of revenue from selling or sharing personal information ([CPPA CPI adjustment](https://cppa.ca.gov/regulations/cpi_adjustment.html); Cal. Civ. Code § 1798.140(d)(1)). A pre-revenue project clears none of them. The other state comprehensive laws use comparable thresholds. **This is a "not yet" rather than a "no"**, and the 100,000-consumer prong is the one a successful consumer product hits first.

---

## 6. The subprocessor question — the live decision

**The question, precisely: does routing a student photograph through Amazon Bedrock constitute third-party disclosure, when AWS is already the processor for the identity, the answers and the progress records?**

### 6.1 First, the framing error that made this hard

"Third party" is not one concept. Each regime defines it, and they do not agree:

| Regime | Is a processing vendor a "third party"? |
|---|---|
| **COPPA** | **No**, if it provides *"support for the internal operations"* and does not use the data for any other purpose. § 312.2 excludes such a person from both *"disclose"* and *"third party"*. |
| **FERPA** | **Not if** it is designated a school official: performs an institutional function, is under the school's direct control, and does not redisclose. § 99.31(a)(1)(i)(B). |
| **HESIPA (proposed)** | **Disclosure is permitted** to a service provider under three contractual conditions. § 22587(b)(4)(E). |
| **`Photo_Work_Upload_Scope.md` §6** | *"no third-party sharing"* — **undefined**, with no carve-out for processors. |

**Every regime in that table has a processor carve-out. The repo's posture is the only one that does not.** Read literally, Scope §6 forbids Cognito, Aurora, Lambda and S3 — which the product uses. Scope §6 was plainly not meant that way; it was written as shorthand for "do not hand student data to someone who will keep it or learn from it." That is a good instinct and it is roughly what all three regimes actually say. But the shorthand is what Scope §3.5 escalated into a build gate, and shorthand is a poor thing to forbid a feature with.

### 6.2 What AWS's terms actually say — quoted, current as of 2026-08-05

**(a) Bedrock is excluded from the clause that lets AWS train on customer content.** This is the important one and it is rarely cited, because people quote the marketing page instead of the contract. [AWS Service Terms](https://aws.amazon.com/service-terms/) § 50.3:

> *"You agree and instruct that for **Amazon CodeGuru Profiler, Amazon Comprehend, Amazon Lex, Amazon Polly, Amazon Rekognition, Amazon Textract, Amazon Transcribe, Amazon Translate, AWS Transform, AWS FinOps Agent (Preview), Kiro Free Tier, and Kiro individual subscribers**…: (a) we may use and store AI Content that is processed by each of the foregoing AI Services to develop and improve the applicable AI Service… **This Section does not apply to** Amazon Comprehend Medical, Amazon Transcribe Medical, AWS HealthScribe, Amazon Comprehend Detect PII **or any AI Service that is not listed in the first sentence of this Section 50.3**."*

**Amazon Bedrock is not in that list.** The service-improvement and cross-region-storage permission in § 50.3 therefore does not reach it, by the contract's own terms. Note the contrast: Amazon **Textract** and **Rekognition** — the two AWS services one might naively reach for to read an image — *are* on the list. If the goal is "AWS must not learn from student photographs," Bedrock is contractually safer than Textract.

**(b) Output is yours.** § 50.2: *"The output that you generate using AI Services is Your Content."*

**(c) Model providers do not receive content by default.** § 50.12.5: *"We may share information, **that does not include Your Content**, about your use of a third-party model with the provider of that third-party model."*

**(d) Under the [AWS DPA](https://d1.awsstatic.com/legal/aws-dpa/aws-dpa.pdf), AWS is your processor and is confined to your instructions.** § 2: *"AWS will process Customer Data only in accordance with Documented Instructions."* § 3: *"AWS will not access or use, or disclose to any third party, any Customer Data, except… as necessary to maintain or provide the Services, or as necessary to comply with the law or a valid and binding order of a governmental body."* § 6.2 flows the same obligations down to any sub-processor and keeps AWS *"responsible… for any acts or omissions of the Sub-processor."*

**(e) Retention is configurable, and it is now enforceable.** This is new and is the most useful operational fact in the note. Per the [Bedrock data-retention documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html), retention is set by a **mode** at account or project scope:

> *"**none** — Zero data retention. No request or response data is written to durable storage by AWS or shared with the model provider."*

and it can be pinned organisation-wide with a service control policy on the `bedrock:DataRetentionMode` condition key: *"This prevents anyone in the organization from setting data retention to anything other than `none`, ensuring no inference data is ever retained."* If you set `none` and call a model that requires retention, *"Amazon Bedrock will block the request and return an error"* — the model becomes unavailable rather than silently retaining. **Fail-closed, which is the property worth having.**

### 6.3 The sub-processor list, actually checked

*Evidence type: I read the list AWS's DPA points at, on 2026-08-05, and searched it for every Bedrock model provider.*

AWS DPA § 6.1 requires AWS to publish its sub-processors at `https://aws.amazon.com/compliance/sub-processors/` and to *"update the applicable website and provide Customer with a mechanism to obtain notice"* at least 30 days before engaging a new one.

**I searched that page for `Anthropic`, `OpenAI`, `Mistral`, `Cohere`, `Stability`, `AI21`, `Qwen`, `Alibaba`, `DeepSeek`, `Luma`, `Poolside`, `Writer` and `TwelveLabs`. Not one appears.** The page's own §3, *"Third-party service providers"*, is the only section listing unaffiliated companies, and it covers exactly two things: A2P messaging (Twilio, Infobip, Sinch, Vonage, TeleSign, Cequens, Route Mobile, Tanla, and Meta for WhatsApp) and geolocation (Esri, for Amazon Location Service). **Bedrock does not appear in it, and no foundation-model provider does.** The single `Meta` hit on the page is *"Meta Platforms, Inc. — WhatsApp messaging"*, under AWS End User Messaging.

**So the direct answer to the question in the heading: on AWS's own published list, using Bedrock does not add a sub-processor.** The processing stays with the same legal counterparty — Amazon Web Services, Inc. — under the same Customer Agreement, the same Service Terms and the same DPA that already govern the Cognito identities, the Aurora answers and the S3 objects. **That is a materially different fact from "we are sending student data to Anthropic."**

### 6.4 Three claims in circulation that do not survive checking

Stated bluntly, because two of them are in this repo's own documents and one is the reason the posture felt safe.

1. **"Bedrock doesn't store customer input data" — not unconditionally true, and the Service Terms say so.** The [Bedrock security and privacy page](https://aws.amazon.com/bedrock/security-privacy-responsible-ai/) is the source usually quoted; § 50.12.2 of the Service Terms is the contract:
   > *"**Abuse Detection.** For certain models identified on the Bedrock abuse detection page, as part of providing the Service, Amazon Bedrock **stores Service inputs and outputs for up to 30 days** (unless otherwise required by law) solely to detect activity that violates our, or third-party model providers', terms of service or use policies. If we detect a potential violation, you agree and instruct that we may review the Service inputs and outputs to determine if a violation has occurred."*

   The [abuse-detection page](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html) names which models, and the default is good: *"Amazon Bedrock uses a zero operator access (ZOA) data security model… Also, Amazon Bedrock uses a zero data retention (ZDR) data security model. This means that by default, Amazon Bedrock does not store model inputs [or outputs]."* The exceptions as read today: several OpenAI GPT-5.x models retain **classifier-flagged** traffic for up to 30 days; **Claude Fable 5** retains inputs and outputs for up to 30 days and *"you must opt in to sharing retained traffic with Anthropic for abuse detection and **potential human review**."* Also: *"If cross-region inference is enabled for these models, retained inputs and outputs are stored in **destination regions**."*

   **This is a model-selection problem, not a Bedrock problem, and it is a solved one** — §6.5.

2. **"Bedrock inspects image inputs for CSAM, and a human may look."** Not a correction of anyone, but it is nowhere in this repo's notes and it is the fact most specific to *photographs of teenagers*. Service Terms § 50.12.2.1: *"If we detect apparent child sexual abuse material ("CSAM"), you agree and instruct that we may: (a) review the flagged input or output to determine if it is CSAM, and (b) report the incident to the National Center for Missing and Exploited Children or other authority."* The abuse-detection page adds that a flagged image request is **blocked** with a `ValidationException` (HTTP 400). **My reading:** the false-positive risk on a photograph of handwritten algebra is very low, and this is a legitimate and legally required safety mechanism rather than a privacy defect. But it is a genuine content-inspection path that applies **regardless of retention mode**, it can lead to human review and an external report, and the owner should know it exists before deciding, not after.

3. **"A FERPA-relevant BAA is available through AWS Artifact" — this conflates two instruments and I could not verify the underlying claim.** That sentence appears in the OCR feasibility note's §8 (on the open PR #635 branch, not in `integration`). A **BAA** is a Business Associate Addendum, a **HIPAA** instrument; AWS's own [Artifact FAQ](https://aws.amazon.com/artifact/faq/) offers the BAA as its example precisely because it is the HIPAA one. FERPA has no BAA. The [AWS FERPA page](https://aws.amazon.com/compliance/ferpa/) I read on 2026-08-05 mentions **no** agreement, no addendum and no Artifact. Third-party consultancies assert that a FERPA data-processing agreement designating AWS a "school official" exists in Artifact; **I could not confirm that from any AWS source**, because Artifact's agreement catalogue is behind an authenticated console. **Action, and it is a five-minute one:** sign in to AWS Artifact → Agreements → Account agreements, and read what is actually offered. That settles it definitively and costs nothing. Until then, treat the availability of a FERPA-specific AWS agreement as **claimed but unverified**.

### 6.5 The configuration that turns the terms into a guarantee

**My reading, offered as engineering rather than law.** If Bedrock is used, four settings convert §6.2's contractual position into something checkable, and none of them is expensive:

1. **Set `data_retention_mode: none` at the account, and pin it with an SCP** on `bedrock:DataRetentionMode`. Note the default for a new account is `inherit`, which falls through to the *model's* default — **not** to `none`. It has to be set deliberately. With the SCP in place, a model that needs retention becomes unavailable instead of quietly retaining.
2. **Never set `provider_data_share`.** That is the only mode under which content reaches a model provider, and the SCP above forecloses it organisation-wide.
3. **Pin the region.** Use direct in-region invocation, or a **geographic** cross-region inference profile, so that even the abuse-detection exception cannot land data outside the intended geography. Global cross-region routing is the one to avoid.
4. **Log the model id with every call.** The retention exceptions are per-model and the model menu changes; an audit that cannot say which model saw a photograph cannot answer the only question anyone will ask.

**A caution on all four: I verified these against AWS's current documentation, not against a deployed account.** Nobody has run a Bedrock call from this project. Before any of this is relied on, it should be configured and the effective mode read back from the API — which the documentation shows is a single `GET /v1/data_retention`.

---

## 7. Photographs specifically — what changes, independent of who reads them

**This section applies whether the photo is read by Bedrock, by a self-hosted model, or by nobody at all.** §6 above was about *which* processor. This is about the artefact, and it is the part of Scope §6 that is right and under-built rather than over-strict.

A photograph of a student's paper is categorically more sensitive than anything this product stores today (§2.4). Answers are text keyed to a pseudonymous uuid. A photograph is uncontrolled capture: it can contain the student's **face**, their **name** written at the top of the page, a **school or class identifier**, a **home interior**, other **people**, and — in EXIF — a **GPS coordinate** and a **device serial**. Scope §6 names the first three; the EXIF point it names correctly at line 103.

**What the law says about that, where it applies:**

- Under COPPA (if it attached), § 312.2 makes *"a photograph… where such file contains a child's image"* personal information in its own right, and now separately covers *"facial templates; or faceprints"*.
- HESIPA (if enacted) lists **photographs** in covered information at § 22587(a)(3)(C), as KOPIPA already does for K-12.
- BIPA reaches a **face-geometry scan** derived from a photograph, with a private right of action (§5.4).

**What that implies, as design.** These are my recommendations, not legal requirements, and they are cheap because nothing is built yet (§2.5):

1. **Minimise at capture, not after.** Say in the UI what a good photo is: *the paper, not you.* A one-line hint costs nothing and removes most faces from the corpus before they exist. This is the single highest-leverage item here and it is copywriting.
2. **Strip EXIF server-side, before the object is written.** The client validator already flags this as owed (`validation.ts:4-6`); the presign Lambda is where it belongs. Geolocation in a student photograph is the sharpest single fact in the file.
3. **Set a retention window and enforce it in S3 lifecycle, not in a promise.** Scope §6 says *"e.g. term-bounded"* and leaves the owner TBD. COPPA § 312.10 would require a **written, published** retention policy if it attached; HESIPA § 22587(d)(4) would require retention *"only as long as reasonably necessary"*; and it is industry-standard practice regardless. **A number has to be picked.** My suggestion for a feedback-only artefact with no downstream use: 30-90 days, expiring automatically.
4. **Ship deletion with the feature, not after it.** Student-initiated delete removing both the object and the metadata row. Every state student-privacy statute in §5 requires deletion on request; Scope §6 records the owner as TBD; and it is far cheaper to build now than to retrofit.
5. **Treat consent as separate from the account.** The learner agreed to do maths. They did not agree to hand over a photograph of their kitchen table. Scope §6's *"opt-in, never required"* rule is right; the addition worth making is that if an AI parse is ever added, **the model-reading step deserves its own plain-sentence disclosure at the point of upload** — *"we'll use an automated reader to find where your working diverged"* — rather than being folded into a policy nobody reads. This is industry-standard practice and, under HESIPA's transparency direction, likely to become more than that.
6. **Keep the one-way invariant.** Already enforced structurally by `apps/web/src/work-upload/workUploadInvariant.browser.test.tsx`, and worth naming here because it is a privacy property and not only a pedagogy one: an artefact that cannot affect a grade cannot become an education record with consequences. *(The module README calls that guard `workUploadInvariant.test.ts` at `README.md:29`; the file on disk is the `.browser.test.tsx` one. Minor, and not this note's to fix.)*

**One observation that should reduce the anxiety, from the OCR note's §5 and independently true:** v1 already uploads the photograph to this project's own S3 bucket. A Bedrock call does not move the photograph anywhere it was not already going; it hands it to the same processor that is already holding it. **The genuinely new privacy event in this whole roadmap is v1 — storing student photographs at all — and that decision is already made.** v2 is a smaller step than it has been treated as.

---

## 8. What the law forecloses versus what the posture forecloses

The two lists differ, and this section exists because conflating them is what stalled the feature.

### 8.1 What the law forecloses — **on the repo's stated facts, nothing on the table**

| Route | Foreclosed by law? |
|---|---|
| **No AI parse at all** | No. Always lawful. |
| **Self-hosted open-weight model in our own AWS account** | **No.** No regime reached in §§3-5 prohibits processing data you already hold, inside infrastructure you already control. (Its problem is measured accuracy and a licence wall — [PR #635](PR #635), still open — not law.) |
| **Managed model on Amazon Bedrock** | **No.** COPPA very likely does not attach at all (§3.2); if it did, AWS falls inside the internal-operations carve-out (§3.3). FERPA does not reach the product (§4.3). The state student statutes are not triggered without a school customer (§5), and the one that would cover this audience permits service providers on conditions AWS's terms appear to meet (§5.2). |

**Two conditions attach to that third row, and they are conditions rather than prohibitions:** do not let the data be used for model training (contractually excluded for Bedrock by Service Terms § 50.3, and the thing HESIPA § 22587(b)(5) would ban outright), and do not let it be retained or shared with a provider (configurable to `none` and enforceable by SCP, §6.5).

**The honest summary: the law likely permits Bedrock, and `Photo_Work_Upload_Scope.md` §6 is stricter than the law requires.** I would rather say that plainly than hedge it, because the hedge is what has been costing the project a route.

### 8.2 What the self-imposed posture forecloses

| Route | Foreclosed by Scope §6 / Scope §3.5 as written? |
|---|---|
| **No AI parse** | No. |
| **Self-hosted / on-device** | No — Scope §3.5 names it as an approved door (b). |
| **Managed model (Bedrock or otherwise)** | **Yes.** Scope §3.5 states that sending photos to a third-party model *"is third-party sharing of student PII, which the §6 COPPA/FERPA posture forbids"*, and admits only *"an education-compliant provider under a signed DPA with no-retention / no-training terms."* |

**The irony worth naming: AWS Bedrock arguably satisfies Scope §3.5's own door (a) on the merits.** A signed DPA exists (the AWS DPA already governs this account). No-training is contractual for Bedrock (§ 50.3's exclusion). No-retention is configurable and SCP-enforceable (§6.5). The only thing that stops Bedrock qualifying is that Scope §3.5's phrase *"third-party model"* was read as "any model not run by us" rather than "any model run by a party who is not already our processor" — and the difference between those two readings is the whole decision.

### 8.3 So what actually killed the route

Not COPPA. Not FERPA. **A shorthand with no processor carve-out**, written in a paragraph that described itself as unconfirmed, cited fourteen lines earlier as a hard gate, and then copied into `apps/web/src/work-upload/README.md:72-76` where it now reads as settled engineering doctrine. Each step was individually reasonable. The compound is a legal constraint nobody ever asserted.

### 8.4 What changing the posture would take

**Not this note.** Scope §6 is the owner's, and a document written by an agent is not the instrument that changes it. What a defensible revision would look like:

1. **Define "third party" with a processor carve-out**, in the terms all three regimes actually use — a party that uses the data for its own purposes, retains it, or learns from it. AWS under the current Bedrock configuration is not that; a vendor with a "we may use your data to improve our services" clause is.
2. **Replace "no third-party sharing" with the four conditions** that §§3-5 actually converge on: purpose-limited, no onward disclosure, no training, deletion on request. Those are FERPA's school-official conditions, HESIPA § 22587(b)(4)(E)'s three, and COPPA's internal-operations proviso, all saying the same thing.
3. **Record the audience finding** (§2.1) in Scope §6, so the COPPA sentence stops implying an under-13 cohort the product does not have.
4. **Record the customer answer** once it exists (§2.3), because §5 is conditional on it and nobody downstream should have to guess.
5. **Keep Scope §3.5's second gate — accuracy and the one-way invariant — completely untouched.** Nothing in this note bears on it. It is a product-quality gate, it is correct, and [PR #635](PR #635) makes the case that it is the binding one anyway.

---

## 9. What he decides versus what counsel decides

### 9.1 His to decide — no lawyer required

1. **Who the customer is.** Direct-to-family, or sold to institutions. Everything in §5 hinges on it and it is a business decision, not a legal one. **One sentence in the PRD.**
2. **Whether to collect age at sign-up.** A trade, not a compliance requirement: an age gate is the standard way to keep a general-audience service out of COPPA's actual-knowledge limb, and it also creates the channel by which actual knowledge arrives. Today the product has neither (§2.2).
3. **The retention window for photographs.** A number. Nobody else can pick it.
4. **Who owns a deletion request** — still "TBD" at `Photo_Work_Upload_Scope.md:104`.
5. **Whether "no new subprocessor" or "no model provider ever sees a pixel" is the rule** — the fork the OCR note's §10 filed as the highest-value open decision. §6.3 changes what is being chosen between: on AWS's published sub-processor list, Bedrock adds no new counterparty. That does not make the choice for him, but it makes it a much smaller choice than it looked.
6. **Whether to run §6.5's configuration as a prerequisite** to any Bedrock call. Cheap, fail-closed, and it converts a contractual promise into an enforced one.
7. **Whether to publish a privacy policy at all before real users exist.** There is none today (§2.2). Every regime that ever attaches will require one, several state laws require one of any commercial site that collects personal information from their residents, and it is unambiguously industry-standard practice.

### 9.2 Counsel's to decide — do not guess these

1. **Is this service "directed to children" under 16 CFR 312.2?** §3.2 gives my reading and the facts it rests on. A lawyer should confirm it against the marketing as it will actually exist, not as the PRD describes it. **This is the load-bearing one**: if it is wrong, §§3, 7 and 8 all move.
2. **Does the AWS relationship qualify as "support for the internal operations"** under § 312.2, if COPPA ever attaches?
3. **If institutions become the customer: does the AWS arrangement satisfy the school-official conditions in § 99.31(a)(1)(i)(B)**, particularly direct control and no-redisclosure, and what does each institution's own contract require on top?
4. **Does HESIPA (§5.2), if enacted, reach this product** as *"designed or marketed for higher educational purposes"* — and does a Bedrock inference call sit inside § 22587(b)(4)(E)'s service-provider exception rather than outside it? **Track the bill.** Senate Appropriations hearing 2026-08-10; operative 2027-07-01 if enacted.
5. **Does routing a photograph that may contain a face through a vision model implicate BIPA** or its Texas and Washington analogues (§5.4)?
6. **Is a plain-language, non-lawyer privacy policy adequate**, and what must it say, given whichever audience and customer answers land from §9.1?
7. **Reading the AWS paper.** Counsel should read the AWS Customer Agreement, Service Terms § 50, the DPA and whatever AWS Artifact actually offers (§6.4, item 3) and say whether they meet the conditions above. §6 of this note assembles the quotations so that review starts from primary sources instead of from a marketing page.

### 9.3 The order to do it in

**None of §9.2 blocks §9.1.** Writing down the customer, picking a retention number, naming a deletion owner, drafting a privacy policy and configuring §6.5's SCP are all available today and all of them are inputs counsel will ask for. Going to a lawyer with "who are our users, who is our customer, what do we store, for how long, and who processes it" answered is a different and much cheaper conversation than going with the question open.

---

## 10. What I could not establish

Stated as explicitly as `.cursor/rules/qa-verification.mdc` requires, because several of these would change conclusions above.

1. **Who the customer is (§2.3).** Not recorded anywhere in the repo. **Not a finding of "direct-to-consumer" — a finding of silence.** §§4 and 5 are conditional on it.
2. **Whether AWS Artifact offers a FERPA-specific agreement (§6.4, item 3).** The catalogue is behind an authenticated console I cannot reach. **Claimed but unverified.** Gabe can settle it in five minutes.
3. **I did not make a single Bedrock API call.** Every claim in §6.2 and §6.5 is read from AWS's published contract and documentation on 2026-08-05, not observed on a deployed account. The retention mode has not been set, the SCP has not been written, and no effective mode has been read back.
4. **I am not a lawyer and this is not a legal opinion.** §3.2's conclusion that COPPA very likely does not attach is my reading of the Rule's text against measured repo facts. It is exactly the kind of conclusion that should be confirmed rather than relied on.
5. **AB 1159's final text is not knowable.** It was amended in the Senate on 2026-08-03 and sits in Appropriations. §5.2 quotes the 08/03/26 version. Bills change in Appropriations, and the AI-training clause is the sort of provision that moves.
6. **I checked California, New York, Colorado and the general shape of the SOPIPA-model statutes. I did not read all ~47 states.** If institutional sales happen, that survey is a real piece of work and it belongs to counsel.
7. **The 85% page-level misread figure is not in `integration`.** It comes from `docs/Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4, which exists only on the branch of **[PR #635](PR #635)**. Read at 2026-08-05: `state: OPEN`, **`mergedAt: null`**. I read that document in full on its branch and §8 relies on its route framing, but it is not yet a fact about this repository, and its own §2.4 caveats that 85.43% describes a *general* open 8B VLM on university circuit-analysis homework, not a fine-tuned recogniser on pre-calculus.
8. **I did not verify that a photograph of handwritten algebra never trips Bedrock's CSAM classifier.** §6.4 item 2 reports the mechanism from AWS's documentation and my expectation that false positives are very rare. That expectation is untested.
9. **No consent or notice copy is drafted here.** §7's item 5 says a disclosure is owed; writing it is separate work and should be reviewed.

---

## 11. Sources

Separated by kind, as the brief asked. Everything read **2026-08-05**.

**Primary law — statutes and regulations (quoted verbatim above):**
[16 CFR part 312 — COPPA Rule, current eCFR text](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312) (retrieved via the [eCFR API](https://www.ecfr.gov/api/versioner/v1/full/2026-08-03/title-16.xml?chapter=I&subchapter=C&part=312) at the title's most recent issue date, 2026-08-03) ·
[90 FR 16918 — FTC, *Children's Online Privacy Protection Rule*, final rule amendments, 2025-04-22](https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf) ([HTML](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm)) ·
[34 CFR § 99.31 — FERPA, conditions for disclosure without consent](https://www.law.cornell.edu/cfr/text/34/99.31) ·
[Cal. Bus. & Prof. Code § 22584 — KOPIPA (formerly SOPIPA)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22584) ·
[740 ILCS 14 — Illinois Biometric Information Privacy Act](https://law.justia.com/codes/illinois/chapter-740/act-740-ilcs-14/) ·
[Cal. Civ. Code § 1798.140 — CCPA definitions](https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf) and the [CPPA CPI threshold adjustment](https://cppa.ca.gov/regulations/cpi_adjustment.html)

**Pending legislation (not law; status read 2026-08-05):**
[CA AB 1159 (Addis) — bill text, as amended in Senate 2026-08-03](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1159) ·
[AB 1159 — bill status: Senate Appropriations, hearing 2026-08-10](https://leginfo.legislature.ca.gov/faces/billStatusClient.xhtml?bill_id=202520260AB1159) ·
[Assembly committee analysis](https://apcp.assembly.ca.gov/system/files/2026-01/ab-1159-addis-apcp-analysis.pdf)

**Regulator guidance (agency interpretation, not statute):**
[US Dept. of Education, *Responsibilities of Third-Party Service Providers under FERPA*](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf) ·
[US Dept. of Education, *Who is a "school official" under FERPA?*](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa) ·
[FTC, *Policy Statement on Education Technology and COPPA* (2022-05-19)](https://www.ftc.gov/legal-library/browse/policy-statement-federal-trade-commission-education-technology-childrens-online-privacy-protection)

**Vendor contract and documentation (AWS's own words — vendor claims, quoted as such):**
[AWS Service Terms](https://aws.amazon.com/service-terms/) (§ 50.2, § 50.3, § 50.4, § 50.5, § 50.12.2, § 50.12.2.1, § 50.12.5) ·
[AWS Data Processing Addendum](https://d1.awsstatic.com/legal/aws-dpa/aws-dpa.pdf) (§§ 1-3, 6) ·
[AWS Sub-processors list](https://aws.amazon.com/compliance/sub-processors/) ·
[Amazon Bedrock — data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html) ·
[Amazon Bedrock — abuse detection](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html) ·
[Amazon Bedrock — security, privacy and responsible AI](https://aws.amazon.com/bedrock/security-privacy-responsible-ai/) ·
[Amazon Bedrock FAQs](https://aws.amazon.com/bedrock/faqs/) ·
[AWS and FERPA](https://aws.amazon.com/compliance/ferpa/) ·
[AWS Artifact FAQ](https://aws.amazon.com/artifact/faq/) ·
[AWS Security Blog — enforcing zero data retention on Bedrock with SCPs](https://aws.amazon.com/blogs/security/enforce-zero-data-retention-on-amazon-bedrock-with-bedrock-projects-and-service-control-policies/) ·
[AWS — securing Bedrock cross-region inference](https://aws.amazon.com/blogs/machine-learning/securing-amazon-bedrock-cross-region-inference-geographic-and-global/)

**Secondary commentary (used for orientation and for the multi-state survey; every legal proposition above is sourced to primary law, not to these):**
[Mayer Brown on the 2025 COPPA amendments](https://www.mayerbrown.com/en/insights/publications/2025/04/ftc-announces-significant-amendments-to-coppa) ·
[Perkins Coie on the 2025 COPPA amendments](https://perkinscoie.com/insights/update/ftc-announces-new-childrens-privacy-requirements-updated-coppa-rule) ·
[Troutman Pepper Locke on the FERPA school-official regulations](https://www.troutman.com/insights/student-privacy-concerns-when-educational-institutions-outsource-the-ferpa-school-official-regulations/) ·
[Promise Legal, EdTech student data privacy: FERPA, COPPA and state laws](https://blog.promise.legal/startup-central/edtech-student-data-privacy-compliance/) (source of the ~47-states and 20+-SOPIPA-model figures) ·
[NY Education Law § 2-d and Part 121 third-party contract toolkit](https://riconedpss.org/documents/Third-Party_Contracts-Toolkit.pdf) ·
[Colorado HB 16-1423 vendor obligations](https://www.cybernut.com/blog/colorado-privacy-act-k12-guide) ·
[Davis Wright Tremaine on the 2024 BIPA damages amendment](https://www.dwt.com/blogs/privacy--security-law-blog/2024/08/illinois-bipa-biometrics-law-amended-for-damages)

**Repo, measured at `47ae7aa1` on 2026-08-05:**
`docs/PRD_Full.md` · `docs/One_Pager.md` · `docs/Game_Visual_Design_Brief.md` · `docs/BrainLift_Game_Design.md` · `docs/MVP_Definition.md` · `docs/Architecture.md` · `docs/Deployment.md` · `docs/Photo_Work_Upload_Scope.md` · `infra/lib/calc-readiness-stack.ts` · `apps/web/src/auth/AuthGate.tsx` · `apps/web/src/work-upload/{store,validation,presigned}.ts` + `README.md` · `db/migrations/0001_core_contracts.sql`

**Read on a branch, NOT in `integration`:** `docs/Photo_Work_Upload_v2_OCR_Feasibility.md` at [PR #635](PR #635), head `e465be48`, which reads `OPEN` / `mergedAt: null` as of 2026-08-05.
