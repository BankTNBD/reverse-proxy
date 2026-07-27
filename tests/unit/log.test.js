process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import dotenv from "dotenv";

// load test env
dotenv.config({ path: "./config/.env.test" });

import { log } from "../../libs/log.js";

test("log writes to file", async () => {
    await fs.writeFile(process.env.LOG, ""); // Clear the log file before reading
    await log("info", "hello test");
    const content = await fs.readFile(process.env.LOG, "utf-8");

    assert.match(content, /hello test/);
});