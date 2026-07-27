import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";

import { log } from "../libs/log.js";

export function httpsServer(port, list) {
    // Cache for dynamically loaded SSL Contexts (for SNI support)
    const sslContexts = new Map();

    // Load default SSL context
    let defaultCtx;
    try {
        if (process.env.SSL_KEY && process.env.SSL_CERT) {
            defaultCtx = tls.createSecureContext({
                key: fs.readFileSync(process.env.SSL_KEY, "utf-8"),
                cert: fs.readFileSync(process.env.SSL_CERT, "utf-8")
            });
        }
    } catch (err) {
        log("error", `Failed to load default SSL credentials: ${err.message}`);
    }

    const getSecureContext = (servername) => {
        if (sslContexts.has(servername)) {
            return sslContexts.get(servername);
        }

        // Find the proxy rule matching the servername
        const proxy = list.find(proxy => {
            if (Array.isArray(proxy.host)) {
                return proxy.host.includes(servername);
            }
            return proxy.host === servername;
        });

        // If the proxy has specific SSL configuration, use it to create a SecureContext
        if (proxy && proxy.ssl && proxy.ssl.key && proxy.ssl.cert) {
            try {
                const ctx = tls.createSecureContext({
                    key: fs.readFileSync(proxy.ssl.key, "utf-8"),
                    cert: fs.readFileSync(proxy.ssl.cert, "utf-8")
                });
                sslContexts.set(servername, ctx);
                return ctx;
            } catch (err) {
                log("error", `Failed to load custom SSL certificates for ${servername}: ${err.message}`);
            }
        }

        return null;
    };

    // SSL certificates options with SNICallback for dynamic SSL support
    const options = {
        SNICallback: (servername, cb) => {
            const ctx = getSecureContext(servername);
            if (ctx) {
                cb(null, ctx);
            } else if (defaultCtx) {
                cb(null, defaultCtx);
            } else {
                cb(new Error("No SSL credentials available for this connection"));
            }
        }
    };

    if (process.env.SSL_KEY && process.env.SSL_CERT) {
        try {
            options.key = fs.readFileSync(process.env.SSL_KEY, "utf-8");
            options.cert = fs.readFileSync(process.env.SSL_CERT, "utf-8");
        } catch (err) {
            log("error", `Failed to load top-level default SSL credentials: ${err.message}`);
        }
    }

    // Create HTTPS server for handling incoming requests
    const server = https.createServer(options, (req, res) => {
        // Extract hostname from the 'Host' header of the request (safely handling cases where host header is missing)
        const hostname = req.headers.host ? req.headers.host.split(":")[0] : ""; 

        // Validate if hostname is provided in the request
        if (!hostname) {
            log("info", "Host header not found in the request.");
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("400 Bad Request");
            return;
        }

        // Find the proxy rule that matches the hostname (supporting array, exact string, or wildcard)
        let proxy = list.find(proxy => {
            if (Array.isArray(proxy.host)) {
                return proxy.host.includes(hostname);
            }
            return proxy.host === hostname || proxy.host === "*";
        });

        // Validate if the proxy configuration for the host is found
        if (!proxy) {
            log("info", `Host '${hostname}' not allowed for proxying.`);
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return;
        }

        // Add CORS headers to allow cross-origin requests dynamically
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400');

        // Handle pre-flight OPTIONS request (for CORS checks)
        if (req.method === 'OPTIONS') {
            res.writeHead(204, { 'Content-Type': 'text/plain' });
            res.end();
            return;
        }

        // Build forward headers adding standard reverse proxy headers
        const clientIp = req.socket.remoteAddress;
        const forwardHeaders = {
            ...req.headers,
            "x-forwarded-for": req.headers["x-forwarded-for"] ? `${req.headers["x-forwarded-for"]}, ${clientIp}` : clientIp,
            "x-forwarded-proto": req.headers["x-forwarded-proto"] || "https",
            "x-forwarded-host": req.headers["x-forwarded-host"] || req.headers.host || "",
        };

        // Prepare options for forwarding the request to the backend server
        const forwardOptions = {
            hostname: proxy.forward,  // Backend server hostname
            port: proxy.port,         // Backend server port
            path: req.url,            // Path from the original request
            method: req.method,       // HTTP method of the original request
            headers: forwardHeaders,   // Forward headers with injected proxy headers
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

        forwardedServer.setTimeout(5000, () => { // Set a timeout for the forwarded request
            log("error", "Forwarded request timed out.");
            forwardedServer.destroy(); // Destroy the connection if it times out
        });

        // Pipe the incoming request data to the backend server
        req.pipe(forwardedServer);
    });

    // Start the server to listen on the specified port
    server.listen(port, () => {
        log("info", `HTTPS Reverse Proxy running on port ${port}`);
    });
}