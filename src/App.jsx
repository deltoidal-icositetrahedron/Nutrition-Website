import { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "arial, sans-serif" }}>
      
      {/* Sticky search bar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid #dfe1e5",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 860 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", height: 44,
            border: "1px solid #dfe1e5", borderRadius: 24, padding: "0 16px",
            boxShadow: query ? "0 1px 6px rgba(32,33,36,.28)" : "none",
            transition: "box-shadow 0.2s"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 16, width: "100%", color: "#202124" }}
              autoComplete="off"
              spellCheck="false"
              placeholder="Search..."
            />
          </div>

          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              backgroundColor: isHovered ? '#45a049' : '#4CAF50',
              color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '4px',
              cursor: 'pointer', whiteSpace: "nowrap",
              transition: 'background-color 0.3s, transform 0.2s',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              fontSize: 14
            }}
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Page content */}
      <div style={{ padding: "40px 24px" }}>
        <h1 style={{ textAlign: "center", marginBottom: "40px", color: "#202124" }}>Welcome to Nutrition Hub</h1>
        
        <section style={{ marginBottom: "60px" }}>
          <h2 style={{ color: "#202124", marginBottom: "20px" }}>Featured Recipes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px", background: "#f9f9f9" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Healthy Salad Bowl</h3>
              <p style={{ color: "#5f6368" }}>A refreshing mix of greens, quinoa, and seasonal vegetables. Perfect for lunch or dinner.</p>
              <p style={{ fontSize: "14px", color: "#9aa0a6" }}>Prep time: 15 mins | Calories: 320</p>
            </div>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px", background: "#f9f9f9" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Protein-Packed Smoothie</h3>
              <p style={{ color: "#5f6368" }}>Blend of spinach, banana, protein powder, and almond milk. Great post-workout recovery drink.</p>
              <p style={{ fontSize: "14px", color: "#9aa0a6" }}>Prep time: 5 mins | Calories: 280</p>
            </div>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px", background: "#f9f9f9" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Grilled Chicken Stir-Fry</h3>
              <p style={{ color: "#5f6368" }}>Lean chicken breast with colorful vegetables and a light soy-ginger sauce.</p>
              <p style={{ fontSize: "14px", color: "#9aa0a6" }}>Prep time: 25 mins | Calories: 380</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: "60px" }}>
          <h2 style={{ color: "#202124", marginBottom: "20px" }}>Nutrition Tips</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div style={{ padding: "20px", background: "#e8f5e8", borderRadius: "8px" }}>
              <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Stay Hydrated</h3>
              <p style={{ color: "#388e3c" }}>Drink at least 8 glasses of water daily to maintain optimal health and energy levels.</p>
            </div>
            <div style={{ padding: "20px", background: "#fff3e0", borderRadius: "8px" }}>
              <h3 style={{ marginTop: 0, color: "#f57c00" }}>Balanced Meals</h3>
              <p style={{ color: "#ef6c00" }}>Include a mix of proteins, carbohydrates, and healthy fats in every meal for sustained energy.</p>
            </div>
            <div style={{ padding: "20px", background: "#fce4ec", borderRadius: "8px" }}>
              <h3 style={{ marginTop: 0, color: "#c2185b" }}>Portion Control</h3>
              <p style={{ color: "#ad1457" }}>Use smaller plates and be mindful of serving sizes to avoid overeating.</p>
            </div>
            <div style={{ padding: "20px", background: "#f3e5f5", borderRadius: "8px" }}>
              <h3 style={{ marginTop: 0, color: "#7b1fa2" }}>Whole Foods</h3>
              <p style={{ color: "#6a1b9a" }}>Focus on whole, unprocessed foods like fruits, vegetables, and whole grains.</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: "60px" }}>
          <h2 style={{ color: "#202124", marginBottom: "20px" }}>Meal Planning Guide</h2>
          <p style={{ color: "#5f6368", lineHeight: "1.6", marginBottom: "20px" }}>
            Planning your meals ahead of time can help you maintain a healthy diet, save money, and reduce food waste. 
            Start by assessing your nutritional needs based on your age, gender, activity level, and health goals.
          </p>
          <div style={{ background: "#f5f5f5", padding: "30px", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0, color: "#202124" }}>Weekly Meal Plan Template</h3>
            <ul style={{ color: "#5f6368", lineHeight: "1.8" }}>
              <li><strong>Monday:</strong> Grilled chicken salad with quinoa and mixed greens</li>
              <li><strong>Tuesday:</strong> Vegetable stir-fry with tofu and brown rice</li>
              <li><strong>Wednesday:</strong> Turkey wrap with hummus and fresh vegetables</li>
              <li><strong>Thursday:</strong> Baked salmon with sweet potato and broccoli</li>
              <li><strong>Friday:</strong> Veggie burger on whole grain bun with side salad</li>
              <li><strong>Saturday:</strong> Homemade pizza with whole wheat crust and vegetable toppings</li>
              <li><strong>Sunday:</strong> Roast chicken with roasted vegetables and couscous</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: "60px" }}>
          <h2 style={{ color: "#202124", marginBottom: "20px" }}>Nutrition Resources</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Understanding Macronutrients</h3>
              <p style={{ color: "#5f6368" }}>Learn about proteins, carbohydrates, and fats - the building blocks of your diet.</p>
              <button style={{ background: "#4CAF50", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Read More</button>
            </div>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Vitamin and Mineral Guide</h3>
              <p style={{ color: "#5f6368" }}>Essential vitamins and minerals for optimal health and how to get them from food.</p>
              <button style={{ background: "#4CAF50", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Read More</button>
            </div>
            <div style={{ border: "1px solid #dfe1e5", borderRadius: "8px", padding: "20px" }}>
              <h3 style={{ marginTop: 0, color: "#202124" }}>Healthy Eating Habits</h3>
              <p style={{ color: "#5f6368" }}>Develop sustainable eating patterns that support long-term health goals.</p>
              <button style={{ background: "#4CAF50", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Read More</button>
            </div>
          </div>
        </section>

        <footer style={{ textAlign: "center", padding: "40px 0", borderTop: "1px solid #dfe1e5", color: "#9aa0a6" }}>
          <p>&copy; 2024 Nutrition Hub. All rights reserved.</p>
        </footer>
      </div>

    </div>
  );
}