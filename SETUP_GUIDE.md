# ArchetypeOS MVP - Complete Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites

Ensure you have installed:
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/)) OR use cloud option below
- **Git**

### 2. Clone / Setup Project

```bash
cd c:\Users\BYNARYCRAFT\Desktop\archetypeos-mvp\talent-compass
```

### 3. Configure Environment

Create `.env.local` file in the project root:

```env
# Database (Choose one option below)
DATABASE_URL="postgresql://postgres:password@localhost:5432/archetype_os"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# App
NEXT_PUBLIC_APP_NAME="ArchetypeOS"
```

**Database Options:**

**Option A: Local PostgreSQL**
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/archetype_os"
```

**Option B: Supabase (Cloud - Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings → Database
```env
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[database]"
```

**Option C: Neon (Cloud)**
1. Go to [neon.tech](https://neon.tech)
2. Create project
3. Copy connection string
```env
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Install & Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database with test data
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

## Login with Test Accounts

After seeding, use these credentials:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **Admin** | admin@archetype.local | admin123 | Full system management |
| **Supervisor** | supervisor@archetype.local | supervisor123 | Manage learners |
| **Learner** | learner1@archetype.local | learner123 | View courses, track learning |
| **Candidate** | candidate@archetype.local | candidate123 | Take onboarding test |

## Troubleshooting

### "Cannot find module 'bcryptjs'"

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Windows + Local PostgreSQL:**
```powershell
# Start PostgreSQL service
Get-Service postgresql-x64-* | Start-Service
```

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**Or use cloud database (Supabase/Neon) - no setup needed!**

### "Error: NEXTAUTH_SECRET is not set"

Ensure `.env.local` exists and contains `NEXTAUTH_SECRET`:
```env
NEXTAUTH_SECRET="min-32-character-secret-key-here"
```

### "Prisma Client generation failed"

```bash
# Delete generated files
rm -rf node_modules/.prisma

# Regenerate
npx prisma generate
```

### Database already exists error

```bash
# Drop and recreate (careful - deletes all data!)
npx prisma migrate reset --force
```

### "Port 3000 already in use"

```bash
# Use different port
npm run dev -- -p 3001

# Then visit http://localhost:3001
```

## Deployment Checklist (Auth + Database)

Before deploying, set these environment variables in your hosting provider:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-long-random-secret"
NEXT_PUBLIC_APP_NAME="ArchetypeOS"
```

Recommended deployment steps:

```bash
# Install dependencies
npm install

# Apply migrations to production database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build the app
npm run build
```

If you use Vercel, add the same env vars in Project Settings and redeploy.

## Project Structure

```
talent-compass/
├── app/
│   ├── api/                    # Backend API routes
│   ├── (dashboard)/            # Protected dashboard routes
│   ├── auth/                   # Authentication pages
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # Shadcn UI components
│   ├── layout/                 # Layout components
│   └── auth/                   # Auth components
├── lib/
│   ├── auth.ts                # NextAuth configuration
│   ├── prisma.ts              # Prisma client singleton
│   └── utils.ts               # Utility functions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── middleware.ts              # Route protection
├── README_ARCHETYPE.md        # Full documentation
├── setup.sh                   # Setup script
└── .env.local                 # Environment variables (create this)
```

## Key API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/[...nextauth]` - Login/Logout

### Courses  
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course (admin)
- `POST /api/courses/[courseId]/enroll` - Enroll in course

### Learning
- `POST /api/learning-sessions` - Start learning session
- `PUT /api/learning-sessions/[sessionId]` - End session
- `GET /api/learning-sessions` - Get user sessions

### Tests
- `GET /api/tests` - List tests
- `POST /api/tests/[testId]/submit` - Submit test

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/analytics` - Organization analytics

## Features Overview

### ✅ Implemented in MVP

- [x] User authentication (credentials + JWT)
- [x] Role-based access control (Candidate, Learner, Supervisor, Admin)
- [x] Course management and enrollment
- [x] Test system with auto-grading for MCQs
- [x] Learning session tracker (clock-in/clock-out)
- [x] Daily reflection system
- [x] Skill tracking
- [x] Analytics dashboards
- [x] Roadmap and archetype system
- [x] Comprehensive seed data

### 🚀 Future Enhancements

- [ ] Email notifications
- [ ] GitHub/Figma integrations
- [ ] Advanced analytics and reporting
- [ ] Peer review system
- [ ] Gamification (badges, leaderboards)
- [ ] Mobile app
- [ ] Real-time collaboration
- [ ] AI-powered recommendations

## Database Schema

Key tables:
- **User** - System users with roles and archetypes
- **Course** - Learning courses and content
- **Roadmap** - Learning paths grouped by archetype
- **Test** - Assessments and quizzes
- **LearningSession** - Clock-in/out tracking
- **Skill** - Proficiency tracking
- **Archetype** - Organization role archetypes

See [README_ARCHETYPE.md](./README_ARCHETYPE.md) for full schema documentation.

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

**Set Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `DATABASE_URL` (production database)
   - `NEXTAUTH_URL` (production domain)
   - `NEXTAUTH_SECRET` (secure random key)

### Deploy to Other Platforms

- **Railway:** Connect GitHub repo, set env vars
- **Fly.io:** Follow deployment guide
- **Heroku:** Compatible with buildpack
- **AWS/GCP/Azure:** Use container image (Docker support coming)

## Important Security Notes

⚠️ **This is an MVP** - For production use:

1. **Passwords**: Stored with bcrypt hashing on signup.
   - Existing plaintext users must reset passwords after this change
   - Use unique, strong passwords in production

2. **NextAuth Secret**: Use strong, unique secret in production
   - Never commit to git
   - Rotate regularly
   - Use different secrets per environment

3. **Database**: Use secure connection strings
   - Never hardcode credentials
   - Use environment variables
   - Enable SSL/TLS connections

4. **CORS**: Configure for your domain only

5. **Rate Limiting**: Add in production

6. **Logging**: Implement audit trails

See [README_ARCHETYPE.md](./README_ARCHETYPE.md) for security best practices.

## Support & Documentation

- 📖 **Full Docs**: [README_ARCHETYPE.md](./README_ARCHETYPE.md)
- 🐛 **Issues**: Check error messages and troubleshooting above
- 📧 **Questions**: Refer to inline code comments
- 🎯 **Examples**: Check seed data in `prisma/seed.ts`

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server

# Database
npx prisma studio      # Open Prisma Studio (GUI)
npx prisma db seed     # Seed database
npx prisma migrate dev --name add_users  # Create migration
npx prisma migrate reset                 # Reset database
npx prisma generate                      # Generate client

# Code Quality
npm run lint            # Run ESLint
npm run lint -- --fix   # Fix linting issues

# Utilities
npm install bcryptjs           # Add password hashing
npm install -D @types/bcryptjs # Add types
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Browser / Next.js Frontend          │
│     (React 19 + TypeScript + Tailwind)       │
└─────────────┬───────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────┐
│        Next.js API Routes (Backend)         │
│    (Express-like routing, middleware)        │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ↓         ↓         ↓
┌────────┐ ┌──────┐ ┌───────────┐
│NextAuth│ │Prisma│ │Middleware │
│  (Auth)│ │ (ORM)│ │  (RBAC)   │
└────┬───┘ └──┬───┘ └─────┬─────┘
     │        │           │
     └────────┼───────────┘
              ↓
┌─────────────────────────────────────────────┐
│          PostgreSQL Database                │
│    (Users, Courses, Tests, Sessions, etc.)  │
└─────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Complete this setup
2. 📖 Read [README_ARCHETYPE.md](./README_ARCHETYPE.md) for full documentation
3. 🔍 Explore the Prisma Studio: `npx prisma studio`
4. 🎯 Login with test accounts
5. 🚀 Start customizing for your organization
6. 📊 Review the seed data for examples

---

**ArchetypeOS MVP v1.0** - Ready for testing and customization! 🚀
