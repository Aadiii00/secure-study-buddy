import { useState, useEffect, useRef } from 'react';
import { useAdminWebRTC } from '@/proctoring/useAdminWebRTC';
import { AlertTriangle, Video, VideoOff, Disc } from 'lucide-react';

interface LiveStudentCardProps {
  attempt: any;
  profile: any;
  violations: any[];
}

const LiveStudentCard = ({ attempt, profile, violations }: LiveStudentCardProps) => {
  const { stream, connected } = useAdminWebRTC(attempt.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, connected]);
  
  // Status logic
  const recentViolations = violations.filter(
    v => v.attempt_id === attempt.id && new Date(v.created_at).getTime() > Date.now() - 60000
  );
  
  let status: 'Active' | 'Suspicious' | 'Disconnected' = 'Disconnected';
  if (connected) {
    status = recentViolations.length > 0 ? 'Suspicious' : 'Active';
  }

  return (
    <div className={`border rounded-xl overflow-hidden bg-card flex flex-col ${
      status === 'Suspicious' ? 'border-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 
      status === 'Active' ? 'border-success/30' : 'border-border'
    }`}>
      {/* Video Feed */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline 
          className={`w-full h-full object-cover ${(!stream || !connected) ? 'hidden' : ''}`} 
          style={{ transform: 'scaleX(-1)' }} 
        />
        
        {(!stream || !connected) && (
          <div className="flex flex-col items-center justify-center text-muted-foreground absolute inset-0">
            <VideoOff className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">Stream Disconnected</span>
          </div>
        )}
        
        {/* Recording Indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
          <Disc className={`w-3 h-3 ${connected ? 'text-danger animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-[10px] font-medium uppercase tracking-wider">REC</span>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex items-center">
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md text-white backdrop-blur-sm ${
            status === 'Active' ? 'bg-success/80' : 
            status === 'Suspicious' ? 'bg-danger/80 animate-pulse' : 
            'bg-muted-foreground/80'
          }`}>
            {status}
          </span>
        </div>
      </div>
      
      {/* Student Info */}
      <div className="p-3 flex-1 flex flex-col justify-between border-t border-border/50">
        <div>
          <h4 className="font-semibold text-sm text-foreground truncate">{profile?.full_name || 'Unknown Student'}</h4>
          <p className="text-xs text-muted-foreground font-mono truncate mb-1">ID: {attempt.user_id.slice(0, 8)}</p>
          <p className="text-[11px] text-muted-foreground truncate">{attempt.exams?.title}</p>
        </div>
        
        {/* Recent Alerts */}
        <div className="mt-3">
          {recentViolations.length > 0 ? (
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-destructive/10 text-danger border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="text-[10px] line-clamp-2 leading-tight font-medium">
                {recentViolations[0].type}: {recentViolations[0].details || 'Recent violation detected'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-success/10 text-success border border-success/20">
              <div className="w-2 h-2 rounded-full bg-success shrink-0" />
              <span className="text-[10px] font-medium">Monitoring normal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LiveProctoringGridProps {
  activeAttempts: any[];
  profiles: any[];
  liveViolations: any[];
}

const LiveProctoringGrid = ({ activeAttempts, profiles, liveViolations }: LiveProctoringGridProps) => {
  if (activeAttempts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card/50">
        <Video className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-foreground">No Active Exams</h3>
        <p className="text-sm text-muted-foreground mt-1">There are currently no students taking exams live.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {activeAttempts.map((attempt) => (
        <LiveStudentCard 
          key={attempt.id} 
          attempt={attempt} 
          profile={profiles.find(p => p.user_id === attempt.user_id)} 
          violations={liveViolations} 
        />
      ))}
    </div>
  );
};

export default LiveProctoringGrid;
