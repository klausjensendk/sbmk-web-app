// Import modern Modular SDK components from Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBpUo2A9bV6ua6ZgHQ9a0aEh7ceUx-im5s",
  authDomain: "sbmk-8cbd4.firebaseapp.com",
  projectId: "sbmk-8cbd4",
  storageBucket: "sbmk-8cbd4.firebasestorage.app",
  messagingSenderId: "374063277771",
  appId: "1:374063277771:web:4dc2586b4f1c99816f5d4e",
  measurementId: "G-S560JG5H74"
};

// Initialize Firebase, Firestore Database, & Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const recipesRef = collection(db, "recipes");

// DOM Elements
const recipeGrid = document.getElementById("recipe-grid");
const loadingSpinner = document.getElementById("loading-spinner");
const recipeCountEl = document.getElementById("recipe-count");
const addRecipeForm = document.getElementById("add-recipe-form");
const modal = document.getElementById("recipe-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const filterItems = document.querySelectorAll("#category-filters li");

// Hide the add button by default until logged in
if (openModalBtn) {
  openModalBtn.style.display = "none";
}

// Check if you are logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (openModalBtn) openModalBtn.style.display = "block";
  } else {
    if (openModalBtn) openModalBtn.style.display = "none";
  }
});

let currentCategory = "all";
let allRecipes = [];

// 1. Real-time Database Listener
const q = query(recipesRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  allRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (loadingSpinner) loadingSpinner.style.display = "none";
  renderRecipes();
});

// 2. Render Recipe Cards to HTML
function renderRecipes() {
  if (!recipeGrid) return;
  recipeGrid.innerHTML = "";
  
  const filtered = currentCategory === "all" 
    ? allRecipes 
    : allRecipes.filter(r => r.category === currentCategory);

  if (recipeCountEl) recipeCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    recipeGrid.innerHTML = `<p class="spinner">No recipes found in this category.</p>`;
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const ingredientsList = (recipe.ingredients || [])
      .map(i => `<li>${escapeHTML(i)}</li>`)
      .join("");

    card.innerHTML = `
      <div>
        <div class="recipe-card-header">
          <h2 class="recipe-title">${escapeHTML(recipe.title)}</h2>
          <span class="badge">${escapeHTML(recipe.category || 'General')}</span>
        </div>
        <div class="prep-time">⏱ ${escapeHTML(recipe.prepTime || 'N/A')}</div>
        
        <h4>Ingredients</h4>
        <ul>${ingredientsList}</ul>

        <h4>Instructions</h4>
        <p class="instructions-text">${escapeHTML(recipe.instructions || '')}</p>
      </div>
      <button class="delete-btn" data-id="${recipe.id}">Delete Recipe</button>
    `;

    // Attach Delete Event
    card.querySelector(".delete-btn").addEventListener("click", () => deleteRecipe(recipe.id));

    recipeGrid.appendChild(card);
  });
}

// 3. Add New Recipe to Firebase Firestore
if (addRecipeForm) {
  addRecipeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("recipe-title").value;
    const category = document.getElementById("recipe-category").value;
    const prepTime = document.getElementById("prep-time").value;
    const ingredientsRaw = document.getElementById("recipe-ingredients").value;
    const instructions = document.getElementById("recipe-instructions").value;

    const ingredients = ingredientsRaw.split("\n").filter(line => line.trim() !== "");

    try {
      await addDoc(recipesRef, {
        title,
        category,
        prepTime,
        ingredients,
        instructions,
        createdAt: new Date()
      });
      
      addRecipeForm.reset();
      if (modal) modal.classList.add("hidden");
    } catch (err) {
      console.error("Error adding document: ", err);
    }
  });
}

// 4. Delete Recipe from Firebase Firestore
async function deleteRecipe(id) {
  if (confirm("Are you sure you want to delete this recipe?")) {
    await deleteDoc(doc(db, "recipes", id));
  }
}

// Category Filter Click Handler
filterItems.forEach(item => {
  item.addEventListener("click", (e) => {
    filterItems.forEach(i => i.classList.remove("active"));
    e.target.classList.add("active");
    currentCategory = e.target.getAttribute("data-category");
    renderRecipes();
  });
});

// Modal Open / Close Controls
if (openModalBtn && modal) {
  openModalBtn.addEventListener("click", () => modal.classList.remove("hidden"));
}
if (closeModalBtn && modal) {
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

// Helper: Prevent XSS
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}