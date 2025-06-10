# Reality-Mapper - AI-Powered Augmented Reality Object Recognition

## Overview

Reality-Mapper is an AI-powered augmented reality application that enables real-time object recognition and provides interactive multilingual experiences. The system uses computer vision to detect objects in the environment and leverages GPT-4 to generate contextual information about recognised objects.

## Prerequisites

- [Python 3.11+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) - Python package manager. Can be installed with the following command:
```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```
- Supabase Account and Project 

## External Libraries and Tools

| Library | Version | Source |
|---------|---------|--------|
| Flask | ≥3.1.1 | [https://flask.palletsprojects.com](https://flask.palletsprojects.com) |
| Flask-CORS | ≥6.0.0 | [https://flask-cors.readthedocs.io](https://flask-cors.readthedocs.io) |
| OpenAI | ≥1.79.0 | [https://github.com/openai/openai-python](https://github.com/openai/openai-python) |
| OpenCV | ≥4.11.0.86 | [https://opencv.org](https://opencv.org) |
| Pillow | ≥11.2.1 | [https://python-pillow.org](https://python-pillow.org) |
| python-dotenv | ≥1.1.0 | [https://github.com/theskumar/python-dotenv](https://github.com/theskumar/python-dotenv) |
| Supabase | ≥2.15.1 | [https://supabase.com](https://supabase.com) |
| Ultralytics YOLO | ≥8.3.141 | [https://ultralytics.com](https://ultralytics.com) |
| Waitress | ≥3.0.2 | [https://docs.pylonsproject.org/projects/waitress](https://docs.pylonsproject.org/projects/waitress) |
|AR.js| ≥3.3.2 | [https://ar-js-org.github.io/AR.js-Docs/](https://ar-js-org.github.io/AR.js-Docs/)

See also [pyproject.toml](./pyproject.toml).

## Folder Structure

```
Reality-Mapper/
│
├── app.py                    # Main backend application (Flask API, object detection, GPT integration)
├── pyproject.toml            # Python project dependencies and metadata
├── uv.lock                   # Lockfile for reproducible Python environments
├── .env.example              # Example environment variables file
├── yolov8n.pt                # Pre-trained YOLOv8n model for object detection
├── marker-5.png              # Marker png to be user for AR 
│
├── Frontend/                 # Frontend web application (HTML, CSS, JS for AR, chat UI, login, etc.)
│   ├── AR Module.html
│   ├── chat-style.css
│   ├── chat-ui.html
│   ├── chat.js
│   ├── icons8-back-64.png
│   ├── Login Page.html
│   ├── mode.html
│   ├── scan.css
│   ├── scan.html
│   └── scan.js
│
├── prompts/                  # AI prompt templates for GPT-4 (object ID, chat, system prompts)
│   ├── base_prompt1.txt
│   ├── base_prompt2.txt
│   ├── base_prompt_more_params.txt
│   ├── image_identify_prompt.txt
│   ├── language_prompt1.txt
│   └── language_prompt2.txt
│
├── README.md                 # Project documentation (this file)
└── .gitignore                # Git ignore rules
```

### Directory & File Explanations

- **app.py**: The main backend application. Handles API routes, object detection, image processing, and GPT-4 integration.
- **Frontend/**: Contains all frontend assets for the AR and chat web interface, including HTML, CSS, and JavaScript files.
- **prompts/**: Stores all prompt templates used for AI interactions (object identification, multilingual chat, etc.).
- **yolov8n.pt**: The YOLOv8n pre-trained model file used for real-time object detection.
- **.env.example**: Template for environment variables required to run the application.
- **pyproject.toml** & **uv.lock**: Define and lock Python dependencies for reproducible environments.

## Data Dependencies

- **YOLOv8 Model**: The application uses the YOLOv8n pre-trained model for object detection. The model file (`yolov8n.pt`) is included in the repository.
- **Supabase Storage**: The application stores captured images in a Supabase storage bucket named "marker-images".

## Application Configuration

1. Copy [.env.example](./env.example) to `.env` and set the following environment variables:
   ```
   SUPABASE_URL=https://usygmuusjaqoojpiygww.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
   eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeWdtdXVzamFxb29qcGl5Z3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg2MDQ4NSwiZXhwIjoyMDYwNDM2NDg1fQ.L5tCy9pTY92LjI7L28CxH7ORrUOzOdubF4W5fRZhf2E
   OPENAI_API_KEY=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
   ```

2. Ensure you have a Supabase project with:
   - A storage bucket named "marker-images"
   - Schema:
  
 ```
sql
-- 0. Sessions table
CREATE TABLE Sessions (
   SessionCode VARCHAR(100) PRIMARY KEY,
   CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

 -- 1. Users table
CREATE TABLE Users (
   Username VARCHAR(50) PRIMARY KEY,
   PasswordHash VARCHAR(255) NOT NULL,
   SessionCode VARCHAR(100),
   FOREIGN KEY (SessionCode)
      REFERENCES Sessions(SessionCode)
      ON DELETE SET NULL );

-- 2. Markers table
CREATE TABLE Markers (
   MarkerID TEXT NOT NULL,
   SessionCode VARCHAR(100) NOT NULL,
   Shape VARCHAR(50),
   Position VARCHAR(100),
   Color VARCHAR(30),
   Image TEXT,
   Animation VARCHAR(100),
   Label VARCHAR(100),
   PRIMARY KEY (MarkerID, SessionCode),
   FOREIGN KEY (SessionCode)
      REFERENCES Sessions(SessionCode)
      ON DELETE CASCADE );

-- 3. History table
   CREATE TABLE History (
      MarkerID TEXT NOT NULL,
      SessionCode VARCHAR(100) NOT NULL,
      Timestamp TIMESTAMP NOT NULL,
      ChatGPTInput TEXT,
      ChatGPTOutput TEXT,
      PRIMARY KEY (MarkerID, SessionCode, Timestamp),
      FOREIGN KEY (MarkerID, SessionCode)
         REFERENCES Markers(MarkerID, SessionCode)
         ON DELETE CASCADE );
```

  


## Running the Application

### Development Mode

```sh
uv run app.py
```

### Production Mode

```sh
uv run waitress-serve --port=8080 'app:app'
```

Access the application at `http://localhost:8080`.

## Appendix: AI Prompts Used

The application uses several AI prompts for different purposes:

1. Object classification prompt - Used to identify captured objects
2. Interactive chat prompts - Used for multilingual conversations about identified objects

All prompt templates are stored in the `prompts/` directory:
- language_prompt1.txt, language_prompt2.txt - Main interaction prompts
- image_identify_prompt.txt - Object identification prompt
- base_prompt1.txt, base_prompt2.txt - Base system prompts for GPT-4

See the specific files for the exact prompt texts.
