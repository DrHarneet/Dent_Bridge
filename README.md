# 🦷 DentBridge — AI Chairside Dental Patient Education Agent

> Built with GitHub Copilot | Agents League Hackathon 2026 | Creative Apps Track

## 🏥 The Problem

In large dental colleges and government hospitals across India, patients arrive from rural areas speaking regional languages — Marathi, Hindi, Punjabi, Telugu, Tamil, Bengali and more. The doctor explains the diagnosis and treatment plan in English or Hindi, but the patient understands very little.

This leads to:
- 😰 Patient fear and anxiety due to lack of understanding
- ❌ Patients not returning for follow-up visits
- 💔 Broken treatment cycles
- 🏥 Overburdened doctors explaining the same thing repeatedly

**As a practicing dental surgeon at a large dental college in Maharashtra, India — I witnessed this problem every single day.**

---

## 💡 The Solution — DentBridge

DentBridge is a chairside AI agent designed to sit alongside the dental chair in large dental colleges. The doctor briefs the AI with the patient's case details, and the AI becomes the patient's personal multilingual explainer — answering questions patiently in the patient's own language.

---

## 🔄 How It Works — 5 Screen Flow

**Screen 1 — Language Selection**
Doctor selects the patient's preferred language from 6 Indian languages

**Screen 2 — Doctor's Briefing**
Doctor speaks or types:
- Chief Complaint
- Diagnosis
- Treatment Plan
- Cost Range
- Number of Appointments
- Medications (Needed/Not Needed)
- Follow-up Instructions

**Screen 3 — Patient Explanation**
AI explains everything to the patient in their own language:
- What happened to their tooth
- Why it happened
- What the treatment involves
- How much it costs
- How many visits needed
- Visual SVG tooth diagrams showing Before & After for each treatment
- Text-to-speech audio in patient's language

**Screen 4 — Patient Q&A Window**
- Patient can ask up to 5 questions in their own language
- Voice or text input supported
- AI answers only from the doctor's briefing — never adds outside information
- Skip button available if patient has no questions

**Screen 5 — Thank You**
Warm closing message in patient's language with follow-up reminder

---

## 🌍 Supported Languages
| Language | Script |
|---|---|
| Hindi | हिंदी |
| Marathi | मराठी |
| Punjabi | ਪੰਜਾਬੀ |
| Telugu | తెలుగు |
| Tamil | தமிழ் |
| Bengali | বাংলা |

---

## 🦷 Supported Treatment Visualizations
- Cavity / Restoration
- Root Canal Treatment (RCT)
- Scaling & Cleaning
- Tooth Extraction
- Crown Placement
- Orthodontic Braces

---

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, JavaScript, Web Speech API, SVG
- **Backend:** Python, Flask
- **AI Engine:** GitHub Models (GPT-4o)
- **Built with:** GitHub Copilot (Creative Apps Track)
- **Speech Recognition:** Web Speech API

---

## 🚀 How to Run

### Prerequisites
- Python 3.8+
- GitHub Personal Access Token (free)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/DrHarneet/DentBridge.git
cd DentBridge
```

2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment:
```bash
copy .env.example .env
```
Add your GitHub Personal Access Token to .env:

5. Run the app:
```bash
python app.py
```

6. Open browser:

http://localhost:5000

---

## 🎥 Demo Video
[Watch DentBridge in action](#) ← https://youtu.be/3W03D42gVUs

---

## 🏗️ Architecture
![DentBridge Architecture](#) ← https://www.canva.com/design/DAHMc48yMLs/uxMiWKY4odsW_GSY0aV4zQ/edit

---

## 👩‍⚕️ About the Creator

**Dr. Harneet Kaur Kalsi**
BDS — Nanded Rural Dental College and Research Centre (2020–2026)
DCI Registered Dental Surgeon
Quality Improvement in Healthcare — Imperial College London
BCLS Provider — Indian Resuscitation Council

*"I built DentBridge because I lived this problem. Every day in my internship I watched patients leave the dental chair confused, scared, and uninformed — not because the doctor didn't explain, but because the explanation wasn't in their language. DentBridge bridges that gap."*

---

## 🏆 Hackathon
**Agents League Hackathon — Microsoft AI Skills Fest 2026**
Track: Creative Apps
Tool: GitHub Copilot
Participant: Dr. Harneet Kaur Kalsi | Microsoft Learn: harneetkaurkalsi-0485 | GitHub: DrHarneet

---

## ⚠️ Disclaimer
DentBridge is a patient education and communication tool. It does not provide medical diagnosis or replace professional dental advice. All clinical decisions are made by the treating dentist.
