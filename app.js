const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config();

const config = require('./config.json');

let hostList = [];
let forwList = [];

config.forEach((value) => {
    if (!value.host || !value.forward) {
        console.error(`Invalid config: ${value.host} → ${value.forward}`);
    } else {
        hostList.push(`${value.host}`);
        forwList.push(`${value.forward}`);
    }
});

const app = express();

const proxy = httpProxy.createProxyServer({});

app.use((req, res, next) => {
    const host = req.headers.host;
    console.log(`Incoming request: ${req.protocol}://${host}${req.url}`);

    let hostIndex = hostList.findIndex(item => item === host);
    if (hostIndex === -1) {
        return res.status(404).send("Domain not found");
    }

    const targetHost = `http://${forwList[hostIndex]}`;
    console.log(`Forwarding request to: ${targetHost}`);

    proxy.web(req, res, { 
        target: targetHost,
        changeOrigin: true,
        headers: {
            'X-Forwarded-Proto': 'https'
        }
    });
});

const httpServer = http.createServer(app);
const httpPort = process.env.HTTP_PORT || 80;
httpServer.listen(httpPort, () => console.log(`HTTP Reverse Proxy running on port ${httpPort}...`));

const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY, "utf8"),
    cert: fs.readFileSync(process.env.SSL_CERT, "utf8")
};

const httpsPort = process.env.HTTPS_PORT || 443;
const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(httpsPort, () => console.log(`HTTPS Reverse Proxy running on port ${httpsPort}...`));