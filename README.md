# LinkedIn Content AI Platform

A comprehensive, AI-powered LinkedIn content creation and optimization platform built with Next.js, Express, and Gemini AI.

## Features

### Core Features
- **Dynamic Persona Engine (DPE)** - Create and manage AI personas with RAG-based context injection
- **LinkedIn Profile Auditor & Optimizer** - Automated profile analysis and optimization suggestions
- **Trend Analysis** - Google Trends integration for topic research
- **Competitor Analysis** - Gap analysis and content opportunity identification
- **Multi-Agent Content Generation** - Research, writing, editing, and fact-checking agents
- **Image Generation** - Free image generation via Pollinations.ai
- **Browser Automation** - Human-like LinkedIn browsing and content scraping

### AI-Powered Features
- **Gemini 2.0 Flash** integration for content generation
- **Google Programmatic Search** for research
- **Fact-checking** with source verification
- **Engagement prediction** for content optimization

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts for data visualization

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Neon/Supabase)
- Redis (Upstash)
- BullMQ for job queues

### AI & APIs
- Google Gemini 2.0 Flash
- Google Custom Search API
- Google Trends API
- Pollinations.ai (free images)
- HuggingFace (optional)

### Infrastructure
- Vercel (frontend + API)
- Docker (scrapers/workers)
- Puppeteer with stealth plugin

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon or Supabase)
- Redis (Upstash or local)
- Google Gemini API key

### 1. Clone and Install

```bash
git clone <your-repo>
cd linkedin-content-platform

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Setup

Copy the example environment files:

```bash
cd backend
cp .env.example .env
```

Fill in your environment variables:

```env
# Database (Neon or Supabase)
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://username:password@hostname:port

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Google Custom Search
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_cse_id

# JWT Secret
JWT_SECRET=your_super_secret_key

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_byte_encryption_key

# Image Provider
IMAGE_PROVIDER=pollinations
```

### 3. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Deploy to Vercel
vercel --prod
```

### Docker Deployment (Scrapers/Workers)

```bash
cd docker
docker-compose up -d
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/linkedin` - Connect LinkedIn account

### Personas
- `GET /api/persona` - List personas
- `POST /api/persona` - Create persona
- `PUT /api/persona/:id` - Update persona
- `DELETE /api/persona/:id` - Delete persona

### Content
- `POST /api/content/generate` - Generate content
- `GET /api/content` - List content
- `GET /api/content/:id` - Get content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Trends
- `POST /api/trends/analyze` - Analyze trends
- `GET /api/trends/trending` - Get trending topics
- `GET /api/trends/opportunities` - Get opportunities

### Competitor Analysis
- `POST /api/competitor/analyze` - Analyze competitors
- `GET /api/competitor/gaps/:topic` - Get content gaps

### Profile Audit
- `POST /api/audit/run` - Run profile audit
- `GET /api/audit/history` - Get audit history
- `POST /api/audit/headlines` - Generate headline variations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Trend    │  │Competitor│  │ Content  │   │
│  │          │  │ Explorer │  │ Analysis │  │ Studio   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express.js)                  │
│                   Rate Limiting + Authentication             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Trend       │      │  Competitor  │      │   Content    │
│  Service     │      │  Service     │      │   Service    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI SERVICES (Gemini)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Research │  │  Writing │  │  Editing │  │  Fact    │   │
│  │  Agent   │  │  Agent   │  │  Agent   │  │ Checker  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA LAYER (PostgreSQL + Redis)                 │
└─────────────────────────────────────────────────────────────┘
```

## Browser Automation

The platform includes a browser automation worker that can:
- Browse LinkedIn like a human
- Search topics and collect content ideas
- Scrape content following LinkedIn's rules
- Work with user-provided logged-in sessions

### Usage

```bash
# Start browser automation service
cd docker
docker-compose up browser-automation

# API endpoints
POST http://localhost:3002/browse       # Browse like human
POST http://localhost:3002/search-ideas # Search and collect ideas
POST http://localhost:3002/scrape       # Scrape specific content
```

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Gemini API | 1,500 requests/day |
| Neon PostgreSQL | 3GB storage |
| Upstash Redis | 10K commands/day |
| Pollinations.ai | Unlimited |
| Vercel | 100GB bandwidth |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@yourdomain.com or join our Discord community.

---

Built with ❤️ using Next.js, Express, and Gemini AI
