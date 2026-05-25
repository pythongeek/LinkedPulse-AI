import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { contentApi, jobApi } from '@/services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  contentType?: string;
  onSuccess?: (content: any) => void;
}

export function QuickGenerateDialog({ isOpen, onClose, topic, contentType = 'post', onSuccess }: QuickGenerateDialogProps) {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobPhase, setJobPhase] = useState<number>(0);
  const [jobTotalPhases, setJobTotalPhases] = useState<number>(1);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: (data: any) => contentApi.generate(data),
    onSuccess: (res) => {
      setJobId(res.data.jobId);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to start generation');
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen && topic && !jobId && !generatedContent && !generateMutation.isPending) {
      generateMutation.mutate({
        topic,
        contentType,
        researchDepth: 'quick',
        hookFormula: 'question',
        ctaType: 'comment',
      });
    }
  }, [isOpen, topic]);

  useEffect(() => {
    let interval: any;
    
    const checkStatus = async () => {
      if (!jobId) return;
      
      try {
        // We use advance to force the backend to process the next phase immediately
        const res = await jobApi.advance(jobId);
        const job = res.data.job;
        if (job.phase !== undefined) setJobPhase(job.phase);
        if (job.totalPhases !== undefined) setJobTotalPhases(job.totalPhases);
        
        if (job.status === 'COMPLETED') {
          const contentId = job.result?.contentId;
          if (contentId) {
            const contentRes = await contentApi.getById(contentId);
            setGeneratedContent(contentRes.data.content);
            if (onSuccess) onSuccess(contentRes.data.content);
          }
          setJobId(null);
        } else if (job.status === 'FAILED') {
          toast.error(job.error || 'Content generation failed');
          setJobId(null);
          onClose();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    if (jobId) {
      interval = setInterval(checkStatus, 2000);
    }

    return () => clearInterval(interval);
  }, [jobId]);

  const handleReset = () => {
    setJobId(null);
    setGeneratedContent(null);
    generateMutation.reset();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isGenerating = jobId !== null || generateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0c] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            God Mode AI Generator
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {generatedContent ? 'Your content is ready.' : 'Calling specialized AI agents to generate content inline.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center min-h-[200px]">
          {isGenerating && !generatedContent && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg animate-pulse">Running Agentic Pipeline...</p>
                <p className="text-sm text-slate-400">
                  Phase {jobPhase + 1} of {jobTotalPhases || 4}
                </p>
              </div>
              <div className="w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${Math.max(10, ((jobPhase + 1) / (jobTotalPhases || 4)) * 100)}%` }} 
                />
              </div>
            </div>
          )}

          {generatedContent && (
            <div className="flex flex-col items-center gap-6 w-full text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Content Generated Successfully!</h3>
                <p className="text-sm text-slate-400">
                  Your "{topic}" content has been crafted by the agents.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/history')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                View in Content History <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
