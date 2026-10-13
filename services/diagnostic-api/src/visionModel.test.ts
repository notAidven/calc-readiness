import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { describe, expect, it } from "vitest";

import { createBedrockVisionModel } from "./bedrockVisionModel";
import { createHttpVisionModel } from "./httpVisionModel";
import { createSecretsManagerResolver } from "./secrets";
import {
  costMicroUsd,
  MAX_VISION_IMAGE_BYTES,
  type VisionModel,
  type VisionModelRequest,
} from "./visionModel";
import { DEFAULT_WORK_UPLOAD_PARSER, selectVisionModel } from "./workUploadParseSeam";

/**
 * **BOTH ADAPTERS, THROUGH THE SAME CONTRACT, WITHOUT A NETWORK.**
 *
 * "The provider is swappable" is the kind of claim that is always made and rarely measured.
 * The measurement is this file: two implementations of `VisionModel`, run through the same
 * assertions, with the vendor SDK's `send` and the runtime's `fetch` both replaced by a
 * local function. Nothing here opens a socket, resolves a credential or bills anybody.
 *
 * What that does NOT establish is that either request shape is one its provider accepts.
 * A wire format is a fact about somebody else's server and cannot be learned from here; the
 * PR says so plainly rather than letting a green suite imply otherwise. What it does
 * establish is everything on our side of the wire: that the deadline is honoured, that the
 * key comes from Secrets Manager and never from the environment, that a non-2xx is an error
 * rather than an empty reading, that plaintext is refused, and that the usage a provider
 * reports is the usage the spend ledger records.
 */

const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);

function request(overrides: Partial<VisionModelRequest> = {}): VisionModelRequest {
  return {
    instructions: "read the working",
    image: { bytes: IMAGE, contentType: "image/jpeg" },
    maxOutputTokens: 700,
    ...overrides,
  };
}

/** A `BedrockRuntimeClient` whose `send` is a local function. */
function fakeBedrock(
  reply: unknown,
  record: { commands: unknown[]; options: unknown[] },
): BedrockRuntimeClient {
  return {
    send: async (command: unknown, options: unknown) => {
      record.commands.push((command as { input: unknown }).input);
      record.options.push(options);
      if (reply instanceof Error) {
        throw reply;
      }
      return reply;
    },
  } as unknown as BedrockRuntimeClient;
}

describe("the two adapters satisfy one contract", () => {
  /**
   * Both providers, built the way the composition root builds them, with their transport
   * replaced. Everything in the shared block below is asserted against BOTH — which is what
   * makes the swap a measured property rather than a design intention.
   */
  const shared: [string, () => { model: VisionModel; calls: () => number }][] = [
    [
      "the default keyless adapter",
      () => {
        const record = { commands: [] as unknown[], options: [] as unknown[] };
        return {
          model: createBedrockVisionModel({
            modelId: "a-vision-model",
            client: fakeBedrock(
              {
                output: { message: { content: [{ text: '{"readable":true}' }] } },
                usage: { inputTokens: 2461, outputTokens: 187 },
              },
              record,
            ),
          }),
          calls: () => record.commands.length,
        };
      },
    ],
    [
      "the configurable chat-completions adapter",
      () => {
        let calls = 0;
        return {
          model: createHttpVisionModel({
            endpoint: "https://models.example.test/v1/chat/completions",
            modelId: "a-vision-model",
            apiKeySecretArn: "arn:aws:secretsmanager:us-east-1:1:secret:vision",
            resolveSecret: async () => "sk-not-a-real-key",
            fetchImpl: async () => {
              calls += 1;
              return new Response(
                JSON.stringify({
                  choices: [{ message: { content: '{"readable":true}' } }],
                  usage: { prompt_tokens: 2461, completion_tokens: 187 },
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            },
          }),
          calls: () => calls,
        };
      },
    ],
  ];

  it("covers both registered providers, so this is a contract and not one implementation", () => {
    // The floor with a shape: two cases, and they are the two the registry offers. A third
    // provider added without a row here would leave it untested while this file still read
    // like a contract suite.
    expect(shared).toHaveLength(2);
    expect(shared.map(([name]) => name)).toEqual([
      "the default keyless adapter",
      "the configurable chat-completions adapter",
    ]);
  });

  for (const [name, build] of shared) {
    it(`${name}: returns the text and the provider's own token counts`, async () => {
      const { model, calls } = build();
      const reply = await model.invoke(request());
      expect(reply.text).toBe('{"readable":true}');
      // Reported, not estimated. A guessed token count is a guessed number in a budget check
      // (`visionModel.ts`), so both adapters read the provider's figures verbatim.
      expect(reply.usage).toEqual({ inputTokens: 2461, outputTokens: 187 });
      expect(calls()).toBe(1);
    });

    it(`${name}: carries a stable id and the configured model id onto every ledger row`, async () => {
      const { model } = build();
      expect(model.id).not.toBe("");
      expect(model.modelId).toBe("a-vision-model");
    });

    it(`${name}: costs what the price table says, to the micro-dollar`, async () => {
      const { model } = build();
      const reply = await model.invoke(request());
      // 2461 input at $3/M + 187 output at $15/M = 7383 + 2805 = 10,188 micro-dollars, i.e.
      // just over a cent for a page-sized photograph.
      expect(
        costMicroUsd(reply.usage, {
          inputUsdPerMillionTokens: 3,
          outputUsdPerMillionTokens: 15,
        }),
      ).toBe(10_188);
    });
  }
});

describe("the default adapter, which needs no key at all", () => {
  it("puts the contract in the system turn and the photograph in the user turn", async () => {
    // A photographed page is untrusted input, and it is untrusted input being handed to a
    // model with an output contract. Keeping the contract out of the user turn is the cheap
    // half of not having it argued with.
    const record = { commands: [] as unknown[], options: [] as unknown[] };
    const model = createBedrockVisionModel({
      modelId: "a-vision-model",
      client: fakeBedrock(
        { output: { message: { content: [{ text: "{}" }] } }, usage: {} },
        record,
      ),
    });
    await model.invoke(request({ instructions: "READ THE WORKING" }));
    const input = record.commands[0] as {
      system: { text: string }[];
      messages: { role: string; content: { image?: { format: string } }[] }[];
      inferenceConfig: { maxTokens: number; temperature: number };
    };
    expect(input.system[0]?.text).toBe("READ THE WORKING");
    expect(input.messages[0]?.role).toBe("user");
    expect(input.messages[0]?.content[0]?.image?.format).toBe("jpeg");
    expect(input.messages[0]?.content.some((block) => "text" in block)).toBe(false);
    expect(input.inferenceConfig).toEqual({ maxTokens: 700, temperature: 0 });
  });

  it("passes the caller's deadline to the SDK rather than racing it", async () => {
    const record = { commands: [] as unknown[], options: [] as unknown[] };
    const model = createBedrockVisionModel({
      modelId: "a-vision-model",
      client: fakeBedrock(
        { output: { message: { content: [{ text: "{}" }] } }, usage: {} },
        record,
      ),
    });
    const controller = new AbortController();
    await model.invoke(request({ signal: controller.signal }));
    expect((record.options[0] as { abortSignal?: AbortSignal }).abortSignal).toBe(
      controller.signal,
    );
  });

  it("answers 0 tokens rather than a guess when the provider reports none", async () => {
    const record = { commands: [] as unknown[], options: [] as unknown[] };
    const model = createBedrockVisionModel({
      modelId: "a-vision-model",
      client: fakeBedrock({ output: { message: { content: [] } } }, record),
    });
    const reply = await model.invoke(request());
    expect(reply.text).toBe("");
    expect(reply.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("refuses a container it cannot name, rather than guessing one", async () => {
    // Unreachable through the route (ingest sniffs the bytes and stores one of three types),
    // but a guess here would send the provider a mislabelled container and get back a
    // confident reading of nothing.
    const record = { commands: [] as unknown[], options: [] as unknown[] };
    const model = createBedrockVisionModel({
      modelId: "a-vision-model",
      client: fakeBedrock({}, record),
    });
    await expect(
      model.invoke(request({ image: { bytes: IMAGE, contentType: "image/heic" } })),
    ).rejects.toThrow(/image\/heic/);
    expect(record.commands).toHaveLength(0);
  });

  it("lets a provider failure through, for the route to degrade on", async () => {
    // The adapter does not swallow anything: `workUploadParse.ts` owns the degradation, in
    // one place, so every provider fails the same way in front of a learner.
    const record = { commands: [] as unknown[], options: [] as unknown[] };
    const model = createBedrockVisionModel({
      modelId: "a-vision-model",
      client: fakeBedrock(new Error("ThrottlingException"), record),
    });
    await expect(model.invoke(request())).rejects.toThrow(/Throttling/);
  });
});

describe("the configurable adapter, and the key it never puts in the environment", () => {
  function build(
    overrides: Partial<Parameters<typeof createHttpVisionModel>[0]> = {},
    onRequest?: (url: string, init: RequestInit) => Response,
  ) {
    const seen: { url: string; init: RequestInit }[] = [];
    const model = createHttpVisionModel({
      endpoint: "https://models.example.test/v1/chat/completions",
      modelId: "a-vision-model",
      apiKeySecretArn: "arn:aws:secretsmanager:us-east-1:1:secret:vision",
      resolveSecret: async () => "sk-not-a-real-key",
      fetchImpl: async (url, init) => {
        seen.push({ url: String(url), init: init ?? {} });
        return (
          onRequest?.(String(url), init ?? {}) ??
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "{}" } }],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200 },
          )
        );
      },
      ...overrides,
    });
    return { model, seen };
  }

  it("refuses a plaintext endpoint at construction, not on a learner's request", () => {
    expect(() =>
      createHttpVisionModel({
        endpoint: "http://models.example.test/v1/chat/completions",
        modelId: "m",
        apiKeySecretArn: "arn",
        resolveSecret: async () => "k",
      }),
    ).toThrow(/https/);
  });

  it("sends the key it was given as a bearer token, and only in the header", async () => {
    const { model, seen } = build();
    await model.invoke(request());
    const headers = seen[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-not-a-real-key");
    // Not in the body, not in the URL: the two places a credential ends up in a log.
    expect(String(seen[0]?.init.body)).not.toContain("sk-not-a-real-key");
    expect(seen[0]?.url).not.toContain("sk-not-a-real-key");
  });

  it("can present the key as an api-key header instead", async () => {
    const { model, seen } = build({ authScheme: "x-api-key" });
    await model.invoke(request());
    const headers = seen[0]?.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-not-a-real-key");
    expect(headers.authorization).toBeUndefined();
  });

  it("inlines the photograph as a data URI, never as a URL into our bucket", async () => {
    const { model, seen } = build();
    await model.invoke(request());
    const body = JSON.parse(String(seen[0]?.init.body)) as {
      messages: { role: string; content: unknown }[];
      max_tokens: number;
      temperature: number;
    };
    expect(body.messages[0]?.role).toBe("system");
    const content = (body.messages[1]?.content ?? []) as {
      type: string;
      image_url: { url: string };
    }[];
    const image = content[0];
    expect(image?.type).toBe("image_url");
    expect(image?.image_url.url.startsWith("data:image/jpeg;base64,")).toBe(true);
    // Round-trips: the provider is shown the bytes we hold, not a re-encoding of something.
    const base64 = image?.image_url.url.split(",")[1] ?? "";
    expect([...atob(base64)].map((c) => c.charCodeAt(0))).toEqual([...IMAGE]);
    expect(body.max_tokens).toBe(700);
    expect(body.temperature).toBe(0);
  });

  it("encodes a photograph too big for `String.fromCharCode(...)` in one call", async () => {
    // The chunking in `dataUri` exists because spreading a multi-megabyte array into
    // `fromCharCode` blows the argument limit on every runtime that has one — which would be
    // a crash on exactly the large photographs this feature is for.
    const big = new Uint8Array(MAX_VISION_IMAGE_BYTES - 1).fill(0x41);
    const { model, seen } = build();
    await model.invoke(request({ image: { bytes: big, contentType: "image/png" } }));
    const body = JSON.parse(String(seen[0]?.init.body)) as {
      messages: { content: { image_url: { url: string } }[] }[];
    };
    const url = body.messages[1]?.content[0]?.image_url.url ?? "";
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(atob(url.split(",")[1] ?? "").length).toBe(big.length);
  });

  it("treats a non-2xx as a failure, and says only the status", async () => {
    // A provider's error body can quote the request back, and this message reaches a log. A
    // photograph's data URI in CloudWatch would undo the private bucket entirely.
    const { model } = build(
      {},
      () =>
        new Response(
          JSON.stringify({ error: { message: "bad image data:image/jpeg;base64,AAAA" } }),
          {
            status: 429,
          },
        ),
    );
    await expect(model.invoke(request())).rejects.toThrow(/answered 429/);
    await expect(model.invoke(request())).rejects.not.toThrow(/base64/);
  });

  it("aborts when the caller's deadline fires", async () => {
    const controller = new AbortController();
    const { model } = build({}, (_url, init) => {
      controller.abort();
      if ((init.signal as AbortSignal | undefined)?.aborted) {
        throw new DOMException("aborted", "AbortError");
      }
      return new Response("{}", { status: 200 });
    });
    await expect(model.invoke(request({ signal: controller.signal }))).rejects.toThrow();
  });
});

describe("the secret resolver", () => {
  function fakeSecretsManager(values: Record<string, string | undefined>) {
    const reads: string[] = [];
    const client = {
      send: async (command: { input: { SecretId: string } }) => {
        reads.push(command.input.SecretId);
        return { SecretString: values[command.input.SecretId] };
      },
    } as unknown as SecretsManagerClient;
    return { client, reads };
  }

  it("reads a secret once per container and shares it", async () => {
    const { client, reads } = fakeSecretsManager({ arn: "sk-value" });
    const resolve = createSecretsManagerResolver({ client });
    const [first, second] = await Promise.all([resolve("arn"), resolve("arn")]);
    expect(first).toBe("sk-value");
    expect(second).toBe("sk-value");
    expect(await resolve("arn")).toBe("sk-value");
    // Once, including for the two concurrent first callers: Secrets Manager bills per
    // 10,000 calls and rate-limits, and a per-request read would add latency for nothing.
    expect(reads).toEqual(["arn"]);
  });

  it("does not cache a failure, so a cold-start throttle is retried", async () => {
    let attempts = 0;
    const client = {
      send: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("ThrottlingException");
        }
        return { SecretString: "sk-value" };
      },
    } as unknown as SecretsManagerClient;
    const resolve = createSecretsManagerResolver({ client });
    await expect(resolve("arn")).rejects.toThrow(/Throttling/);
    // Without the cache eviction, this container would be poisoned for its whole life.
    expect(await resolve("arn")).toBe("sk-value");
    expect(attempts).toBe(2);
  });

  it("names an empty or binary secret rather than sending an empty header", async () => {
    const { client } = fakeSecretsManager({ arn: undefined });
    const resolve = createSecretsManagerResolver({ client });
    // The alternative is an empty `Authorization` header and reading the provider's 401 as a
    // model failure, which would degrade to "we couldn't read your work" forever.
    await expect(resolve("arn")).rejects.toThrow(/holds no string value/);
  });
});

describe("the registry chooses a provider, and nothing else names one", () => {
  it("builds the default without any key material at all", () => {
    const model = selectVisionModel(DEFAULT_WORK_UPLOAD_PARSER, {
      modelId: "a-vision-model",
    });
    expect(model.modelId).toBe("a-vision-model");
  });

  it("refuses the key-bearing provider until its destination is configured", () => {
    // It names no vendor of its own, so an endpoint and a secret are not optional extras —
    // without them there is nowhere to send the photograph and nothing to send it with.
    expect(() =>
      selectVisionModel("http-chat-completions", { modelId: "a-vision-model" }),
    ).toThrow(/WORK_UPLOAD_PARSE_ENDPOINT/);
    const built = selectVisionModel("http-chat-completions", {
      modelId: "a-vision-model",
      endpoint: "https://models.example.test/v1/chat/completions",
      apiKeySecretArn: "arn:aws:secretsmanager:us-east-1:1:secret:vision",
      resolveSecret: async () => "k",
    });
    expect(built.id).toBe("http-chat-completions");
  });
});
