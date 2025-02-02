const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const proxy = require("express-http-proxy"); // Change here
require("dotenv").config();

const config = require('./config.json');

let hostList = [];
let forwList = [];

// Load host and forward mappings
config.forEach((value) => {
    if (!value.host || !value.forward ) {
        console.error(`Invalid config: ${value.host} → ${value.forward}`);
    } else {
        hostList.push(`${value.host}`);
        forwList.push(`${value.forward}`);
    }
});

const app = express();

// Middleware to check domain and proxy requests
app.use((req, res, next) => {
    const host = req.headers.host;
    console.log(`Incoming request: ${req.protocol}://${host}${req.url}`);

    let hostIndex = hostList.findIndex(item => item === host);
    if (hostIndex === -1) {
        return res.status(404).send("Domain not found");
    }

    const targetHost = `http://${forwList[hostIndex]}`; // Always forward to HTTP
    console.log(`Forwarding request to: ${targetHost}`);

    proxy(targetHost, {
        proxyReqOptDecorator: (proxyReqOpts) => {
            proxyReqOpts.headers['X-Forwarded-Proto'] = 'https'; // Tell backend the request was HTTPS
            return proxyReqOpts;
        }
    })(req, res, next);
});

// Start HTTP and HTTPS servers
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