import fs from "node:fs";
import os from "node:os";
import cluster from "node:cluster";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: "./config/.env" });

import { tcpServer } from "./functions/tcp.js";
import { httpsServer } from "./functions/https.js";
import { log } from "./libs/log.js";
import { createPortList } from "./libs/createPortList.js";

const numCPUs = os.availableParallelism(); // Get the number of available CPUs on the machine

// If the current process is the master process
if (cluster.isPrimary) {
    let list;
    try {
        // Read and parse the list of proxies from 'config/list.json' or fallback to 'list.json'
        const configPath = fs.existsSync("./config/list.json") ? "./config/list.json" : "./list.json";
        list = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (err) {
        log("error", `Failed to read or parse proxy configuration: ${err.message}`);
        process.exit(1); // Exit the process if there's an error
    }

    // Lists for grouping proxies by port and protocol
    let tcpList = [];
    let httpsList = [];

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
    const numWorkers = Math.min(tcpList.length + httpsList.length, numCPUs); // Max workers will be the smaller of available CPUs or proxy types

    // Group tasks per worker index to distribute them evenly
    const workerTasks = Array.from({ length: numWorkers }, () => []);
    let taskIndex = 0;
    for (const value of tcpList) {
        workerTasks[taskIndex++ % numWorkers].push(["tcp", value.port, value.list]);
    }
    for (const value of httpsList) {
        workerTasks[taskIndex++ % numWorkers].push(["https", value.port, value.list]);
    }

    // Keep track of which worker has which index
    const workerIndices = new Map();

    // Helper function to spawn a worker and assign its tasks
    const spawnWorker = (index) => {
        const worker = cluster.fork();
        workerIndices.set(worker.id, index);
        log("info", `Forked worker ${worker.process.pid} for index ${index + 1}/${numWorkers}`);

        worker.on("message", (msg) => {
            if (msg.scheme === "ping") {
                log("info", `Worker ${worker.process.pid} is ready. Sending assigned tasks...`);
                for (const task of workerTasks[index]) {
                    worker.send({ scheme: "run", data: task });
                }
            }
        });
    };

    // Fork the initial set of workers
    for (let i = 0; i < numWorkers; i++) {
        spawnWorker(i);
    }

    // Listen for workers dying and restart them automatically
    cluster.on("exit", (worker, code, signal) => {
        const index = workerIndices.get(worker.id);
        if (index !== undefined) {
            log("warn", `Worker ${worker.process.pid} (index ${index + 1}) died (code: ${code}, signal: ${signal}). Restarting...`);
            workerIndices.delete(worker.id);
            spawnWorker(index);
        }
    });

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