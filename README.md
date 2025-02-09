
# 🌐 reverse proxy

Reverse proxy server from Express.js (Node.js)

## 👨🏻‍💻 Authors

- [@BankTNBD](https://github.com/BankTNBD)

## 🛠️ Config

Before start a server their are more steps you need to do.

Setup ```.env``` file.
```
    HTTP_PORT=8000
    HTTPS_PORT=8001
    SSL_KEY="PATH/TO/SSL_KEY"
    SSL_CERT="PATH/TO/SSL_CERTIFICATE"
```
This is not required. If you not set ```HTTP_PORT``` or ```HTTPS_PORT``` this will set to ```80``` and ```443``` respectively by default.

Setup ```config.json``` file
```
    [
        {
            "host": "HOSTNAME:PORT", // For incoming
            "forward": "HOSTNAME:PORT" // For forwarding
        },
        ...
    ]
```
For example
```
    [
        {
            "host": "your.domain.com:8000",
            "forward": "your-server.local:3000"
        }
    ]
```
This will forward request to ```your-server.local:3000```, if incoming request is from ```your.domain.com:8000```

## 🚀 Start a server

Start a server with npm after clone this project.

```bash
    cd reverse-proxy
```

Install node modules using npm
```bash
    npm install
```

Start a server
```bash
    npm start
```