import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import "./App.css";

/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyB5Nn_cykIpozWS-Wy6GWut5GSQsLoTE5c",
  authDomain: "aizal-skincare.firebaseapp.com",
  projectId: "aizal-skincare",
  storageBucket: "aizal-skincare.firebasestorage.app",
  messagingSenderId: "941375329561",
  appId: "1:941375329561:web:77a011185516c3401f6188"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= AUTH CONTEXT ================= */
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if admin
        if (firebaseUser.email === "admin@aizal.com") {
          setUserRole("admin");
        } else {
          setUserRole("user");
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await addDoc(collection(db, "users"), {
      uid: result.user.uid,
      name,
      email,
      role: "user",
      createdAt: new Date()
    });
    return result.user;
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, userRole, loading, register, login, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

/* ================= CART CONTEXT ================= */
const CartContext = createContext();
const useCart = () => useContext(CartContext);

function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    const exist = cart.find(p => p.id === product.id);
    if (exist) {
      setCart(cart.map(p =>
        p.id === product.id ? { ...p, qty: p.qty + 1 } : p
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(p => p.id !== id));
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(p => p.id === id ? { ...p, qty } : p));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{ cart, setCart, addToCart, removeFromCart, updateQty, total, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* ================= WISHLIST CONTEXT ================= */
const WishlistContext = createContext();
const useWishlist = () => useContext(WishlistContext);

function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (product) => {
    if (!wishlist.find(p => p.id === product.id)) {
      setWishlist([...wishlist, product]);
    }
  };

  const removeFromWishlist = (id) => {
    setWishlist(wishlist.filter(p => p.id !== id));
  };

  const isInWishlist = (id) => wishlist.some(p => p.id === id);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

/* ================= MAIN APP ================= */
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/orders" element={<Protected><OrderTracking /></Protected>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<Protected><Admin /></Protected>} />
            </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

/* ================= NAVBAR ================= */
function Navbar() {
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">✨ AIZAL Skincare</Link>
      <div className={`nav-menu ${menuOpen ? "open" : ""}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
        <Link to="/wishlist" onClick={() => setMenuOpen(false)}>❤️ Wishlist ({wishlist.length})</Link>
        <Link to="/cart" onClick={() => setMenuOpen(false)}>🛒 Cart ({cart.length})</Link>
        {user ? (
          <>
            <Link to="/orders" onClick={() => setMenuOpen(false)}>📦 Orders</Link>
            {user.email === "admin@aizal.com" && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}>⚙️ Admin</Link>
            )}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
          </>
        )}
      </div>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
    </nav>
  );
}

/* ================= HOME ================= */
function Home() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let q;
      if (selectedCategory === "all") {
        q = query(collection(db, "products"));
      } else {
        q = query(collection(db, "products"), where("category", "==", selectedCategory));
      }

      const data = await getDocs(q);
      let productList = data.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (sortBy === "price-low") productList.sort((a, b) => a.price - b.price);
      else if (sortBy === "price-high") productList.sort((a, b) => b.price - a.price);
      else if (sortBy === "rating") productList.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      setProducts(productList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="home">
      <div className="hero">
        <h1>✨ AIZAL Premium Skincare</h1>
        <p>Transform Your Skin, Naturally</p>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="facewash">Face Wash</option>
          <option value="moisturizer">Moisturizer</option>
          <option value="serum">Serum</option>
          <option value="mask">Face Mask</option>
          <option value="sunscreen">Sunscreen</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="popular">Popular</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <img src={product.image || "https://via.placeholder.com/300"} alt={product.name} />
                  <button
                    className={`wishlist-btn ${isInWishlist(product.id) ? "active" : ""}`}
                    onClick={() => isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product)}
                  >
                    {isInWishlist(product.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="category">{product.category}</p>
                  <p className="description">{product.description}</p>
                  <div className="rating">⭐ {product.rating || 4.5} ({product.reviews || 0})</div>
                  <div className="price">₹{product.price}</div>
                  <button className="add-cart-btn" onClick={() => addToCart(product)}>Add to Cart</button>
                  <Link to={`/product/${product.id}`} className="view-details-btn">View Details</Link>
                </div>
              </div>
            ))
          ) : (
            <p className="no-products">No products found</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= PRODUCT DETAILS ================= */
function ProductDetails() {
  const { id } = window.location.pathname.split("/").pop();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await getDocs(query(collection(db, "products"), where("__name__", "==", id)));
      if (!data.empty) {
        setProduct({ id: data.docs[0].id, ...data.docs[0].data() });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await getDocs(query(collection(db, "reviews"), where("productId", "==", id)));
      setReviews(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to review");
      return;
    }
    try {
      await addDoc(collection(db, "reviews"), {
        productId: id,
        userId: user.uid,
        userName: user.email,
        rating,
        text: reviewText,
        createdAt: new Date()
      });
      setReviewText("");
      setRating(5);
      fetchReviews();
      alert("Review submitted!");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) return <div className="loader">Loading...</div>;
  if (!product) return <div className="no-products">Product not found</div>;

  return (
    <div className="product-details">
      <div className="details-container">
        <div className="details-image">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="details-info">
          <h1>{product.name}</h1>
          <p className="category">Category: {product.category}</p>
          <div className="rating">⭐ {product.rating || 4.5}</div>
          <p className="description">{product.description}</p>
          <p className="ingredients"><strong>Ingredients:</strong> {product.ingredients}</p>
          <h2 className="price">₹{product.price}</h2>
          <button className="add-cart-btn" onClick={() => addToCart(product)}>Add to Cart</button>
        </div>
      </div>

      <div className="reviews-section">
        <h3>Customer Reviews</h3>
        {user && (
          <form onSubmit={submitReview} className="review-form">
            <textarea placeholder="Write your review..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} required />
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              <option value={1}>⭐ 1 - Poor</option>
              <option value={2}>⭐ 2 - Fair</option>
              <option value={3}>⭐ 3 - Good</option>
              <option value={4}>⭐ 4 - Very Good</option>
              <option value={5}>⭐ 5 - Excellent</option>
            </select>
            <button type="submit">Submit Review</button>
          </form>
        )}
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <strong>{review.userName}</strong>
                <span>{"⭐".repeat(review.rating)}</span>
              </div>
              <p>{review.text}</p>
              <small>{new Date(review.createdAt?.toDate?.() || review.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= CART ================= */
function Cart() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);

  const placeOrder = async (method) => {
    if (!user) {
      alert("Please login to place order");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        items: cart,
        total,
        paymentMethod: method,
        status: "Pending",
        createdAt: new Date()
      });
      clearCart();
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const payWithRazorpay = () => {
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY || "YOUR_RAZORPAY_KEY",
      amount: total * 100,
      currency: "INR",
      name: "AIZAL Skincare",
      handler: function () {
        placeOrder("razorpay");
      }
    };
    new window.Razorpay(options).open();
  };

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <Link to="/" className="continue-shopping">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Shopping Cart</h2>
      <div className="cart-items">
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <img src={item.image} alt={item.name} />
            <div className="item-details">
              <h4>{item.name}</h4>
              <p>₹{item.price}</p>
            </div>
            <div className="item-qty">
              <button onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
              <input type="number" value={item.qty} onChange={(e) => updateQty(item.id, Number(e.target.value))} />
              <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
            </div>
            <p className="item-total">₹{item.price * item.qty}</p>
            <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Order Summary</h3>
        <p>Subtotal: ₹{total}</p>
        <p>Shipping: Free</p>
        <h4>Total: ₹{total}</h4>

        <div className="payment-methods">
          <label>
            <input type="radio" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} />
            Cash on Delivery
          </label>
          <label>
            <input type="radio" value="razorpay" checked={paymentMethod === "razorpay"} onChange={(e) => setPaymentMethod(e.target.value)} />
            Pay Online
          </label>
        </div>

        <button className="checkout-btn" onClick={() => paymentMethod === "cod" ? placeOrder("cod") : payWithRazorpay()} disabled={loading}>
          {loading ? "Processing..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}

/* ================= WISHLIST ================= */
function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <div className="wishlist-container">
      <h2>❤️ My Wishlist</h2>
      {wishlist.length === 0 ? (
        <p className="empty-message">Your wishlist is empty</p>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(product => (
            <div key={product.id} className="wishlist-item">
              <img src={product.image} alt={product.name} />
              <h4>{product.name}</h4>
              <p className="price">₹{product.price}</p>
              <button className="add-cart-btn" onClick={() => addToCart(product)}>Add to Cart</button>
              <Link to={`/product/${product.id}`} className="view-details">View Details</Link>
              <button className="remove-btn" onClick={() => removeFromWishlist(product.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= ORDER TRACKING ================= */
function OrderTracking() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const data = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid)));
      setOrders(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loader">Loading...</div>;

  return (
    <div className="orders-container">
      <h2>📦 My Orders</h2>
      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>Order #{order.id.slice(0, 8)}</h3>
                <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
              <div className="order-details">
                <p><strong>Total:</strong> ₹{order.total}</p>
                <p><strong>Payment:</strong> {order.paymentMethod}</p>
                <p><strong>Date:</strong> {new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="order-items">
                <h4>Items:</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.name}</span>
                    <span>x{item.qty}</span>
                    <span>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= AUTH PAGES ================= */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>
        <p>Don't have an account? <Link to="/register">Register</Link></p>
        <p style={{fontSize: "12px", color: "#666"}}>Demo Admin: admin@aizal.com / password: 123456</p>
      </div>
    </div>
  );
}

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await register(email, password, name);
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Creating..." : "Register"}</button>
        </form>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

/* ================= PROTECTED ROUTE ================= */
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

/* ================= ADMIN PANEL ================= */
function Admin() {
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState({ name: "", price: "", category: "", description: "", ingredients: "", image: "", rating: 4.5 });
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchReviews();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getDocs(collection(db, "products"));
      setProducts(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getDocs(collection(db, "orders"));
      setOrders(data.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await getDocs(collection(db, "reviews"));
      setReviews(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert("Please fill all required fields");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "products"), {
        ...formData,
        price: Number(formData.price),
        rating: Number(formData.rating),
      });
      setFormData({ name: "", price: "", category: "", description: "", ingredients: "", image: "", rating: 4.5 });
      fetchProducts();
      alert("Product added!");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchProducts();
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "orders", id), { status });
      fetchOrders();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const deleteReview = async (id) => {
    if (window.confirm("Delete this review?")) {
      try {
        await deleteDoc(doc(db, "reviews", id));
        fetchReviews();
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>⚙️ Admin Dashboard</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>📦 Products</button>
        <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>🛒 Orders</button>
        <button className={activeTab === "reviews" ? "active" : ""} onClick={() => setActiveTab("reviews")}>⭐ Reviews</button>
      </div>

      <div className="admin-content">
        {activeTab === "products" && (
          <div className="admin-section">
            <h3>Add New Product</h3>
            <form onSubmit={addProduct} className="admin-form">
              <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              <input type="number" placeholder="Price" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                <option value="">Select Category</option>
                <option value="facewash">Face Wash</option>
                <option value="moisturizer">Moisturizer</option>
                <option value="serum">Serum</option>
                <option value="mask">Face Mask</option>
                <option value="sunscreen">Sunscreen</option>
              </select>
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <textarea placeholder="Ingredients" value={formData.ingredients} onChange={(e) => setFormData({...formData, ingredients: e.target.value})} />
              <input type="url" placeholder="Image URL" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} />
              <button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Product"}</button>
            </form>

            <h3>Products List</h3>
            <div className="admin-table">
              {products.map(product => (
                <div key={product.id} className="admin-row">
                  <img src={product.image} alt={product.name} />
                  <div>
                    <h4>{product.name}</h4>
                    <p>₹{product.price} - {product.category}</p>
                  </div>
                  <button onClick={() => deleteProduct(product.id)} className="delete-btn">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="admin-section">
            <h3>Order Management</h3>
            {orders.map(order => (
              <div key={order.id} className="admin-row">
                <div>
                  <p><strong>Order #{order.id.slice(0, 8)}</strong></p>
                  <p>{order.userEmail} - ₹{order.total}</p>
                </div>
                <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="admin-section">
            <h3>Review Management</h3>
            {reviews.map(review => (
              <div key={review.id} className="admin-row">
                <div>
                  <p><strong>{review.userName}</strong></p>
                  <p>{"⭐".repeat(review.rating)}</p>
                  <p>{review.text}</p>
                </div>
                <button onClick={() => deleteReview(review.id)} className="delete-btn">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}