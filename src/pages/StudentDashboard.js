import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { BookOpen, LogOut, Award, Clock, CheckCircle, PlayCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const studentData = localStorage.getItem("studentData");
    const storedSessionId = localStorage.getItem("sessionId");
    
    if (!studentData || !storedSessionId) {
      navigate("/student/login");
      return;
    }
    
    const parsed = JSON.parse(studentData);
    setStudent(parsed);
    setSessionId(storedSessionId);
    
    // Validate session on component mount
    validateSession(storedSessionId);
    
    fetchExams(parsed.id, storedSessionId);
    fetchResults(parsed.id, storedSessionId);
  }, [navigate]);

  const validateSession = async (sessionToken) => {
    try {
      await axios.post(`${API}/student/validate-session`, null, {
        params: { session_id: sessionToken }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Your session has ended because you logged in from another device");
        handleLogout();
      }
    }
  };

  const fetchExams = async (studentId, sessionToken) => {
    try {
      const response = await axios.get(`${API}/student/available-exams/${studentId}`, {
        headers: { "X-Session-ID": sessionToken }
      });
      setExams(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Your session has ended. Please login again.");
        handleLogout();
      } else {
        toast.error("Failed to fetch exams");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (studentId, sessionToken) => {
    try {
      const response = await axios.get(`${API}/student/results/${studentId}`, {
        headers: { "X-Session-ID": sessionToken }
      });
      setResults(response.data);
    } catch (error) {
      console.error("Failed to fetch results");
    }
  };

  const handleStartExam = async (exam) => {
    if (exam.is_completed) {
      toast.error("You have already completed this exam");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/student/start-exam/${exam.id}/${student.id}`,
        { session_id: sessionId }
      );
      navigate(`/exam/${exam.id}/${response.data.attempt_id}`);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Your session has ended. Please login again.");
        handleLogout();
      } else {
        toast.error(error.response?.data?.detail || "Failed to start exam");
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (student) {
        await axios.post(`${API}/student/logout`, null, {
          params: { student_id: student.id }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    localStorage.removeItem("studentData");
    localStorage.removeItem("sessionId");
    navigate("/student/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {student?.name}</h1>
            <p className="text-gray-400">
              {student?.branch} - Year {student?.year} - Semester {student?.semester}
            </p>
          </div>
          <Button
            data-testid="logout-btn"
            onClick={handleLogout}
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-600/20 hover:text-green-300 transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="exams" className="w-full">
          <TabsList className="bg-slate-900/50 border-slate-700 mb-6">
            <TabsTrigger data-testid="exams-tab" value="exams" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Available Exams
            </TabsTrigger>
            <TabsTrigger data-testid="results-tab" value="results" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Award className="w-4 h-4 mr-2" />
              My Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            {exams.length === 0 ? (
              <div className="glass-effect rounded-xl p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No exams available at the moment</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    data-testid={`exam-card-${exam.id}`}
                    className="glass-effect rounded-xl p-6 exam-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{exam.subject}</h3>
                        <p className="text-sm text-gray-400">
                          {exam.branch} - Year {exam.year}
                        </p>
                      </div>
                      {exam.is_completed && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                          <CheckCircle className="w-4 h-4" />
                          <span>Completed</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Questions:</span>
                        <span className="text-white">{exam.questions_per_student || exam.questions_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {exam.time_limit} minutes
                        </span>
                      </div>
                    </div>

                    <Button
                      data-testid={`start-exam-btn-${exam.id}`}
                      onClick={() => handleStartExam(exam)}
                      disabled={exam.is_completed}
                      className={`w-full ${
                        exam.is_completed
                          ? "bg-gray-600 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white`}
                    >
                      {exam.is_completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Exam
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {results.length === 0 ? (
              <div className="glass-effect rounded-xl p-12 text-center">
                <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No results available yet</p>
              </div>
            ) : (
              <div className="glass-effect rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="text-left p-4 text-gray-300 font-medium">Subject</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Score</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Percentage</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr
                          key={index}
                          data-testid={`result-row-${index}`}
                          className="border-t border-slate-800 hover:bg-slate-900/30 transition-colors"
                        >
                          <td className="p-4 text-white font-medium">{result.subject}</td>
                          <td className="p-4 text-gray-300">
                            {result.score}/{result.total}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                result.percentage >= 75
                                  ? "bg-green-500/20 text-green-400"
                                  : result.percentage >= 50
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {result.percentage}%
                            </span>
                          </td>
                          <td className="p-4 text-gray-400 text-sm">
                            {result.date ? new Date(result.date).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}