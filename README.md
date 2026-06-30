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
    },
    {
        "protocol": "tcp",
        "port": 8002,
        "host": "*",
        "forward": {
            "address": "your-web-db.local",
            "port": 3000
        }
    }
]
```

Explaination:
- Requests to ```your.domain.com:8000```, ```www.domain.com:8000```, or ```my.domain.com:8000``` will be forwarded to ```your-server.local:3000``` over TCP.
- Requests to ```domain.com:8001``` over HTTPS will be forwarded to ```your-web-server.local:3000``` over HTTP.
- Requests to every doamin in port ```:8002``` will be forwarded to ```your-web-db.local:3000``` over TCP.

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

---

## 🐳 Docker Configuration & Deployment

You can run this reverse proxy inside a Docker container using either the **Docker CLI** or **Docker Compose**.

### 1️⃣ Configuration Requirements

When running in Docker, you need to ensure the container can access your configurations and certificates, and that ports are mapped correctly.

#### Port Mapping
The container needs to expose the ports you configured in [list.json](./list.json). 
- If you configured a proxy on ports `80` and `443`, you must map these ports from your host to the container.

#### SSL Certificates (for HTTPS)
Since the container is isolated, any local SSL certificate paths on your host won't work out-of-the-box inside the container. You must mount the certificates into the container.
- For example, if your certificates are on the host at `/etc/letsencrypt/live/example.com/`, you can mount them to `/usr/src/app/certs/` inside the container.
- Set the paths in your `.env` file relative to the container directory:
  ```env
  SSL_KEY="/usr/src/app/certs/privkey.pem"
  SSL_CERT="/usr/src/app/certs/fullchain.pem"
  ```

---

### 2️⃣ Using Docker Compose (Recommended)

1. Open [docker-compose.yml](./docker-compose.yml) and configure your **ports** and **volumes**.
2. Mount your SSL certificate directory if using HTTPS:

```yaml
services:
  reverse-proxy:
    build: .
    container_name: reverse-proxy
    restart: unless-stopped
    ports:
      # Map all ports configured in your list.json
      - "80:80"
      - "443:443"
      - "8000:8000"
    volumes:
      # Mount list.json to update rules without rebuilding the image
      - ./list.json:/usr/src/app/list.json
      # Mount your .env file
      - ./.env:/usr/src/app/.env
      # Mount SSL certificates from host to container (read-only)
      - /path/to/host/certs:/usr/src/app/certs:ro
```

3. Start the container in detached mode:
```bash
docker compose up -d
```

4. View logs:
```bash
docker compose logs -f
```

---

### 3️⃣ Using Docker CLI

1. **Build the Docker Image:**
   ```bash
   docker build -t node-reverse-proxy .
   ```

2. **Run the Container:**
   Map the ports and mount `list.json`, `.env`, and your SSL certs folder:
   ```bash
   docker run -d \
     --name reverse-proxy \
     --restart unless-stopped \
     -p 80:80 \
     -p 443:443 \
     -p 8000:8000 \
     -v $(pwd)/list.json:/usr/src/app/list.json \
     -v $(pwd)/.env:/usr/src/app/.env \
     -v /path/to/host/certs:/usr/src/app/certs:ro \
     node-reverse-proxy
   ```