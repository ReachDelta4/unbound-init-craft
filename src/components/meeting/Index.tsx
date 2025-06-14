
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Phone, Share, Share2, Monitor } from "lucide-react";
import MeetingWorkspace from "./MeetingWorkspace";
import { useTranscriptionWebSocket } from "@/hooks/useTranscriptionWebSocket";

const MeetingPage = () => {
  const navigate = useNavigate();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mouseTimeoutRef = useRef<number | null>(null);

  // Transcription hook
  const {
    fullTranscript,
    realtimeText,
    fullSentences,
    status: transcriptionStatus,
    error: transcriptionError,
    connect: connectTranscription,
    disconnect: disconnectTranscription,
  } = useTranscriptionWebSocket();

  // Simple screen sharing state
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Sample insights data
  const insights = {
    emotions: [
      { emotion: "Interest", level: 75 },
      { emotion: "Confusion", level: 25 },
      { emotion: "Satisfaction", level: 60 },
    ],
    painPoints: [
      "Current process is too manual",
      "Lack of visibility into team productivity",
      "Integration issues with existing tools"
    ],
    objections: [
      "Price is too high compared to competitors",
      "Implementation timeline is too long",
      "Need approval from other stakeholders"
    ],
    recommendations: [
      "Focus on ROI and long-term value",
      "Offer implementation assistance",
      "Provide case studies from similar clients"
    ],
    nextActions: [
      "Schedule follow-up meeting with decision makers",
      "Send pricing comparison document",
      "Share implementation timeline"
    ]
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      console.log("Requesting screen capture...");
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      console.log('Screen share video tracks:', screenStream.getVideoTracks().map(track => ({
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState
      })));
      
      setStream(screenStream);
      setIsScreenSharing(true);

      // Add event listener for when screen sharing ends
      const videoTracks = screenStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].onended = () => {
          console.log("Screen share ended by user");
          stopScreenShare();
        };
      }

      return screenStream;
    } catch (error) {
      console.error("Screen share error:", error);
      throw error;
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    console.log("Stopping screen share...");
    
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
      });
    }
    
    setStream(null);
    setIsScreenSharing(false);
    
    console.log("Screen share stopped");
  };

  // Start/stop call
  const toggleCall = async () => {
    if (isCallActive) {
      setIsCallActive(false);
      setIsMicOn(false);
      setIsVideoOn(false);
      if (isScreenSharing) {
        stopScreenShare();
      }
      disconnectTranscription();
    } else {
      setIsCallActive(true);
      setIsMicOn(true);
      connectTranscription();
      // Auto-start screen sharing when call starts
      try {
        await startScreenShare();
      } catch (error) {
        console.error("Failed to start screen sharing:", error);
      }
    }
  };

  // Toggle microphone
  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    // In a real app, would toggle actual microphone here
  };

  // Toggle video
  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // In a real app, would toggle actual camera here
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        await startScreenShare();
      } catch (error) {
        console.error("Error starting screen share:", error);
      }
    }
  };

  // Handle mouse movement to show/hide controls
  const handleMouseMove = (e: MouseEvent) => {
    const { clientY } = e;
    const windowHeight = window.innerHeight;
    
    // Show controls when mouse is near the bottom 100px of the screen
    const shouldShowControls = clientY > windowHeight - 100;
    
    if (shouldShowControls !== showControls) {
      setShowControls(shouldShowControls);
    }
    
    // Reset any existing timeout
    if (mouseTimeoutRef.current) {
      window.clearTimeout(mouseTimeoutRef.current);
      mouseTimeoutRef.current = null;
    }
  };

  // Set up mouse move listener
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseTimeoutRef.current) {
        window.clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, [showControls]);

  return (
    <div 
      ref={mainContainerRef}
      className="h-screen w-full flex flex-col bg-background overflow-hidden"
      style={{ height: '100vh' }}
    >
      {/* Main Meeting Area */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          height: showControls ? 'calc(100vh - 80px)' : '100vh',
          transition: 'height 0.3s ease-in-out'
        }}
      >
        <MeetingWorkspace
          isCallActive={isCallActive}
          transcript={fullTranscript || ""}
          insights={insights}
          realtimeText={realtimeText}
          fullSentences={fullSentences}
          transcriptionStatus={transcriptionStatus}
          transcriptionError={transcriptionError}
          onReconnectTranscription={connectTranscription}
          stream={stream}
        />
      </div>

      {/* Controls Bar */}
      <div 
        ref={controlsRef}
        className="h-20 bg-card border-t-2 border-border shadow-lg flex items-center justify-center gap-4 transition-all duration-300"
        style={{
          transform: showControls ? 'translateY(0)' : 'translateY(100%)',
          opacity: showControls ? 1 : 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10
        }}
      >
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isMicOn ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-border"
            onClick={toggleMic}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant={isVideoOn ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-border"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Center Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-border"
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? <Monitor className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isCallActive ? "destructive" : "default"}
            size="lg"
            className="rounded-full px-8 border-2 border-border"
            onClick={toggleCall}
          >
            <Phone className="h-5 w-5 mr-2" />
            {isCallActive ? "End Call" : "Start Call"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;
