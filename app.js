import fs from "node:fs";
import os from "node:os";
import cluster from "node:cluster";
import dotenv from "dotenv";

dotenv.config();

import { tcpServer } from "./tcp.js";
import { httpsServer } from "./https.js";
import { log } from "./lib/log.js";

const numCPUs = os.availableParallelism(); // Get the number of available CPUs on the machine

// If the current process is the master process
if (cluster.isPrimary) {
    let list;
    try {
        // Read and parse the list of proxies from the 'list.json' file
        list = JSON.parse(fs.readFileSync("./list.json", "utf-8"));
    } catch (err) {
        log("error", `Failed to read or parse 'list.json': ${err.message}`);
        process.exit(1); // Exit the process if there's an error
    }

    // Lists for grouping proxies by port and protocol
    let tcpList = [];
    let httpsList = [];

    // Function to group proxies by their port
    function createPortList(port, list, proxy) {
        let listObj = list.find(obj => obj.port === port);
        
        if (listObj) {
            // Add the proxy to the existing port group
            listObj.list.push({ host: proxy.host, forward: proxy.forward, port: proxy.port });
        } else {
            // Create a new port group for the proxy
            list.push({ port, list: [{ host: proxy.host, forward: proxy.forward, port: proxy.port }] });
        }
    }

    // Loop through the proxies and categorize them based on protocol
    for (const value of list) {
        switch (value.protocol.toLowerCase()) {
            case "tcp":
            case "http":
                createPortList(value.port, tcpList, { host: value.host, forward: value.forward.address, port: value.forward.port });
                break;
            case "https":
                createPortList(value.port, httpsList, { host: value.host, forward: value.forward.address, port: value.forward.port });
                break;
            default:
                log("warn", `Unknown protocol: ${value.protocol}. Skipping entry.`);
                break;
        }
    }

    // Calculate the number of workers to spawn based on available CPUs
    let workers = [];
    let readyWorkers = 0;
    const numWorkers = Math.min(tcpList.length + httpsList.length, numCPUs); // Max workers will be the smaller of available CPUs or proxy types

    // Fork the workers based on the number of proxies
    for (let i = 0; i < numWorkers; i++) {
        let worker = cluster.fork(); // Fork a worker process
        workers.push(worker);
        log("info", `Forked worker ${worker.process.pid}`);

        // Listen for messages from workers
        worker.on("message", (msg) => {
            if (msg.scheme === "ping") {
                // When a worker is ready, it sends a "ping" message
                readyWorkers++; // Increment the count of ready workers
                log("info", `Worker ${worker.process.pid} is ready (${readyWorkers}/${numWorkers})`);

                // Once all workers are ready, assign them tasks (TCP/HTTPS server)
                if (readyWorkers === numWorkers) {
                    let workerIndex = 0;

                    // Distribute the TCP tasks to workers
                    for (const value of tcpList) {
                        const worker = workers[workerIndex++ % numWorkers];
                        worker.send({ scheme: "run", data: ["tcp", value.port, value.list] });
                    }

                    // Distribute the HTTPS tasks to workers
                    for (const value of httpsList) {
                        const worker = workers[workerIndex++ % numWorkers];
                        worker.send({ scheme: "run", data: ["https", value.port, value.list] });
                    }
                }
            }
        });
    }

} else if (cluster.isWorker) {
    // Send a "ping" message to the primary process to signal that the worker is ready
    process.send({ scheme: "ping" });

    // Handle messages from the primary process
    process.on("message", (msg) => {
        if (msg.scheme === "run") {
            const [type, port, list] = msg.data;

            // Start the corresponding server based on the message type (TCP or HTTPS)
            if (type === "tcp") {
                tcpServer(port, list); // Start TCP server
            } else if (type === "https") {
                httpsServer(port, list); // Start HTTPS server
            }
        }
    });

    // Handle any uncaught exceptions that crash the worker
    process.on("uncaughtException", (err) => {
        log("error", `Worker ${process.pid} crashed due to an uncaught exception: ${err.message}`);
        process.exit(1); // Exit the worker process in case of a fatal error
    });
}