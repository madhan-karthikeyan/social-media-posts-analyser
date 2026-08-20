# Deployment Guide

This guide walks you through deploying the Social Media Content Analyzer on a single virtual private server (VPS) using Docker Compose.

## Prerequisites
- A cloud VPS (e.g., DigitalOcean Droplet, AWS EC2, Hetzner) running Ubuntu 22.04 or 24.04.
- A registered domain name (optional but recommended for HTTPS).
- Basic familiarity with SSH.

---

## 1. Initial Server Setup

SSH into your server:
```bash
ssh root@your_server_ip
```

Install Docker and Docker Compose:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Ensure Docker starts on boot
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt-get update
apt-get install docker-compose-plugin
```

---

## 2. Deploying the Application

1. **Clone the Repository**
   ```bash
   git clone https://github.com/madhan-karthikeyan/social-media-posts-analyser.git
   cd social-media-posts-analyser
   ```

2. **Configure Environment Variables**
   Create the `.env` file required by the backend:
   ```bash
   nano .env
   ```
   Add your API keys and configuration:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   OCR_KEY=your_ocr_space_api_key
   
   # Optional: Restrict CORS to your domain name (Highly Recommended for Production)
   # CORS_ORIGINS=https://yourdomain.com
   ```

3. **Start the Containers**
   Launch the application in detached mode:
   ```bash
   docker compose up --build -d
   ```

4. **Verify the Deployment**
   Check the running containers:
   ```bash
   docker ps
   ```
   You should see both `sma_frontend` and `sma_backend` running.

---

## 3. Setting up a Reverse Proxy (HTTPS)

While Docker exposes the app on port `5173` (Frontend) and `8000` (Backend), it is highly recommended to serve the app over port 80/443 using a reverse proxy like **Nginx** or **Caddy**.

### Using Nginx and Certbot

1. **Install Nginx and Certbot**
   ```bash
   apt-get install nginx certbot python3-certbot-nginx
   ```

2. **Configure Nginx**
   Create a new site configuration:
   ```bash
   nano /etc/nginx/sites-available/sma
   ```
   Paste the following (replace `yourdomain.com` with your actual domain):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Route API requests to the backend
       location /api/ {
           proxy_pass http://localhost:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Route all other requests to the frontend
       location / {
           proxy_pass http://localhost:5173/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable the Configuration**
   ```bash
   ln -s /etc/nginx/sites-available/sma /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

4. **Enable SSL (HTTPS)**
   ```bash
   certbot --nginx -d yourdomain.com
   ```

You can now access your secured application at `https://yourdomain.com`.

## 4. Updates & Maintenance

To pull the latest changes and redeploy seamlessly with zero downtime on existing active requests:

```bash
git pull
docker compose up --build -d
```
