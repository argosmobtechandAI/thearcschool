import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LogIn } from "lucide-react";
import { loginSuccess } from "../features/authSlice";
import api from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      const response = await api.post("/user/loginUser", {
        data: { email, password },
      });

      if (response.data.success) {
        dispatch(
          loginSuccess({
            user: response.data.user,
            token: response.data.token,
          })
        );
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "64px", width: "64px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          <div>
            <h2 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "0.25rem", lineHeight: 1.2 }}>The Arc School</h2>
            <p style={{ color: "var(--text-secondary)" }}>Sign in to manage your school</p>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Email Address</label>
            <input
              type="email"
              className="input-glass"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Password</label>
            <input
              type="password"
              className="input-glass"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "1rem", padding: "0.875rem" }}>
            {loading ? "Authenticating..." : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
