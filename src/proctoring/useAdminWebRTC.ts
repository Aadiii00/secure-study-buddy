import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminWebRTC(attemptId: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    // Generate a unique ID per admin connection instance
    const senderId = `admin-${attemptId}-${crypto.randomUUID()}`;
    const channel = supabase.channel(`webrtc-${attemptId}`);
    
    const config: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    
    const initConnection = async () => {
      const pc = new RTCPeerConnection(config);
      pcRef.current = pc;
      
      pc.ontrack = (event) => {
        setStream(event.streams[0]);
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-candidate',
            payload: { candidate: event.candidate, senderId, targetId: 'student' }
          });
        }
      };
      
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnected(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnected(false);
          setStream(null);
        }
      };
      
      // Wait for channel to subscribe before sending offer
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      
      channel.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: { offer, senderId }
      });
    };

    channel
      .on('broadcast', { event: 'webrtc-answer' }, async (payload) => {
        const { answer, targetId, senderId: remoteSender } = payload.payload;
        if (targetId !== senderId) return; // Strict bounds: only process answers targeted to this admin instance
        if (remoteSender !== 'student') return;
        
        if (pcRef.current && pcRef.current.signalingState !== 'stable') {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            
            // Process queued candidates
            for (const c of candidateQueue.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            }
            candidateQueue.current = [];
          } catch (e) {
            console.error('Error setting remote answer', e);
          }
        }
      })
      .on('broadcast', { event: 'webrtc-candidate' }, async (payload) => {
        const { candidate, targetId, senderId: remoteSender } = payload.payload;
        if (targetId !== senderId) return;
        if (remoteSender !== 'student') return;
        
        if (pcRef.current && candidate) {
          try {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              candidateQueue.current.push(candidate);
            }
          } catch (e) {
            console.error('Error adding admin ICE candidate', e);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Admin WebRTC subscribed for attempt ${attemptId}`);
          initConnection();
        }
      });
      
    return () => {
      pcRef.current?.close();
      setStream(null);
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [attemptId]);

  return { stream, connected };
}
