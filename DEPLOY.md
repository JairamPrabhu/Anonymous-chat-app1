# Deployment Guide: Anonymous Real-Time Chat App

## Prerequisites
- Node.js 18+ and npm
- Railway, Render, AWS, or any VPS with Node.js support

## 1. Local Setup
1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   npm start
   ```
4. Open `http://localhost:3000` in your browser

## 2. Deploying Online

### Railway
1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repo or upload the code
3. Set the start command to `npm start`
4. Deploy

### Render
1. Create a new Web Service on [Render](https://render.com/)
2. Connect your repo or upload code
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy

### VPS / AWS EC2
1. Upload code to your server
2. Install Node.js and npm
3. Run `npm install` and `npm start`
4. Use a reverse proxy (Nginx) for HTTPS

## 3. HTTPS Support
- For Railway/Render: Enable HTTPS in platform settings (automatic)
- For VPS: Use Nginx/Certbot to set up SSL

## 4. Environment Variables
- None required for basic demo
- Set `PORT` if you want to use a custom port

## 5. Testing Online
- Open the deployed URL in two browser windows
- You should be paired with a stranger and able to chat anonymously

---

For questions or issues, see README.md or contact the project maintainer.
