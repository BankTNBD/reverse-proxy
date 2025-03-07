import net from "node:net";

import { log } from "./lib/log.js";

export function tcpServer(port, list) {
    const server = net.createServer((client) => {
        let proxy = list.find(list => list.host === "*");

        // Case when no wildcard proxy is found and specific host needs to be matched
        if (!proxy) {
            // Trigger when the client sends data
            client.once("data", (data) => {
                try {
                    // Extract the Host header from the data to determine the destination
                    const matchHost = data.toString().match(/Host: ([^\r\n]+)/);

                    // If the Host header is missing, return a bad request
                    if (!matchHost) {
                        log("info", `${client.remoteAddress} - Host header not found.`);
                        client.end("400 Bad Request");
                        return;
                    }

                    // Extract the hostname from the matched Host header (without the port)
                    const hostname = matchHost[1].trim().split(":")[0];
                    // Find the appropriate proxy configuration based on the hostname
                    proxy = list.find(list => list.host.includes(hostname));

                    // If no matching proxy is found, deny the request
                    if (!proxy) {
                        log("info", `${client.remoteAddress} - Host not allowed.`);
                        client.end("403 Forbidden");
                        return;
                    }

                    // Connect to the backend server
                    const forwardedServer = net.createConnection(proxy.port, proxy.forward, () => {
                        log("info", `Forward: ${client.remoteAddress} -> ${proxy.forward}:${proxy.port}`);
                        // Write the data received from the client to the backend server
                        forwardedServer.write(data);
                        // Pipe data from the client to the backend server and vice versa
                        client.pipe(forwardedServer).pipe(client);
                    });

                    // Handle errors while connecting to the backend server
                    forwardedServer.on("error", (err) => {
                        log("error", `Error connecting to backend server: ${err.message}`);
                        client.end("500 Internal Server Error");
                    });
                } catch (err) {
                    // Handle unexpected internal errors
                    log("error", `Internal server error: ${err.message}`);
                    client.end("500 Internal Server Error");
                }
            });

            // Handle errors that occur on the client connection
            client.on("error", (err) => {
                log("error", `Client connection error: ${err.message}`);
                client.end("500 Internal Server Error");
                client.destroy();
            });
        } else {
            // If a wildcard proxy is found, directly forward the data without checking the headers
            const forwardedServer = net.createConnection(proxy.port, proxy.forward, () => {
                log("info", `Forward: ${client.remoteAddress} -> ${proxy.forward}:${proxy.port}`);
                // Bidirectional data transfer between the client and the backend server
                client.pipe(forwardedServer).pipe(client);
            });

            // Handle errors while connecting to the backend server in this case
            forwardedServer.on("error", (err) => {
                log("error", `Error connecting to backend server: ${err.message}`);
                client.end("500 Internal Server Error");
            });

            // Handle errors that occur on the client connection in this case
            client.on("error", (err) => {
                log("error", `Client connection error: ${err.message}`);
            });
        }
    });

    // Handle server-level errors
    server.on("error", (err) => {
        log("error", `TCP Server error: ${err.message}`);
    });

    // Start listening on the provided port and log that the server is running
    server.listen(port, () => {
        log("info", `TCP Reverse Proxy running on port ${port}`);
    });
}