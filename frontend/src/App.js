import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("blog");
  const [selectedPost, setSelectedPost] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    github_link: "",
    live_deploy_link: "",
    photo: null,
  });

  // ---------------- Fetch Public Posts ----------------
  const fetchPublicPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- Auth ----------------
  const checkSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/current_user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session check failed:", err);
      setUser(null);
    }
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // backend returns "token"
        localStorage.setItem("token", data.token);
        await checkSession();
        setView("dashboard");
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setView("blog");
    try {
      await fetch(`${API_BASE}/logout`, { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ---------------- CREATE POST ----------------
  const handleCreatePost = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("description", formData.description);
    fd.append("github_link", formData.github_link);
    fd.append("live_deploy_link", formData.live_deploy_link);
    if (formData.photo) fd.append("photo", formData.photo);

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchPublicPosts();
        setView("dashboard");
      } else {
        alert(data.message || "Failed to create post.");
      }
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  // ---------------- EDIT POST ----------------
  const handleEditPost = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const fd = new FormData();
    fd.append("title", formData.title);
    fd.append("description", formData.description);
    fd.append("github_link", formData.github_link);
    fd.append("live_deploy_link", formData.live_deploy_link);
    if (formData.photo) fd.append("photo", formData.photo);

    try {
      const res = await fetch(`${API_BASE}/posts/${selectedPost.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchPublicPosts();
        setView("dashboard");
      } else {
        alert(data.message || "Failed to update post.");
      }
    } catch (err) {
      console.error("Error updating post:", err);
    }
  };

  // ---------------- DELETE POST ----------------
  const handleDeletePost = async (id) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchPublicPosts();
      } else {
        alert(data.message || "Failed to delete post.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ---------------- Hooks ----------------
  useEffect(() => {
    fetchPublicPosts();
    checkSession();
  }, [fetchPublicPosts, checkSession]);

  // ---------------- Components ----------------
  const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="bg-gray-900 p-10 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-500">
          <h1 className="text-3xl font-bold mb-4 text-center">Admin Login</h1>
          <input
            type="email"
            className="w-full mb-4 p-3 rounded bg-gray-800"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full mb-4 p-3 rounded bg-gray-800"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={() => handleLogin(email, password)}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded"
          >
            Login
          </button>
        </div>
      </div>
    );
  };

  const BlogList = () => (
    <div className="min-h-screen bg-black text-gray-200 p-10">
      <h1 className="text-4xl font-bold text-center mb-10">My Blog</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900 p-6 rounded-2xl shadow-lg transform hover:scale-105 hover:rotate-1 transition-transform duration-500"
            >
              {post.photo_filename && (
                <img
                  src={`/static/uploads/${post.photo_filename}`}
                  alt={post.title}
                  className="rounded-lg mb-4"
                />
              )}
              <h2 className="text-2xl font-semibold">{post.title}</h2>
              <p className="text-gray-400 mt-2">{post.description}</p>
              <div className="flex justify-between mt-4">
                <a
                  href={post.github_link}
                  className="text-blue-400 hover:text-blue-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <a
                  href={post.live_deploy_link}
                  className="text-green-400 hover:text-green-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Live
                </a>
              </div>
            </div>
          ))
        ) : (
          <p>No posts available.</p>
        )}
      </div>
      <div className="text-center mt-10">
        <button
          onClick={() => setView("login")}
          className="px-6 py-3 bg-blue-700 rounded-md hover:bg-blue-800"
        >
          Admin Login
        </button>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="flex justify-between mb-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      <button
        onClick={() => {
          setFormData({
            title: "",
            description: "",
            github_link: "",
            live_deploy_link: "",
            photo: null,
          });
          setView("create");
        }}
        className="bg-green-600 px-4 py-2 rounded mb-6 hover:bg-green-700"
      >
        Create Post
      </button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-gray-900 p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-500"
          >
            <h2 className="text-xl font-bold">{post.title}</h2>
            <p className="text-gray-400">{post.description}</p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => {
                  setSelectedPost(post);
                  setFormData({
                    title: post.title,
                    description: post.description,
                    github_link: post.github_link,
                    live_deploy_link: post.live_deploy_link,
                    photo: null,
                  });
                  setView("edit");
                }}
                className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeletePost(post.id)}
                className="bg-red-600 px-3 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const PostForm = ({ isEdit = false }) => (
    <div className="min-h-screen bg-black text-white p-10 flex justify-center">
      <form
        onSubmit={(e) => (isEdit ? handleEditPost(e) : handleCreatePost(e))}
        className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg"
        encType="multipart/form-data"
      >
        <h1 className="text-2xl font-bold mb-6">
          {isEdit ? "Edit Post" : "Create Post"}
        </h1>

        {["title", "description", "github_link", "live_deploy_link"].map(
          (field) => (
            <input
              key={field}
              type="text"
              placeholder={field.replace("_", " ")}
              value={formData[field]}
              onChange={(e) =>
                setFormData({ ...formData, [field]: e.target.value })
              }
              className="w-full mb-4 p-3 rounded bg-gray-800"
            />
          )
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })}
          className="w-full mb-4 p-3 rounded bg-gray-800"
        />

        <div className="flex justify-between mt-6">
          <button
            type="submit"
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            {isEdit ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // ---------------- Conditional Render ----------------
  if (view === "login") return <Login />;
  if (view === "dashboard") return <Dashboard />;
  if (view === "create") return <PostForm />;
  if (view === "edit") return <PostForm isEdit />;

  return <BlogList />;
}

export default App;
