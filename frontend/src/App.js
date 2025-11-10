import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import {useNavigate} from "react-router-dom" ;

function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("blog"); 
  const navigate = useNavigate()
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    github_link: "",
    live_deploy_link: "",
    photo_filename: "",
  });

  // ---------------- Fetch Public Blog Posts ----------------
  const fetchPublicPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/posts", { credentials: "include" });
      const html = await res.text();

      // Extract JSON-like content if Flask returns HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const cards = [...doc.querySelectorAll(".blog-card")];
      if (cards.length > 0) {
        // Custom structure extraction (optional)
      }

      // If you have a JSON endpoint for /blog, replace above with:
      // const data = await res.json();
      // setPosts(data);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- Auth Handlers ----------------
  
  const checkSession = useCallback(async () => {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/dashboard", {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      setUser(true);
      setPosts(data);
      return true;
    } else {
      setUser(null);
      return false;
    }
  } catch (err) {
    console.error("Session check failed:", err);
    setUser(null);
    return false;
  }
}, []);

const handleLogin = async (email, password) => {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const sessionRes = await fetch("http://localhost:8000/api/session",{
        credentials:"include"
      })
      if (sessionRes.ok) {
        navigate("/dashboard");
      } else {
        alert("Session not active. Try logging in again.");
      }
    } else {
      alert("Login failed. Check credentials.");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("An error occurred during login.");
  }
};

useEffect(() => {
  fetchPublicPosts();
  checkSession();
}, [fetchPublicPosts, checkSession]);

  const handleLogout = async () => {
    await fetch("http://127.0.0.1:8000/api/logout", { credentials: "include" });
    setUser(null);
    setView("blog");
  };

  // ---------------- CRUD Operations ----------------
  const handleCreatePost = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/api/create_post", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: new URLSearchParams(formData),
    });
    if (res.ok) {
      alert("Post created!");
      fetchPublicPosts();
      setView("dashboard");
    } else {
      alert("Failed to create post.");
    }
  };

  const handleEditPost = async (id) => {
    const res = await fetch(`http://127.0.0.1:8000/api/edit_post/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: new URLSearchParams(formData),
    });
    if (res.ok) {
      alert("Post updated!");
      fetchPublicPosts();
      setView("dashboard");
    } else {
      alert("Failed to update post.");
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`http://127.0.0.1:8000/api/delete_post/${id}`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      alert("Post deleted!");
      fetchPublicPosts();
    } else {
      alert("Failed to delete post.");
    }
  };

  // ---------------- Render Components ----------------

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
              <img
                src={post.photo_filename}
                alt={post.title}
                className="rounded-lg mb-4"
              />
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
            photo_filename: "",
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
                  setFormData(post);
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
        onSubmit={(e) => (isEdit ? handleEditPost(selectedPost.id) : handleCreatePost(e))}
        className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <h1 className="text-2xl font-bold mb-6">
          {isEdit ? "Edit Post" : "Create Post"}
        </h1>
        {["title", "description", "github_link", "live_deploy_link", "photo_filename"].map(
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

  // ---------------- Conditional Rendering ----------------
  if (view === "login") return <Login />;
  if (view === "dashboard") return <Dashboard />;
  if (view === "create") return <PostForm />;
  if (view === "edit") return <PostForm isEdit />;

  return <BlogList />;
}

export default App;
