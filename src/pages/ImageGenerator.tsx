import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { imageApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Image, Download } from 'lucide-react';

const styles = [
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tech', label: 'Tech' },
  { value: 'bold', label: 'Bold' },
];

const aspectRatios = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '9:16', label: 'Portrait (9:16)' },
];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('professional');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const generateMutation = useMutation({
    mutationFn: (data: any) => imageApi.generate(data),
    onSuccess: (res) => {
      setGeneratedImages(res.data.images);
      toast.success('Images generated!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Generation failed');
    },
  });

  const handleGenerate = () => {
    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }
    generateMutation.mutate({ prompt, style, aspectRatio, count: 2 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Image Generator</h1>
        <p className="text-muted-foreground">
          Create AI-generated images for your LinkedIn content
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Images</CardTitle>
            <CardDescription>Describe what you want to create</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                placeholder="e.g., A professional illustration of AI technology in healthcare, modern design, clean lines"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Aspect Ratio</label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aspectRatios.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="mr-2 h-4 w-4" />
                  Generate Images
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
            <CardDescription>Your AI-generated images</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length > 0 ? (
              <div className="grid gap-4">
                {generatedImages.map((image, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={image}
                      alt={`Generated ${i + 1}`}
                      className="w-full rounded-lg"
                    />
                    <a
                      href={image}
                      download
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Button size="sm" variant="secondary">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your generated images will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
