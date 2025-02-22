// TCP proxy server

import net from "node:net";

export function tcpServer(name, port, host, forward) {
    const server = net.createServer((client) => {
        client.once("data", (data) => {
            try {
                const matchHost = data.toString().match(/Host: ([^\r\n]+)/);
                if (!matchHost) {
                    console.error("host headers not found");
                    client.end("400 Bad Request");
                    return;
                }

                const hostname = matchHost[1].trim().split(":")[0];
                if (!host.includes(hostname)) {
                    console.error("host not allowes");
                    client.end("403 Forbidden");
                    return;
                }
                
                const forwardedServer = net.createConnection(forward.port, forward.address, () => {
                    forwardedServer.write(data); // write data to forward server stream
                    client.pipe(forwardedServer).pipe(client); // forward between two sockert (client and server)
                });
            } catch (err) {
                console.error("internal server error:", err);
                client.end("500 Internal Server Error");
            }
        });
    });
    
    server.on("error", (err) => {
        console.error("server error: ", err);
    });

    server.listen(port, () => {
        console.log(name || "TCP Reverse Proxy", "running on port", port);
    });
}