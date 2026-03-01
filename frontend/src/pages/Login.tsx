import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      localStorage.setItem("corsair_auth", password);
      navigate("/");
    } else {
      setError("Password is required");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-abyss border border-foam/8 rounded-lg p-8 w-96">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="Corsair" className="h-10 w-10" />
          <h1 className="text-2xl font-semibold text-foam">corsair</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-mist text-sm mb-2">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-navy border border-horizon rounded px-3 py-2 text-white focus:outline-none focus:border-sky mb-4"
            placeholder="Enter password"
          />
          {error && <p className="text-coral text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 rounded font-medium text-white"
            style={{
              background: "linear-gradient(135deg, #1A6FB5, #0F4C8A)",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
