# Photo-of-Work v2 — On-Device / Self-Hosted Math OCR: Feasibility & Recommendation (v0.1)

> **Status: RESEARCH + RECOMMENDATION. Not a build commitment. No application code was changed to write this** — the only repo edit that accompanies it is a dated pointer appended to `docs/Photo_Work_Upload_Scope.md` §3.5. Every repo measurement below was taken on `integration` at `684a7a9f` by a scratch probe over the real item-bank pools, deleted afterwards; the tree is clean. Every external number is attributed inline and listed in §12, and §11 separates what was measured from what was read and what could not be established.
>
> **This note answers §3.5's second gate — "self-hosted / on-device OCR that keeps images inside our trust boundary" — and does not disturb the first.** Nothing in §3.5 is contradicted here. What is added is the price of taking that branch.
>
> **Bottom line: no. Convenient on-device handwritten-math OCR does not exist in 2026, and the version that does exist is not convenient.** In-browser is ruled out on evidence, not on caution (§3). Self-hosting inside AWS is buildable and cheap, and accuracy is what it cannot buy: on the only published benchmark of real student pages, the one *open-weight* model evaluated misreads something on **85%** of them, against 38% for the best frontier model behind an API (§2.4). **But the product goal is not transcription — it is localizing the divergent step, and this repo already knows every step of the canonical solution for 2,230 of 2,230 practice items.** That reframing (§6) gets most of the value for none of the model, and it is the recommendation.
>
> **§13 was appended 2026-08-05 after two owner rulings, and it supersedes part of what is above.** Mathpix is out (so §4.5 is closed and §11's hole 2 is retired unanswered), Phase 0 is approved, and the live question is now the *verification* framing §9 filed as Phase 1. **§13.2 invalidates §4.1's B1 recommendation on a ground §§0-12 never checked: CoMER, TAMER, PosFormer and ICAL ship with no licence file at all, and §2.2's 72.66% headline belongs to a fine-tune of a non-commercial base.** The clean options, the verification arithmetic, a trap the verification framing creates, and a one-afternoon measurement that can close the question are in §§13.3-13.5.

---

## 0. The question

Verbatim, from the owner, on the §3.5 v2 AI-parse roadmap:

> "this makes sense; should be on-device for sure. is there a way to conveniently wire that in?"

The instinct is right and this note does not argue against it. The §6 privacy posture forbids third-party PII sharing, and keeping the image inside the trust boundary is the clean way to clear that gate. What this note establishes is that **"on-device" and "conveniently" cannot both be had**, that the gap is an accuracy gap and not an engineering gap, and that there is a third framing that is cheaper than either and probably better than both.

---

## 1. Bottom line, in four sentences

1. **In-browser (Option A) is not viable.** The one small handwritten-math model that runs in a browser today takes *pen strokes*, not photographs, and is out of distribution for a phone camera on four separate axes (§3.1). Nothing photo-input exists in the browser-model ecosystem at all.
2. **Self-hosted in AWS (Option B) is viable and unexpectedly cheap, and its accuracy is the problem.** The specialist models are ~6-8 M parameters and run on CPU in the existing Lambda footprint for $0/month at pilot volume (§4.2). The best *self-hostable* model reaches ~72.7% exact-match on cropped single expressions photographed by phone — and a student's paper is not a cropped single expression (§2).
3. **The narrower framing wins.** The system already computes the full canonical solution path for every practice item, and the "give up" screen that carries the upload button is the *same screen* that already renders those steps as numbered cards. Asking the student which step stopped matching produces the exact signal §1 wants, with no model, no image leaving anywhere, and no accuracy question (§6).
4. **"Wrong and provisional" helps materially, and it is measured rather than hoped.** On the only published benchmark of real student handwritten work, the best frontier model misreads something in 37.62% of solutions but only 7.60% of those misreads change the downstream judgement (§7). A feedback-only surface really can tolerate what a grader could not — but that is an argument for a *narrow* parse, not for a wide one.

---

## 2. What the benchmarks measure, and why the numbers are worse than they look

Everything published in this field is scored by **ExpRate** — the percentage of images whose predicted LaTeX matches the ground truth *exactly*. That metric is the reason the numbers below are all in the 50s-70s and the reason they cannot be read naively. Three things have to be held in mind at once.

**The metric punishes style.** `x^2` and `x^{2}` render identically and score as a miss. The field's answer is **CDM / ExpRate@CDM**, which renders both strings and compares them visually ([CDM, arXiv 2409.03643](https://arxiv.org/html/2409.03643v1)); it is consistently 3-8 points more generous. Where a source reports both, both are given below.

**The benchmarks get harder in three distinct tiers, and almost nobody reports the third.** This is the single most important thing in this note:

| Tier | What the image is | Benchmark |
|---|---|---|
| 1 | Pen strokes **rendered** to a clean binary bitmap. One expression. No camera. | CROHME 2014/2016/2019 |
| 2 | A **phone photo** of one expression, cropped. Real blur, ink, paper, lighting. | HME100K (99,109 images, "mainly captured by cameras") |
| 2b | A phone photo of a **multi-line** expression. | M²E (79,979 train / 9,985 test) |
| 3 | A photo of a **whole page of a real student's multi-step working.** | EDU-CIRCUIT-HW; CHECK-MAT |

**Our input is tier 3.** `docs/Photo_Work_Upload_Scope.md` §1 is explicit that the value is in "the worked steps," and the README's attach point is the gave-up state where a student has a page of attempts on paper. Tier-1 and tier-2 numbers are the ones the field quotes, and they are upper bounds on ours.

### 2.1 Tier 1 — CROHME (rendered strokes, single line, clean)

ExpRate %, CROHME 2014 / 2016 / 2019 and their average. Specialist rows are from each model's own paper; the VLM rows and the CDM column are from [Uni-MuMER Table 1](https://openreview.net/pdf?id=oHbVboLXz6).

| Model | Params | 2014 | 2016 | 2019 | **Avg** | Avg @CDM |
|---|---|---|---|---|---|---|
| CoMER (ECCV 2022), scale-aug | 6.39 M | 59.33 | 59.81 | 62.97 | **60.70** | – |
| TAMER | 8.23 M | 61.36 | 59.54 | 60.13 | **60.34** | 63.23 |
| PosFormer, scale-aug | 6.4 M | 62.74 | 61.03 | 64.97 | **62.91** | 66.85 |
| SSAN, scale-aug | – | 62.58 | 62.51 | 65.30 | **63.43** | – |
| Qwen2.5-VL-3B, zero-shot | 3.4 B | 38.64 | 37.75 | 37.45 | **37.95** | 43.46 |
| Qwen2.5-VL-7B, zero-shot | 8.3 B | 55.98 | 50.92 | 49.62 | **52.17** | 59.46 |
| Qwen2.5-VL-72B, zero-shot | 72 B | 59.74 | 54.32 | 55.13 | **56.40** | 62.99 |
| GPT-4o, zero-shot | – | 50.61 | 46.03 | 49.79 | **48.81** | 56.21 |
| Gemini 2.5 Flash, zero-shot | – | 58.01 | 52.74 | 55.21 | **55.32** | 65.57 |
| **Uni-MuMER†** (fine-tuned Qwen2.5-VL-3B) | 3.4 B | 82.05 | 77.94 | 79.23 | **79.74** | 82.86 |

Two readings matter. **A 6.4 M-parameter specialist beats a 72 B general VLM zero-shot**, which is why §4 does not assume a GPU is needed. And **fine-tuning on in-domain data is worth ~42 points** over the same 3 B backbone zero-shot — the whole game is training data, not model size.

### 2.2 Tier 2 — HME100K (real camera photos, one cropped expression)

ExpRate %, from [Uni-MuMER Table 2](https://openreview.net/pdf?id=oHbVboLXz6) except where noted.

| Model | ExpRate | @CDM |
|---|---|---|
| GPT-4o | **22.96** | 27.02 |
| Gemini 2.5 Flash | **28.14** | 34.32 |
| Doubao-1.5-pro | 43.90 | 55.08 |
| Qwen2.5-VL-3B | 44.42 | 47.41 |
| Qwen2.5-VL-7B | 54.57 | 58.84 |
| Qwen2.5-VL-72B | 49.59 | 55.09 |
| CoMER (6.39 M) | 68.12 | 70.36 |
| ICAL | 69.06 ([ICAL paper](https://arxiv.org/html/2405.09032)) | – |
| TAMER w/ fusion (8.23 M) | 69.50 | 71.30 |
| **Uni-MuMER†** (3.4 B) | **72.66** | 74.30 |

**72.66% is the ceiling of the self-hostable state of the art on a photograph of one cropped expression.** More than one image in four is read wrong, on the easiest realistic framing of the problem, by an open Apache-2.0 model you can download today.

Three caveats, two of which cut against optimism:

- **HME100K is Chinese K-12 content** collected by TAL Education via an internet app ([dataset page](https://ai.100tal.com/dataset)); Uni-MuMER's evaluation excludes test instances containing CJK characters. It is not a US pre-calculus cohort.
- **The specialists' 68-69% is in-domain**: CoMER and TAMER were trained on HME100K's own 74,502 training images. We have zero images from our cohort.
- **The frontier VLMs' 23-28% is the one number here that is unfairly low, and it should not be read as "GPT-4o cannot read handwriting."** ExpRate demands an exact string match against a ground truth annotated in one particular LaTeX dialect, and a general model writes LaTeX in its own. Their @CDM (27-34%) relaxes that only partly, because CDM still compares rendered *formulas* rather than meanings. §2.4's tier-3 benchmark judges semantically and puts the same class of model far higher — which is why the two sections' numbers must not be compared to each other, and why §2.4's are the ones to plan against.

### 2.3 Tier 2b — M²E (multi-line)

PosFormer, the best reported, reaches **58.33% ExpRate** on M²E against 62.91% on single-line CROHME ([PosFormer §4.4](https://arxiv.org/pdf/2407.07764)). So going from one line to several costs ~4.6 points on a benchmark that is still one *expression*, cropped, in a controlled corpus. Our input is several *steps*, uncropped, on a whole page.

### 2.4 Tier 3 — real student pages, and the numbers that actually bound this

**[EDU-CIRCUIT-HW](https://arxiv.org/abs/2602.00095) (Feb 2026)** is the closest published proxy for our actual input: 1,334 authentic handwritten homework solutions from 29 students in an undergraduate course at a US public research university, with expert-verified verbatim transcriptions. Recognition is judged *semantically* (an LLM judge validated against expert annotation at F1 0.914), so LaTeX-style differences are not counted as errors — which makes these numbers directly comparable to "did we read what the student wrote," and **not** comparable to the ExpRate tables above.

| Visual recognizer | **SER** — % of solutions with ≥1 recognition error | AEC — mean errors per solution | EIR — Error Impact Rate on grading |
|---|---|---|---|
| Gemini-3-Pro-Preview | **37.62** | 0.61 | 7.60 |
| Gemini-2.5-Pro | 53.52 | 1.23 | 14.72 |
| Qwen3-VL-Plus | 61.72 | 1.38 | 16.67 |
| GPT-5.1 | 71.54 | 2.05 | 17.89 |
| Claude-4.5-Sonnet | 80.70 | 2.76 | 18.05 |
| **Qwen3-VL-8B-Thinking** (the only open-weight row) | **85.43** | 2.79 | 19.60 |

**The best model available anywhere misreads something on 37.62% of real student pages. The one open-weight model in the table — the only row you could actually self-host — misreads something on 85.43%.** That 48-point gap between "call an API" and "run it yourself" is the price of the owner's constraint, stated as plainly as the evidence allows. Note what the table does *not* contain: a fine-tuned HMER specialist. Nobody has run one on this benchmark, so 85.43% bounds a general open VLM and not §4's B1 or B2.

The domain is university circuit analysis, which carries hand-drawn schematics and dense prose our pre-calculus pages will not — so read the absolute numbers as directional and the *ordering* as the finding. Nobody has published the equivalent for US algebra homework, and §11 records that as a hole.

**[CHECK-MAT](https://aclanthology.org/2025.mathnlp-main.6/)** is the second data point, on the adjacent task of *judging* 122 scanned multi-step handwritten solutions from the Russian national exam against a rubric: best model o4-mini at **56.56%** grading accuracy, Qwen2.5-VL-32B at **30.33%**, with the authors concluding performance "remains significantly below the level required for reliable use, especially in understanding the logical steps of human reasoning."

### 2.5 The domain-transfer tax, measured

Three separate measurements say the same thing: these models do not transfer to a domain they were not trained on.

| Measurement | With in-domain data | Without | Source |
|---|---|---|---|
| Uni-MuMER† on HME100K (ExpRate@CDM) | 74.30 | **52.38** | [Uni-MuMER Table 5](https://openreview.net/pdf?id=oHbVboLXz6) |
| CoMER† on CROHME-Avg (ExpRate@CDM) | 52.29 | **45.99** | same |
| UniMERNet on handwritten expressions (BLEU) | 0.895 | **0.087** | [UniMERNet Table 2](https://arxiv.org/html/2404.15254v1) |

The third row is the one to remember. A model trained only on the **pix2tex** corpus — printed formulas scraped from arXiv — scores BLEU **0.926 on simple printed expressions and 0.087 on handwritten ones**. Adding handwritten training data takes handwriting from 0.087 to 0.895. **Printed-math OCR and handwritten-math OCR are not the same task and the weights do not transfer.**

---

## 3. Option A — in-browser, image never leaves the device

The privacy story is unimprovable: no upload, so most of §6 evaporates. The evidence says it cannot be had.

### 3.1 The one thing that exists takes strokes, not photos

[`vue-math-handwrite`](https://github.com/cskwork/vue-math-handwrite) is a genuine, working, in-browser handwritten-math recognizer: **CoMER quantized to INT8 as a 3.4 MB encoder + 4.0 MB decoder, 7.2 MB total**, ONNX Runtime Web with a WASM/WebGPU switch, IndexedDB caching so the download happens once. On paper that is exactly what "conveniently wire that in" would look like.

It is not usable here, for a reason that no amount of engineering fixes. Its input is `Stroke[]` — pointer and touch events captured on a `<canvas>`. Its preprocessing renders those strokes "following CROHME training conventions (**white strokes on black background**, top-left aligned)," scales to 256 px height, and emits a grayscale tensor. A photograph of paper differs from that on four axes at once: **polarity** (dark ink on light paper vs white on black), **capture** (lens blur, perspective, shadow, JPEG artefacts vs vector-rendered curves), **background** (ruled lines, margins, eraser marks vs pure black), and **scope** (a whole page of stacked steps vs one centred expression). §2.5 measures what happens when this kind of model meets an out-of-distribution image, and the answer is a 6-22 point drop *between benchmarks that are both handwriting*.

Practically it is also a single-author repository with 0 stars and one contributor. It is a credible proof of concept and not a dependency.

**This is also, unavoidably, on-screen ink** — the capture method `docs/Photo_Work_Upload_Scope.md` §3 explicitly recommends against as a primary path, for three reasons that all still hold ("writing math with a mouse is bad… this app is desktop-heavy"). Adopting it would reverse a decision this note has no evidence to reverse.

### 3.2 Tesseract.js is inadequate, and the maintainers say so

Named in the brief, so answered directly. From the Tesseract project's own tracker: *"Tesseract cannot read display formulas, its fundamental model is only linear"* and *"Don't expect math recognition in Tesseract to get improved in the foreseeable future"* ([tesseract#4092](https://github.com/tesseract-ocr/tesseract/issues/4092), [mailing list](https://groups.google.com/g/tesseract-ocr/c/rcsvxsxdjNY)). On a report of failure to read simple typeset equations a maintainer replies *"tesseract is not suitable for this kind of input text… No training will not help you"* ([tesseract#3028](https://github.com/tesseract-ocr/tesseract/issues/3028)). The architectural reason is that Tesseract emits a linear stream of text lines and has no representation for the two-dimensional relationships — numerator over denominator, base and superscript, radicand under a vinculum — that *are* the mathematics.

Tesseract.js is not, however, useless here: it is a plausible component of the narrow digit-reading job in §6.5, where there is no 2-D structure to lose. That is a different task with a different name.

### 3.3 pix2tex / LaTeX-OCR is a printed-formula model

Also named in the brief. Its own README lists *"support handwritten formulae"* as an **unchecked TODO** ([LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR)), and §2.5 gives the measurement: BLEU 0.087 on handwriting against 0.926 on simple printed. Out.

### 3.4 TrOCR reads handwritten *text*, which is a different problem

`Xenova/trocr-small-handwritten` runs in transformers.js today and is the model the maintainers point people at for handwriting ([transformers.js#452](https://github.com/xenova/transformers.js/issues/452)). It is a text model: it emits a string, with no fraction bars, no exponents and no 2-D layout. The nearest browser-runnable *document* model is `onnx-community/granite-docling-258M-ONNX`, with a public WebGPU demo — a printed-document converter whose behaviour on handwritten math is **unverified here** (§11).

**Searching the transformers.js / ONNX-Runtime-Web ecosystem turns up no photo-input handwritten-math model at all.** That is the finding for Option A: not "the available model is weak," but "there is no available model."

### 3.5 Could the good model be shipped to the browser instead?

The self-hostable state of the art is Uni-MuMER, a family of fine-tunes released under **Apache-2.0** and downloadable from Hugging Face, now spanning Qwen2.5-VL-3B (3.4 B), Qwen3-VL-2B (2.1 B), Qwen3.5-2B (2.2 B) and larger ([model zoo](https://github.com/BFlameSwift/Uni-MuMER)). The smallest is 2.1 B parameters.

At `q4` that is roughly 1.2-1.5 GB of weights to **download on first use** and to hold resident. Mobile Safari's practical per-page ceiling is widely reported around 2 GB and is not documented by Apple; transformers.js has a live history of iOS crashes from exactly this pressure, with the maintainers' own mitigation being *"set `numThreads = 1`"* and, for one class of failure, "wait for iOS 18.4" ([transformers.js#1242](https://github.com/huggingface/transformers.js/issues/1242), [emscripten#19374](https://github.com/emscripten-core/emscripten/issues/19374)). Asking a student on a phone to download 1.4 GB before they can see what we read of their homework is not a product.

### 3.6 The phone-browser platform question is, at last, mostly answered

Worth recording because it is the part that *has* improved and it changes nothing. **WebGPU is enabled by default on iOS 26, iPadOS 26, macOS Tahoe and visionOS 26** ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/); [gpuweb implementation status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)), and transformers.js shipped the corresponding detection in [PR #1700, merged 2026-06-08](https://github.com/huggingface/transformers.js/pull/1700). Chrome has had it on Android and desktop since 113. So the platform is no longer the blocker; the model is.

Two integration costs would still land on this repo if Option A were pursued:

- **Multi-threaded WASM needs `SharedArrayBuffer`, which needs COOP/COEP headers**, which put the whole SPA into cross-origin isolation. That is a CloudFront response-headers-policy change affecting every cross-origin asset the app loads — and `Native_Math_Input_Scope.md` §6.3 measures 6.4 MB of `.glb` models and 27 font files in the current build. Without those headers the runtime is single-threaded, which the library's own docs put at 2-4x slower.
- **A model download is a bundle-budget event.** 7.2 MB cached in IndexedDB is defensible against the 927 KB gzipped JS the app ships today; 1.4 GB is not.

### 3.7 Verdict on A

**Not viable, and not close.** There is no photo-input handwritten-math model that runs in a browser; the stroke-input one that exists solves a problem §3 of the scope doc already declined; and the model that would work is a ~200x larger download than the one that fits. Revisit if and only if a photo-input HMER model under ~50 MB appears with published tier-2 numbers.

---

## 4. Option B — self-hosted inside the AWS trust boundary

Image leaves the device, stays in the account. This is buildable. Two very different builds sit behind the same sentence.

### 4.1 The two tiers, and the surprising one

| | **B1 — specialist** | **B2 — fine-tuned VLM** |
|---|---|---|
| Model | CoMER / TAMER / PosFormer class | Uni-MuMER (Qwen3-VL-2B … Qwen2.5-VL-7B) |
| Parameters | **6.4-8.2 M** | 2.1-8.3 B |
| Artefact size | ~7 MB INT8 ONNX (proven: the browser build) | 4.3-16 GB bf16 |
| Compute | **CPU. No GPU.** 18.81 GFLOPs/image | GPU |
| HME100K ExpRate | 68.1-69.5 | **72.7** |
| Robustness off-domain | poor (§2.5) | better (§2.5) |
| Licence | research code, MIT/Apache per repo | Apache-2.0 |

**The headline: B2 buys 3.2 ExpRate points over B1 for ~400x the parameters** (Uni-MuMER† at 3.4 B scores 72.66; TAMER at 8.23 M scores 69.50, on the same HME100K test set). That comparison flatters B1 — those 69.5 points are in-domain, trained on HME100K's own training split, whereas §2.5's leave-one-out shows the VLM degrading far more gracefully off-domain. But it does mean the honest B1 pitch is real: *most* of the available accuracy is reachable on CPU, in the compute footprint this repo already pays for.

For scale on B1's cost: CoMER is 6.39 M parameters and 18.81 GFLOPs, running 11.13 FPS at 64x256 on a single 2080Ti; TAMER is 8.23 M / 19.79 GFLOPs / 6.75 FPS ([TAMER Table 4](https://arxiv.org/html/2408.08578)). Those are small enough that CPU inference is a question of seconds, not of feasibility.

### 4.2 The hosting menu, priced

All rates are AWS-published us-east-1 list prices read **2026-08-05**, except the EC2 rows, which come from third-party aggregators and should be re-checked against AWS's own page before anyone commits.

| Host | Fits B1? | Fits B2? | Rate | Cold start |
|---|---|---|---|---|
| **Lambda container, 10,240 MB / 6 vCPU** | **yes** | no (CPU-only; 10 GB memory and 15 min ceiling) | $0.0000166667 /GB-s x86, $0.0000133334 arm64, $0.20/M req; **400,000 GB-s + 1 M req free every month, permanently** | seconds |
| **SageMaker Serverless Inference** | yes | no — **GPUs are an explicit feature exclusion**, 6 GB RAM / 5 GB disk cap | $0.00004/s at the metered size | seconds |
| **SageMaker async, scale-to-zero** | overkill | **yes** | ml.g4dn.xlarge **$0.7364/hr** (AWS's own pricing example) | **P50 216-381 s** measured by AWS pre-caching, 134-216 s after; one customer reports up to 20 min with a large image |
| **EC2 GPU, always on** | overkill | yes | g6.xlarge $0.8048/hr on-demand = **$587.50/mo**; spot from ~$0.4467/hr. g5.xlarge $1.0060/hr | n/a |

Sources: [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [SageMaker Serverless docs](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html), [SageMaker async autoscaling](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html), [SageMaker pricing](https://aws.amazon.com/sagemaker/ai/pricing/), [container caching benchmarks](https://aws.amazon.com/blogs/machine-learning/introducing-container-caching-in-amazon-sagemaker-ai-for-faster-model-scaling/), [re:Post cold-start report](https://repost.aws/questions/QUDboilwqLQpOELFQZs5kOBg/reduce-cold-start-times-of-async-sagemaker-endpoints-huggingface-tgi-image), [Vantage](https://instances.vantage.sh/aws/ec2/g6.xlarge), [DoiT](https://www.doit.com/compute/spot/us-east-1/g6.xlarge).

Two AWS facts are load-bearing and worth stating flatly. **Lambda has no GPU** and never has ([AWS's own compute blog](https://aws.amazon.com/blogs/compute/deploying-ai-models-for-inference-with-aws-lambda-using-zip-packaging/) says so and redirects GPU workloads elsewhere), and **SageMaker Serverless has no GPU either** — it is listed among the unsupported features alongside VPC config and network isolation. So the cheap serverless paths are B1-only by construction, and B2 forces a GPU instance and its cold start.

### 4.3 What it actually costs

**No usage figure exists anywhere in the repo**, so these are three assumed volumes, not forecasts. Uploads/day → cost/month. A "page" is one photo; B1 is modelled at 4 s of 10 GB Lambda (40 GB-s) per page, which is a **MODELLED** figure with wide bars (§11).

GPU rows are priced at **ml.g4dn.xlarge, $0.7364/hr** — AWS's own published figure — with a 4-minute cold start and 5 s of inference per page.

| | 20/day (600/mo) | 200/day (6,000/mo) | 2,000/day (60,000/mo) |
|---|---|---|---|
| **B1, Lambda CPU** | **$0** (24,000 of 400,000 free GB-s) | **$0** (240,000 of 400,000) | **~$33** x86 / **~$27** arm64 |
| **B2, SageMaker async, per-request cold start** | ~$30, **and every student waits ~4 min** | ~$220 (endpoint mostly warm) | ~$540 (always warm) |
| **B2, SageMaker async, batched once a day** | **~$2** | **~$8** | **~$64** |
| **B2, EC2 g6.xlarge always on** | $587.50 | $587.50 | $587.50 |
| *(reference) Mathpix hosted API, `improve_mathpix:false`* | *$1.20* | *$12* | *$120* |

**The single most consequential engineering choice in Option B is batching, and it costs nothing to make.** A per-request GPU endpoint pays a 4-minute cold start on nearly every upload at pilot volume; a nightly (or hourly) batch pays it once. That converts B2 from ~$30/month to ~$2/month at 20 uploads a day — a **15x** saving, and roughly 8x at 2,000/day — and it is *free* to us, because §3.5 already makes the parse feedback-only and inert. Nothing waits on it. A result that appears when the student next opens the app is not a degraded experience; it is the experience the roadmap already describes.

Small costs not in the table: a Lambda container image must live in **private ECR** (public ECR is not supported), whose free tier is 500 MB for 12 months and then per-GB-month — cents at a ~150 MB image. Aurora, S3, CloudFront and the Lambda are all already paid for (`docs/Deployment.md`).

### 4.4 The problem no benchmark in §2 covers: getting from a page to an expression

Every model in §2 takes **one cropped expression** and returns one string. Our input is a photograph of a page. Something has to find the lines, order them, and crop them — and that component is not in any of these papers, has no published accuracy for handwritten math on unruled paper, and is where a naive build will actually fail. It is the largest unquantified risk in Option B and §11 records it as unresolved. B2 partly dissolves it (a VLM can be asked for the whole page at once), which is a real argument for B2 that has nothing to do with its 3.2-point ExpRate edge.

### 4.5 Mathpix on-prem — the highest-accuracy self-hosted option, unpriced

Worth naming because it satisfies the owner's constraint exactly and nobody seems to know it exists. Mathpix sells a **"Yearly License On-Prem — fully contained AMI, unlimited usage, no access to outside internet needed, Docker image available upon request"** ([Mathpix billing](https://mathpix.com/docs/convert/billing)). That is the field's accuracy leader running on our own EC2, images never leaving the account, no per-image metering.

**The price is "contact sales" and I could not establish it.** It is the single highest-leverage unknown in this note: one email would settle whether the good option is affordable, and until it is sent, every accuracy ceiling in §4 is a ceiling on the *free* options only.

### 4.6 Verdict on B

**Buildable, genuinely cheap in the B1 shape, and short of the accuracy the feature deserves.** B1 is nearly free and will misread a lot. B2 is ~$2-8/month batched at pilot-to-moderate volume and, per §2.4's tier-3 evidence, still misreads something on a large fraction of real pages. Neither is a bad engineering decision; both are answers to a question §6 shows we should reframe first.

---

## 5. A and B side by side

| | **A — in-browser** | **B1 — self-hosted CPU** | **B2 — self-hosted GPU** |
|---|---|---|---|
| Accuracy on *photographed* handwritten math | **n/a — no such model exists in the browser** | 68-70% ExpRate on cropped tier-2, in-domain | 72.7% ExpRate on cropped tier-2 |
| Accuracy on a real student *page* | n/a | unpublished; worse than B2 | unpublished; the nearest tier-3 proxy — a general open 8 B VLM, not a fine-tuned one — is **85% of pages carrying a misread** (§2.4) |
| Integration effort against this stack | very high — new model pipeline, COOP/COEP on CloudFront, phone memory tuning, and it still would not work | **low** — one Hono route, one ONNX container Lambda, patterns the repo already has | medium — GPU endpoint, batch scheduler, IaC in `infra/` |
| Cost at pilot volume | $0 | **$0** | ~$2/mo batched |
| Latency | n/a | seconds | ~4 min cold, or same-day if batched |
| Privacy posture | **best possible** — no upload at all | image is already in our S3 per v1; parse adds no new party | same |
| Verdict | **ruled out on evidence** | viable, weakest accuracy | viable, best available self-hosted accuracy, real money at scale |

**On the privacy axis, note what is easy to miss: v1 already uploads the image to our S3 bucket.** Option B does not move the photo anywhere new. The §6 gate is about *third parties*, and a Lambda in our own account reading an object already in our own bucket introduces none. So B clears the gate cleanly, and A's advantage over B is smaller than it sounds — A avoids an upload the product has already decided to do.

---

## 6. The narrower framing, which is the recommendation

The brief asks whether a reduced scope gets most of the value. It does, and the reason is specific to this codebase rather than general.

### 6.1 The goal is localization, and localization is not transcription

`docs/Photo_Work_Upload_Scope.md` §1 says the value is that "a wrong final answer hides *where* it broke; the worked steps show it," and §3.5 says the v2 parse exists to "**localize the mistake**." Transcribing the student's page to LaTeX is one way to get there. It is not the only way, and it is by far the hardest — it solves an open-vocabulary structured-prediction problem in order to answer a question with fewer than ten possible answers.

### 6.2 What this repo already knows — measured

Measured on `integration` at `684a7a9f` over all ten registered practice pools:

| | |
|---|---|
| Practice items | **2,230** across **322** templates |
| Items carrying a `worked_solution` | **2,230 — 100%** |
| Worked-solution steps in total | **9,167** |
| Steps per item | min **2**, median **4**, mean 4.11, max **10** |
| Steps containing at least one `$…$` math fragment | **8,754 — 95.5%** |
| Items where *every* step carries `$…$` | **1,862 — 83.5%** |
| Items whose `answer_type` is `numeric` | **1,105 — 49.6%** |
| Items whose answer key is a bare integer | **751 — 33.7%** |

Step histogram: 2 steps ×111, 3 ×409, **4 ×1,123**, 5 ×386, 6 ×133, 7 ×54, 8 ×7, 9 ×6, 10 ×1.

So for **every** practice item a student can miss, the system already holds an ordered list of the canonical steps — typically four of them — computed deterministically from `template_params` by the template's own `generate()` (`packages/item-bank/src/template.ts:73,123`).

### 6.3 The two components are already rendered side by side

This is the part that makes the recommendation cheap rather than merely correct. In `apps/web/src/lessons/LessonPractice.tsx`, both of these are gated on the same `uiPhase === "revealed"` and sit in adjacent JSX blocks:

```398:425:apps/web/src/lessons/LessonPractice.tsx
          {uiPhase === "revealed" && (
            <WorkedSolution
              templateId={frozen.template_id}
              params={frozen.template_params}
              steps={frozen.worked_solution}
            />
          )}
          {/* … WORK-CHECKER v1 … */}
          {uiPhase === "revealed" && (
            <WorkUpload
              association={{
                surface: "lesson-practice",
                node_id: node,
                item_version_id: slot.instance.item_version_id,
                template_id: frozen.template_id,
              }}
            />
          )}
```

`WorkedSolution` already renders each step as **a numbered card** (`apps/web/src/lessons/WorkedSolution.tsx`: "each step is a card with a numbered badge… steps are joined by connectors, and the final step is emphasized as the answer").

### 6.4 Tier 0 — ask the student. No model at all.

**Make the step cards tappable: "Which step is where yours stopped matching?"**

That is a click handler on content already on screen, beside a photo the student has already chosen to attach. It produces the *same* datum the v2 parse is supposed to produce — an index into the canonical solution path, associated with `node_id` + `item_version_id` + `template_id` — for 2,230 of 2,230 items, on every device, with no image analysis, no new subprocessor, no cold start, no GPU, and no accuracy question at all.

Five things recommend it beyond the obvious:

1. **It is more accurate than any model in this note.** The student knows where they went wrong better than a 72%-ExpRate parse will guess. Where they do *not* know, that is itself the finding, and a "not sure" option records it.
2. **It respects the one-way invariant by construction.** The signal is student-supplied metadata, structurally incapable of reaching a grader — the same argument `apps/web/src/work-upload/README.md` already makes for the upload.
3. **It is the labelled dataset.** §2.5's whole message is that the field's models transfer badly and in-domain data is worth ~42 points. A step-tap paired with a photo is exactly `(image, correct step index)` — the training and evaluation set nothing else in this plan can generate.
4. **It is measurable against the only thing that matters.** "Did we point at the right step" is the metric; a later model can be scored against these labels rather than against an ExpRate on Chinese K-12 photos.
5. **It answers the §7 open question "do we ever show the image back to the student"** with a use for it.

The honest limit: **it needs the student to still be there and willing to tap.** A page uploaded and abandoned yields nothing, and this note has no measurement of the tap rate — that is §11's biggest hole on the recommended path, and it is one release away from being answered.

### 6.5 Tier 1 — constrained verification, if Tier 0 proves insufficient

If step-tapping turns out to be under-used or too coarse, the next step is still not transcription. It is **verification against a known candidate set**:

- The canonical steps for that exact instance are computable, and 95.5% of them carry a `$…$` fragment from which the expected intermediate value can be extracted.
- Half the bank (1,105 items) keys a `numeric` answer and a third (751) a bare integer.
- So the question the vision model is asked stops being *"what does this page say?"* (open vocabulary, 2-D structure, ~250 symbol classes) and becomes ***"does any line on this page contain one of these ≤10 known strings, and where does the agreement stop?"***

That is a dramatically smaller problem. It has a fixed, tiny candidate set; it degrades to a clean "we could not read this" instead of to a confident wrong LaTeX string; and on the numeric/integer half it needs only digits and a minus sign — no fractions, no exponents, no radicals, which §3.2 establishes is precisely where a linear OCR engine stops being hopeless. Constrained decoding over the known candidates is a further well-trodden lever on top.

It runs in B1's footprint: CPU, Lambda, $0 at pilot volume. And it inherits Tier 0's labels as its test set, so it can be *proven* better before it is shipped rather than argued to be.

**This note does not claim a number for Tier 1.** Nothing in §12 measures constrained matching on student pages, and inventing an estimate would be exactly the optimism the brief asked me not to hand back. What can be said is structural: it strictly dominates free transcription, because free transcription is one way to implement it and the candidate set can only remove failure modes.

---

## 7. Does "wrong and provisional" change the answer?

Yes, measurably, and less than one would hope.

**The measurement.** On EDU-CIRCUIT-HW, Gemini-3-Pro-Preview's Sample Error Rate is **37.62%** while its Error Impact Rate on the downstream grading decision is **merely 7.60%** — the authors' word. Their framing is that grading "inherently masks a significant portion of recognition failures," and the gap between those two figures is the size of the masking. Most misreads land somewhere the decision does not look. (Their exact denominator for EIR is not restated here; the SER-versus-EIR gap is the claim, not a derived absorption rate.)

So §3.5's provisional posture ("here's what we read — correct us if we got it wrong") is not wishful. A feedback-only surface really can absorb error rates a grader could not, and this is the published evidence that it does.

**Three limits on how far that carries.**

- **It shrinks as the task gets finer.** In the same table, as recognition degrades the coarsest metric (binary agreement — "did the student make a mistake at all") falls 12.86 points while the finest (point agreement — which error, worth how much) falls 17.35. The authors note explicitly that these errors "may become increasingly problematic as AI-enabled educational systems evolve to provide more detailed, step-by-step feedback." **Step-level localization is the fine-grained end.** Our use case is the one that masks least.
- **The correction loop has a floor.** "Correct us if we got it wrong" only works if the student can tell that we are wrong and bothers to say so. If they can do that reliably, §6.4 observes that we could have just asked them in the first place — for free, with no image analysis at all.
- **A wrong parse is not neutral.** Confidently telling a struggling student their line 3 says something it does not is worse than saying nothing, in a way a missing feature is not. That argues for a high-confidence-only surface with an explicit "we couldn't read this" state — which is exactly what §6.5's candidate-set framing produces naturally and what free transcription does not.

---

## 8. The comparison the owner did not ask for, stated once

The owner has decided on-device, and §§3-6 answer that question on its own terms. One number belongs on the record anyway, because he is actively cutting spend and is entitled to know the size of what the constraint costs.

§3.5's gate has **two** doors: (a) an education-compliant provider under a DPA with no-retention/no-training terms, or (b) self-hosted/on-device. Door (a), priced: **Mathpix Convert API at $0.002/image with `improve_mathpix: false`**, documented as "not persisted to disk," "not cached," images and results deleted within 24 hours — $1.20/month at 20 uploads a day, $120/month at 2,000, plus a one-time $19.99 setup ([pricing](https://mathpix.com/pricing/api), [retention](https://docs.mathpix.com/concepts/data-retention)). FERPA/COPPA terms are "contact support," i.e. **unestablished** — the gate would still need clearing, and this note does not claim it clears.

There is also a middle door nobody has named: **Amazon Bedrock is AWS, and AWS is already this project's processor** for Cognito, Aurora, S3 and CloudFront. AWS states that Bedrock "doesn't store customer input data and model output data, share the data with third-party model providers, or use the data to train models," that each provider's model runs in a dedicated deployment account the provider cannot access, that invocation traffic stays on the AWS network, and that a FERPA-relevant BAA is available through AWS Artifact ([Bedrock privacy](https://aws.amazon.com/bedrock/security-privacy-responsible-ai/), [re:Post](https://repost.aws/knowledge-center/amazon-bedrock-model-data-use), [AWS FERPA](https://aws.amazon.com/compliance/ferpa/)).

**Whether that counts as "no third-party sharing" is a legal reading, not a technical one, and this note does not make it.** It is a genuine fork for the owner and counsel: if the posture means *no new subprocessor*, Bedrock plausibly qualifies and is far easier than anything in §4; if it means *no model provider's weights ever see the image*, it does not. Two facts should temper the enthusiasm either way: §2.2 puts frontier VLMs at 22.96-28.14% ExpRate on photographed handwritten math, worse than a 6.4 M-parameter specialist; and Bedrock's model menu is not the fine-tuned HMER models that actually top these tables.

---

## 9. Recommendation — three phases, each with a named trigger

### Phase 0 — now (post-demo). The step-tap. No model.
Make `WorkedSolution`'s numbered step cards tappable on the `revealed` state, beside the existing `WorkUpload`: *"Which step is where yours stopped matching?"* plus a "not sure." Record `(student_id, node_id, item_version_id, template_id, step_index | unsure)` beside the upload row.

- Surfaces: `apps/web/src/lessons/WorkedSolution.tsx` + `LessonPractice.tsx` (both **Anthony's** lane), one additive column or table beside `work_upload` (**Gabe's**).
- Delivers the §1 "localize the mistake" signal for **2,230 of 2,230** items on day one.
- **Does not require the backend gap in `apps/web/src/work-upload/README.md` to be closed first** — the tap is useful with or without a stored photo, which decouples it from the work-upload backend another agent owns.

### Phase 1 — only if Phase 0 proves insufficient. Constrained verification, self-hosted CPU.
**Trigger, in both halves:** (i) the Phase-0 tap rate is measured and low, or its step index is measured to disagree with what the photo shows often enough to matter; **and** (ii) Phase 0 has accumulated enough `(image, step_index)` pairs to serve as a real test set. Neither half is guessable today.

Build §6.5: extract the expected intermediate values from the instance's own `worked_solution`, run a small ONNX recognizer over the page in a Lambda container on CPU, and report the first line that stops agreeing — or "we couldn't read this." Not transcription; verification. Priced at **$0/month at pilot volume** on §4.3's model, which is MODELLED and should be re-derived from a real timing before it is relied on.

**Ship gate:** it must beat Phase 0's labels on "did we point at the right step," measured, before it is shown to a learner. If it cannot, Phase 0 was the answer.

### Phase 2 — full page transcription. Do not start until all four are true.
1. Phase 1 has shipped and been measured insufficient.
2. Someone has priced the Mathpix on-prem licence (§4.5) — it may make Phases 1 and 2 both moot.
3. The page-segmentation problem in §4.4 has a measured answer on our own images, not an assumed one.
4. A confidence threshold and a visible "we couldn't read this" state are specified, so that §7's third limit is designed for rather than discovered.

**And do not build it in the browser.** §3 is the finding, not a preference.

---

## 10. What the owner has to decide

1. **Is the constraint "no third party" or "no new subprocessor"?** This is the highest-value decision in the note and it is legal, not technical. It decides whether §8's middle door exists.
2. **Is a same-day parse acceptable, or must it be in-the-moment?** Batching is worth ~15x on Option B (§4.3) and §3.5's feedback-only posture already appears to permit it. If the answer is "in-the-moment," B2 costs ~$30/month at 20 uploads a day and makes the student wait four minutes.
3. **What accuracy floor is worth shipping?** §2 puts the best self-hostable model at 72.7% on the *easiest* realistic input and gives no tier-3 number for it at all. There is some rate below which a provisional parse is worse than no parse, and nobody has named it.
4. **Should the Mathpix on-prem quote be requested?** One email. It is the only path to field-leading accuracy inside the trust boundary and its price is the largest unknown here.
5. **Who owns Phase 0?** `docs/Photo_Work_Upload_Scope.md` §7 assigns v2 to **Gabe** ("the parse Lambda + AI-provider vetting"). Phase 0 has no parse, no Lambda and no provider: it is entirely `apps/web/src/lessons/**` plus one additive column, which per `OWNERS.md` is **Anthony's** lane. If Phase 0 is adopted, that assignment moves.
6. **What is the volume assumption?** Every figure in §4.3 is parameterized on a number nothing in the repo establishes.

---

## 11. What was measured, what was read, and what could not be established

**Measured by running code against this tree** (a scratch vitest probe over `D1..D10_PRACTICE_ITEMS`, deleted afterwards; the tree is clean): every figure in §6.2 — the 2,230 items, 322 templates, 100% worked-solution coverage, 9,167 steps, the 2/4/4.11/10 distribution and its histogram, the 95.5% and 83.5% math-fragment shares, and both answer-type and answer-key censuses.

**Verified by reading this tree at `684a7a9f`:** the adjacency of `WorkedSolution` and `WorkUpload` under one `uiPhase === "revealed"` guard (`LessonPractice.tsx:398-425`); that `WorkedSolution` renders numbered step cards; that `worked_solution` is declared on `RenderedItem`/`FrozenItem` (`template.ts:73,123`) and stamped by `generateFromTemplate`; the AWS topology and existing cost floor in `docs/Deployment.md`; the ownership rows in `OWNERS.md`; and the v1 contract and backend gap in `apps/web/src/work-upload/README.md`.

**Read from published papers and vendor documentation, not reproduced here.** Every accuracy figure in §2, §3 and §4.1 is a reading of a table in the source named beside it. **No model was downloaded, run, or evaluated for this note.** In particular I did not run CoMER on a photograph, did not run Uni-MuMER on anything, and did not time an ONNX model in a Lambda.

**Read from vendor pricing pages on 2026-08-05:** the Lambda, SageMaker and Mathpix rates. The EC2 g5/g6 rates are from third-party aggregators (Vantage, DoiT, aws-pricing.com), which agree with each other; AWS's own page is the authority and should be checked before anyone commits.

**MODELLED, and flagged in place.** §4.3's B1 row assumes 4 s at 10 GB per page (40 GB-s). That is an inference from CoMER's 18.81 GFLOPs and 11.13 GPU FPS plus the observation that a comparable INT8 ONNX model ships in a 112 MB Lambda container and runs "at Lambda latency" on CPU. **It could be off by 3-5x in either direction** — which does not change the conclusion at 20 uploads/day (the free tier absorbs a 16x error there) but does move the 200/day row off $0 and scales the 2,000/day figure linearly. The B2 rows assume a 4-minute cold start, 5 s per page, and — for the 200/day per-request row only — that the endpoint stays warm through a ~10-hour active window, which depends on a scale-in cooldown nobody has configured. That row is the softest number in the document.

### The eight things I could not establish

1. **No published benchmark measures US pre-calculus student handwriting.** §2.4's tier-3 numbers are university circuit analysis; §2.2's are Chinese K-12. The gap between those and our cohort is unmeasured, and it is the load-bearing uncertainty in the whole note.
2. **The Mathpix on-prem licence price** (§4.5). "Contact sales." Every accuracy ceiling in §4 is a ceiling on the free options only.
3. **Page-to-expression segmentation accuracy on handwritten pre-calculus work** (§4.4). Nothing in the literature covers it, and it is where a naive build fails first.
4. **The Phase-0 tap rate** (§6.4). Whether students will actually tap a step is the single assumption the recommendation rests on, and one release answers it.
5. **Any accuracy number for §6.5's constrained-matching framing.** Deliberately not estimated. The argument for it is structural, not empirical.
6. **Whether `granite-docling-258M-ONNX`, the only browser-runnable document VLM found, handles handwritten math at all** (§3.4). It is a printed-document converter; I did not test it, and if it turned out to work it would be the one thing that could reopen Option A.
7. **Whether Mathpix's terms clear the §6 gate.** Their docs say "contact support@mathpix.com" for FERPA/COPPA. §8 prices the door; it does not claim it opens.
8. **How a fine-tuned HMER specialist performs on a tier-3 page.** §2.4's table contains general VLMs only, so its 85.43% bounds an open generalist rather than §4's B1 or B2. Every tier-3 statement about a *fine-tuned* self-hosted model in this note is therefore an inference across benchmarks, and running Uni-MuMER against a page-level corpus would be the cheapest way to close it.

**One thing I want to be explicit about not having done:** I did not build a prototype of anything here — not the step-tap, not a Lambda, not a browser demo. §6's claim that step-tapping delivers the localization signal is an argument from the item-bank measurements and the two components' existing adjacency, not a measurement of students.

---

## 12. Sources

Distinguishing measured benchmarks from vendor claims, as the brief asked.

**Peer-reviewed / preprint benchmarks (measured):**
[Uni-MuMER, NeurIPS 2025 spotlight](https://openreview.net/pdf?id=oHbVboLXz6) ([poster](https://neurips.cc/virtual/2025/poster/116052), [code + model zoo](https://github.com/BFlameSwift/Uni-MuMER), [Qwen3-VL-2B weights, Apache-2.0](https://huggingface.co/phxember/Uni-MuMER-Qwen3-VL-2B)) ·
[CoMER, ECCV 2022](https://arxiv.org/abs/2207.04410) ·
[TAMER](https://arxiv.org/html/2408.08578) ([code](https://github.com/qingzhenduyu/tamer)) ·
[PosFormer](https://arxiv.org/pdf/2407.07764) ·
[ICAL](https://arxiv.org/html/2405.09032) ·
[SAN / HME100K, CVPR 2022](https://openaccess.thecvf.com/content/CVPR2022/papers/Yuan_Syntax-Aware_Network_for_Handwritten_Mathematical_Expression_Recognition_CVPR_2022_paper.pdf) ([dataset](https://ai.100tal.com/dataset), [repo](https://github.com/Phymond/HME100K)) ·
[LAST / M²E, ACM MM 2023](https://doi.org/10.1145/3581783.3612499) ([code](https://github.com/HCIILAB/LAST)) ·
[UniMERNet](https://arxiv.org/html/2404.15254v1) ·
[CDM metric](https://arxiv.org/html/2409.03643v1) ·
[EDU-CIRCUIT-HW, Feb 2026](https://arxiv.org/abs/2602.00095) ·
[CHECK-MAT, MathNLP 2025](https://aclanthology.org/2025.mathnlp-main.6/) ([arXiv](https://arxiv.org/html/2507.22958v1))

**Implementations and maintainer statements (project claims):**
[vue-math-handwrite](https://github.com/cskwork/vue-math-handwrite) ·
[transformers.js](https://github.com/huggingface/transformers.js) ([WebGPU guide](https://huggingface.co/docs/transformers.js/en/guides/webgpu), [Safari 26 PR #1700](https://github.com/huggingface/transformers.js/pull/1700), [iOS memory #1242](https://github.com/huggingface/transformers.js/issues/1242), [OCR models #452](https://github.com/xenova/transformers.js/issues/452)) ·
[Tesseract #4092](https://github.com/tesseract-ocr/tesseract/issues/4092), [#3028](https://github.com/tesseract-ocr/tesseract/issues/3028), [mailing list](https://groups.google.com/g/tesseract-ocr/c/rcsvxsxdjNY) ·
[LaTeX-OCR / pix2tex](https://github.com/lukas-blecher/LaTeX-OCR) ·
[emscripten #19374](https://github.com/emscripten-core/emscripten/issues/19374)

**Platform documentation (vendor claims):**
[WebKit — Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) ·
[gpuweb implementation status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) ·
[AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/) ·
[AWS — AI inference on Lambda](https://aws.amazon.com/blogs/compute/deploying-ai-models-for-inference-with-aws-lambda-using-zip-packaging/) ·
[SageMaker Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html) ·
[SageMaker async autoscaling](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html) ·
[SageMaker container caching](https://aws.amazon.com/blogs/machine-learning/introducing-container-caching-in-amazon-sagemaker-ai-for-faster-model-scaling/) ·
[SageMaker scale-to-zero](https://aws.amazon.com/blogs/machine-learning/unlock-cost-savings-with-the-new-scale-down-to-zero-feature-in-amazon-sagemaker-inference/) ·
[SageMaker pricing](https://aws.amazon.com/sagemaker/ai/pricing/) ·
[re:Post — async cold start](https://repost.aws/questions/QUDboilwqLQpOELFQZs5kOBg/reduce-cold-start-times-of-async-sagemaker-endpoints-huggingface-tgi-image) ·
[Bedrock security & privacy](https://aws.amazon.com/bedrock/security-privacy-responsible-ai/) ·
[Bedrock data use](https://repost.aws/knowledge-center/amazon-bedrock-model-data-use) ·
[AWS FERPA](https://aws.amazon.com/compliance/ferpa/) ·
[Mathpix API pricing](https://mathpix.com/pricing/api) ·
[Mathpix billing / on-prem](https://mathpix.com/docs/convert/billing) ·
[Mathpix data retention](https://docs.mathpix.com/concepts/data-retention) ·
[Mathpix privacy FAQ](https://mathpix.com/docs/convert/privacy) ·
[Vantage g6.xlarge](https://instances.vantage.sh/aws/ec2/g6.xlarge) ·
[DoiT g6.xlarge](https://www.doit.com/compute/spot/us-east-1/g6.xlarge)

---

# 13. The verification framing, costed on open weights — recorded 2026-08-05

> **Nothing above this line has been edited.** §§0-12 stand as written on the same day, including the parts this section corrects. Where a finding here supersedes one above, it says so in place; the largest is §13.2, which invalidates §4.1's B1 recommendation on a ground §§0-12 never checked.
>
> **Provenance.** Written after two owner rulings (§13.0). Repo state re-read at `origin/integration` = `da781d1f`; the four files cited in §§6.2-6.3 (`LessonPractice.tsx`, `WorkedSolution.tsx`, `template.ts`, `Photo_Work_Upload_Scope.md`) are **unmoved** since `684a7a9f`, so every file:line citation above is still good. Licence facts are from the GitHub and Hugging Face APIs and from licence texts read directly, on 2026-08-05; each row of §13.2 names its method.

## 13.0 What changed, and what is claimed rather than verified

**Ruling 1 — Mathpix is out.** Verbatim: *"no - dont have time to chase after quotes right now. look into open-source ocr."* So §4.5 is closed, and hole 2 in §11 is retired unanswered rather than resolved. Open-source and self-hostable only.

**Ruling 2 — Phase 0 is approved and being built.** Another agent is making the worked-solution steps tappable.

**That second one is owner-stated and NOT verified in the tree.** At `da781d1f` no step-tap exists in `LessonPractice.tsx` or `WorkedSolution.tsx`, and no open pull request in this repository carries it. Recorded as **claimed but unverified**, because everything downstream of it in this section — the candidate set, the abstention design, the labelled test set — assumes the tap ships.

The question this section answers is the one §9 filed as Phase 1 and the owner has now made live: **not "can a model transcribe the page" but "can a model confirm or deny a known string."**

## 13.1 Bottom line: a qualified yes, and neither qualification is the one anybody expected

**Yes — verification is viable on open weights, and it is cheap.** But the two things that nearly stopped it are both new, and neither is the page-level accuracy figure that dominates §§2-4:

1. **A licence wall.** Every model §4.1 named as tier B1 — CoMER, TAMER, PosFormer, ICAL — ships with **no licence file at all**, and the model whose 72.66% headline §2.2 quoted is a fine-tune of a **non-commercial** base. §4.1's B1 recommendation does not survive this section. There is a clean path, and it is narrower than the field looks (§13.2, §13.3).
2. **A signal-to-noise problem the verification framing creates rather than solves.** Relaxing exact match to a small edit tolerance lifts recognition from 68.0% to 89.6% — and a typical student slip is one digit or one sign, which is *the same size as the tolerance*. The tolerance that rescues the OCR is the tolerance that blinds it to the error we are looking for (§13.4). This is a design constraint, not a blocker, and designing for it is most of the work.

Both are answerable. The recommendation in §13.10 is buildable and its first step is an afternoon's measurement, not a build.

## 13.2 The licence audit, and the correction it forces on §4.1

The brief said this was easy to get wrong. It was: I got it wrong above.

Method per row: **[G]** = GitHub REST `/repos/{r}/license` plus a listing of the repository root for any `LICEN*` file; **[H]** = Hugging Face REST `/api/models/{m}` `cardData.license`; **[T]** = the licence text itself, read; **[R]** = the project README's own commercial-use section. All read 2026-08-05.

| Model / project | Code licence | **Weights licence** | Commercial? |
|---|---|---|---|
| **CoMER** (`Green-Wood/CoMER`) | **none — no LICENSE file** [G] | none | **NO** |
| **TAMER** (`qingzhenduyu/TAMER`) | **none — no LICENSE file** [G] | none | **NO** |
| **PosFormer** (`SJTU-DeepVisionLab/PosFormer`) | **none — no LICENSE file** [G] | none | **NO** |
| **ICAL** (`qingzhenduyu/ICAL`) | **none — no LICENSE file** [G] | none | **NO** |
| **GOT-OCR2.0** (`Ucas-HaoranWei/GOT-OCR2.0`) | **none — no LICENSE file** [G] | `stepfun-ai/GOT-OCR2_0` apache-2.0 [H] | weights yes, repo code no |
| **Uni-MuMER-Qwen2.5-VL-3B** | Apache-2.0 [G] | tagged apache-2.0 [H], **but base `Qwen/Qwen2.5-VL-3B-Instruct` is `qwen-research`** [H][T] | **NO — see below** |
| **Uni-MuMER-Qwen3-VL-2B** | Apache-2.0 [G] | apache-2.0 [H]; base `Qwen3-VL-2B-Instruct` **apache-2.0** [H] | **YES — clean both halves** |
| **Uni-MuMER-Qwen3-VL-4B** / **-Qwen3.5-2B** / **-Qwen3.5-4B** | Apache-2.0 [G] | apache-2.0 [H]; bases `Qwen3-VL-4B-Instruct`, `Qwen3.5-2B` **apache-2.0** [H] | **YES** |
| **Uni-MuMER-Qwen2.5-VL-7B** | Apache-2.0 [G] | apache-2.0 [H]; base `Qwen2.5-VL-7B-Instruct` **apache-2.0** [H] | **YES** |
| **UniMERNet** (`opendatalab/UniMERNet`) | Apache-2.0 [G] | `wanderkid/unimernet_base` apache-2.0 [H] | **YES — clean both halves** |
| **PaddleOCR** incl. **PP-FormulaNet**, **PP-OCRv5 det**, **PaddleOCR-VL** | Apache-2.0 [G] | apache-2.0 [H] | **YES** |
| **docTR** (`mindee/doctr`) | Apache-2.0 [G] | Apache-2.0 | **YES** |
| **EasyOCR** / **CRAFT** | Apache-2.0 / MIT [G] | not separately checked | code yes; **verify weights before use** |
| **TrOCR** | not separately checked | `microsoft/trocr-base-handwritten` mit [H] | YES (handwritten *text*, not math) |
| **Nougat** (`facebookresearch/nougat`) | **MIT** [G] | **`facebook/nougat-base` cc-by-nc-4.0** [H] | **NO — weights are non-commercial** |
| **surya** / **marker** (`datalab-to/*`) | Apache-2.0 [G] | **modified AI Pubs OpenRAIL-M — "free for research, personal use, and startups under $5M funding/revenue"** [R] | **conditionally** |
| **LAST** (multi-line, M²E) (`HCIILAB/LAST`) | **GPL-3.0** [G] | — | copyleft |
| **MinerU** (`opendatalab/MinerU`) | `NOASSERTION` [G] | — | **unresolved** |

### 13.2.1 The two traps, both of which caught this note

**Trap one: the code licence is not the weights licence, and the GitHub API only reports the first.** Nougat is the clean demonstration — the repository is MIT and the weights everybody actually downloads are **CC-BY-NC-4.0**, non-commercial. surya and marker are the same shape with a different ceiling: Apache-2.0 code, OpenRAIL-M weights, free below $5M in funding or revenue. Reading either project's GitHub badge as "Apache-2.0, fine" is the mistake, and both projects say so plainly in a README section a licence scanner never reads.

**Trap two: a fine-tune cannot relicense its base, and this one is load-bearing.** `phxember/Uni-MuMER-Qwen2.5-VL-3B` is tagged `apache-2.0` on Hugging Face. Its base, `Qwen/Qwen2.5-VL-3B-Instruct`, is under the **Qwen RESEARCH LICENSE AGREEMENT**, whose §1(i) defines *"'Non-Commercial' shall mean for research or evaluation purposes only"*, whose §2(a) grants rights *"FOR NON-COMMERCIAL PURPOSES ONLY"*, whose §2(b) says *"If you are commercially using the Materials, you shall request a license from us,"* whose §3 requires the agreement to travel with derivative works, and whose §5(a) retains Alibaba's IP in the base. A full fine-tune of those weights is a derivative work. **The Apache tag is the fine-tuner's statement about the fine-tuner's contribution; it cannot enlarge the grant on the weights underneath.**

**So §2.2's headline — "72.66% is the ceiling of the self-hostable state of the art," attributed to Uni-MuMER-Qwen2.5-VL-3B — is a number this project may not build on.** That sentence is not withdrawn (it is true about the state of the art) but it must be read with this row attached, and §4.1's B2 row, which names that model, is superseded by §13.3.

The escape is specific and clean rather than general: **the Qwen3-VL and Qwen3.5 bases are Apache-2.0**, so the same authors' fine-tunes on those bases are usable end to end. It is one model id apart from the trap.

### 13.2.2 What this does to §4.1

**§4.1's B1 tier — "CoMER / TAMER / PosFormer class, 6.4-8.2 M parameters, CPU, no GPU" — is not commercially usable and should not be built.** That is the largest single correction in this document. The parameter counts, the GFLOPs and the 68-69% HME100K figures all stand as facts about the field; what fails is the assumption, never checked in §4, that an academic repository with public checkpoints carries a licence. Four of four do not. Under default copyright, no licence means no grant.

The replacement is §13.3, and it costs an order of magnitude in model size.

## 13.3 The three buildable candidates, named

| | **UniMERNet** | **PP-FormulaNet-S / _plus-S** | **Uni-MuMER-Qwen3-VL-2B** |
|---|---|---|---|
| Licence, both halves | **Apache-2.0** | **Apache-2.0** | **Apache-2.0** (base Qwen3-VL-2B-Instruct also Apache-2.0) |
| Parameters | **392 M** | **58 M** | **2.1 B** |
| Artefact | ~1.5 GB fp32 (PaddleOCR lists 1530 MB) | **224 MB / 248 MB** | ~4.3 GB bf16 |
| CROHME 14/16/19 ExpRate | **67.4 / 68.4 / 65.4** | **not published** | 72.49% "avg ExpRate" per the model zoo, denominator unstated |
| HME100K ExpRate / ≤1 err / ≤2 err | **68.0 / 84.1 / 89.6** | **not published** | not published for this variant |
| Handwriting in training | yes — CROHME + HME100K, 83,338 samples | inherited via UniMERNet-1M; **no handwritten test result reported** | yes — Uni-MuMER-Data, ~1.6 M samples |
| CPU inference, vendor-measured | **8,288 ms** | **254 ms** (`_plus-S` 261 ms) | GPU-shaped |
| Where it runs here | Lambda container, CPU | Lambda container, CPU, comfortably | GPU: SageMaker async batched (§4.3) |

Sources: [UniMERNet Table 6](https://arxiv.org/html/2404.15254v1), [PaddleOCR formula-recognition module table](https://www.paddleocr.ai/main/en/version3.x/module_usage/formula_recognition.html) (model sizes and the CPU times, which are Baidu's own benchmark, not mine), [PP-FormulaNet](https://arxiv.org/html/2503.18382) (58 M / 179 M parameter counts), [Uni-MuMER model zoo](https://github.com/BFlameSwift/Uni-MuMER).

**Three things to notice, because each of them constrains the build.**

**UniMERNet is the only clean-licence model with a published handwritten number**, and 68.0 ExpRate on HME100K puts it level with the unlicensed specialists (CoMER 68.12, TAMER 69.50) at 60x the parameters. That is a fair price for being usable.

**PP-FormulaNet is by far the fastest and its handwriting performance is unknown.** Its five reported test sets are UniMERNet's SPE/CPE and arXiv-4M's Easy/Middle/Hard — **all printed**. The paper's own framing is that prior work "has primarily been optimized for handwritten formula recognition tasks, often underperforming when dealing with printed formulas," and PP-FormulaNet goes the other way deliberately. It ships a qualitative handwriting figure whose caption notes that blanks mean *"there is a syntax error in the generated formula, preventing it from rendering."* **So the cheapest Apache-2.0 option is the one with no handwriting evidence at all**, and §13.5's measurement exists partly to settle it.

**Uni-MuMER-Qwen3-VL-2B is the accuracy option and it is a 2.1 B VLM**, which means §4.2's GPU row and §4.3's batching argument, not the free Lambda tier.

For the detector, the answer is **DBNet**, shipped Apache-2.0 in both [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) and [docTR](https://github.com/mindee/doctr) — see §13.6.

## 13.4 Verification versus transcription: the honest arithmetic

### 13.4.1 Nobody has published this, and here is the closest proxy

**No HMER paper reports a verification metric.** Every number in §2 and §13.3 is free-decoding exact match. So the gain from verification has to be argued from a proxy, and the proxy is the "≤1 error" and "≤2 errors" columns that HMER papers report beside ExpRate — the share of images whose free decode is within one or two symbol edits of the truth.

| Model | HME100K exact | **≤1 error** | **≤2 errors** |
|---|---|---|---|
| SAN | 67.1 | – | – |
| CoMER | 68.12 | 84.20 | 89.71 |
| **UniMERNet** (Apache-2.0) | **68.0** | **84.1** | **89.6** |
| TAMER w/ fusion | 69.50 | 85.48 | 90.80 |
| ICAL | 69.06 | 85.16 | 90.61 |

Sources: [UniMERNet Table 6](https://arxiv.org/html/2404.15254v1), [TAMER repo results table](https://github.com/qingzhenduyu/tamer).

**Read as an upper bound on verification, that is 68.0% → 89.6%: a 21.6-point head-room, and it is real head-room.** The information needed to confirm a known string is present in the model's output far more often than exact match suggests, which is exactly the brief's intuition and it is quantified rather than asserted.

### 13.4.2 The mechanism already exists, and it is cheaper than decoding

Verification does not need free decoding at all. These are autoregressive encoder-decoders over a LaTeX token vocabulary, so the probability of a **known** candidate string can be read off directly: encode the crop once, then run the decoder **teacher-forced** over each candidate in a single non-sequential pass, and sum the token log-probabilities. Rank the item's own expected step strings, plus a "none of these" hypothesis, by that score.

This is not speculative. TAMER's published inference already does the candidate-scoring half of it — beam search produces a candidate set, each candidate gets `S_seq(y)`, a structural score is added, and the argmax is returned ([TAMER, AAAI 2025](https://ojs.aaai.org/index.php/AAAI/article/download/33190/35345)). Substituting a known candidate list for the beam's output is a change to what is scored, not to how.

**It is also strictly cheaper than transcription, which is the opposite of what one would guess.** Free decoding costs one encoder pass plus roughly L sequential decoder steps, where L is the output length (HME100K's mean label is 24 tokens). Scoring K known candidates costs one encoder pass plus K teacher-forced decoder passes, which are parallel, batchable and length-independent. With §6.2's median of 4 steps and a worst case of 10, **K ≤ ~10 and the encoder dominates.** So §4.3's cost table is, if anything, generous to the verification build.

### 13.4.3 The trap: the tolerance that rescues the OCR is the tolerance that blinds it

This is the finding that the transcription framing never surfaces, and it is the reason this section says "qualified yes."

Verification only helps if the match rule is looser than exact string equality — that is the whole of §13.4.1's 21.6 points. But consider what the product is being asked to detect. A student's error on an intermediate step is typically **a single digit, a dropped sign, or a transposed pair**: `-7` for `7`, `3/8` for `3/5`, `x^2` for `x^3`. That is an edit distance of **one**.

The model's own error is also typically one or two symbols — that is precisely what the ≤1 / ≤2 columns measure.

**So the signal and the noise are the same size.** A matcher tolerant enough to accept the model's misreading of a correct step is tolerant enough to accept a student's wrong step as correct, and the errors it will wave through are the most common ones. Tighten the tolerance to exact match and you are back at 68%. There is no threshold that separates them, because the quantity being thresholded does not distinguish them.

Three things make this a design constraint rather than a wall, and all three depend on Phase 0:

- **Score the margin, not the distance.** The right question is not "is the decode within 2 edits of the expected string" but "does the expected string score higher than the plausible wrong strings *for this item*." Those wrong strings are enumerable: the item's own distractors, the off-by-one-sign variant, the un-reduced fraction, the value from the previous step. A likelihood ranking over a candidate set that deliberately includes the near-misses measures the discrimination directly, where an edit-distance threshold measures something else and calls it the same thing.
- **Abstain by default.** Speak only when the top candidate's margin over the runner-up exceeds a threshold calibrated for precision, not recall. §7's third limit already argued that a confidently wrong parse is worse than silence; this is the mechanism that honours it.
- **The learner has already spoken.** With step-tap, the model's job is reduced from *deciding* where the work diverged to *corroborating* a claim the learner has made — and it can decline. A system that says "your step 3 looks right to us, so the slip may be in step 4" only when it is sure, and nothing when it is not, is useful at an accuracy that could never support "your step 3 says X."

**This is the strongest argument in this section for Phase 0 having been the right call, and it is not the one §6 made.** §6 argued step-tap was cheaper. §13.4.3 is the argument that it is a *precondition*: without a learner-supplied claim to corroborate, the verification framing has no way to tell its own errors from the ones it exists to find.

## 13.5 How to measure this cheaply — the protocol, because nobody has published it

The brief asked for this if the literature is silent. It is silent, so here is a protocol that costs an afternoon and a laptop, produces the negative result as readily as the positive one, and needs no training and no AWS.

**Corpus (the only part that costs anything).** 50-100 photographs of real pre-calculus working on paper, each labelled with the item it answers and the index of the first diverging step. Before Phase 0 ships, that is a manual exercise with whoever is to hand. **After Phase 0 ships it is free**, which is §6.4's third argument becoming operational: every upload paired with a step-tap is exactly one labelled example.

**Candidate set per photo.** The item's own `worked_solution` step strings (median 4, max 10 — §6.2), plus deliberately adversarial near-misses: sign flips, off-by-one digits, un-reduced forms, and the previous step's value. Plus a "none of these" hypothesis. The near-misses are what make the measurement worth taking; without them it measures nothing, because the real steps of one item are far apart and any model separates them.

**Three metrics, in this order.**

1. **Corroboration.** On steps the learner marked as correct, how often does the expected string rank first? This is the optimistic number and it is the one that will look good.
2. **Discrimination.** On the diverging step, how often does the expected string *still* rank first — i.e. how often does the system wrongly confirm work the learner has told us is wrong? **This is §13.4.3 measured, and it is the number that decides the project.** A system that scores well on (1) and badly on (2) is a system that says "looks right" to everything.
3. **Abstention calibration.** Sweep the top-two margin; report the precision/coverage curve. The deliverable is the margin at which precision reaches 95%, and the coverage left at that margin. If coverage there is near zero, the answer is no and the question is closed.

**Models to run, in this order:** PP-FormulaNet-S first (254 ms CPU, 224 MB, and its handwriting performance is the biggest unknown in §13.3, so it is both the cheapest test and the most informative); then UniMERNet (the clean-licence model with an actual handwritten number); then Uni-MuMER-Qwen3-VL-2B on a rented GPU hour if the first two fail. **Cost: the download, plus roughly one GPU-hour if it gets that far.** No fine-tuning, no endpoint, no infrastructure.

**Run it before building anything.** §13.4.3 says the outcome is genuinely uncertain in a way §13.4.1's head-room does not reveal, and metric (2) is a day's work standing between a recommendation and a maybe.

## 13.6 Segmentation, and how much of it step-tap deletes

§4.4 called this "where a naive build will actually fail." It is smaller than it was, for one structural reason and one practical one.

**The open-source answer exists and is Apache-2.0.** [DBNet](https://www.paddleocr.ai/v2.10.0/en/algorithm/text_detection/algorithm_det_db.html) is the standard differentiable-binarization text detector and ships in both PaddleOCR and docTR under Apache-2.0, weights included. The honest caveat is that its published numbers are on scene text (ICDAR2015, Hmean 82.4% for the ResNet50 variant) and printed forms (docTR reports ~73-74% recall on FUNSD) — **nobody publishes detection recall on handwritten mathematics on paper**, and it is out of distribution there as surely as the recognizers are. What makes that tolerable is that detection is a far more forgiving task than recognition: a box only has to be approximately right, and a slightly loose crop costs a recognizer very little.

**The structural reason it shrinks: verification is order-free, and reading order is where page parsing actually breaks.** Transcription needs to know that this line is step 3 and that one is step 4. Verification does not. The question is *"does any detected line on this page score highly for this expected string?"* — a search over the page rather than a parse of it. Every ordering failure, every column-detection failure, every "which of these two lines came first" failure simply stops being an error mode. What remains is line **detection**, which is the solved half.

**And the practical one: the search is bounded and tiny.** §6.2 measures a median of 4 canonical steps and a maximum of 10, and a page of working has of the order of ten lines. Ten lines against ten candidates is a hundred scored pairs — and per §13.4.2 the encoder runs once per line, so the cost is ten encoder passes and a batched decoder, not a hundred forward passes.

**Try the classical version first.** Before any learned detector, a horizontal projection profile over a binarized page — OpenCV, BSD-3-Clause, about twenty lines of code — segments lines of handwriting on unruled paper adequately in the common case. It is worth an hour before DBNet is worth a day, and §13.5's protocol can be run on hand-cropped lines and needs no detector at all.

## 13.7 What it costs in this stack

The two facts that change §4.3's arithmetic are both favourable, and one of them retires a MODELLED figure with a vendor measurement.

**§4.3's B1 row was modelled at 4 s per page and the vendor numbers say otherwise.** PaddleOCR publishes CPU inference times for the whole formula-recognition family: **PP-FormulaNet-S at 254 ms, `_plus-S` at 261 ms, `_plus-M` at 1,616 ms, PP-FormulaNet-L at 3,132 ms, and UniMERNet at 8,288 ms** per expression. These are Baidu's own benchmark on unstated CPU hardware, so treat them as vendor claims and not as measurements on a Lambda — but they bracket the truth far better than my estimate did, and they span 30x, which is itself the finding: **the model choice moves the cost by more than the hosting choice does.**

Per page, with §13.6's bound of ~10 detected lines and §13.4.2's observation that verification costs one encoder pass per line plus a batched decoder:

| | per-line CPU (vendor) | ~10 lines/page | Lambda GB-s at 10 GB | free-tier headroom (400,000 GB-s/mo) |
|---|---|---|---|---|
| **PP-FormulaNet-S** | 254 ms | ~2.5 s | ~25 | **~16,000 pages/month, i.e. ~500/day, free** |
| **PP-FormulaNet_plus-M** | 1,616 ms | ~16 s | ~160 | ~2,500 pages/month, ~80/day |
| **UniMERNet** | 8,288 ms | ~83 s | ~830 | ~480 pages/month, ~16/day |

Priced at §4.3's three volumes, x86 at $0.0000166667/GB-s after the free 400,000:

| | 20/day | 200/day | 2,000/day |
|---|---|---|---|
| **PP-FormulaNet-S**, Lambda CPU | **$0** | **$0** | **~$19/mo** |
| **UniMERNet**, Lambda CPU | ~$2/mo | **~$77/mo** | ~$834/mo |
| Uni-MuMER-Qwen3-VL-2B, batched GPU (§4.3) | ~$2/mo | ~$8/mo | ~$64/mo |

**The model choice, not the hosting choice, is what decides the bill — and it inverts at scale.** UniMERNet on CPU is the cheapest thing here at 20 uploads a day and thirteen times more expensive than a batched GPU at 2,000, because Lambda charges for every second of a 30x-slower model while a batched GPU amortises. If §13.5 says UniMERNet is the model that works, the hosting decision has to be re-taken at whatever volume the feature actually sees, and §11's sixth hole — nobody knows that volume — becomes load-bearing rather than incidental.

Both CPU models fit Lambda's 10 GB memory ceiling and the container-image path (§4.2); UniMERNet's 1.5 GB artefact quantizes down and is well inside the 10 GB image limit, though ECR's 500 MB free tier stops covering it.

**Uni-MuMER-Qwen3-VL-2B is a GPU model and §4.3's B2 rows apply unchanged**: ~$2/month batched at 20 uploads/day, ~$8 at 200, ~$64 at 2,000, on ml.g4dn.xlarge at $0.7364/hr.

**A caution on all six of those figures.** They assume verification costs about what free decoding costs per line, which §13.4.2 argues is conservative, and they inherit the vendor CPU numbers wholesale. Nothing here has been timed in a Lambda. That is unchanged from §11 and it remains the softest input to the cost.

## 13.8 The subprocessor question: still live, and the ground under it has moved

**Ruling 1 removed the vendor branch, not this one.** The owner declined to chase *quotes*; AWS is not a quote, it is the bill he already pays. So the §8 fork stands, and one fact has changed since §8 was written that makes it a genuinely different question.

**Amazon Bedrock now serves open-weight models as fully managed serverless endpoints, and one of them is multimodal.** `qwen.qwen3-vl-235b-a22b` — Qwen3-VL-235B-A22B, text + vision — is listed Active on Bedrock, alongside eighteen other open-weight models added from Google, Mistral, Qwen, NVIDIA, OpenAI and others ([AWS: Qwen on Bedrock](https://aws.amazon.com/blogs/aws/qwen-models-are-now-available-in-amazon-bedrock/), [AWS: 18 open-weight models](https://aws.amazon.com/blogs/aws/amazon-bedrock-adds-fully-managed-open-weight-models/)).

**That narrows the legal question considerably, and it is still not mine to answer.** §8's version was "does sending the image to Anthropic's or Google's proprietary model count as third-party sharing." The version now available is: *AWS runs, in your account's region, weights that are openly published and which you could otherwise download and host yourself, under terms stating that inputs are not stored, not shared with model providers, and not used for training.* There is no third party holding the weights as a trade secret, because there is no secret. Whether that clears §6's posture is a reading of the posture, and §8's refusal to make it stands.

**The tradeoff, priced, so the owner can see what the reading is worth.** Bedrock's Qwen3-VL-235B is **$0.53 per million input tokens and $2.66 per million output** in us-east-1, with **Batch at $0.26 / $1.33** ([Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)). A page image plus a short verification prompt is of the order of 1,500 input tokens and a couple of hundred output, so roughly **$0.0013 per page on demand and $0.0007 batched**:

| | 20/day | 200/day | 2,000/day |
|---|---|---|---|
| Bedrock, Qwen3-VL-235B, on demand | **~$0.80/mo** | ~$8/mo | ~$79/mo |
| Bedrock, same, Batch | ~$0.40/mo | ~$4/mo | ~$40/mo |
| Self-hosted Uni-MuMER-Qwen3-VL-2B, batched GPU | ~$2/mo | ~$8/mo | ~$64/mo |
| Self-hosted UniMERNet, CPU Lambda (§13.7) | ~$2/mo | ~$77/mo | ~$834/mo |

**So the managed 235 B model costs the same as or less than the self-hosted 2.1 B one, with no endpoint, no cold start, no container and no model to keep patched.** That is a 100x difference in model capacity for no difference in bill, and it is the single largest lever left in this document — which is exactly why the reading matters and why it should be made deliberately rather than by default.

Two things temper it. §2.2 measures frontier VLMs at 22.96-28.14% exact-match on photographed handwritten math, worse than a 6.4 M specialist, so raw scale is not the same as accuracy here — although §2.2's own third caveat explains that ExpRate treats these models unfairly, and §13.4's verification framing sidesteps the metric entirely. And a token-priced API cannot be teacher-forced: **the likelihood-scoring mechanism in §13.4.2 is unavailable through Bedrock's text API**, which returns tokens and not scores. A Bedrock build would have to ask the model in words ("does this page contain the value X?") and trust the answer, which forfeits both the abstention calibration in §13.4.3 and the cost advantage in §13.4.2. That is a real and specific architectural cost of the managed route, and it is not obvious from the price table.

## 13.9 What is unmeasured

Everything in §11 still applies. These are additional, and the first three are the ones that would change the answer.

1. **No verification metric exists for any HMER model, anywhere.** §13.4.1's 21.6-point head-room is inferred from an error-tolerance column that measures something adjacent, not the thing. §13.5 exists because of this. **Unmeasured.**
2. **PP-FormulaNet's handwriting performance is unpublished.** The fastest and smallest Apache-2.0 candidate — the one §13.7 shows is free through ~500 uploads a day — has no handwritten test result at all, only a qualitative figure. **Unmeasured, and cheap to settle.**
3. **§13.4.3's trap is argued, not measured.** That student-error magnitude and OCR-error magnitude coincide follows from the ≤1/≤2 columns and from what a student slip looks like; I have not run a single image through a single model to confirm it. Metric (2) in §13.5 is precisely this claim, made falsifiable. **Unmeasured.**
4. **No open model has a page-level (tier-3) number** — unchanged from §11 hole 8, and now sharper: the licence audit removed the models one might have benchmarked.
5. **Line-detection recall on handwritten mathematics on paper is unpublished** for DBNet or anything else (§13.6).
6. **Nothing here has been timed on Lambda.** §13.7 rests on Baidu's CPU benchmark on unstated hardware.
7. **I read licence texts; I am not counsel.** §13.2 is a careful reading of what each project published, including the Qwen research licence verbatim. The conclusion that a fine-tune cannot enlarge its base's grant is the standard reading of derivative-work licensing and it is not a legal opinion. **The four unlicensed repositories are the least ambiguous row and the most consequential: absence of a licence is absence of a grant, and no reading rescues it.**
8. **Uni-MuMER's model-zoo "Avg ExpRate" spans an unstated set of benchmarks** and is not the same denominator as the paper's CROHME-average (72.19% vs 79.74% for the same 3 B model). The 72.49% for the Qwen3-VL-2B variant inherits that ambiguity.
9. **Phase 0 is not in the tree** (§13.0). Everything in §13.4.3 and §13.5 that depends on a learner-supplied step index is contingent on it shipping.

## 13.10 Recommendation

**Do not build yet. Run §13.5 first — it is an afternoon and it can close the question.** The single most valuable output of this note is that metric (2) exists and is cheap, because §13.4.3 makes the outcome genuinely uncertain in a way the head-room figure conceals.

If it must be sequenced as work:

1. **Now, before any build: the §13.5 measurement**, on hand-cropped lines, no detector, no AWS. PP-FormulaNet-S first (254 ms, 224 MB, Apache-2.0, unknown on handwriting), then UniMERNet (Apache-2.0, 68.0/84.1/89.6 on HME100K). Report all three metrics; **metric (2) is the gate**.
2. **Then, if metric (3) shows usable coverage at 95% precision:** UniMERNet or PP-FormulaNet-S in a CPU Lambda container behind a horizontal-projection line splitter, scoring the item's own `worked_solution` candidates by teacher-forced likelihood, abstaining below the calibrated margin, and speaking only to corroborate the learner's step-tap. Free to somewhere between 16 and 500 uploads a day depending which model survives step 1 (§13.7).
3. **Never: CoMER, TAMER, PosFormer, ICAL, Nougat, or Uni-MuMER-Qwen2.5-VL-3B.** §13.2. If a future note quotes 72.66% or 69.50% as an option, it is quoting a model this project cannot use.
4. **In parallel, and independent of all of the above: get the subprocessor reading** (§13.8). It is worth 100x the model capacity at the same price, it now concerns open weights rather than a vendor's secret, and it is the one decision here that no amount of engineering substitutes for.

**And if §13.5 comes back negative — if the model confirms the diverging step as readily as the correct one — that closes the question rather than deferring it.** The product would then have exactly what Phase 0 gives it, which §6 argues is most of the value, and the right answer would be to stop. That outcome is worth naming in advance so that it can be reported as a result rather than absorbed as a delay.

## 13.11 Sources added by this section

**Licence facts (read directly, 2026-08-05):** GitHub REST `/repos/{owner}/{repo}/license` and root listings for [CoMER](https://github.com/Green-Wood/CoMER), [TAMER](https://github.com/qingzhenduyu/TAMER), [PosFormer](https://github.com/SJTU-DeepVisionLab/PosFormer), [ICAL](https://github.com/qingzhenduyu/ICAL), [GOT-OCR2.0](https://github.com/Ucas-HaoranWei/GOT-OCR2.0), [Uni-MuMER](https://github.com/BFlameSwift/Uni-MuMER), [UniMERNet](https://github.com/opendatalab/UniMERNet), [nougat](https://github.com/facebookresearch/nougat), [surya](https://github.com/datalab-to/surya), [marker](https://github.com/datalab-to/marker), [MinerU](https://github.com/opendatalab/MinerU), [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), [docTR](https://github.com/mindee/doctr), [EasyOCR](https://github.com/JaidedAI/EasyOCR), [CRAFT](https://github.com/clovaai/CRAFT-pytorch), [LAST](https://github.com/HCIILAB/LAST) · Hugging Face `cardData.license` for [Uni-MuMER-Qwen3-VL-2B](https://huggingface.co/phxember/Uni-MuMER-Qwen3-VL-2B), [Qwen2.5-VL-3B-Instruct](https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct), [Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct), [unimernet_base](https://huggingface.co/wanderkid/unimernet_base), [nougat-base](https://huggingface.co/facebook/nougat-base), [trocr-base-handwritten](https://huggingface.co/microsoft/trocr-base-handwritten) · the [Qwen Research License Agreement](https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct/raw/main/LICENSE) text.

**Benchmarks and methods:** [UniMERNet](https://arxiv.org/html/2404.15254v1) (Table 6, the error-tolerance columns) · [TAMER, AAAI 2025](https://ojs.aaai.org/index.php/AAAI/article/download/33190/35345) (the candidate-scoring inference mechanism) · [PP-FormulaNet](https://arxiv.org/html/2503.18382) · [PaddleOCR formula-recognition module](https://www.paddleocr.ai/main/en/version3.x/module_usage/formula_recognition.html) (model sizes, CPU times) · [DBNet in PaddleOCR](https://www.paddleocr.ai/v2.10.0/en/algorithm/text_detection/algorithm_det_db.html).

**AWS (vendor claims):** [Qwen models on Bedrock](https://aws.amazon.com/blogs/aws/qwen-models-are-now-available-in-amazon-bedrock/) · [Bedrock adds 18 open-weight models](https://aws.amazon.com/blogs/aws/amazon-bedrock-adds-fully-managed-open-weight-models/) · [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/).
