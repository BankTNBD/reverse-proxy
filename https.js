import http from "node:http";
import https from "node:https";
import fs from "node:fs";

import { log } from "./lib/log.js";

export function httpsServer(port, list) {
    // SSL certificates options
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY, "utf-8"),  // Load SSL private key
        cert: fs.readFileSync(process.env.SSL_CERT, "utf-8") // Load SSL certificate
    };

    // Create HTTPS server for handling incoming requests
    const server = https.createServer(options, (req, res) => {
        // Extract hostname from the 'Host' header of the request
        const hostname = req.headers.host.split(":")[0]; 

        // Validate if hostname is provided in the request
        if (!hostname) {
            log("info", "Host header not found in the request.");
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("400 Bad Request");
            return;
        }

        // Find the proxy rule that matches the hostname
        let proxy = list.find(proxy => proxy.host.includes(hostname)); 

        // Validate if the proxy configuration for the host is found
        if (!proxy) {
            log("info", `Host '${hostname}' not allowed for proxying.`);
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return;
        }

        // Add CORS headers to allow cross-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle pre-flight OPTIONS request (for CORS checks)
        if (req.method === 'OPTIONS') {
            res.writeHead(204, { 'Content-Type': 'text/plain' });
            res.end();
            return;
        }

        // Prepare options for forwarding the request to the backend server
        const forwardOptions = {
            hostname: proxy.forward,  // Backend server hostname
            port: proxy.port,         // Backend server port
            path: req.url,            // Path from the original request
            method: req.method,       // HTTP method of the original request
            headers: req.headers,     // Forward all request headers
        };

        // Create a request to forward the incoming request to the backend server
        const forwardedServer = http.request(forwardOptions, (fwdRes) => {
            log("info", `Forward: ${req.socket.remoteAddress} -> ${proxy.forward}:${proxy.port}`);
            // When the backend responds, forward the response headers and body to the client
            res.writeHead(fwdRes.statusCode, fwdRes.headers);
            fwdRes.pipe(res); // Pipe the backend response to the client
        });

        // Handle errors when forwarding the request
        forwardedServer.on("error", (err) => {
            log("error", `Error forwarding request to backend: ${err.message}`);
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("502 Bad Gateway"); // Return a 502 Bad Gateway error if the backend fails
        });

        // Pipe the incoming request data to the backend server
        req.pipe(forwardedServer);
    });

    // Start the server to listen on the specified port
    server.listen(port, () => {
        log("info", `HTTPS Reverse Proxy running on port ${port}`);
    });
}