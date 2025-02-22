// TCP proxy server

import net from "node:net";

export function tcpServer(port, list) {
    // create tcp server to wait request
    const server = net.createServer((client) => {
        // trigger when get request
        client.once("data", (data) => {
            try {
                const matchHost = data.toString().match(/Host: ([^\r\n]+)/); // find hostname from data header
                // check if hostname exist
                if (!matchHost) {
                    console.error("host headers not found");
                    client.end("400 Bad Request");
                    return;
                }
                const hostname = matchHost[1].trim().split(":")[0]; // get hostname without port
                let proxy = list.find(list => list.host.includes(hostname)); // find what url allow and where to redirect
                // check if host allow
                if (!proxy) {
                    console.error("host not allowes");
                    client.end("403 Forbidden");
                    return;
                }
                // connect to backend server
                const forwardedServer = net.createConnection(proxy.port, proxy.forward, () => {
                    forwardedServer.write(data); // write data to forward server stream
                    client.pipe(forwardedServer).pipe(client); // forward between two sockert (client and server)
                });
            } catch (err) {
                // handle error
                console.error("internal server error:", err);
                client.end("500 Internal Server Error");
            }
        });
    });
    // handle error
    server.on("error", (err) => {
        console.error("server error: ", err);
    });
    // start server
    server.listen(port, () => {
        console.log("TCP Reverse Proxy", "running on port", port);
    });
}