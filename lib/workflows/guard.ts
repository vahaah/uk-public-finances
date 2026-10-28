/** Run a parse inside the health journal. A throw is recorded and returned, not propagated. */
export async function protectBuild<T>(
  build: () => Promise<T> | T,
  journal: (message: string) => Promise<void>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await build() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "parse failed";
    await journal(message);
    return { ok: false, error: message };
  }
}
