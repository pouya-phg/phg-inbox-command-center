import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the real server helper while replacing only its session provider.
const source = readFileSync(new URL("../src/lib/addon-auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const oldKey = "previously-public-addon-key";

function helper(session, fails = false) {
  const exports = {};
  runInNewContext(compiled, {
    exports,
    process: { env: { ADDON_API_KEY: oldKey } },
    require(name) {
      assert.equal(name, "./auth");
      return {
        getAuthSession: async () => {
          if (fails) throw new Error("Session verification failed");
          return session;
        },
        isAuthorized: (email) => email === "owner@phg.example",
      };
    },
  });
  return exports.isAuthenticated;
}

test("an authorized verified session is accepted", async () => {
  assert.equal(await helper({ user: { email: "owner@phg.example" } })(), true);
});

test("a previously public key cannot replace a verified session", async () => {
  const req = new Request("https://inbox.example/api/emails", { headers: { "x-addon-key": oldKey } });
  assert.equal(await helper(null)(req), false);
});

test("an unauthorized user cannot elevate access with the old key", async () => {
  const req = new Request("https://inbox.example/api/emails", { headers: { "x-addon-key": oldKey } });
  assert.equal(await helper({ user: { email: "other@example.test" } })(req), false);
});

test("missing user identity and failed session verification fail closed", async () => {
  assert.equal(await helper({})(), false);
  assert.equal(await helper(null, true)(), false);
});

test("the add-in does not embed or send a shared API credential", () => {
  const page = readFileSync(new URL("../src/app/outlook-addon/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /NEXT_PUBLIC_ADDON_API_KEY|x-addon-key/);
});
