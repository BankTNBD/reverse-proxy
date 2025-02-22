import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

import { tcpServer } from "./tcp.js";
import { httpsServer } from "./https.js";

// check if list file are exist
let list; 
try {
    list = JSON.parse(fs.readFileSync("./list.json", "utf-8"));
} catch (err) {
    console.error("cannot reading list file");
    process.exit(1);
}

// create list of tcp server and https server
let tcpList = [];
let httpsList = [];

// grouping list by port
function createPortList(port, list, proxy) {
    let listObj = list.find(obj => obj.port === port);

    if (listObj) {
        listObj.list.push({ host: proxy.host, forward: proxy.forward, port: proxy.port });
        list = list.map(obj => obj.port === port ? listObj : obj);
    } else {
        list.push({ port: port, list: [{ host: proxy.host, forward: proxy.forward, port: proxy.port }] });
    }
    return list;
}

// add to list
for (const value of list) {
    switch (value.protocol.toLowerCase()) {
        case "tcp":
            tcpList = createPortList(value.port, tcpList, { host: value.host, forward: value.forward.address, port: value.forward.port });
            break;
        case "http":
            tcpList = createPortList(value.port, tcpList, { host: value.host, forward: value.forward.address, port: value.forward.port });
            break;
        case "https":
            httpsList = createPortList(value.port, httpsList, { host: value.host, forward: value.forward.address, port: value.forward.port });
        break;
    }
}

// create tcp server for every port
tcpList.forEach((value) => {
    tcpServer(value.port, value.list);
});
// create https server for every port
httpsList.forEach((value) => {
    httpsServer(value.port, value.list);
});