import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useStudentWebRTC(attemptId: string, stream: MediaStream | null) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!attemptId || !stream) return;

    const channel = supabase.channel(`webrtc-${attemptId}`);

    const handleWebRTCOffer = async (payload: any) => {
      const { offer, senderId } = payload;
      
      const config: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };
      
      const pc = new RTCPeerConnection(config);
      peerConnections.current.set(senderId, pc);

      // Add local stream tracks to connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-candidate',
            payload: { candidate: event.candidate, senderId: 'student', targetId: senderId }
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channel.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { answer, senderId: 'student', targetId: senderId }
      });
    };

    const handleWebRTCCandidate = async (payload: any) => {
      const { candidate, senderId, targetId } = payload;
      if (targetId !== 'student') return; // Only process candidates meant for the student
      
      const pc = peerConnections.current.get(senderId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    };

    channel
      .on('broadcast', { event: 'webrtc-offer' }, (payload) => handleWebRTCOffer(payload.payload))
      .on('broadcast', { event: 'webrtc-candidate' }, (payload) => handleWebRTCCandidate(payload.payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Student WebRTC signaling connected for attempt ${attemptId}`);
        }
      });

    return () => {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      supabase.removeChannel(channel);
    };
  }, [attemptId, stream]);
}
