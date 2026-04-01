// Function to group proxies by their port
export function createPortList(port, list, proxy) {
    let listObj = list.find(obj => obj.port === port);

    if (listObj) {
        // Add the proxy to the existing port group
        listObj.list.push({ host: proxy.host, forward: proxy.forward, port: proxy.port });
    } else {
        // Create a new port group for the proxy
        list.push({ port, list: [{ host: proxy.host, forward: proxy.forward, port: proxy.port }] });
    }
}