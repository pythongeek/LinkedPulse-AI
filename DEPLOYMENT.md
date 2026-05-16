# Deployment Guide

## Vercel Deployment (Recommended)

### 1. Prepare Your Repository

```bash
# Make sure all files are committed
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset**: Other
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Output Directory**: `backend/dist`
   - **Install Command**: `npm install`

### 3. Environment Variables

Add these environment variables in Vercel Dashboard:

```
DATABASE_URL=your_neon_or_supabase_url
REDIS_URL=your_upstash_url
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_cse_id
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
IMAGE_PROVIDER=pollinations
```

### 4. Database Setup

#### Neon (Recommended)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel environment variables

#### Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (Pooler mode)
5. Add to Vercel environment variables

### 5. Redis Setup (Upstash)

1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the connection URL
4. Add to Vercel environment variables

### 6. Run Migrations

```bash
# Local migration
cd backend
npx prisma migrate deploy
```

Or use Vercel's console to run migrations after deployment.

## Docker Deployment (Scrapers/Workers)

### Local Development

```bash
cd docker

# Create .env file
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Deployment

```bash
# Build images
docker-compose -f docker-compose.yml build

# Push to registry (optional)
docker tag linkedin-content-platform-api your-registry/api
docker push your-registry/api

# Deploy on server
docker-compose -f docker-compose.yml up -d
```

## Frontend Only (Vercel)

If you want to deploy just the frontend:

```bash
cd frontend

# Create vercel.json
echo '{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}' > vercel.json

# Deploy
vercel --prod
```

## Backend Only (Railway/Render)

### Railway

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables
4. Deploy!

### Render

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy!

## Troubleshooting

### Build Errors

1. **Node Version**: Ensure Node.js 18+ is used
2. **Dependencies**: Run `npm install` in both frontend and backend
3. **TypeScript**: Check for type errors with `npm run build`

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check if database is accessible from Vercel's IP
3. Enable SSL if required (`sslmode=require`)

### Redis Connection Issues

1. Verify `REDIS_URL` is correct
2. Check if Redis is running
3. Verify network access

### API Errors

1. Check Vercel function logs
2. Verify all environment variables are set
3. Check rate limits (Gemini: 1500/day)

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics

### Custom Monitoring

Add Sentry for error tracking:

```bash
npm install @sentry/node
```

```javascript
// server.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});
```

## Cost Optimization

### Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Vercel | 100GB bandwidth |
| Neon | 3GB storage |
| Upstash | 10K commands/day |
| Gemini | 1,500 requests/day |
| Pollinations | Unlimited |

### Tips

1. Use caching (Redis) to reduce API calls
2. Compress images before storing
3. Use CDN for static assets
4. Monitor usage and set up alerts

## Security Checklist

- [ ] Change default JWT secret
- [ ] Generate strong encryption key
- [ ] Enable HTTPS only
- [ ] Set up CORS properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection (Helmet.js)

## Support

For issues and questions:
- GitHub Issues: [your-repo]/issues
- Email: support@yourdomain.com
- Discord: [your-discord-link]
