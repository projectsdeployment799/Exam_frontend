import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { ArrowLeft, Filter } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

export default function AdminResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState({
    branch: "",
    year: "",
    semester: "",
    subject: "",
    section: ""
  });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API}/admin/results`);
      setResults(response.data);
      setFilteredResults(response.data);
    } catch (error) {
      toast.error("Failed to fetch results");
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    if (filters.branch) {
      filtered = filtered.filter(r => r.branch === filters.branch);
    }
    if (filters.year) {
      filtered = filtered.filter(r => r.year === filters.year);
    }
    if (filters.semester) {
      filtered = filtered.filter(r => r.semester === filters.semester);
    }
    if (filters.subject) {
      filtered = filtered.filter(r => r.subject.toLowerCase().includes(filters.subject.toLowerCase()));
    }
    if (filters.section) {
      filtered = filtered.filter(r => r.section === filters.section);
    }

    setFilteredResults(filtered);
    setShowFilterDialog(false);
    toast.success("Filters applied");
  };

  const clearFilters = () => {
    setFilters({
      branch: "",
      year: "",
      semester: "",
      subject: "",
      section: ""
    });
    setFilteredResults(results);
    setShowFilterDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          data-testid="back-to-dashboard-btn"
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Exam Results</h1>
            <p className="text-gray-400">{filteredResults.length} results found</p>
          </div>
          <Button
            data-testid="filter-btn"
            onClick={() => setShowFilterDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Roll Number</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Student Name</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Subject</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Score</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Percentage</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    data-testid={`result-row-${result.id}`}
                    className="border-t border-slate-800 hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="p-4 text-white font-medium">{result.roll_number}</td>
                    <td className="p-4 text-gray-300">{result.student_name}</td>
                    <td className="p-4 text-gray-300">{result.subject}</td>
                    <td className="p-4 text-white font-medium">{result.score}</td>
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

          {filteredResults.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No results found</p>
            </div>
          )}
        </div>

        {/* Filter Dialog */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Filter Results</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Branch</label>
                <Select value={filters.branch} onValueChange={(value) => setFilters({...filters, branch: value})}>
                  <SelectTrigger data-testid="filter-branch-select" className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value=" ">All Branches</SelectItem>
                    <SelectItem value="CSE">Computer Science</SelectItem>
                    <SelectItem value="ECE">Electronics</SelectItem>
                    <SelectItem value="MECH">Mechanical</SelectItem>
                    <SelectItem value="CIVIL">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Year</label>
                <Select value={filters.year} onValueChange={(value) => setFilters({...filters, year: value})}>
                  <SelectTrigger data-testid="filter-year-select" className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value=" ">All Years</SelectItem>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Semester</label>
                <Select value={filters.semester} onValueChange={(value) => setFilters({...filters, semester: value})}>
                  <SelectTrigger data-testid="filter-semester-select" className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value=" ">All Semesters</SelectItem>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="clear-filters-btn"
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 border-slate-700 text-gray-300"
                >
                  Clear Filters
                </Button>
                <Button
                  data-testid="apply-filters-btn"
                  onClick={applyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}