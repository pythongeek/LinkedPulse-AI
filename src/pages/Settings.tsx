import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { linkedinApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Linkedin, Unlink, User, Key } from 'lucide-react';

export default function Settings() {
  const { user, refetchUser } = useAuth();
  const [liAt, setLiAt] = useState('');
  const [jsessionId, setJsessionId] = useState('');

  const { data: linkedinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['linkedinStatus'],
    queryFn: () => linkedinApi.getStatus().then((res) => res.data),
  });

  const connectMutation = useMutation({
    mutationFn: (data: any) => linkedinApi.connect(data),
    onSuccess: () => {
      toast.success('LinkedIn connected!');
      refetchStatus();
      refetchUser();
      setLiAt('');
      setJsessionId('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Connection failed');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => linkedinApi.disconnect(),
    onSuccess: () => {
      toast.success('LinkedIn disconnected');
      refetchStatus();
      refetchUser();
    },
  });

  const handleConnect = () => {
    if (!liAt || !jsessionId) {
      toast.error('Please enter both cookies');
      return;
    }
    connectMutation.mutate({ liAt, jsessionId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and connections</p>
      </div>

      {/* LinkedIn Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn Connection
          </CardTitle>
          <CardDescription>
            Connect your LinkedIn account for content analysis and automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedinStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <Linkedin className="h-3 w-3" />
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Expires: {linkedinStatus.expiresAt ? new Date(linkedinStatus.expiresAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-2">How to get your LinkedIn cookies:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Log in to LinkedIn in your browser</li>
                  <li>Open Developer Tools (F12)</li>
                  <li>Go to Application → Cookies</li>
                  <li>Copy the values for <code>li_at</code> and <code>JSESSIONID</code></li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="li_at">li_at Cookie</Label>
                <Input
                  id="li_at"
                  type="password"
                  placeholder="Paste your li_at cookie"
                  value={liAt}
                  onChange={(e) => setLiAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jsessionid">JSESSIONID Cookie</Label>
                <Input
                  id="jsessionid"
                  type="password"
                  placeholder="Paste your JSESSIONID cookie"
                  value={jsessionId}
                  onChange={(e) => setJsessionId(e.target.value)}
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                className="w-full"
              >
                {connectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Linkedin className="mr-2 h-4 w-4" />
                )}
                Connect LinkedIn
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={user?.name || ''} placeholder="Your name" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* API Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Usage
          </CardTitle>
          <CardDescription>Your current usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Content Generated</p>
              <p className="text-2xl font-bold">{0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Topics Researched</p>
              <p className="text-2xl font-bold">{0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Images Created</p>
              <p className="text-2xl font-bold">{0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
