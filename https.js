import http from "node:http";
import https from "node:https";
import fs from "node:fs";

export function httpsServer(port, list) {
    // ssl cert option
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY, "utf-8"),
        cert: fs.readFileSync(process.env.SSL_CERT, "utf-8")
    };

    // create server for request and response
    const server = https.createServer(options, (req, res) => {
        const hostname = (req.headers.host).split(":")[0];  // get hostname from request headers
        // check if hostname exists
        if (!hostname) {
            console.error("host headers not found");
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("400 Bad Request");
            return;
        }

        let proxy = list.find(list => list.host.includes(hostname)); // find allowed host and where to redirect
        // check if the host is allowed
        if (!proxy) {
            console.error("host not allowed");
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return ;
        }

        // Add CORS headers to allow all origins
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle pre-flight OPTIONS request (CORS check)
        if (req.method === 'OPTIONS') {
            res.writeHead(204, { 'Content-Type': 'text/plain' });
            res.end();
            return;
        }

        // create redirect options
        const options = {
            hostname: proxy.forward,
            port: proxy.port,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };

        // connect to backend server
        const forwardedServer = http.request(options, (fwdRes) => {
            res.writeHead(fwdRes.statusCode, fwdRes.headers);
            fwdRes.pipe(res); // forward data from backend server to response
        });

        // handle error
        forwardedServer.on("error", (err) => {
            console.error("error forwarding request:", err);
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("502 Bad Gateway");
        });

        req.pipe(forwardedServer); // forward data from the request to the backend server
    });

    // run the server on the specified port
    server.listen(port, () => {
        console.log("HTTPS Reverse Proxy", "running on port", port);
    });
}