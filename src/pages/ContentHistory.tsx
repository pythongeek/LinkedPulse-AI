import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FileText, Calendar, BarChart3, ExternalLink } from 'lucide-react';

export default function ContentHistory() {
  const { data: contents, isLoading } = useQuery({
    queryKey: ['contentHistory'],
    queryFn: () => contentApi.getAll({ limit: 50 }).then((res) => res.data.contents),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Content</h1>
        <p className="text-muted-foreground">View and manage your generated content</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : contents?.length > 0 ? (
        <div className="space-y-4">
          {contents.map((content: any) => (
            <Card key={content.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{content.contentType}</Badge>
                      <Badge
                        variant={content.status === 'published' ? 'default' : 'secondary'}
                      >
                        {content.status}
                      </Badge>
                      {content.engagementPrediction && (
                        <Badge variant="outline" className="gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {content.engagementPrediction}/100
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {content.title || 'Untitled Content'}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {content.body}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Open content">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open content</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground mb-4">
              Start creating content in the Content Studio
            </p>
            <Button asChild>
              <a href="/content/studio">Create Content</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
