import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { LogIn, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeviceConfirmation, setShowDeviceConfirmation] = useState(false);
  const [studentData, setStudentData] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/student/login`, {
        roll_number: rollNumber,
        password: password
      });

      if (response.data.requires_device_confirmation) {
        // Show device confirmation popup
        setStudentData({
          roll_number: rollNumber,
          password: password,
          student: response.data.student
        });
        setShowDeviceConfirmation(true);
      } else if (response.data.success) {
        // Successful login without conflict
        toast.success("Login successful!");
        localStorage.setItem("studentData", JSON.stringify(response.data.student));
        localStorage.setItem("sessionId", response.data.session_id);
        navigate("/student/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceConfirmation = async (confirm) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/student/confirm-device-login`, {
        roll_number: studentData.roll_number,
        password: studentData.password,
        confirm_continue: confirm
      });

      if (confirm && response.data.success) {
        toast.success("Previous session logged out. Welcome!");
        localStorage.setItem("studentData", JSON.stringify(response.data.student));
        localStorage.setItem("sessionId", response.data.session_id);
        setShowDeviceConfirmation(false);
        navigate("/student/dashboard");
      } else if (!confirm) {
        toast.info("Login cancelled");
        setShowDeviceConfirmation(false);
        setRollNumber("");
        setPassword("");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to process login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!showDeviceConfirmation ? (
          <>
            <button
              data-testid="back-to-home-btn"
              onClick={() => navigate("/")}
              className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </button>

            <div className="glass-effect rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/50">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Student Portal</h1>
                <p className="text-gray-400">Sign in to access your exams</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="roll_number" className="text-gray-300 mb-2 block">
                    Roll Number
                  </Label>
                  <Input
                    data-testid="roll-number-input"
                    id="roll_number"
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white h-12"
                    placeholder="Enter your roll number"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-300 mb-2 block">
                    Password
                  </Label>
                  <Input
                    data-testid="password-input"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white h-12"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button
                  data-testid="login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                >
                  {loading ? "Signing in..." : "Sign in to Exam"}
                </Button>
              </form>

              <div className="mt-6 space-y-3 text-center">
                <button
                  data-testid="go-to-register-btn"
                  onClick={() => navigate("/student/register")}
                  className="text-green-400 hover:text-green-300 text-sm transition-colors block w-full"
                >
                  Don't have an account? Register
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-effect rounded-2xl p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Device Conflict Detected
            </h2>
            <p className="text-gray-300 text-center mb-6">
              You are already logged in on another device. Do you want to continue?
            </p>
            <p className="text-gray-400 text-sm text-center mb-6">
              Your previous session will be logged out.
            </p>
            <div className="space-y-3">
              <Button
                data-testid="device-confirm-btn"
                onClick={() => handleDeviceConfirmation(true)}
                disabled={loading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
              >
                {loading ? "Processing..." : "Continue on This Device"}
              </Button>
              <Button
                data-testid="device-cancel-btn"
                onClick={() => handleDeviceConfirmation(false)}
                disabled={loading}
                className="w-full h-12 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}