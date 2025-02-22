import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

import { tcpServer } from "./tcp.js";
import { httpsServer } from "./https.js";

let list; 
try {
    list = JSON.parse(fs.readFileSync("./list.json", "utf-8"));
} catch (err) {
    console.error("cannot reading list file");
    process.exit(1);
}


let listPort = [];
for (const value of list) {
    if (listPort.includes(value.port)) {
        console.error("port", value.port, "duplicated");
        continue;
    }
    listPort.push(value.port);
    switch (value.protocol.toLowerCase()) {
        case "tcp":
            tcpServer(value.name, value.port, value.host, value.forward);
            break;
        case "http":
            tcpServer(value.name, value.port, value.host, value.forward);
            break;
        case "https":
            httpsServer(value.name, value.port, value.host, value.forward);
            break;
    }
}