
// diff --git a/convex/utils/streams.ts b/convex/utils/streams.ts
export function readableStreamFromIterable<T>(
  iterable: AsyncIterable<T> | Iterable<T>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      for await (const chunk of iterable as AsyncIterable<T>) {
        controller.enqueue(
          typeof chunk === "string" ? encoder.encode(chunk) : (chunk as any)
        );
      }
      controller.close();
    },
  });
}
