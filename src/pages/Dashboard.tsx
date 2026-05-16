import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { userApi, contentApi, trendApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  TrendingUp,
  Users,
  Image,
  ArrowRight,
  Sparkles,
  BarChart3,
  Zap,
} from 'lucide-react';

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => userApi.getStats().then((res) => res.data.stats),
  });

  const { data: recentContent } = useQuery({
    queryKey: ['recentContent'],
    queryFn: () => contentApi.getAll({ limit: 5 }).then((res) => res.data.contents),
  });

  const { data: opportunities } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => trendApi.getOpportunities().then((res) => res.data.topics?.slice(0, 5) || []),
  });

  const statsCards = [
    {
      title: 'Content Generated',
      value: stats?.contentsGenerated || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Topics Researched',
      value: stats?.topicsResearched || 0,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Images Created',
      value: stats?.imagesCreated || 0,
      icon: Image,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Personas',
      value: 0,
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/content/studio">
              <Sparkles className="mr-2 h-4 w-4" />
              Create Content
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with these popular actions</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link to="/content/studio">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Create Content</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate AI-powered LinkedIn posts
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/trends">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Explore Trends</h3>
                      <p className="text-sm text-muted-foreground">
                        Discover trending topics
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/competitors">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Analyze Competitors</h3>
                      <p className="text-sm text-muted-foreground">
                        Find content gaps
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/audit">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Profile Audit</h3>
                      <p className="text-sm text-muted-foreground">
                        Optimize your LinkedIn profile
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </CardContent>
        </Card>

        {/* Opportunities */}
        <Card>
          <CardHeader>
            <CardTitle>Content Opportunities</CardTitle>
            <CardDescription>High-opportunity topics to explore</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunities?.length > 0 ? (
              opportunities.map((topic: any) => (
                <div key={topic.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{topic.keyword}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={topic.opportunityScore} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(topic.opportunityScore)}/100
                      </span>
                    </div>
                  </div>
                  <Badge variant={topic.opportunityScore >= 70 ? 'default' : 'secondary'}>
                    {topic.opportunityScore >= 70 ? 'Hot' : 'Good'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No opportunities yet. Start researching trends!
              </p>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/trends">View All Opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Your latest generated content</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link to="/content/history">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentContent?.length > 0 ? (
            <div className="space-y-4">
              {recentContent.map((content: any) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{content.contentType}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-medium mt-1 line-clamp-1">{content.title || 'Untitled'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={content.status === 'published' ? 'default' : 'secondary'}>
                      {content.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/content/history`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content yet. Start creating!</p>
              <Button className="mt-4" asChild>
                <Link to="/content/studio">Create Content</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
