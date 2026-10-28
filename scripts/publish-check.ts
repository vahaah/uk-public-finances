import { spawnSync } from "node:child_process";

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["tsc", "--noEmit"]);
run("npx", ["tsx", "scripts/build-snapshots.ts"]);
run("git", ["diff", "--exit-code", "--", "fixtures/snapshots"]);
run("npx", ["vitest", "run"]);
if (process.env.PUBLISH_CHECK_E2E === "1") {
  run("npx", ["playwright", "test"]);
}
