import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { personaApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Users, Sparkles } from 'lucide-react';

export default function Personas() {
  const { data: personas, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personaApi.getAll().then((res) => res.data.personas),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="text-muted-foreground">
            Manage your AI content personas for authentic LinkedIn posts
          </p>
        </div>
        <Button asChild>
          <Link to="/personas/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Persona
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted" />
            </Card>
          ))}
        </div>
      ) : personas?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona: any) => (
            <Card key={persona.id} className="group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{persona.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {persona.jobRole}
                      </CardDescription>
                    </div>
                  </div>
                  {persona.isDefault && (
                    <Badge variant="default">Default</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-1">
                    {persona.expertiseNodes.slice(0, 3).map((node: string) => (
                      <Badge key={node} variant="secondary" className="text-xs">
                        {node}
                      </Badge>
                    ))}
                    {persona.expertiseNodes.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{persona.expertiseNodes.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Tone</p>
                  <Badge variant="outline" className="capitalize">
                    {persona.tone}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/personas/edit/${persona.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to={`/content/studio?persona=${persona.id}`}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No personas yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first persona to start generating authentic content
            </p>
            <Button asChild>
              <Link to="/personas/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Persona
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
