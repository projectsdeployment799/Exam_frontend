import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { Plus, Upload, Settings, FileText, LogOut, BarChart3, Clock, Trash2, X, Inbox, FolderOpen, Menu, ChevronDown, ImagePlus, ListCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
// Suppress ResizeObserver errors
if (typeof ResizeObserver !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop')) {
      return;
    }
    originalError(...args);
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [unassignedQuestions, setUnassignedQuestions] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Add these missing states
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  const [formData, setFormData] = useState({
    branch: "",
    year: "",
    semester: "",
    subject: "",
    num_students: "",
    time_limit: ""
  });
  
  const [file, setFile] = useState(null);
  const [draggedQuestion, setDraggedQuestion] = useState(null);

  // New states for image upload feature
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchExams();
  }, [navigate]);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API}/admin/exam-configs`);
      setExams(response.data);
    } catch (error) {
      toast.error("Failed to fetch exams");
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/exam-config`, formData);
      toast.success("Exam configuration saved!");
      setShowConfigDialog(false);
      setFormData({
        branch: "",
        year: "",
        semester: "",
        subject: "",
        num_students: "",
        time_limit: ""
      });
      fetchExams();
    } catch (error) {
      toast.error("Failed to save configuration");
    }
  };

  const openDeleteConfirm = (examId) => {
    setDeleteExamId(examId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteExamId) return;
    setDeleting(true);
    try {
      // correct path is /admin/exam-config/{exam_id}
      await axios.delete(`${API}/admin/exam-config/${deleteExamId}`);
      toast.success("Exam deleted");
      setExams(prev => prev.filter(e => e.id !== deleteExamId));
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete exam error:", err);
      toast.error("Failed to delete exam");
    } finally {
      setDeleting(false);
      setDeleteExamId(null);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${API}/admin/upload-questions/${selectedExam.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.success) {
        toast.success(`Uploaded ${response.data.questions_count} questions`);
        setFile(null);
        setShowUploadDialog(false);
        
        // Refresh exams to get updated data
        await fetchExams();
        
        // Go directly to organize sections
        setTimeout(() => {
          const updatedExam = exams.find(e => e.id === selectedExam.id);
          if (updatedExam) {
            setSelectedExam(updatedExam);
            openSectionDialog(updatedExam);
          }
        }, 500);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload questions");
    }
  };

  const openUploadDialog = (exam) => {
    setSelectedExam(exam);
    setShowUploadDialog(true);
  };

  const openSectionDialog = async (exam) => {
    setSelectedExam(exam);
    try {
      // Load all questions for this exam
      const questionsResponse = await axios.get(`${API}/admin/questions/${exam.id}`);
      setQuestions(questionsResponse.data);
      
      // Load exam status including sections
      const statusResponse = await axios.get(`${API}/admin/exam-status/${exam.id}`);
      const { sections: sectionsData } = statusResponse.data;
      setSections(sectionsData || []);
      
      // Filter unassigned questions (those without section_id)
      const unassigned = questionsResponse.data.filter(q => !q.section_id);
      setUnassignedQuestions(unassigned);
      
      setShowSectionDialog(true);
    } catch (error) {
      console.error("Error loading dialog:", error);
      toast.error("Failed to load questions");
    }
  };

  // Auto-distribute questions evenly across sections
  const autoDistributeQuestions = () => {
    if (sections.length === 0 || unassignedQuestions.length === 0) {
      toast.error("Add sections first and ensure there are unassigned questions");
      return;
    }

    const questionsToDistribute = [...unassignedQuestions];
    const newSections = sections.map(section => ({ ...section }));
    let questionIndex = 0;

    // Distribute questions round-robin style
    while (questionsToDistribute.length > 0) {
      for (let i = 0; i < newSections.length && questionsToDistribute.length > 0; i++) {
        const question = questionsToDistribute.shift();
        newSections[i].question_ids.push(question.id);
      }
    }

    setSections(newSections);
    setUnassignedQuestions([]);
    toast.success("Questions distributed automatically!");
  };

  const addSection = () => {
    setSections([...sections, { name: `Section ${sections.length + 1}`, question_ids: [] }]);
  };

  const removeSection = (index) => {
    const removedSection = sections[index];
    const newSections = sections.filter((_, i) => i !== index);
    
    // Re-assign questions from removed section back to unassigned
    const reassignedQuestions = questions.filter(q => 
      removedSection.question_ids.includes(q.id)
    );
    setUnassignedQuestions([...unassignedQuestions, ...reassignedQuestions]);
    setSections(newSections);
  };

  const assignToSection = (sectionIndex, questionId) => {
    const newSections = [...sections];
    if (!newSections[sectionIndex].question_ids.includes(questionId)) {
      newSections[sectionIndex].question_ids.push(questionId);
      setSections(newSections);
      setUnassignedQuestions(unassignedQuestions.filter(q => q.id !== questionId));
    }
  };

  const removeFromSection = (sectionIndex, questionId) => {
    const newSections = [...sections];
    newSections[sectionIndex].question_ids = newSections[sectionIndex].question_ids.filter(id => id !== questionId);
    setSections(newSections);
    
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setUnassignedQuestions([...unassignedQuestions, question]);
    }
  };

  const saveSections = async () => {
  try {
    const response = await axios.post(`${API}/admin/organize-sections/${selectedExam.id}`, sections);
    if (response.data.success) {
      toast.success("Sections organized successfully!");
      setShowSectionDialog(false);
      // Refresh exams to show updated questions_per_student
      await fetchExams();
    }
  } catch (error) {
    console.error("Error saving sections:", error);
    toast.error("Failed to save sections");
  }
};
  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/admin/login");
  };

  // Add drag handlers
  const handleDragStart = (e, question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnSection = (e, sectionIndex) => {
    e.preventDefault();
    if (draggedQuestion) {
      assignToSection(sectionIndex, draggedQuestion.id);
      setDraggedQuestion(null);
    }
  };
// In your organize sections handler, add this:

const handleSaveSections = async () => {
  try {
    if (!organizedSections || organizedSections.length === 0) {
      toast.error("Please organize questions into sections");
      return;
    }
    
    // Validate all sections have questions
    for (let section of organizedSections) {
      if (!section.name || !section.name.trim()) {
        toast.error("All sections must have a name");
        return;
      }
      if (!section.question_ids || section.question_ids.length === 0) {
        toast.error(`Section "${section.name}" has no questions`);
        return;
      }
    }
    
    // Save sections
    const response = await axios.post(
      `${API}/admin/exam/${selectedExam.id}/sections`,
      { sections: organizedSections },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
      }
    );
    
    console.log("Sections saved:", response.data);
    toast.success("Sections organized and saved successfully!");
    
  } catch (error) {
    console.error("Error saving sections:", error);
    toast.error(error.response?.data?.detail || "Failed to save sections");
  }
};
  // Add image upload handler
  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile || !selectedQuestion) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", imageFile);

    try {
      const response = await axios.post(
        `${API}/admin/upload-question-image/${selectedExam.id}/${selectedQuestion.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      toast.success("Image uploaded successfully!");
      
      // Update the selected question with new image URL
      setSelectedQuestion({
        ...selectedQuestion,
        image_url: response.data.image_url
      });
      
      // Refresh questions from server
      const questionsResponse = await axios.get(`${API}/admin/questions/${selectedExam.id}`);
      setQuestions(questionsResponse.data);
      
      // Update unassigned questions with new data
      const updatedUnassigned = questionsResponse.data.filter(q =>
        unassignedQuestions.some(uq => uq.id === q.id)
      );
      setUnassignedQuestions(updatedUnassigned);
      
      // Close dialog after short delay
      setTimeout(() => {
        setShowImageUploadDialog(false);
        setImageFile(null);
        setSelectedQuestion(null);
      }, 500);
      
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Add image remove handler
  const handleRemoveImage = async (questionId) => {
    if (!window.confirm("Remove image from this question?")) return;

    try {
      await axios.delete(
        `${API}/admin/remove-question-image/${selectedExam.id}/${questionId}`
      );
      toast.success("Image removed successfully!");
      
      // Refresh questions from server
      const response = await axios.get(`${API}/admin/questions/${selectedExam.id}`);
      setQuestions(response.data);
      
      // Update unassigned questions
      const updatedUnassigned = response.data.filter(q =>
        unassignedQuestions.some(uq => uq.id === q.id)
      );
      setUnassignedQuestions(updatedUnassigned);
      
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    }
  };

  // Simplify the getImageUrl function
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Cloudinary URLs are already full URLs
    return imageUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-7xl mx-auto">
        
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-400">Manage exams and configurations</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button
              data-testid="view-results-btn"
              onClick={() => navigate("/admin/results")}
              className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm py-2 px-2 sm:px-4 h-auto"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">View Results</span>
              <span className="xs:hidden">Results</span>
            </Button>
              <Button
              data-testid="admin-logout-btn"
              onClick={handleLogout}
              variant="outline"
              className="flex-1 sm:flex-initial border-gray-700 text-gray-300 hover:bg-slate-800 hover:text-gray-100 text-xs sm:text-sm py-2 px-2 sm:px-4 h-auto transition-all hover:border-slate-600"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Sign Out</span>
              <span className="xs:hidden">Log Out</span>
            </Button>
          </div>
        </div>

        {/* Create Button - Responsive */}
        <Button
          data-testid="create-exam-btn"
          onClick={() => setShowConfigDialog(true)}
          className="w-full sm:w-auto mb-4 md:mb-6 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 h-auto"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Create New Exam
        </Button>

        {/* Exam Cards Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              data-testid={`exam-card-${exam.id}`}
              className="glass-effect rounded-lg sm:rounded-xl p-4 sm:p-6 exam-card relative hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5 truncate hover:text-blue-200 transition-colors">{exam.subject}</h3>
                  <p className="text-xs sm:text-sm text-gray-400 hover:text-gray-300 truncate transition-colors">
                    {exam.branch} - Year {exam.year} - Sem {exam.semester}
                  </p>
                </div>
                <button
                  onClick={() => openDeleteConfirm(exam.id)}
                  disabled={deleting}
                  className="p-1.5 sm:p-2 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 hover:text-red-200 flex-shrink-0"
                  title="Delete exam"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-3 sm:mb-4 text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{exam.time_limit}m</span>
              </div>

              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm">
  <div className="flex justify-between hover:bg-slate-800/30 px-2 py-0.5 rounded transition-colors">
    <span className="text-gray-400 hover:text-gray-300 transition-colors">Total Uploaded:</span>
    <span className="text-white font-semibold hover:text-blue-100 transition-colors">{exam.questions_count || 0}</span>
  </div>
  
  {exam.questions_per_student > 0 && exam.questions_per_student < exam.questions_count && (
    <div className="flex justify-between hover:bg-slate-800/30 px-2 py-0.5 rounded transition-colors bg-blue-500/10 border border-blue-500/30 rounded">
      <span className="text-blue-300 hover:text-blue-200 transition-colors font-semibold">Selected for Students:</span>
      <span className="text-blue-200 font-bold hover:text-blue-100 transition-colors">
        {exam.questions_per_student}
      </span>
    </div>
  )}
  
  {exam.questions_per_student === exam.questions_count && (
    <div className="flex justify-between hover:bg-slate-800/30 px-2 py-0.5 rounded transition-colors">
      <span className="text-gray-400 hover:text-gray-300 transition-colors">Per Student:</span>
      <span className="text-white font-semibold hover:text-blue-100 transition-colors">
        All ({exam.questions_per_student})
      </span>
    </div>
  )}
</div>

              {!exam.questions_uploaded ? (
                <Button
                  data-testid={`upload-questions-btn-${exam.id}`}
                  onClick={() => openUploadDialog(exam)}
                  className="w-full bg-blue-600 hover:bg-blue-700 hover:text-white text-white text-xs sm:text-sm py-2 h-auto transition-all"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Upload Questions
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 hover:text-green-300 text-xs sm:text-sm mb-2 transition-colors">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    Questions Uploaded
                  </div>
                  <Button
                    data-testid={`organize-sections-btn-${exam.id}`}
                    onClick={() => openSectionDialog(exam)}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-300 hover:text-blue-200 hover:bg-blue-600/20 text-xs sm:text-sm py-2 h-auto transition-all"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Organize Sections
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Exam Dialog - Responsive */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] sm:w-full max-w-sm md:max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white hover:text-blue-100 transition-colors">Exam Configuration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateExam} className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Branch</Label>
                <Select value={formData.branch} onValueChange={(value) => setFormData({...formData, branch: value})} required>
                  <SelectTrigger data-testid="branch-select" className="bg-slate-800 border-slate-700 hover:border-slate-600 text-white text-xs sm:text-sm mt-1 transition-colors hover:text-gray-100">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm">
                    <SelectItem value="CSE" className="hover:bg-slate-700 hover:text-white">Computer Science</SelectItem>
                    <SelectItem value="ECE" className="hover:bg-slate-700 hover:text-white">Electronics</SelectItem>
                    <SelectItem value="MECH" className="hover:bg-slate-700 hover:text-white">Mechanical</SelectItem>
                    <SelectItem value="CIVIL" className="hover:bg-slate-700 hover:text-white">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Year</Label>
                  <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})} required>
                    <SelectTrigger data-testid="year-select" className="bg-slate-800 border-slate-700 hover:border-slate-600 text-white text-xs sm:text-sm mt-1 transition-colors hover:text-gray-100">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm">
                      <SelectItem value="1" className="hover:bg-slate-700 hover:text-white">1st Year</SelectItem>
                      <SelectItem value="2" className="hover:bg-slate-700 hover:text-white">2nd Year</SelectItem>
                      <SelectItem value="3" className="hover:bg-slate-700 hover:text-white">3rd Year</SelectItem>
                      <SelectItem value="4" className="hover:bg-slate-700 hover:text-white">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Semester</Label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})} required>
                    <SelectTrigger data-testid="semester-select" className="bg-slate-800 border-slate-700 hover:border-slate-600 text-white text-xs sm:text-sm mt-1 transition-colors hover:text-gray-100">
                      <SelectValue placeholder="Sem" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm">
                      <SelectItem value="1" className="hover:bg-slate-700 hover:text-white">Sem 1</SelectItem>
                      <SelectItem value="2" className="hover:bg-slate-700 hover:text-white">Sem 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Subject Name</Label>
                <Input
                  data-testid="subject-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm mt-1 hover:border-slate-600 focus:border-blue-500 transition-colors placeholder:text-gray-500 hover:placeholder:text-gray-400"
                  placeholder="Enter subject name"
                  required
                />
              </div>

              <div>
                <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Number of Students</Label>
                <Input
                  data-testid="num-students-input"
                  type="number"
                  value={formData.num_students}
                  onChange={(e) => setFormData({...formData, num_students: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm mt-1 hover:border-slate-600 focus:border-blue-500 transition-colors placeholder:text-gray-500 hover:placeholder:text-gray-400"
                  placeholder="Enter number"
                  required
                />
              </div>

              <div>
                <Label className="text-xs sm:text-sm text-gray-300 hover:text-gray-200 transition-colors cursor-default">Time Limit (minutes)</Label>
                <Input
                  data-testid="time-limit-input"
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({...formData, time_limit: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white text-xs sm:text-sm mt-1 hover:border-slate-600 focus:border-blue-500 transition-colors placeholder:text-gray-500 hover:placeholder:text-gray-400"
                  placeholder="Enter time in minutes"
                  required
                />
              </div>

              <Button data-testid="save-config-btn" type="submit" className="w-full bg-blue-600 hover:bg-blue-700 hover:text-white text-white text-sm py-2 h-auto mt-6 transition-all">
                Save Configuration
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upload Questions Dialog - Responsive */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-600 text-white w-[90vw] sm:w-80 rounded-xl shadow-xl p-0 max-h-96">
            <DialogHeader className="border-b border-slate-700/50 pb-3 pt-4 px-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:from-blue-400 hover:to-blue-500 transition-all">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-white hover:text-blue-100 transition-colors">Upload Questions</DialogTitle>
                  <p className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-0.5">Import from DOCX</p>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleFileUpload} className="space-y-3 px-4 py-3">
              
              {/* File Upload Section */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-200 block text-center hover:text-gray-100 transition-colors cursor-default">
                  Select File
                </Label>
                <div className="relative">
                  <Input
                    data-testid="file-upload-input"
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="bg-slate-800/80 border-2 border-dashed border-slate-600 hover:border-blue-500 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:bg-blue-600 file:text-white file:font-semibold file:border-0 file:cursor-pointer file:text-xs hover:file:bg-blue-700 transition-all cursor-pointer text-xs"
                    required
                  />
                  {file && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-300 text-xs font-bold hover:text-green-200 transition-colors">
                      ✓
                    </div>
                  )}
                </div>
                {file && (
                  <p className="text-xs text-gray-400 text-center truncate hover:text-gray-300 transition-colors">{file.name}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/50">
                <Button
                  data-testid="upload-submit-btn"
                  type="submit"
                  disabled={!file}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-xs py-2 h-auto font-semibold text-white hover:text-white transition-all"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload
                </Button>
                <Button
                  data-testid="cancel-upload-btn"
                  type="button"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setFile(null);
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-gray-300 hover:text-gray-100 hover:bg-slate-800 text-xs py-2 h-auto transition-all"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Organize Sections Dialog - Responsive */}
        <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white w-[100vw] h-[100vh] max-w-none max-h-none overflow-hidden flex flex-col rounded-none lg:rounded-xl lg:max-w-6xl lg:max-h-[95vh] lg:w-auto lg:h-auto">
            <DialogHeader className="flex-shrink-0 border-b border-slate-700 pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <DialogTitle className="text-lg sm:text-xl font-bold text-white hover:text-blue-100 transition-colors">
          Organize Sections
        </DialogTitle>
        <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Questions: <span className="text-blue-300 font-bold">{questions.length}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-purple-400" />
            <span>Sections: <span className="text-purple-300 font-bold">{sections.length}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ListCheck className="w-4 h-4 text-green-400" />
            <span>Selected: <span className="text-green-300 font-bold">{questions.length - unassignedQuestions.length}</span></span>
          </div>
        </div>
        <p className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-2">Drag questions between panels or use dropdown</p>
      </div>
      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
        <Button
          data-testid="add-section-btn"
          onClick={addSection}
          size="sm"
          className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 hover:text-white text-white text-xs py-1.5 px-2 sm:px-3 h-auto whitespace-nowrap transition-all"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
          <span className="hidden sm:inline">Add Section</span>
          <span className="sm:hidden">Add</span>
        </Button>
        <Button
          data-testid="auto-distribute-btn"
          onClick={autoDistributeQuestions}
          size="sm"
          className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 hover:text-white text-white text-xs py-1.5 px-2 sm:px-3 h-auto whitespace-nowrap transition-all"
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
          <span className="hidden sm:inline">Auto Distribute</span>
          <span className="sm:hidden">Auto</span>
        </Button>
      </div>
    </div>
  </DialogHeader>

            {/* Two Column Layout - Responsive Stack on Mobile */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4 lg:gap-4">
              
              {/* Left Side - Unassigned Questions */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-800/30 rounded-lg border-2 border-slate-700 p-2 sm:p-4 hover:border-slate-600 transition-colors overflow-hidden lg:overflow-visible">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-shrink-0">
                  <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 hover:text-red-300 flex-shrink-0 transition-colors" />
                  <h3 className="font-bold text-xs sm:text-sm text-white hover:text-red-200 transition-colors">Unassigned</h3>
                  <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold ml-auto flex-shrink-0 hover:bg-red-500 transition-colors">
                    {unassignedQuestions.length}
                  </span>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  className="flex-1 overflow-y-auto bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700 hover:border-red-500/50 transition-all p-2 sm:p-4 space-y-2 sm:space-y-3"
                >
                  {unassignedQuestions.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 hover:text-gray-400 transition-colors">
                        <Inbox className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 text-slate-600 hover:text-slate-500 transition-colors" />
                        <p className="text-xs sm:text-base">All questions assigned!</p>
                      </div>
                    </div>
                  ) : (
                    unassignedQuestions.map((q) => (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, q)}
                        className="bg-gradient-to-r from-blue-900/60 to-blue-800/40 p-2 sm:p-4 rounded-lg border-2 border-blue-500/60 hover:border-blue-300 hover:from-blue-900/80 hover:to-blue-800/60 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-blue-500/40 select-none"
                      >
                        <p className="text-xs sm:text-sm font-bold text-blue-300 hover:text-blue-100 transition-colors">
                          Q{q.question_number}
                        </p>
                        <p className="text-xs text-gray-300 hover:text-gray-100 mt-1 line-clamp-3 sm:line-clamp-4 transition-colors">
                          {q.question_text}
                        </p>
                        {q.image_url && (
                          <div className="mt-2 relative group/img w-full">
                            <img
                              src={getImageUrl(q.image_url)}
                              alt="Question"
                              className="w-full h-24 sm:h-32 object-cover rounded mt-2 border border-blue-400/30 hover:border-blue-300 transition-colors"
                              onError={(e) => {
                                console.error("Unassigned - Image failed to load from:", q.image_url);
                                e.target.style.backgroundColor = '#4B5563';
                                e.target.alt = '❌ Image not found';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side - Sections */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-800/30 rounded-lg border-2 border-slate-700 p-2 sm:p-4 hover:border-slate-600 transition-colors overflow-hidden lg:overflow-visible">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-shrink-0">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 hover:text-purple-300 flex-shrink-0 transition-colors" />
                  <h3 className="font-bold text-xs sm:text-sm text-white hover:text-purple-200 transition-colors">Sections</h3>
                  <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold ml-auto flex-shrink-0 hover:bg-purple-500 transition-colors">
                    {sections.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 sm:pr-2">
                  {sections.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
                      <div className="text-center text-gray-400 hover:text-gray-300 transition-colors">
                        <FolderOpen className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 text-slate-600 hover:text-slate-500 transition-colors" />
                        <p className="text-xs sm:text-sm mb-1">No sections yet</p>
                        <p className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Click "Add" to create one</p>
                      </div>
                    </div>
                  ) : (
                    sections.map((section, sectionIndex) => (
                      <div
                        key={sectionIndex}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnSection(e, sectionIndex)}
                        className="bg-slate-800 rounded-lg border-2 border-slate-700 hover:border-purple-500/70 transition-all overflow-hidden"
                      >
                        {/* Section Header */}
                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 sm:p-2.5 border-b border-slate-700 hover:bg-slate-900/70 flex-wrap sm:flex-nowrap transition-colors">
                          <Input
                            data-testid={`section-name-input-${sectionIndex}`}
                            value={section.name}
                            onChange={(e) => {
                              const newSections = [...sections];
                              newSections[sectionIndex].name = e.target.value;
                              setSections(newSections);
                            }}
                            className="bg-slate-800 border-slate-600 text-white text-xs py-1 px-1.5 sm:px-2 focus:border-purple-400 hover:border-slate-500 flex-1 min-w-0 h-auto transition-colors"
                            placeholder="Section name"
                          />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-gray-300 hover:text-gray-200 bg-slate-900 px-1 sm:px-1.5 py-0.5 rounded transition-colors">
                              {section.question_ids.length}
                            </span>
                            <button
                              onClick={() => removeSection(sectionIndex)}
                              className="p-1 hover:bg-red-500/30 rounded transition-colors text-red-400 hover:text-red-200"
                              title="Delete section"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Questions in Section */}
                        <div className="p-1.5 sm:p-2.5 min-h-[120px] sm:min-h-[140px] max-h-[200px] sm:max-h-[260px] overflow-y-auto space-y-1.5 sm:space-y-2">
                          {section.question_ids.length === 0 ? (
                            <p className="text-xs text-gray-500 hover:text-gray-400 text-center py-4 sm:py-6 transition-colors">
                              Drag questions here or select from dropdown
                            </p>
                          ) : (
                            section.question_ids.map((qId) => {
                              const question = questions.find(q => q.id === qId);
                              return question ? (
                                <div
                                  key={qId}
                                  className="bg-gradient-to-r from-green-900/50 to-emerald-900/30 p-1.5 sm:p-2 rounded border border-green-600/60 hover:border-green-400 hover:from-green-900/70 hover:to-emerald-900/50 transition-all group"
                                >
                                  <div className="flex justify-between items-start gap-1 sm:gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors">
                                        Q{question.question_number}
                                      </p>
                                      <p className="text-xs text-gray-400 hover:text-gray-300 line-clamp-1 mt-0.5 transition-colors">
                                        {question.question_text}
                                      </p>
                                      {question.image_url && (
                                        <div className="mt-2 relative group/img w-full">
                                          <img
                                            src={getImageUrl(question.image_url)}
                                            alt="Question"
                                            className="w-full h-20 sm:h-24 object-cover rounded border border-green-500/30 hover:border-green-400 transition-colors"
                                            onError={(e) => {
                                              console.error("Image failed to load from:", question.image_url);
                                              console.error("Attempting URL:", getImageUrl(question.image_url));
                                              // Show a placeholder instead of fallback image
                                              e.target.style.backgroundColor = '#4B5563';
                                              e.target.style.display = 'flex';
                                              e.target.style.alignItems = 'center';
                                              e.target.style.justifyContent = 'center';
                                              e.target.alt = '❌ Image not found';
                                            }}
                                          />
                                          <button
                                            onClick={() => handleRemoveImage(question.id)}
                                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 rounded opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            title="Remove image"
                                          >
                                            <X className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setSelectedQuestion(question);
                                          setShowImageUploadDialog(true);
                                        }}
                                        className="p-0.5 hover:bg-blue-500/30 rounded transition-colors text-blue-400 hover:text-blue-200"
                                        title="Add/change image"
                                      >
                                        <ImagePlus className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => removeFromSection(sectionIndex, qId)}
                                        className="p-0.5 hover:bg-red-500/30 rounded transition-colors text-red-400 hover:text-red-200"
                                        title="Remove from section"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })
                          )}
                        </div>

                        {/* Dropdown - Only show if unassigned questions exist */}
                        {unassignedQuestions.length > 0 && (
                          <div className="p-1.5 sm:p-2.5 border-t border-slate-700 bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
                            <Select onValueChange={(value) => {
                              assignToSection(sectionIndex, value);
                            }}>
                              <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-gray-400 hover:text-gray-300 text-xs h-auto py-1.5 px-2 hover:border-blue-500 transition-all">
                                <SelectValue placeholder="+ Add question" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700 text-xs max-h-[200px]">
                                {unassignedQuestions.map((q) => (
                                  <SelectItem key={q.id} value={q.id} className="text-xs hover:bg-slate-800 hover:text-white">
                                    Q{q.question_number}: {q.question_text.substring(0, 35)}...
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Responsive */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-4 border-t border-slate-700 pt-2 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 bg-slate-900/30 hover:bg-slate-900/40 transition-colors">
              <Button
                data-testid="cancel-sections-btn"
                onClick={() => setShowSectionDialog(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-gray-300 hover:text-gray-100 hover:bg-slate-800 text-xs sm:text-sm py-2 h-auto transition-all hover:border-slate-600"
              >
                Cancel
              </Button>
              <Button
                data-testid="save-sections-btn"
                onClick={saveSections}
                className="flex-1 bg-blue-600 hover:bg-blue-700 hover:text-white text-white font-semibold text-xs sm:text-sm py-2 h-auto transition-all"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Save Sections
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Image Upload Dialog - Responsive */}
        <Dialog open={showImageUploadDialog} onOpenChange={setShowImageUploadDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] sm:w-full max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
                Upload Question Image
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedQuestion && (
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <p className="text-xs text-gray-400">Question:</p>
                  <p className="text-sm text-white font-semibold">
                    Q{selectedQuestion.question_number}
                  </p>
                  <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                    {selectedQuestion.question_text}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs sm:text-sm text-gray-300 mb-2 block">
                  Select Image
                </Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="bg-slate-800/80 border-2 border-dashed border-slate-600 hover:border-blue-500 text-white file:mr-2 file:py-1.5 file:px-3 file:rounded file:bg-blue-600 file:text-white file:font-semibold file:border-0 file:cursor-pointer file:text-xs hover:file:bg-blue-700 transition-all cursor-pointer text-xs"
                  />
                  {imageFile && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400 text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
                {imageFile && (
                  <p className="text-xs text-gray-400 mt-2 truncate">{imageFile.name}</p>
                )}
              </div>

              {imageFile && (
                <div className="w-full">
                  <p className="text-xs text-gray-300 mb-2">Preview:</p>
                  <div className="relative w-full h-40 bg-slate-800 rounded border border-slate-700 overflow-hidden flex items-center justify-center">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error("Preview failed to load");
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedQuestion?.image_url && (
                <div className="w-full">
                  <p className="text-xs text-gray-300 mb-2">Current Image:</p>
                  <div className="relative w-full h-32 bg-slate-800 rounded border border-slate-700 overflow-hidden flex items-center justify-center">
                    <img
                      src={getImageUrl(selectedQuestion.image_url)}
                      alt="Current"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error("Current image failed to load:", selectedQuestion.image_url);
                        e.target.alt = "Image not found";
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Uploading a new image will replace this one.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setShowImageUploadDialog(false);
                    setImageFile(null);
                    setSelectedQuestion(null);
                  }}
                  variant="outline"
                  className="flex-1 border-slate-700 text-gray-300 hover:text-gray-100 text-xs sm:text-sm py-2 h-auto transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImageUpload}
                  disabled={!imageFile || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2 h-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <span className="inline-block animate-spin mr-1.5">⏳</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-3.5 h-3.5 mr-1.5 inline" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog - Responsive */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-red-900 border-red-700 text-white w-[90vw] sm:w-80 rounded-xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-white">
                Confirm Deletion
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-white">
                Are you sure you want to delete this exam? This action cannot be undone.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteConfirmed}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 h-auto transition-all"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1 border-red-700 text-red-300 hover:text-red-100 text-sm py-2 h-auto transition-all"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}