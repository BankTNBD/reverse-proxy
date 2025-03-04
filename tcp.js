import net from "node:net";

export function tcpServer(port, list) {
    const server = net.createServer((client) => {
        let proxy = list.find(list => list.host === "*");
        if (!proxy) {
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
                    proxy = list.find(list => list.host.includes(hostname)); // find what url allow and where to redirect

                    // check if host allow
                    if (!proxy) {
                        console.error("host not allowes");
                        client.end("403 Forbidden");
                        return;
                    }
                    // connect to backend server
                    const forwardedServer = net.createConnection(proxy.port, proxy.forward, () => {
                        client.pipe(forwardedServer).pipe(client); // forward between two sockert (client and server)
                    });
                } catch (err) {
                    // handle error
                    console.error("internal server error:", err);
                    client.end("500 Internal Server Error");
                }
            });
        } else {
            // Directly connect to the backend without checking HTTP headers
            const forwardedServer = net.createConnection(proxy.port, proxy.forward, () => {
                client.pipe(forwardedServer).pipe(client); // Bidirectional data transfer
            });

            forwardedServer.on("error", (err) => {
                console.error("Error connecting to backend:", err);
                client.end("500 Internal Server Error");
            });

            client.on("error", (err) => {
                console.error("Client connection error:", err);
            });
        }
    });

    server.on("error", (err) => {
        console.error("Server error:", err);
    });

    server.listen(port, () => {
        console.log("TCP Reverse Proxy running on port", port);
    });
}