# 🎯 Key-Forge: Minimalist Web-Based Typing Game

**Key-Forge** is a high-performance, distraction-free web-based typing speed application inspired by popular platforms like Monkeytype. Built completely from scratch using modern frontend technologies, it offers a clean interface for developers and typists to test and improve their typing metrics in real-time.

---

## ✨ Features

- **Smart Timer Mode:** Choose between 15, 30, or 60 seconds. The countdown *only* starts when you type your very first character.
- **Real-Time Metrics:** 
  - **WPM (Words Per Minute):** Dynamically calculated using the programming standard ($WPM = \frac{\text{Total Correct Characters} / 5}{\text{Time Spent in Minutes}}$).
  - **Accuracy (%):** Tracks your precision on the fly.
- **Dynamic Visual Feedback:** Character-by-character DOM rendering gives instantaneous feedback (Green for correct, Red for mistakes) along with a smooth blinking cursor.
- **Difficulty Levels:** Supports **Easy** (short words), **Medium** (normal sentences), and **Hard** (includes complex punctuation and numbers) modes.
- **Quality of Life Controls:** Pressing `Tab + Enter` instantly resets the board and generates fresh words without any full page reload.
- **Persistent Personal Best:** Integrates with browser `LocalStorage` to save and display your all-time high score.

---

## 🛠️ Tech Stack

- **Structure:** HTML5
- **Styling:** Tailwind CSS (via CDN)
- **Core Logic:** Vanilla JavaScript (ES6+)

---

## 🚀 How to Run Locally

Since this is a lightweight client-side application, it doesn't require any backend servers or node modules to run. 

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Sawon-52/Key-Forge.git
