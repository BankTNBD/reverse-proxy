// HTTPs Proxy Server

import http from "node:http";
import https from "node:https";
import fs from "node:fs";

export function httpsServer(name, port, host, forward) {
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY, "utf-8"),
        cert: fs.readFileSync(process.env.SSL_CERT, "utf-8")
    };

    const server = https.createServer(options, (req, res) => {
        const hostname = (req.headers.host).split(":")[0];
        if (!hostname) {
            console.error("host headers not found");
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("400 Bad Request");
            return;
        }

        if (!host.includes(hostname)) {
            console.error("host not allowed");
            req.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return ;
        }
        
        const options = {
            hostname: forward.address,
            port: forward.port,
            path: req.url, 
            method: req.method,
            headers: req.headers,
        };
        
        const forwardedServer = http.request(options , (fwdRes) => {
            res.writeHead(fwdRes.statusCode, fwdRes.headers)
            fwdRes.pipe(res);
        });

        forwardedServer.on("error", (err) => {
            console.error("error forward request:", err);
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("502 Bad Gateway");
        });

        req.pipe(forwardedServer);
    });

    server.listen(port, () => {
        console.log(name || "HTTPS Reverse Proxy",  "running on port", port);
    });
}