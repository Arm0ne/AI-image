import assert from "node:assert/strict";
import test from "node:test";

import { buildSiteLaunchUrl, LaunchTicketStore } from "./site-launch.js";

test("launch ticket can only be consumed once", () => {
    const store = new LaunchTicketStore(() => 1_000);
    const ticket = store.issue("recent");
    assert.deepEqual(store.consume(ticket), { mode: "recent", expiresAt: 61_000 });
    assert.equal(store.consume(ticket), null);
});

test("expired launch ticket is rejected", () => {
    let now = 1_000;
    const store = new LaunchTicketStore(() => now);
    const ticket = store.issue("new");
    now = 61_000;
    assert.equal(store.consume(ticket), null);
});

test("site launch URL keeps credentials in fragment", () => {
    const url = new URL(buildSiteLaunchUrl({ url: "http://127.0.0.1:17371", token: "secret" }, "choose"));
    assert.equal(url.origin, "https://img.panlai.me");
    assert.equal(url.pathname, "/canvas");
    assert.equal(url.searchParams.get("mode"), "choose");
    assert.equal(url.searchParams.has("agentToken"), false);
    const fragment = new URLSearchParams(url.hash.slice(1));
    assert.equal(fragment.get("agentUrl"), "http://127.0.0.1:17371");
    assert.equal(fragment.get("agentToken"), "secret");
});
