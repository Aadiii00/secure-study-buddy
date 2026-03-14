# 🚀 TracxnLabs

### AI-Powered Secure Online Examination Platform

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-UI-blue)
![Vite](https://img.shields.io/badge/Vite-Build-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

**TracxnLabs** is an AI-powered online examination platform built to ensure **secure, fair, and scalable remote assessments**.

It combines **AI proctoring, coding challenges, automated evaluation, and credibility scoring** to prevent cheating and provide reliable exam monitoring.

---

# 🧠 Problem Statement

Online exams are increasingly common, but most platforms lack **effective cheating prevention and monitoring systems**.

Common problems include:

* Tab switching during exams
* Students leaving the screen
* Multiple people appearing in the camera
* Lack of integrity scoring
* Manual result evaluation

**TracxnLabs solves these problems using AI-based monitoring and automated exam evaluation.**

---

# 💡 Our Solution

TracxnLabs introduces a **secure exam ecosystem** that includes:

✔ Real-time webcam monitoring
✔ Browser activity detection
✔ Credibility scoring system
✔ Coding challenge evaluation
✔ Admin dashboard for monitoring

This ensures **exam integrity while maintaining a smooth student experience**.

---

# 🔐 Key Features

## 👨‍🎓 Student Portal

* Secure authentication
* Online coding exam interface
* Real-time exam environment
* Automatic code evaluation
* Leaderboard and result tracking

---

## 🛡️ AI Proctoring System

The platform actively monitors students during exams.

Detection capabilities include:

* 📷 Webcam monitoring
* 👤 Face detection
* 🔄 Tab switching detection
* 🖥 Fullscreen exit detection
* 👥 Multiple face detection
* 📸 Evidence screenshot capture

---

## 🧠 Credibility Engine

A unique **Credibility Score System** calculates the integrity level of a student.

| Violation        | Score Impact |
| ---------------- | ------------ |
| Tab Switching    | -20          |
| Face Not Visible | -30          |
| Multiple Faces   | -50          |
| Camera Disabled  | -40          |

This allows administrators to quickly identify suspicious exam sessions.

---

# 👨‍💼 Admin Dashboard

Admins can:

* Monitor live exam activity
* View violations and evidence
* Analyze exam performance
* Review coding submissions
* Access leaderboard analytics

---

# 🏗️ System Architecture

```
Student Browser
      │
      ▼
React + Vite Frontend
      │
      ▼
Supabase Backend
      │
      ├── Authentication
      ├── Database (PostgreSQL)
      ├── Edge Functions
      │        │
      │        ├── Code Evaluation
      │        └── Result Processing
      │
      ▼
Admin Dashboard
```

---

# ⚙️ Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn-ui

## Backend

* Supabase
* PostgreSQL Database
* Supabase Edge Functions

## Security Monitoring

* Browser Activity Tracking
* Webcam API
* Face Detection

---

# 📂 Project Structure

```
tracxnlabs
│
├── src
│   ├── components        # Reusable UI components
│   ├── pages             # Application pages
│   ├── hooks             # Custom React hooks
│   ├── proctoring        # AI monitoring logic
│   ├── integrations      # Supabase integration
│   ├── lib               # Credibility engine
│   └── types             # TypeScript definitions
│
├── supabase
│   ├── functions         # Backend serverless functions
│   ├── migrations        # Database schema
│   └── config.toml
│
├── index.html
├── package.json
└── tailwind.config.ts
```

---

# ⚙️ Installation

### Clone the repository

```
git clone https://github.com/YOUR_USERNAME/tracxnlabs.git
```

### Navigate to the project directory

```
cd tracxnlabs
```

### Install dependencies

```
npm install
```

### Start the development server

```
npm run dev
```

Application will run on:

```
http://localhost:5173
```

---

---

# 🔄 System Workflow

1️⃣ Student logs into TracxnLabs
2️⃣ Student starts an online exam
3️⃣ Webcam monitoring begins automatically
4️⃣ Browser activity is monitored
5️⃣ Student submits coding solutions
6️⃣ Code is evaluated using backend functions
7️⃣ Results and violations are stored in database
8️⃣ Admin dashboard displays analytics and scores

---

# 📊 Example Use Cases

* Online coding interviews
* University remote exams
* Technical skill assessments
* Hackathon evaluation platforms

---

# 🚀 Future Improvements

* AI gaze tracking
* Voice detection for cheating
* AI-generated exam questions
* Advanced plagiarism detection
* Live proctoring dashboard

---

# 🏆 Hackathon Pitch

**TracxnLabs** is an AI-powered remote exam platform designed to ensure fairness in online assessments.

By combining **real-time proctoring, credibility scoring, and automated code evaluation**, the system detects suspicious activity and maintains exam integrity without requiring manual supervision.

---

