import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Linkedin } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) return;
    
    setIsLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (error) {
      // Error handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
      <CardHeader className="space-y-2 pb-6 relative z-10">

        <CardTitle className="text-3xl text-center font-bold tracking-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">Create an account</CardTitle>
        <CardDescription className="text-center text-slate-400">
          Start creating AI-powered LinkedIn content
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-black/50 border-white/10 focus-visible:ring-indigo-500 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/50 border-white/10 focus-visible:ring-indigo-500 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/50 border-white/10 focus-visible:ring-indigo-500 h-11"
            />
            <p className="text-xs text-slate-500">
              Must be at least 8 characters
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="terms"
              checked={agreeTerms}
              onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
              className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 mt-0.5"
            />
            <Label htmlFor="terms" className="text-sm font-normal text-slate-300 leading-snug cursor-pointer">
              I agree to the{' '}
              <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Privacy Policy
              </Link>
            </Label>
          </div>
          <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all font-semibold" disabled={isLoading || !agreeTerms}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-4 pb-8 relative z-10">
        <div className="text-sm text-center text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
