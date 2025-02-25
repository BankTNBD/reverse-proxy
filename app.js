import fs from "node:fs";
import os from "node:os";
import cluster from "node:cluster";
import dotenv from "dotenv";

dotenv.config();

import { tcpServer } from "./tcp.js";
import { httpsServer } from "./https.js";

const numCPUs = os.availableParallelism();

if (cluster.isPrimary) {
    // Check if list file are exist
    let list;
    try {
        list = JSON.parse(fs.readFileSync("./list.json", "utf-8"));
    } catch (err) {
        console.error(`Error reading list.json: ${err.message}`);
        process.exit(1);
    }

    // Create list of tcp server and https server
    let tcpList = [];
    let httpsList = [];
    // Grouping list by port
    function createPortList(port, list, proxy) {
        let listObj = list.find(obj => obj.port === port);

        if (listObj) {
            listObj.list.push({ host: proxy.host, forward: proxy.forward, port: proxy.port });
        } else {
            list.push({ port, list: [{ host: proxy.host, forward: proxy.forward, port: proxy.port }] });
        }
    }

    // Add to list
    for (const value of list) {
        switch (value.protocol.toLowerCase()) {
            case "tcp":
            case "http":
                createPortList(value.port, tcpList, { host: value.host, forward: value.forward.address, port: value.forward.port });
                break;
            case "https":
                createPortList(value.port, httpsList, { host: value.host, forward: value.forward.address, port: value.forward.port });
                break;
        }
    }


    let workers = [];
    let readyWorkers = 0;
    const numWorkers = Math.min(tcpList.length + httpsList.length, numCPUs); // Get numbers of CPUs to create worker cluster

    for (let i = 0; i < numWorkers; i++) {
        let worker = cluster.fork(); // Create workers
        workers.push(worker);
        console.log(`Forked worker ${worker.process.pid}`);
        // Trigger when worker ready
        worker.on("message", (msg) => {
            // Whem worker ready will sent "ping" to master
            if (msg.scheme === "ping") {
                readyWorkers++; // Count ready workers
                console.log(`Worker ${worker.process.pid} is ready (${readyWorkers}/${numWorkers})`);
                // When all workers are ready
                if (readyWorkers === numWorkers) {
                    let workerIndex = 0;
                    for (const value of tcpList) {
                        const worker = workers[workerIndex++ % numWorkers];
                        worker.send({ scheme: "run", data: ["tcp", value.port, value.list] }); // Send data to worker
                    }
                    for (const value of httpsList) {
                        const worker = workers[workerIndex++ % numWorkers];
                        worker.send({ scheme: "run", data: ["https", value.port, value.list] }); // Send data to worker
                    }
                }
            }
        });

    }


} else if (cluster.isWorker) {
    process.send({ scheme: "ping" }); // Send "ping" to primary when ready
    // Trigger when primary sent message
    process.on("message", (msg) => {
        if (msg.scheme === "run") {
            const [type, port, list] = msg.data;
            if (type === "tcp") {
                tcpServer(port, list); // Create TCP server
            } else if (type === "https") {
                httpsServer(port, list); // Create HTTPS server
            }
        }
    });

    // Check error
    process.on("uncaughtException", (err) => {
        console.error(`Worker ${process.pid} crashed due to an error:`, err);
        process.exit(1);
    });
}