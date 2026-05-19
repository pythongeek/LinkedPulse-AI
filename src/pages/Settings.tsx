import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { linkedinApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Linkedin, Unlink, User, Key, Clock } from 'lucide-react';

export default function Settings() {
  const { user, refetchUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [liAt, setLiAt] = useState('');
  const [jsessionId, setJsessionId] = useState('');
  const [loadingOAuth, setLoadingOAuth] = useState(false);

  const { data: linkedinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['linkedinStatus'],
    queryFn: () => linkedinApi.getStatus().then((res) => res.data),
  });

  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    if (linkedinParam === 'success') {
      toast.success('Successfully connected LinkedIn via OAuth!');
      refetchStatus();
      refetchUser();
      
      // Clean query params
      searchParams.delete('linkedin');
      setSearchParams(searchParams);
    } else if (linkedinParam === 'error') {
      toast.error('Failed to connect LinkedIn via OAuth.');
      
      // Clean query params
      searchParams.delete('linkedin');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, refetchStatus, refetchUser]);

  const connectMutation = useMutation({
    mutationFn: (data: any) => linkedinApi.connect(data),
    onSuccess: () => {
      toast.success('LinkedIn cookies connected!');
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
    mutationFn: (type?: 'cookie' | 'oauth') => linkedinApi.disconnect(type),
    onSuccess: () => {
      toast.success('Disconnected successfully');
      refetchStatus();
      refetchUser();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Disconnect failed');
    },
  });

  const handleConnectCookies = () => {
    if (!liAt || !jsessionId) {
      toast.error('Please enter both cookies');
      return;
    }
    connectMutation.mutate({ liAt, jsessionId });
  };

  const handleConnectOAuth = async () => {
    setLoadingOAuth(true);
    try {
      const response = await linkedinApi.getOAuthUrl();
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Could not retrieve LinkedIn authorization URL');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to initiate OAuth');
    } finally {
      setLoadingOAuth(false);
    }
  };

  const handleDisconnect = (type?: 'cookie' | 'oauth') => {
    disconnectMutation.mutate(type);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and connections</p>
      </div>

      {/* LinkedIn Connection */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm relative">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Linkedin className="h-5.5 w-5.5 text-[#0a66c2]" />
            LinkedIn Integration
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Configure your LinkedIn account connection. Connect via OAuth 2.0 to publish posts directly, and provide cookies for advanced browser automation features (Audits & Competitor Scrapes).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          
          {/* OAuth Connection */}
          <div className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-500/50 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-blue-500" />
                  Direct Publishing (OAuth)
                </h3>
                {linkedinStatus?.hasOAuth ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5">
                    Disconnected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Connect using the official LinkedIn secure authorization flow. This allows the Content Studio to publish draft posts directly to your LinkedIn profile.
              </p>
            </div>
            <div>
              {linkedinStatus?.hasOAuth ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                    <Clock className="h-3 w-3" />
                    <span>OAuth token is managed and refreshed securely.</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-colors text-xs h-9"
                    onClick={() => handleDisconnect('oauth')}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="mr-2 h-3.5 w-3.5" />
                    )}
                    Disconnect OAuth
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnectOAuth}
                  disabled={loadingOAuth}
                  className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white text-xs h-9 font-medium shadow-sm transition-all duration-200"
                >
                  {loadingOAuth ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Linkedin className="mr-2 h-4 w-4" />
                  )}
                  Connect LinkedIn OAuth
                </Button>
              )}
            </div>
          </div>

          {/* Cookie Connection */}
          <div className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-500/50 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-indigo-500" />
                  Scraper & Auditor (Cookies)
                </h3>
                {linkedinStatus?.hasCookies ? (
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 gap-1 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Connect using browser cookies for advanced features like Profile Audits and Competitor Analyses. These processes simulate browser visits using Puppeteer.
              </p>
            </div>
            <div>
              {linkedinStatus?.hasCookies ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                    <Clock className="h-3 w-3" />
                    <span>Expires: {linkedinStatus.expiresAt ? new Date(linkedinStatus.expiresAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-colors text-xs h-9"
                    onClick={() => handleDisconnect('cookie')}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="mr-2 h-3.5 w-3.5" />
                    )}
                    Disconnect Scraper
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">How to get your cookies:</p>
                    <ol className="text-[10px] text-slate-500 dark:text-slate-400 list-decimal list-inside space-y-0.5">
                      <li>Log in to LinkedIn in your browser</li>
                      <li>Open Developer Tools (F12) → Application → Cookies</li>
                      <li>Copy the values for <code>li_at</code> and <code>JSESSIONID</code></li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="li_at" className="text-xs">li_at Cookie</Label>
                      <Input
                        id="li_at"
                        type="password"
                        placeholder="Paste your li_at cookie"
                        value={liAt}
                        onChange={(e) => setLiAt(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="jsessionid" className="text-xs">JSESSIONID Cookie</Label>
                      <Input
                        id="jsessionid"
                        type="password"
                        placeholder="Paste your JSESSIONID cookie"
                        value={jsessionId}
                        onChange={(e) => setJsessionId(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>

                    <Button
                      onClick={handleConnectCookies}
                      disabled={connectMutation.isPending}
                      className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs h-8.5 font-medium transition-all duration-200"
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Linkedin className="mr-2 h-3.5 w-3.5" />
                      )}
                      Save Cookies
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

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
