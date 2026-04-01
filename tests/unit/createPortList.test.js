import test from "node:test";
import assert from "node:assert";
import { createPortList } from "../../libs/createPortList.js";

test("creates new port group if not exists", () => {
    const list = [];

    createPortList(80, list, {
        host: "example.com",
        forward: "127.0.0.1",
        port: 3000
    });

    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].port, 80);
    assert.strictEqual(list[0].list.length, 1);
});

test("adds proxy to existing port group", () => {
    const list = [];

    createPortList(80, list, {
        host: "a.com",
        forward: "127.0.0.1",
        port: 3000
    });

    createPortList(80, list, {
        host: "b.com",
        forward: "127.0.0.1",
        port: 4000
    });

    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].list.length, 2);
});

test("creates separate groups for different ports", () => {
    const list = [];

    createPortList(80, list, {
        host: "a.com",
        forward: "127.0.0.1",
        port: 3000
    });

    createPortList(443, list, {
        host: "b.com",
        forward: "127.0.0.1",
        port: 4000
    });

    assert.strictEqual(list.length, 2);
});

test("stores correct proxy data structure", () => {
    const list = [];

    const proxy = {
        host: "example.com",
        forward: "192.168.1.1",
        port: 5000
    };

    createPortList(80, list, proxy);

    assert.deepStrictEqual(list[0].list[0], {
        host: "example.com",
        forward: "192.168.1.1",
        port: 5000
    });
});

test("does not modify original proxy object", () => {
    const list = [];

    const proxy = {
        host: "example.com",
        forward: "127.0.0.1",
        port: 3000
    };

    createPortList(80, list, proxy);

    // ensure it's copied, not referenced (important)
    assert.notStrictEqual(list[0].list[0], proxy);
});