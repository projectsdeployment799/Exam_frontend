import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { Clock, Flag, Send, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Menu, X, Zap, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";

export default function ExamInterface() {
  const navigate = useNavigate();
  const { examId, attemptId } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [sections, setSections] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const warningTimeoutRef = useRef(null);

  // Prevent scrolling on body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchExamData();
    enterFullscreen();
    
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBack);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    
    return () => {
      window.removeEventListener("popstate", preventBack);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API}/student/exam/${examId}/${attemptId}`
      );
      
      const { exam, questions, attempt, sections } = response.data;
      
      // DEBUG: Log everything
      console.log("===== EXAM DATA RECEIVED =====");
      console.log("Exam:", exam);
      console.log("Questions count:", questions?.length);
      console.log("Sections:", sections);
      console.log("Sections length:", sections?.length);
      console.log("Attempt:", attempt);
      
      setExam(exam);
      setQuestions(questions || []);
      
      // IMPORTANT: Ensure sections are set
      if (sections && Array.isArray(sections) && sections.length > 0) {
        console.log("✓ Setting sections:", sections);
        setSections(sections);
      } else {
        console.warn("⚠ No sections received or invalid format");
        setSections([]);
      }
      
      // Set initial time - check sessionStorage for existing session
      const sessionKey = `exam_session_${attemptId}`;
      const existingSession = sessionStorage.getItem(sessionKey);
      
      let timeInSeconds;
      if (existingSession) {
        // Calculate elapsed time and subtract from remaining
        const session = JSON.parse(existingSession);
        const elapsedTime = Math.floor((Date.now() - session.startTime) / 1000);
        timeInSeconds = Math.max(0, session.totalTime - elapsedTime);
        console.log(`📊 Resuming session - Elapsed: ${elapsedTime}s, Remaining: ${timeInSeconds}s`);
      } else {
        // First time loading
        timeInSeconds = (exam?.time_limit || 60) * 60;
        sessionStorage.setItem(sessionKey, JSON.stringify({
          startTime: Date.now(),
          totalTime: timeInSeconds
        }));
        console.log(`⏱ New session started - Total time: ${timeInSeconds}s`);
      }
      
      setTimeRemaining(timeInSeconds);
      
      // Initialize answers from attempt
      if (attempt?.answers) {
        setAnswers(attempt.answers);
      }
      if (attempt?.marked_for_review) {
        setMarkedForReview(attempt.marked_for_review);
      }
      
    } catch (error) {
      console.error("Error fetching exam data:", error);
      toast.error(
        error.response?.data?.detail || "Failed to load exam. Please refresh."
      );
      setTimeout(() => navigate("/student/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  };

  const preventBack = (e) => {
    window.history.pushState(null, "", window.location.href);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      reportSuspiciousActivity();
      showWarningBanner();
    }
  };

  const handleWindowBlur = () => {
    reportSuspiciousActivity();
    showWarningBanner();
  };

  const reportSuspiciousActivity = async () => {
    const newCount = suspiciousCount + 1;
    setSuspiciousCount(newCount);
    
    try {
      await axios.post(`${API}/student/suspicious-activity/${attemptId}`);
    } catch (error) {
      console.error("Failed to report activity");
    }
    
    if (newCount >= 3) {
      toast.error("Too many violations! Exam will be auto-submitted.");
      setTimeout(() => handleAutoSubmit(), 3000);
    }
  };

  const showWarningBanner = () => {
    setShowWarning(true);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setShowWarning(false), 3000);
  };

  const handleAnswerChange = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    
    try {
      await axios.post(`${API}/student/save-answer/${attemptId}`, {
        question_id: questionId,
        answer: answer
      });
    } catch (error) {
      console.error("Failed to save answer");
    }
  };

  const toggleMarkForReview = async () => {
    const currentQuestion = getCurrentSectionQuestions()[currentQuestionIndex];
    const isMarked = markedForReview.includes(currentQuestion.id);
    
    try {
      await axios.post(`${API}/student/mark-review/${attemptId}/${currentQuestion.id}`, null, {
        params: { mark: !isMarked }
      });
      
      if (isMarked) {
        setMarkedForReview(markedForReview.filter(id => id !== currentQuestion.id));
      } else {
        setMarkedForReview([...markedForReview, currentQuestion.id]);
      }
    } catch (error) {
      console.error("Failed to mark for review");
    }
  };

  const handleAutoSubmit = async () => {
    toast.warning("Time's up! Auto-submitting exam...");
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/student/submit-exam/${attemptId}`);
      setShowSubmitDialog(false);
      setShowThankYou(true);
      
      setTimeout(() => {
        navigate("/student/dashboard");
      }, 3000);
    } catch (error) {
      toast.error("Failed to submit exam");
      setSubmitting(false);
    }
  };

  const getCurrentSectionQuestions = () => {
    if (!sections || sections.length === 0) {
      // No sections - return all questions
      return questions;
    }
    
    // Get questions for current section
    const currentSectionData = sections[currentSection];
    if (!currentSectionData) {
      return [];
    }
    
    const questionIds = currentSectionData.question_ids || [];
    return questions.filter(q => questionIds.includes(q.id));
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColorClass = () => {
    if (timeRemaining < 60) return "text-red-500 animate-pulse";
    if (timeRemaining < 300) return "text-yellow-500";
    return "text-blue-400";
  };

  const getAnsweredCount = () => {
    return getCurrentSectionQuestions().filter(q => answers[q.id]).length;
  };

  const getNotAnsweredCount = () => {
    return getCurrentSectionQuestions().filter(q => !answers[q.id] && !markedForReview.includes(q.id)).length;
  };

  const getReviewCount = () => {
    return getCurrentSectionQuestions().filter(q => markedForReview.includes(q.id)).length;
  };

  const progressPercentage = Math.round(
    (getAnsweredCount() / getCurrentSectionQuestions().length) * 100
  ) || 0;

  // Update the getImageUrl function
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Log for debugging
    console.log("Processing image URL:", imageUrl);
    
    // If it's already a full Cloudinary URL
    if (imageUrl && typeof imageUrl === 'string') {
      if (imageUrl.startsWith('https://res.cloudinary.com')) {
        return imageUrl;
      }
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
    }
    
    return imageUrl;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-2 sm:p-4">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-lg">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-2 sm:p-4">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-bounce shadow-2xl shadow-green-500/50">
            <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">Exam Submitted!</h1>
          <p className="text-gray-400 text-sm sm:text-lg mb-1 sm:mb-2">Thank you for completing the exam</p>
          <p className="text-gray-500 text-xs sm:text-sm">Redirecting in 3s</p>
        </div>
      </div>
    );
  }

  const currentSectionQuestions = getCurrentSectionQuestions();
  const currentQuestion = currentSectionQuestions[currentQuestionIndex];

  return (
    <div data-testid="exam-interface" className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden">
      {/* Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 px-3 py-1.5 sm:py-2 z-50 animate-in slide-in-from-top duration-300 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-white text-xs max-w-7xl mx-auto">
            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="font-semibold">⚠ Suspicious activity detected! ({suspiciousCount}/3)</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 backdrop-blur-md bg-opacity-95 px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Exam Info */}
          <div className="flex-1 min-w-0">
            <h1 data-testid="exam-title" className="text-sm sm:text-lg lg:text-xl font-bold text-white truncate">
              {exam?.subject}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {exam?.branch} • Y{exam?.year}S{exam?.semester}
            </p>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            timeRemaining < 60
              ? "bg-red-900/40 text-red-300 animate-pulse ring-2 ring-red-500"
              : timeRemaining < 300
              ? "bg-yellow-900/40 text-yellow-300 ring-2 ring-yellow-500"
              : "bg-blue-900/40 text-blue-300"
          }`}>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span data-testid="timer">{formatTime(timeRemaining)}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Submit Button - Hidden on mobile */}
            <button
              onClick={() => setShowSubmitDialog(true)}
              className="hidden sm:flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold transition-all text-xs shadow-lg hover:shadow-green-500/25"
            >
              <Send className="w-3 h-3" />
              <span className="hidden md:inline">Submit</span>
            </button>

            {/* Hamburger Menu - Shows sidebar with stats and questions */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-gray-300"
            >
              {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sections Bar - Now in header */}
        {sections && sections.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold flex items-center gap-2 text-xs sm:text-sm">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                Sections ({currentSection + 1}/{sections.length})
              </h3>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
              {sections.map((section, index) => {
                const sectionQuestions = section.question_ids?.length || 0;
                const answeredInSection = section.question_ids?.filter(
                  qId => answers[qId]
                ).length || 0;
                
                return (
                  <button
                    key={`section-${index}-${section.id || section.name || index}`}
                    data-testid={`section-btn-${index}`}
                    onClick={() => {
                      setCurrentSection(index);
                      setCurrentQuestionIndex(0);
                    }}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-xs sm:text-sm flex-shrink-0 whitespace-nowrap ${
                      currentSection === index
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    <div>{section.name || `Section ${index + 1}`}</div>
                    <div className="text-xs opacity-75">
                      {answeredInSection}/{sectionQuestions}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">
            No sections configured for this exam
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 flex-col sm:flex-row">
        {/* Left: Question Area */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-slate-700 min-w-0 order-1 sm:order-none">
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            <div className="max-w-2xl">
              {/* Question Header */}
              <div className="mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-slate-700">
                <div className="flex items-baseline gap-2 sm:gap-3 mb-2">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Q{currentQuestionIndex + 1}</span>
                  <span className="text-sm sm:text-base text-gray-300">/ {currentSectionQuestions.length}</span>
                </div>
                {sections.length > 1 && (
                  <div className="text-sm text-gray-200 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/50">{sections[currentSection].name}</span>
                  </div>
                )}
              </div>

              {/* Question Content */}
              <div className="space-y-4 sm:space-y-5">
                {/* Remove code blocks from question text */}
                {(() => {
                  let displayText = currentQuestion?.question_text || '';
                  displayText = displayText.replace(/```[\s\S]*?```/g, '').trim();
                  return (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">
                      {displayText}
                    </p>
                  );
                })()}
                
                {currentQuestion?.has_code && currentQuestion?.code_snippet && (
                  <div className="bg-slate-900/80 border border-slate-600 rounded-lg p-3 sm:p-4 lg:p-5 overflow-x-auto">
                    <div className="text-sm text-gray-200 mb-3 font-semibold font-mono">Code Snippet</div>
                    <pre className="text-sm sm:text-base font-mono text-gray-100 leading-relaxed max-h-48 overflow-y-auto">
                      <code>{currentQuestion.code_snippet}</code>
                    </pre>
                  </div>
                )}

                {/* Display question image if available */}
                {currentQuestion?.image_url && (
                  <div className="my-4 flex justify-center">
                    <div className="relative w-full max-w-md">
                      <img
                        key={`img-${currentQuestion.id}`}
                        src={getImageUrl(currentQuestion.image_url)}
                        alt={`Question ${currentQuestion.question_number}`}
                        className="max-w-full h-auto max-h-80 object-contain rounded-lg border border-blue-400/30 hover:border-blue-300 transition-colors"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onLoad={() => {
                          console.log("✓ Image loaded successfully:", currentQuestion.image_url);
                        }}
                        onError={(e) => {
                          console.error("✗ Image failed to load:", currentQuestion.image_url);
                          e.target.style.backgroundColor = '#1e293b';
                          e.target.style.color = '#94a3b8';
                          e.target.style.display = 'flex';
                          e.target.style.alignItems = 'center';
                          e.target.style.justifyContent = 'center';
                          e.target.style.width = '100%';
                          e.target.style.height = '200px';
                          e.target.style.borderRadius = '0.5rem';
                          e.target.style.border = '1px solid #475569';
                          e.target.textContent = '❌ Image failed to load';
                          e.target.style.fontSize = '14px';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Visible only on mobile, hidden on sm and above */}
        <div className="sm:hidden flex gap-2 p-3 border-t border-slate-700 bg-slate-900/40">
          <button
            data-testid="mobile-prev-btn"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 disabled:text-gray-600 font-semibold transition-all duration-200 text-xs"
          >
            <ChevronLeft className="w-3 h-3" />
            Prev
          </button>

          <button
            data-testid="mobile-options-btn"
            onClick={() => setShowMobileOptions(true)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-200 text-xs"
          >
            <Zap className="w-3 h-3" />
            Options
          </button>

          <button
            data-testid="mobile-next-btn"
            onClick={() => setCurrentQuestionIndex(Math.min(currentSectionQuestions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === currentSectionQuestions.length - 1}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 text-xs"
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>



        {/* Right: Options Area */}
        <div className="hidden sm:flex w-full sm:w-96 lg:w-[420px] bg-slate-800/20 border-r border-slate-700 flex-col overflow-hidden">
          {/* Options Header */}
          <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-700 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-300 uppercase">Answer Options</h3>
              <button
                data-testid="mark-for-review-btn"
                onClick={toggleMarkForReview}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                  markedForReview.includes(currentQuestion?.id)
                    ? "bg-yellow-500/20 border border-yellow-500 text-yellow-300 ring-1 ring-yellow-500/30"
                    : "bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300"
                }`}
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Options Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-3">Select your answer:</div>
              <RadioGroup
                value={answers[currentQuestion?.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion?.id, value)}
              >
                <div className="space-y-2">
                  {currentQuestion?.options?.map((option, idx) => (
                    <div
                      key={`${currentQuestion.id}-${option.letter}`}
                      data-testid={`option-${option.letter}`}
                      className={`relative group`}
                    >
                      <input
                        type="radio"
                        id={`option-${option.letter}`}
                        name={`question-${currentQuestion?.id}`}
                        value={option.letter}
                        checked={answers[currentQuestion?.id] === option.letter}
                        onChange={(e) => handleAnswerChange(currentQuestion?.id, e.target.value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`option-${option.letter}`}
                        className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 text-xs sm:text-sm ${
                          answers[currentQuestion?.id] === option.letter
                            ? "border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/25"
                            : "border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700/50 group-hover:shadow-md group-hover:shadow-slate-600/20"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          answers[currentQuestion?.id] === option.letter
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-500 group-hover:border-slate-400"
                        }`}>
                          {answers[currentQuestion?.id] === option.letter && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-100">
                            {option.letter})
                          </div>
                          <div className="text-gray-300 mt-1">{option.value}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Navigation Buttons - Desktop Only */}
          <div className="flex-shrink-0 p-3 sm:p-4 border-t border-slate-700 bg-slate-900/40 space-y-2">
            <div className="flex gap-2">
              <button
                data-testid="previous-btn"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 disabled:text-gray-600 font-semibold transition-all duration-200 text-xs"
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </button>

              <button
                data-testid="next-btn"
                onClick={() => setCurrentQuestionIndex(Math.min(currentSectionQuestions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === currentSectionQuestions.length - 1}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 text-xs"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Desktop Submit */}
            <button
              data-testid="submit-exam-btn-desktop"
              onClick={() => setShowSubmitDialog(true)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-green-500/25 text-xs"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          </div>
        </div>

        {/* Sidebar - Question Navigator */}
        <div
          className={`fixed inset-y-0 right-0 w-64 sm:w-72 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-all duration-300 ease-in-out z-30 overflow-hidden flex flex-col ${
            showSidebar ? "translate-x-0" : "translate-x-full"
          } lg:static lg:translate-x-0 lg:w-80`}
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
              {/* Mobile Header */}
              {isMobile && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <h3 className="font-bold text-sm">Questions</h3>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-2.5 sm:p-3 border border-green-500/30">
                  <div className="text-lg sm:text-xl font-bold text-green-400">{getAnsweredCount()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Answered</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg p-2.5 sm:p-3 border border-red-500/30">
                  <div className="text-lg sm:text-xl font-bold text-red-400">{getNotAnsweredCount()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Skipped</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg p-2.5 sm:p-3 border border-yellow-500/30">
                  <div className="text-lg sm:text-xl font-bold text-yellow-400">{getReviewCount()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Review</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-2.5 sm:p-3 border border-blue-500/30">
                  <div className="text-lg sm:text-xl font-bold text-blue-400">{progressPercentage}%</div>
                  <div className="text-xs text-gray-400 mt-0.5">Progress</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Overall</span>
                  <span className="font-semibold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Grid */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Questions</h3>
                <div className="grid grid-cols-7 gap-1.5">
                  {currentSectionQuestions.map((q, index) => {
                    const isAnswered = answers[q.id];
                    const isMarked = markedForReview.includes(q.id);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={q.id}
                        data-testid={`question-nav-${index + 1}`}
                        onClick={() => {
                          setCurrentQuestionIndex(index);
                          setShowSidebar(false);
                        }}
                        title={`Q${index + 1}`}
                        className={`aspect-square rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center flex-shrink-0 relative group ${
                          isCurrent ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500 scale-110 shadow-lg shadow-blue-500/40" : ""
                        } ${
                          isAnswered
                            ? "bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md shadow-green-500/30"
                            : isMarked
                            ? "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 shadow-md shadow-yellow-500/30"
                            : "bg-slate-700 text-gray-300 hover:bg-slate-600 border border-slate-600"
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section Stats */}
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-gray-300 text-xs">Total</div>
                    <div className="text-lg font-bold text-blue-400 mt-0.5">{currentSectionQuestions.length}</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-300 text-xs">Done</div>
                    <div className="text-lg font-bold text-green-400 mt-0.5">{getAnsweredCount()}</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 pb-3 border-t border-slate-700 pt-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Legend</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-lg bg-green-500 shadow-md shadow-green-500/50"></div>
                    <span className="text-gray-400">Answered</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-lg bg-yellow-500 shadow-md shadow-yellow-500/50"></div>
                    <span className="text-gray-400">Review</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-lg bg-slate-700 border border-slate-600"></div>
                    <span className="text-gray-400">Skipped</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Submit Button */}
            <div className="sm:block px-3 sm:px-4 py-3 border-t border-slate-700 mt-auto flex-shrink-0">
              <button
                data-testid="submit-exam-btn-desktop"
                onClick={() => setShowSubmitDialog(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-2 rounded-lg transition-all shadow-lg hover:shadow-green-500/25 text-xs sm:text-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobile && showSidebar && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </div>

      {/* Mobile Options Modal - Direct Implementation */}
      {showMobileOptions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setShowMobileOptions(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg font-bold">Q{currentQuestionIndex + 1} - Answer</h2>
                <button
                  onClick={() => setShowMobileOptions(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Mark for Review Button */}
                <button
                  onClick={toggleMarkForReview}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    markedForReview.includes(currentQuestion?.id)
                      ? "bg-yellow-500/20 border border-yellow-500 text-yellow-300"
                      : "bg-slate-700 hover:bg-slate-600 text-gray-300 border border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Mark for Review
                  </div>
                  {markedForReview.includes(currentQuestion?.id) && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>

                {/* Answer Options */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-3">Select your answer:</div>
                  {currentQuestion && currentQuestion.options && currentQuestion.options.length > 0 ? (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option) => (
                        <div
                          key={`mobile-opt-${currentQuestion.id}-${option.letter}`}
                          className="relative"
                        >
                          <input
                            type="radio"
                            id={`mobile-opt-${option.letter}`}
                            name={`mobile-q-${currentQuestion?.id}`}
                            value={option.letter}
                            checked={answers[currentQuestion?.id] === option.letter}
                            onChange={(e) => handleAnswerChange(currentQuestion?.id, e.target.value)}
                            className="sr-only"
                          />
                          <label
                            htmlFor={`mobile-opt-${option.letter}`}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 text-sm ${
                              answers[currentQuestion?.id] === option.letter
                                ? "border-blue-500 bg-blue-500/15"
                                : "border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700/50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              answers[currentQuestion?.id] === option.letter
                                ? "border-blue-500 bg-blue-500"
                                : "border-slate-500"
                            }`}>
                              {answers[currentQuestion?.id] === option.letter && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-100">
                                {option.letter})
                              </div>
                              <div className="text-gray-300 mt-1">{option.value}</div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-sm">No options available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-900/50 flex-shrink-0">
                <button
                  onClick={() => setShowMobileOptions(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stats Modal - Hidden (content now in hamburger menu sidebar) */}
      {false && (
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogContent className="bg-slate-900 border border-slate-700 text-white w-[95vw] max-h-[90vh] mx-auto rounded-lg p-0 max-w-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Statistics</h2>
              <button
                onClick={() => setShowStats(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Overall Stats */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Overall Progress</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-4 border border-green-500/30 text-center">
                    <div className="text-2xl font-bold text-green-400">{getAnsweredCount()}</div>
                    <div className="text-xs text-gray-400 mt-1">Answered</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg p-4 border border-red-500/30 text-center">
                    <div className="text-2xl font-bold text-red-400">{getNotAnsweredCount()}</div>
                    <div className="text-xs text-gray-400 mt-1">Skipped</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg p-4 border border-yellow-500/30 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{getReviewCount()}</div>
                    <div className="text-xs text-gray-400 mt-1">Review</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-4 border border-blue-500/30 text-center">
                    <div className="text-2xl font-bold text-blue-400">{progressPercentage}%</div>
                    <div className="text-xs text-gray-400 mt-1">Progress</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Completion</span>
                  <span className="font-semibold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Section Stats */}
              {sections.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">By Section</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sections.map((section, idx) => {
                      const sectionQuestions = section.question_ids?.length || 0;
                      const answeredInSection = section.question_ids?.filter(qId => answers[qId]).length || 0;
                      const sectionPercentage = sectionQuestions > 0 ? Math.round((answeredInSection / sectionQuestions) * 100) : 0;
                      
                      return (
                        <div key={`stat-section-${idx}`} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-200">{section.name}</span>
                            <span className="text-xs font-bold text-blue-400">{sectionPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                              style={{ width: `${sectionPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{answeredInSection}/{sectionQuestions} answered</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-900/50 flex-col sm:flex-row">
              <button
                onClick={() => setShowStats(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowStats(false);
                  setShowSubmitDialog(true);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                Submit
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white w-[95vw] sm:max-w-sm mx-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold">Ready to Submit?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-500/20 rounded-lg p-2 text-center border border-green-500/30">
                <div className="text-xl font-bold text-green-400">{getAnsweredCount()}</div>
                <div className="text-xs text-gray-400 mt-0.5">Answered</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-2 text-center border border-yellow-500/30">
                <div className="text-xl font-bold text-yellow-400">{getReviewCount()}</div>
                <div className="text-xs text-gray-400 mt-0.5">Review</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-2 text-center border border-red-500/30">
                <div className="text-xl font-bold text-red-400">{getNotAnsweredCount()}</div>
                <div className="text-xs text-gray-400 mt-0.5">Skipped</div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded p-3">
              <p className="text-xs text-yellow-300">
                ⚠️ You cannot change answers after submission.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                data-testid="cancel-submit-btn"
                onClick={() => setShowSubmitDialog(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 font-semibold transition-all duration-200 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg hover:shadow-green-500/25 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
