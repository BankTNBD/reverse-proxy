# 🌐 reverse proxy

Reverse proxy server usign Node.js.

## 👨🏻‍💻 Authors

- [@BankTNBD](https://github.com/BankTNBD)

## 🛠️ Configuration

Before starting the server, there are a few steps you need to complete.

**1️⃣ Setup .env file:**
```
SSL_KEY="PATH/TO/SSL_KEY"
SSL_CERT="PATH/TO/SSL_CERTIFICATE"
```

**2️⃣ Setup list.json file:**
```json
[
    {
        "name": "",
        "protocol": "",
        "port": 8000,
        "host": [ "HOSTNAME" ],
        "forward": {
            "address": "HOSTNAME",
            "port": 8000
        }
    },
    ...
]
```
- ```name``` (optional): Before starting the server, there are a few steps you need to complete.
- ```protocol```: Canba ```http```, ```https``` or ```tcp```.
- ```port```: The port on which the reverse proxy listens.
- ```host```: An array of hostnames that the proxy should handle.
- ```forward```: The destination server details.

Example:
```json
[
    {
        "name": "Chat Server",
        "protocol": "tcp",
        "port": 8000,
        "host": [ "your.domain.com", "www.domain.com", "my.domain.com" ],
        "forward": {
            "address": "your-server.local",
            "port": 3000
        }
    },
    {
        "protocol": "https",
        "port": 8001,
        "host": [ "domain.com" ],
        "forward": {
            "address": "your-web-server.local",
            "port": 3000
        }
    }
]
```

Explaination:
- Requests to ```your.domain.com:8000```, ```www.domain.com:8000```, or ```my.domain.com:8000``` will be forwarded to ```your-server.local:3000``` over TCP.
- Requests to ```domain.com:8001``` over HTTPS will be forwarded to ```your-web-server.local:3000``` over HTTP.

## 🚀 Running the Server

After cloning this project, follow these steps:

**1️⃣ Navigate to the project directory:**
```bash
cd reverse-proxy
```

**2️⃣ Install dependencies:**
```bash
npm install
```

**3️⃣ Start the server:**
```bash
npm start
```