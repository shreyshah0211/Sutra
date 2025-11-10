import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Mic, Square, Volume2, VolumeX, User, Star, FileText, ImageIcon, ZoomIn, ZoomOut, X } from 'lucide-react';
import './styles.css';

// Interface for session state
type SessionState = 'initial' | 'patientTalking' | 'userPrompted' | 'userTalking' | 'feedback';

interface SimplifiedClinicalSkillsPageProps {
  onBackClick: () => void;
  onRecordingComplete?: (recording: Blob) => void;
}

interface ApiResponse {
  content: string;
  promptIndex: number;
  totalPrompts: number;
  prompt: string;
  nextPrompt: string | null;
}

const SimplifiedClinicalSkillsPage: React.FC<SimplifiedClinicalSkillsPageProps> = ({ onBackClick, onRecordingComplete }) => {
  // State variables
  const [sessionState, setSessionState] = useState<SessionState>('initial');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [latestRecording, setLatestRecording] = useState<Blob | null>(null);
  const [showXrayPopup, setShowXrayPopup] = useState<boolean>(false);
  const [showLabResultsPopup, setShowLabResultsPopup] = useState<boolean>(false);
  const [xrayZoomLevel, setXrayZoomLevel] = useState<number>(1);
  const [showResultButtons, setShowResultButtons] = useState<boolean>(false);
  const [promptIndex, setPromptIndex] = useState<number>(0);
  const [totalPrompts, setTotalPrompts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const synth = window.speechSynthesis;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Lab results content
  const labResults = {
    title: "Laboratory Results",
    content: [
      "WBC: 17,000/mm³",
      "Differential:",
      "- Neutrophils: 70%",
      "- Bands: 15%",
      "- Lymphocytes: 15%",
      "Temperature: 102.6°F",
      "Blood Pressure: 152/90",
      "Heart Rate: 112/minute, regular",
      "Respiratory Rate: 24/minute, somewhat labored"
    ]
  };
  
  // Effect to handle text-to-speech when currentCaption or sessionState changes
  useEffect(() => {
    if (sessionState === 'patientTalking' && !isMuted && currentCaption && !isSpeaking) {
      console.log("Starting speech for:", currentCaption);
      speakText(currentCaption);
    }
    
    return () => {
      // Clean up any ongoing speech when component unmounts or dependencies change
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, [sessionState, currentCaption, isMuted]);

  // Effect to notify parent component when a new recording is made
  useEffect(() => {
    if (latestRecording && onRecordingComplete) {
      onRecordingComplete(latestRecording);
    }
  }, [latestRecording, onRecordingComplete]);
  
  // Effect to show result buttons after prompt index 3 (4th prompt)
  useEffect(() => {
    if (promptIndex > 3) {
      setShowResultButtons(true);
    }
  }, [promptIndex]);
  
  // Setup audio recording when component mounts
  useEffect(() => {
    setupAudioRecording();
    
    // Initialize speech synthesis voices
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => {
        console.log("Voices loaded:", synth.getVoices().length);
      };
    }
    
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Ensure speech is canceled when component unmounts
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, []);
  
  // Function to setup audio recording
  const setupAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        // Store the recording as a Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        // Save the latest recording in state
        setLatestRecording(audioBlob);
        
        // For demonstration purposes, we'll just log that we have the recording
        console.log('Recording saved:', audioBlob);
      };
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions and try again.');
    }
  };
  
  // Fetch the next prompt from the API
  const fetchNextPrompt = async () => {
    setIsLoading(true);
    try {
      // Use your server's actual URL and port
      const response = await fetch('http://localhost:5001/api/send-prompt');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('API response:', data);
      
      setCurrentCaption(data.content);
      setPromptIndex(data.promptIndex);
      setTotalPrompts(data.totalPrompts);
      
      setIsLoading(false);
      return data;
    } catch (error) {
      console.error('Error fetching prompt:', error);
      setIsLoading(false);
      setCurrentCaption("Sorry, I'm having trouble communicating. Please try again later.");
      return null;
    }
  };

   // Fetch the next prompt from the API
   const resetPrompts = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/reset", {
        method: "POST", // Ensure it's a POST request
        headers: {
          "Content-Type": "application/json",
        },
      });
      return null;

    } catch (error) {
      console.error('Error fetching prompt:', error);
      setIsLoading(false);
      setCurrentCaption("Sorry, I'm having trouble communicating. Please try again later.");
      return null;
    }
  };
  
  // Start the session
  const startSession = async () => {
    const data = await fetchNextPrompt();
    if (data) {
      setSessionState('patientTalking');
    } else {
      setCurrentCaption("Sorry, I'm having trouble communicating. Please try again later.");
    }
  };
  
  // Handle patient finished talking
  const handlePatientFinishedTalking = () => {
    console.log("Patient finished talking, moving to user prompted state");
    setSessionState('userPrompted');
  };
  
  // Start user recording
  const startRecording = () => {
    if (mediaRecorderRef.current) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setSessionState('userTalking');
    } else {
      alert('Recording is not available. Please check microphone permissions.');
    }
  };
  
  // Stop user recording and proceed to next patient response
  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Get the next prompt if available
      const data = await fetchNextPrompt();
      
      if (data && data.nextPrompt !== null) {
        // Continue the conversation
        setSessionState('patientTalking');
      } else {
        // End of script, show feedback form
        setSessionState('feedback');
      }
    }
  };
  
  // Toggle mute for text-to-speech
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isSpeaking && !isMuted) {
      synth.cancel();
      setIsSpeaking(false);
    }
  };
  
  // Speak text using text-to-speech
  const speakText = (text: string) => {
    if (!isMuted && synth) {
      // Cancel any ongoing speech
      if (synth.speaking) {
        synth.cancel();
      }

      setIsSpeaking(true);
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Try to select a male voice for our male patient
      const voices = synth.getVoices();
      console.log("Available voices:", voices.length);
      
      if (voices.length > 0) {
        const maleVoice = voices.find(voice => 
          voice.name.includes("Female") || 
          voice.name.includes("Lisa")
        );
        
        if (maleVoice) {
          utterance.voice = maleVoice;
          console.log("Selected voice:", maleVoice.name);
        }
      }
      
      // Set speech parameters
      utterance.pitch = 1.3;
      utterance.rate = 1.3; // Slightly slower for better comprehension
      
      // Define what happens when speech ends
      utterance.onend = (event) => {
        console.log("Speech ended, duration:", event.elapsedTime);
        setIsSpeaking(false);
        // Wait a moment after speaking ends before prompting user
        setTimeout(handlePatientFinishedTalking, 1000);
      };
      
      // Error handling for speech
      utterance.onerror = (event) => {
        console.error("Speech error:", event.error);
        setIsSpeaking(false);
        handlePatientFinishedTalking();
      };
      
      // Start speaking
      synth.speak(utterance);
      
      // Workaround for some browsers that don't trigger onend correctly
      const maxSpeechTime = 15000; // 15 seconds max for a response
      setTimeout(() => {
        if (isSpeaking) {
          console.log("Speech timeout triggered");
          setIsSpeaking(false);
          handlePatientFinishedTalking();
        }
      }, maxSpeechTime);
    }
  };
  
  // Zoom in on the X-ray image
  const zoomIn = () => {
    setXrayZoomLevel(prev => Math.min(prev + 0.5, 3));
  };
  
  // Zoom out on the X-ray image
  const zoomOut = () => {
    setXrayZoomLevel(prev => Math.max(prev - 0.5, 1));
  };
  
  // Submit feedback and return to dashboard
  const submitFeedback = () => {
    // In a real app, you would send this feedback to your server
    resetPrompts();
    console.log('Feedback submitted:', { rating: feedbackRating, text: feedbackText });
    onBackClick();
  };
  
  // Render stars for rating
  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <button 
          key={i}
          className={`star-button ${i <= feedbackRating ? 'active' : ''}`}
          onClick={() => setFeedbackRating(i)}
        >
          <Star className="star-icon" />
        </button>
      );
    }
    return stars;
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (totalPrompts === 0) return 0;
    return (promptIndex / (totalPrompts - 1)) * 100;
  };
  
  // Manual override to move to user recording if speech is stuck
  const forceUserPrompt = () => {
    if (sessionState === 'patientTalking') {
      if (synth.speaking) {
        synth.cancel();
      }
      setIsSpeaking(false);
      setSessionState('userPrompted');
    }
  };
  
  return (
    <main className="clinical-skills-container">
      <div className="clinical-skills-header">
        <button className="back-button" onClick={onBackClick}>
          <ChevronDown className="back-icon" />
          Back to Dashboard
        </button>
        <h1 className="page-title">Patient Simulation</h1>
      </div>
      
      <div className="simulation-card">
        <div className="simulation-sidebar">
          <div className="current-topic">
            <h3>Current topic:</h3>
            <p>Pathology</p>
          </div>
          
          <div className="progress-container">
            <h3>Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
          
          <div className="next-test">
            <h3>Next test:</h3>
            <p>March 5th</p>
          </div>
          
          {showResultButtons && (
            <div className="results-buttons">
              <h3>View Results:</h3>
              <button 
                className="result-button xray-button"
                onClick={() => setShowXrayPopup(true)}
              >
                <ImageIcon className="result-icon" />
                X-ray
              </button>
              <button 
                className="result-button labs-button"
                onClick={() => setShowLabResultsPopup(true)}
              >
                <FileText className="result-icon" />
                Lab Results
              </button>
            </div>
          )}
        </div>
        
        <div className="simulation-content">
          <div className="patient-avatar-large">
            <User className="avatar-icon-large" />
          </div>
          
          {sessionState === 'initial' && (
            <button className="primary-button" onClick={startSession}>
              Start
            </button>
          )}
          
          {sessionState === 'patientTalking' && (
            <div className="patient-speaking">
              <div className="captions-container">
                {isLoading ? "Loading..." : currentCaption}
              </div>
              <div className="speech-controls">
                <button className="continue-button" onClick={forceUserPrompt}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {sessionState === 'userPrompted' && (
            <button className="record-button" onClick={startRecording}>
              Tap to record response
            </button>
          )}
          
          {sessionState === 'userTalking' && (
            <button className="stop-button" onClick={stopRecording}>
              <Square className="stop-icon" /> Stop recording
            </button>
          )}
          
          {sessionState === 'feedback' && (
            <div className="feedback-container">
              <h2>Session Completed</h2>
              <p>Please rate your experience and provide feedback:</p>
              
              <div className="rating-container">
                <h3>Rating:</h3>
                <div className="star-rating">
                  {renderRatingStars()}
                </div>
                <span className="rating-value">{feedbackRating}/10</span>
              </div>
              
              <div className="feedback-text-container">
                <h3>Feedback:</h3>
                <textarea
                  className="feedback-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Please share your thoughts about this simulation..."
                  rows={4}
                ></textarea>
              </div>
              
              <button 
                className="primary-button submit-button" 
                onClick={submitFeedback}
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* X-ray Popup */}
      {showXrayPopup && (
        <div className="popup-overlay">
          <div className="popup-container xray-popup">
            <div className="popup-header">
              <h2>Chest X-ray PA and Lateral</h2>
              <div className="popup-controls">
                <button className="icon-button" onClick={zoomIn}>
                  <ZoomIn className="icon" />
                </button>
                <button className="icon-button" onClick={zoomOut}>
                  <ZoomOut className="icon" />
                </button>
                <button className="icon-button" onClick={() => setShowXrayPopup(false)}>
                  <X className="icon" />
                </button>
              </div>
            </div>
            <div className="popup-content">
              <div className="xray-container" style={{ transform: `scale(${xrayZoomLevel})` }}>
                {/* This would be a real X-ray image in production */}
                <div className="xray-placeholder">
                  <div className="xray-image">
                    <div className="xray-finding"></div>
                  </div>
                  <p className="xray-caption">X-ray showing right hilar mass and right middle lobe pneumonia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lab Results Popup */}
      {showLabResultsPopup && (
        <div className="popup-overlay">
          <div className="popup-container lab-popup">
            <div className="popup-header">
              <h2>{labResults.title}</h2>
              <button className="icon-button" onClick={() => setShowLabResultsPopup(false)}>
                <X className="icon" />
              </button>
            </div>
            <div className="popup-content">
              <div className="lab-results">
                {labResults.content.map((line, index) => (
                  <p key={index} className="lab-result-line">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SimplifiedClinicalSkillsPage;