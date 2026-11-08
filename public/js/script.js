import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpUo2A9bV6ua6ZGhQ9a0aEh7ceUx-im5s", 
  authDomain: "sbmk-8cbd4.firebaseapp.com",
  projectId: "sbmk-8cbd4",
  storageBucket: "sbmk-8cbd4.appspot.com",
  messagingSenderId: "331908608880",
  appId: "1:331908608880:web:..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const recipeGrid = document.getElementById("recipe-grid");
const recipeCount = document.getElementById("recipe-count");
const categoryFilters = document.getElementById("category-filters");
const loadingSpinner = document.getElementById("loading-spinner");
const searchInput = document.getElementById("recipe-search");

let currentCategory = "all";
let searchQuery = "";
let allRecipesData = [];

// Helper to escape HTML characters safely
function escapeHTML(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Real-time Firestore Database Listener
const recipesRef = collection(db, "recipes");
const q = query(recipesRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allRecipesData = [];
  snapshot.forEach((docSnap) => {
    allRecipesData.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (loadingSpinner) loadingSpinner.style.display = "none";
  renderRecipes();
}, (error) => {
  console.error("Error fetching Firestore data: ", error);
  if (loadingSpinner) loadingSpinner.textContent = "Error loading database records.";
});

// Render Recipe Matrix
function renderRecipes() {
  if (!recipeGrid) return;
  recipeGrid.innerHTML = "";

  const filtered = allRecipesData.filter(recipe => {
    const matchesCategory = currentCategory === "all" || 
      (recipe.category || recipe.Category || "").toLowerCase() === currentCategory.toLowerCase();

    if (!matchesCategory) return false;
    if (!searchQuery) return true;
    
    const title = (recipe.title || recipe.Title || "").toLowerCase();
    const category = (recipe.category || recipe.Category || "").toLowerCase();
    
    let ingText = "";
    const rawIng = recipe.ingredients || recipe.Ingredients;
    if (Array.isArray(rawIng)) {
      ingText = rawIng.join(" ").toLowerCase();
    } else if (typeof rawIng === 'string') {
      ingText = rawIng.toLowerCase();
    }

    const queryLower = searchQuery.toLowerCase();
    return title.includes(queryLower) || category.includes(queryLower) || ingText.includes(queryLower);
  });

  if (recipeCount) recipeCount.textContent = filtered.length;

  if (filtered.length === 0) {
    recipeGrid.innerHTML = `<p class="caption-text" style="padding: 1.5rem;">No records found matching your criteria.</p>`;
    return;
  }

  filtered.forEach(recipe => {
    const title = recipe.title || recipe.Title || "Untitled Recipe";
    const category = recipe.category || recipe.Category || "Mains";
    const prepTime = recipe.prepTime || recipe.preptime || recipe.PrepTime || "30 mins";
    const rawInstructions = recipe.instructions || recipe.Instructions || "";

    // Local / External Image Handler
    const imageUrl = recipe.imageUrl || recipe.ImageUrl || recipe.image_url || "";
    const imageHtml = imageUrl 
      ? `<div class="recipe-image-container"><img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(title)}" loading="lazy"></div>` 
      : "";

    // Parse Ingredients List
    let ingredientsList = [];
    const rawIng = recipe.ingredients || recipe.Ingredients;
    if (Array.isArray(rawIng)) {
      ingredientsList = rawIng;
    } else if (typeof rawIng === 'string') {
      if (rawIng.includes('\n')) {
        ingredientsList = rawIng.split('\n');
      } else if (rawIng.includes(',')) {
        ingredientsList = rawIng.split(',').map(i => i.trim());
      } else {
        ingredientsList = [rawIng];
      }
    }

    const ingredientsHtml = ingredientsList
      .filter(item => item.trim() !== "")
      .map(item => `<li>${escapeHTML(item)}</li>`)
      .join('');

    // Parse Instructions into "1.    Step text" multi-line list with precise indentation
    let steps = [];
    if (typeof rawInstructions === 'string') {
      if (rawInstructions.includes('\n')) {
        steps = rawInstructions.split('\n').filter(s => s.trim() !== "");
      } else {
        steps = rawInstructions.split(/(?=\b\d+\.\s)/).filter(s => s.trim() !== "");
      }
    } else if (Array.isArray(rawInstructions)) {
      steps = rawInstructions;
    }

    let instructionsHtml = "";
    if (steps.length > 0) {
      const itemsHtml = steps.map((step, index) => {
        // Strip out existing leading numbers like "1. " or "1.    " if present
        const cleanedText = step.replace(/^\d+\.\s*/, '');
        const stepNumber = `${index + 1}.`;
        return `
          <li>
            <span class="step-num">${stepNumber}</span>
            <span class="step-text">${escapeHTML(cleanedText)}</span>
          </li>`;
      }).join('');
      instructionsHtml = `<ul class="instructions-list">${itemsHtml}</ul>`;
    } else {
      instructionsHtml = `<p class="instructions-text">${escapeHTML(rawInstructions)}</p>`;
    }

    const cardHtml = `
      <article class="recipe-card">
        <div>
          ${imageHtml}
          <div class="recipe-card-header">
            <h3 class="recipe-title">${escapeHTML(title)}</h3>
            <span class="badge">${escapeHTML(category)}</span>
          </div>
          <div class="prep-time">⏱ ${escapeHTML(prepTime)}</div>
          
          <h4>INGREDIENTS</h4>
          <ul>${ingredientsHtml}</ul>
          
          <h4>INSTRUCTIONS</h4>
          ${instructionsHtml}
        </div>
      </article>
    `;

    recipeGrid.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// Search Bar Input Listener
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderRecipes();
  });
}

// Category Navigation Listener
if (categoryFilters) {
  categoryFilters.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;

    document.querySelectorAll("#category-filters li").forEach(el => el.classList.remove("active"));
    li.classList.add("active");

    currentCategory = li.getAttribute("data-category");
    renderRecipes();
  });
}