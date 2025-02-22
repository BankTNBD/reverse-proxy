// HTTPs Proxy Server
import http from "node:http";
import https from "node:https";
import fs from "node:fs";

export function httpsServer(port, list) {
    // ssl cert option
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY, "utf-8"),
        cert: fs.readFileSync(process.env.SSL_CERT, "utf-8")
    };
    // create server for request for response
    const server = https.createServer(options, (req, res) => {
        const hostname = (req.headers.host).split(":")[0];  // get hostname from request headers
        // check if hostname exist
        if (!hostname) {
            console.error("host headers not found");
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("400 Bad Request");
            return;
        }
        let proxy = list.find(list => list.host.includes(hostname)); // find what url allow and where to redirect
        // check if url allow
        if (!proxy) {
            console.error("host not allowed");
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return ;
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
        const forwardedServer = http.request(options , (fwdRes) => {
            res.writeHead(fwdRes.statusCode, fwdRes.headers)
            fwdRes.pipe(res); // forward data from backend server to res (response what backend response)
        });
        // handle error
        forwardedServer.on("error", (err) => {
            console.error("error forward request:", err);
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("502 Bad Gateway");
        });
        req.pipe(forwardedServer); // forward data from req to backend server
    });
    // run server on port
    server.listen(port, () => {
        console.log("HTTPS Reverse Proxy",  "running on port", port);
    });
}