-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "linkedin_cookies" TEXT,
    "linkedin_profile" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "job_role" TEXT NOT NULL,
    "expertise_nodes" TEXT[],
    "experience_vault" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "visual_dna" JSONB NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "opportunity_score" DOUBLE PRECISION,
    "trend_data" JSONB,
    "competition_data" JSONB,
    "linkedin_data" JSONB,
    "last_analyzed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "persona_id" TEXT,
    "content_type" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "outline" JSONB,
    "research_data" JSONB,
    "sources" JSONB,
    "images" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "engagement_prediction" DOUBLE PRECISION,
    "scheduled_for" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_posts" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "author_profile" TEXT,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "post_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_audits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "headline" TEXT,
    "about" TEXT,
    "banner_url" TEXT,
    "profile_url" TEXT,
    "audit_score" DOUBLE PRECISION,
    "seo_score" DOUBLE PRECISION,
    "brand_score" DOUBLE PRECISION,
    "gaps" JSONB,
    "suggestions" JSONB,
    "top_creators" JSONB,
    "industry_trends" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contents_generated" INTEGER NOT NULL DEFAULT 0,
    "topics_researched" INTEGER NOT NULL DEFAULT 0,
    "images_created" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "last_reset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_cache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_jobs" (
    "id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "params" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "li_at" TEXT NOT NULL,
    "jsession_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "topics_keyword_key" ON "topics"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "usage_stats_user_id_key" ON "usage_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_sessions_user_id_key" ON "linkedin_sessions"("user_id");

-- CreateIndex
CREATE INDEX "research_cache_query_query_type_idx" ON "research_cache"("query", "query_type");

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_posts" ADD CONSTRAINT "competitor_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_audits" ADD CONSTRAINT "profile_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_alerts" ADD CONSTRAINT "topic_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_stats" ADD CONSTRAINT "usage_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
