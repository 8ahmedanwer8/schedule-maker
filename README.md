# 📅 AI Schedule Maker

An intelligent schedule generator that converts natural language text into beautiful, editable calendars using AI.

## ✨ Features

- **AI-Powered Parsing**: Convert raw text, course registration data, or natural language into structured schedules
- **Interactive Calendar**: Beautiful week/day views with event details
- **Full Editing**: Click any event to edit title, location, instructors, or delete
- **Add New Events**: Manually add events to your generated schedule
- **Export Options**: Download your schedule as an image
- **Responsive Design**: Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- OpenAI API key (optional - works with mock data)

### Installation

1. **Clone and setup**:
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../schedule-maker
   npm install
   ```

2. **Configure OpenAI (Optional)**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Run the application**:
   
   **Terminal 1 - Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   
   **Terminal 2 - Frontend**:
   ```bash
   cd schedule-maker
   npm start
   ```

4. **Access the app**: Open http://localhost:3000

## 🎯 How to Use

### Method 1: Natural Language
```
Math class Monday 2PM-3PM in Room 101 with Dr. Smith
Physics lab Wednesday 10AM-1PM at Science Building
```

### Method 2: Course Registration Data
Paste your course registration text directly - the AI will parse course codes, times, locations, and instructors automatically.

### Method 3: Load Sample
Click "Load Sample 📝" to see an example format.

## 🎨 Features in Detail

### AI Processing
- Understands various text formats
- Extracts course titles, times, locations, instructors
- Handles ambiguous or incomplete data
- Converts to standardized JSON format

### Interactive Calendar
- **Week/Day Views**: Switch between calendar views
- **Event Editing**: Click any event to modify details
- **Add New Events**: Create events manually
- **Delete Events**: Remove unwanted entries
- **Smart Sizing**: Events resize based on duration

### Export Options
- **Image Export**: Download your schedule as PNG
- **Visual Appeal**: Clean, professional layout

## 🔧 Configuration

### Enable Real OpenAI API
```bash
# In backend/.env
OPENAI_API_KEY=your_api_key_here
USE_OPENAI=true
```

### API Format
The system expects/produces this JSON structure:
```json
[
  {
    "title": "Course Name",
    "start": "Monday 10:00 AM", 
    "end": "Monday 11:30 AM",
    "instructors": ["Dr. Smith", "TA: John"],
    "location": "Room 101"
  }
]
```

## 🛠 Tech Stack

**Frontend:**
- React + TypeScript
- Chakra UI (components)
- React Big Calendar
- html2canvas (export)

**Backend:**
- Express + TypeScript
- OpenAI API
- CORS enabled

## 📝 Example Inputs

**Academic Schedule:**
```
COMP 1000 Key Concepts in Computer Science
Tuesday Thursday 5:30PM-6:50PM
Chrysler Hall North G133
Instructor: Biswas

MATH 150 Calculus
MWF 10:00AM-11:00AM  
Math Building Room 204
Prof. Johnson
```

**Work Schedule:**
```
Team Meeting Monday 9AM-10AM Conference Room A
Client Call Wednesday 2PM-3PM via Zoom
Project Review Friday 4PM-5PM with Manager Smith
```

