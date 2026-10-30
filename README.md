# ☀️ Global Choghadiya Dashboard

A modern, high-precision web application built to calculate and display **Hindu Choghadiya timelines** for any coordinate or city worldwide. By combining astronomical computations with geometric bisection algorithms, the application maps local solar cycles to precisely identify auspicious and inauspicious planetary hours.

---

## 🚀 Features

* **Global Astronomical Accuracy:** Uses precise solar longitude calculations to derive sunrise and sunset intervals for any location, breaking away from static timezone-locked calendar tables.
* **Interactive Choghadiya Grid:** Displays an interactive dashboard with dedicated Day and Night segments, complete with a live-updating indicator highlighting the current active time slot.
* **Location Autocomplete:** Powered by an integrated geocoding address dropdown utilizing OpenStreetMap/Photon APIs for fast, debounced city lookup.
* **State Preservation:** Keeps client-side configurations cached locally via a resilient `localStorage` wrapper with automated TTL invalidation.

---

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript / JavaScript (ES6+)
* **Styling:** Tailwind CSS (Responsive Grid & Utility Design)
* **Core Astronomy Engine:** `astronomy-engine` & `suncalc` for highly precise planetary and lunar phase mechanics

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── choghadiya/       # Geolocation, solar math, and day/night sequence engine
│   │   └── autocomplete/     # Debounced geocoding dropdown provider
│   └── page.jsx              # Main dashboard wrapper and layout container
├── components/
│   └── ChoghadiyaGrid.jsx    # Visual grid displaying active slots & metadata
└── public/                   # Asset vectors, minimal icons, and public configurations
```

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have **Node.js (v18.x or higher)** and npm/yarn installed locally.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HiraniDotCom/Choghadiya
   cd choghadiya
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

---

## 🧪 Core Algorithms Explained

### 1. Choghadiya Intervals
Instead of relying on fixed 90-minute blocks, this app dynamically divides the local daytime (sunrise to sunset) and nighttime (sunset to next sunrise) into **8 equal segments**. The sequence depends on the weekday of the specific coordinates provided.

## Screenshot

<img width="688" height="609" alt="choghadiya-app" src="https://github.com/user-attachments/assets/b49ac4d9-e564-4605-ad3c-85a90171859f" />
