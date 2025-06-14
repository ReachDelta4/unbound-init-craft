import React, { useEffect, useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import FloatingNotesWidget from "@/components/FloatingNotesWidget";
import { TranscriptionWSStatus } from "@/hooks/useTranscriptionWebSocket";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import ClientInterestBar from "./ClientInterestBar";
import SimpleClientEmotion from "./SimpleClientEmotion";
import CallStageIndicator from "./CallStageIndicator";
import AIResponseSection from "./AIResponseSection";
import ResizableScreenShare from "./ResizableScreenShare";
import LiveTranscriptDisplay from "./LiveTranscriptDisplay";
import LeftInsightsPanel from "./LeftInsightsPanel";
import RightInsightsPanel from "./RightInsightsPanel";
import Phi3Insights from "./Phi3Insights";
import { Phi3Insights as Phi3InsightsType } from "@/integrations/phi3/phi3Config";

interface MeetingWorkspaceProps {
  isCallActive: boolean;
  transcript: string;
  insights: {
    emotions: Array<{ emotion: string; level: number }>;
    painPoints: string[];
    objections: string[];
    recommendations: string[];
    nextActions: string[];
  };
  realtimeText?: string;
  fullSentences?: string[];
  transcriptionStatus?: TranscriptionWSStatus;
  transcriptionError?: string | null;
  onReconnectTranscription?: () => void;
  className?: string;
  stream?: MediaStream | null;
}

const MeetingWorkspace = ({ 
  isCallActive, 
  transcript, 
  insights: initialInsights,
  realtimeText = "",
  fullSentences = [],
  transcriptionStatus = "disconnected",
  transcriptionError = null,
  onReconnectTranscription = () => {},
  className,
  stream = null
}: MeetingWorkspaceProps) => {
  // State to manage phi3-generated insights
  const [phi3Insights, setPhi3Insights] = useState<Phi3InsightsType | null>(null);

  // Use phi3 insights if available, otherwise use initial insights
  const currentInsights = phi3Insights ? {
    emotions: phi3Insights.emotions,
    painPoints: phi3Insights.painPoints,
    objections: phi3Insights.objections,
    recommendations: phi3Insights.recommendations,
    nextActions: phi3Insights.nextActions
  } : initialInsights;

  // Current AI coaching response and call stage from phi3
  const aiResponse = phi3Insights?.aiCoaching || "Ask about their current workflow and pain points to better understand their needs.";
  const currentStage = phi3Insights?.callStage || "Discovery";
  
  // Get the highest emotion level for the current client emotion
  const currentEmotion = 
    phi3Insights?.emotions?.length > 0
      ? [...phi3Insights.emotions].sort((a, b) => b.level - a.level)[0].emotion
      : "Interested";
  
  // Get client interest level (using the Interest emotion if available)
  const clientInterest = 
    phi3Insights?.emotions?.find(e => e.emotion === "Interest")?.level || 75;

  // Debug stream information when it changes
  useEffect(() => {
    if (stream) {
      console.log('MeetingWorkspace received stream:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoActive: stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live'),
      });
    }
  }, [stream]);

  // Always show screen share preview when call is active and stream exists
  const isScreenShareActive = isCallActive && !!stream;

  return (
    <div className={cn("h-full overflow-hidden relative", className)}>
      {/* Add Phi3Insights component to process transcript */}
      <Phi3Insights 
        liveText={realtimeText}
        transcriptHistory={fullSentences}
        onInsightsUpdated={setPhi3Insights}
        className="hidden"
      />

      <div className="h-full flex flex-col">
        {/* Compact Top Section */}
        <div className="flex-shrink-0 p-3 space-y-2 border-b border-border">
          {/* First row: Client Interest (20%), Client Emotion, Call Stage, User Controls */}
          <div className="flex gap-3 items-center">
            <div className="w-1/5">
              <ClientInterestBar interestLevel={clientInterest} />
            </div>
            <div className="flex-1">
              <SimpleClientEmotion currentEmotion={currentEmotion} />
            </div>
            <div className="flex-1">
              <CallStageIndicator currentStage={currentStage} />
            </div>
            <div className="flex justify-end items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          
          {/* Second row: AI Response */}
          <div>
            <AIResponseSection response={aiResponse} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 px-3 pb-3 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full border border-border rounded-lg overflow-hidden">
            {/* Left Side Panel - Emotions & Pain Points */}
            <ResizablePanel 
              defaultSize={20} 
              minSize={15}
              maxSize={25}
              className="pr-2 border-r border-border"
            >
              <ScrollArea className="h-full">
                <LeftInsightsPanel 
                  isCallActive={isCallActive}
                  emotions={currentInsights.emotions}
                  painPoints={currentInsights.painPoints}
                />
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border" />

            {/* Center Panel - Screen Share & Transcript */}
            <ResizablePanel 
              defaultSize={60} 
              minSize={40}
              className="px-2 border-x border-border"
            >
              <ScrollArea className="h-full">
                <div className="flex flex-col space-y-3 py-2">
                  {/* Resizable Screen Share Preview */}
                  <div className="flex-shrink-0">
                    <ResizableScreenShare 
                      stream={stream} 
                      isActive={isScreenShareActive} 
                    />
                  </div>
                  
                  {/* Live Transcript Area */}
                  <div className="min-h-[200px]">
                    <LiveTranscriptDisplay 
                      liveText={realtimeText}
                      transcriptHistory={fullSentences}
                    />
                  </div>
                </div>
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border" />

            {/* Right Side Panel - Objections & Recommendations */}
            <ResizablePanel 
              defaultSize={20} 
              minSize={15}
              maxSize={25}
              className="pl-2 border-l border-border"
            >
              <ScrollArea className="h-full">
                <RightInsightsPanel 
                  isCallActive={isCallActive}
                  objections={currentInsights.objections}
                  recommendations={currentInsights.recommendations}
                  nextActions={currentInsights.nextActions}
                />
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Floating Notes Widget */}
      <FloatingNotesWidget isCallActive={isCallActive} />
    </div>
  );
};

export default MeetingWorkspace;
