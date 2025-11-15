import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function StudentRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    roll_number: "",
    year: "",
    semester: "",
    branch: "",
    section: "",
    email: ""
  });
  const [nameError, setNameError] = useState("");
  const [rollNumberError, setRollNumberError] = useState("");

  const handleNameChange = (e) => {
    let value = e.target.value.toUpperCase();
    
    // Allow only uppercase letters and spaces
    value = value.replace(/[^A-Z\s]/g, "");
    
    setFormData({ ...formData, name: value });
    
    // Validate: only uppercase letters and spaces, min 3 characters
    if (value && value.trim().length < 3) {
      setNameError("Name must be at least 3 characters");
    } else if (value && !/^[A-Z\s]+$/.test(value)) {
      setNameError("Name must contain only uppercase letters and spaces");
    } else {
      setNameError("");
    }
  };

  const handleRollNumberChange = (e) => {
    let value = e.target.value.toUpperCase();
    
    // Allow only uppercase letters and numbers
    value = value.replace(/[^A-Z0-9]/g, "");
    
    // Limit to 10 characters
    value = value.slice(0, 10);
    
    setFormData({ ...formData, roll_number: value });
    
    // Validate: only uppercase letters and numbers
    if (value && !/^[A-Z0-9]+$/.test(value)) {
      setRollNumberError("Roll number must contain only uppercase letters and numbers");
    } else {
      setRollNumberError("");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate name
    if (!formData.name) {
      setNameError("Name is required");
      return;
    }
    
    if (formData.name.trim().length < 3) {
      setNameError("Name must be at least 3 characters");
      return;
    }
    
    if (!/^[A-Z\s]+$/.test(formData.name)) {
      setNameError("Name must contain only uppercase letters and spaces");
      return;
    }
    
    // Validate roll number
    if (!formData.roll_number) {
      setRollNumberError("Roll number is required");
      return;
    }
    
    if (!/^[A-Z0-9]+$/.test(formData.roll_number)) {
      setRollNumberError("Roll number must contain only uppercase letters and numbers");
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(`${API}/student/register`, formData);
      if (response.data.success) {
        toast.success("Registration successful! You can now login with password: Student@123");
        navigate("/student/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm">
        <button
          data-testid="back-to-home-btn"
          onClick={() => navigate("/")}
          className="flex items-center text-gray-400 hover:text-white mb-3 transition-colors text-xs sm:text-sm"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Back to Home
        </button>

        <div className="glass-effect rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="text-center mb-4 sm:mb-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg shadow-green-500/50">
              <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">Create Account</h1>
            <p className="text-xs text-gray-400">Register to take exams</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-2 sm:space-y-3">
            {/* Name & Roll Number Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="name" className="text-gray-300 text-xs block mb-0.5">
                  Full Name
                </Label>
                <Input
                  data-testid="name-input"
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className={`bg-slate-900/50 border-slate-700 text-white h-8 text-xs uppercase ${
                    nameError ? "border-red-500" : ""
                  }`}
                  placeholder="JOHN DOE"
                  required
                />
                {nameError && (
                  <p className="text-red-400 text-xs mt-1">{nameError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="roll_number" className="text-gray-300 text-xs block mb-0.5">
                  Roll No.
                </Label>
                <Input
                  data-testid="roll-number-input"
                  id="roll_number"
                  type="text"
                  value={formData.roll_number}
                  onChange={handleRollNumberChange}
                  className={`bg-slate-900/50 border-slate-700 text-white h-8 text-xs uppercase ${
                    rollNumberError ? "border-red-500" : ""
                  }`}
                  placeholder="10 chars"
                  maxLength={10}
                  required
                />
                {rollNumberError && (
                  <p className="text-red-400 text-xs mt-1">{rollNumberError}</p>
                )}
              </div>
            </div>

            {/* Year & Semester Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-300 text-xs block mb-0.5">Year</Label>
                <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})} required>
                  <SelectTrigger data-testid="year-select" className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs">
                    <SelectItem value="1">1st</SelectItem>
                    <SelectItem value="2">2nd</SelectItem>
                    <SelectItem value="3">3rd</SelectItem>
                    <SelectItem value="4">4th</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300 text-xs block mb-0.5">Semester</Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})} required>
                  <SelectTrigger data-testid="semester-select" className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs">
                    <SelectValue placeholder="Sem" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs">
                    <SelectItem value="1">Sem 1</SelectItem>
                    <SelectItem value="2">Sem 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Branch & Section Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-300 text-xs block mb-0.5">Branch</Label>
                <Select value={formData.branch} onValueChange={(value) => setFormData({...formData, branch: value})} required>
                  <SelectTrigger data-testid="branch-select" className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs">
                    <SelectItem value="CSE">CSE</SelectItem>
                    <SelectItem value="ECE">ECE</SelectItem>
                    <SelectItem value="MECH">MECH</SelectItem>
                    <SelectItem value="CIVIL">CIVIL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300 text-xs block mb-0.5">Section</Label>
                <Select value={formData.section} onValueChange={(value) => setFormData({...formData, section: value})} required>
                  <SelectTrigger data-testid="section-select" className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs">
                    <SelectValue placeholder="Sec" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white text-xs">
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-gray-300 text-xs block mb-0.5">
                Email (Optional)
              </Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-slate-900/50 border-slate-700 text-white h-8 text-xs"
                placeholder="your@email.com"
              />
            </div>

            {/* Register Button */}
            <Button
              data-testid="register-btn"
              type="submit"
              disabled={loading || nameError !== "" || rollNumberError !== ""}
              className="w-full h-9 bg-green-600 hover:bg-green-700 text-white font-medium text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register"}
            </Button>

            {/* Sign In Link */}
            <div className="text-center pt-1">
              <button
                data-testid="go-to-login-btn"
                type="button"
                onClick={() => navigate("/student/login")}
                className="text-green-400 hover:text-green-300 text-xs transition-colors"
              >
                Already have account? Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}