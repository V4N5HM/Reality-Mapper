import os
import time
import io
import traceback
import base64

import cv2
import numpy as np
from PIL import Image as PILImage

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from datetime import datetime, timezone

from supabase import create_client
from ultralytics import YOLO
from openai import OpenAI

from dotenv import load_dotenv

# ── CONFIG ────────────────────────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if SUPABASE_URL is None:
    raise RuntimeError("SUPABASE_URL environment variable is not set")

if SUPABASE_SERVICE_ROLE_KEY is None:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")

if OPENAI_API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

client = OpenAI(api_key=OPENAI_API_KEY)

# Name of your storage bucket (must exist in Supabase)
BUCKET_NAME = "marker-images"

# ── FLASK SETUP ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# Load your GPT prompt template
base_prompt_template = open("prompts/language_prompt2.txt", encoding="utf-8").read()
label_prompt = open("prompts/image_identify_prompt.txt", encoding="utf-8").read()

# Load YOLO
model = YOLO("yolov8n.pt")

# Globals
latest_frame   = None
latest_results = []
chat_history   = {}
language = "French"  # Hardcoded for now

# ── ROUTES ──────────────────────────────────────────────────────────────────────

@app.route("/")
def serve_login_page():
    """
    Serves the login page HTML to the user.

    Returns:
        Response: The HTML file for the login page from the 'Frontend' directory.
    """
    return send_from_directory("Frontend", "Login Page.html")

@app.route("/mode")
def serve_mode_page():
    """
    Serves the mode selection page.

    Returns:
        Response: The HTML file for mode selection.
    """
    return send_from_directory("Frontend", "mode.html")

@app.route("/scan")
def serve_scan_page():
    """
    Serves the scanning interface page.

    Returns:
        Response: The HTML file for scanning page.
    """
    return send_from_directory("Frontend", "scan.html")

@app.route("/chat.html")
def serve_chat_page():
    """
    Serves the chat UI interface.

    Returns:
        Response: The HTML file for the chat UI.
    """
    return send_from_directory("Frontend", "chat-ui.html")

@app.route("/<path:filename>")
def serve_static_files(filename):
    """
    Serves static frontend files dynamically based on the provided filename.

    Args:
        filename (str): The name of the file to serve.

    Returns:
        Response: The file response from the Frontend directory.
    """
    return send_from_directory("Frontend", filename)

@app.route("/detect", methods=["POST"])
def detect_objects():
    """
    Detects objects in the uploaded frame using YOLOv8.

    Expects:
        Form-data: "frame" (image file)

    Returns:
        JSON: List of bounding boxes in the format [x1, y1, x2, y2].
    """
    global latest_frame, latest_results
    file = request.files["frame"]
    arr  = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    latest_frame   = frame.copy()
    latest_results = model(frame)

    boxes = []
    for box in latest_results[0].boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        boxes.append([x1, y1, x2, y2])
    return jsonify({"boxes": boxes})

@app.route("/crop", methods=["POST"])
def crop_and_send_to_gpt():
    """
    Crops a region of the most recent frame, uploads it to Supabase,
    classifies it using GPT, and generates a multilingual teaching prompt.

    JSON Body:
        {
            "x1": int,
            "y1": int,
            "x2": int,
            "y2": int,
            "sessioncode": str,
            "marker_id": str
        }

    Returns:
        JSON: {
            "gpt_reply": str,
            "label": str,
            "session_id": str,
            "image_url": str
        }
    """
    global latest_frame, latest_results
    try:
        data = request.get_json()
        x1, y1, x2, y2 = map(int, (data["x1"], data["y1"], data["x2"], data["y2"]))
        sessioncode = data.get("sessioncode", "1")
        marker_id   = data.get("marker_id", "marker-5")

        if latest_frame is None:
            return jsonify({"gpt_reply":"No frame available.","label":"object"}), 400

        # 1) Crop & convert to PIL
        cropped = latest_frame[y1:y2, x1:x2]
        pil_img = PILImage.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))

        # 2) Encode PNG + data-URL fallback
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        img_bytes = buf.getvalue()
        data_url  = "data:image/png;base64," + base64.b64encode(img_bytes).decode()

        # 3) Upload to Supabase
        ts          = int(time.time() * 1000)
        remote_path = f"{sessioncode}/{marker_id}/{ts}.png"
        public_url  = None
        try:
            sb.storage.from_(BUCKET_NAME).upload(remote_path, img_bytes, {"content-type":"image/png"})
            signed = sb.storage.from_(BUCKET_NAME).create_signed_url(remote_path, expires_in=3600)
            public_url = signed.get("signedURL") or signed.get("signedUrl")
            if public_url and public_url.endswith('?'):
                public_url = public_url[:-1]
        except Exception as e:
            print("[STORAGE ERROR]", e)

        # 4) FIRST GPT CALL: classification → one-word label
        classification_prompt = (
            "You have been shown an image. That image is you.\n\n"
            "You must respond with only a single word: the most accurate and relevant name for the object shown in the image. "
            "Use lowercase unless the object's name is a proper noun. Do not include any additional words, descriptions, punctuation, or translations. "
            "Do not explain or introduce yourself.\n\n"
            "You are not a chatbot or assistant. You are the object in the picture. Your job is to say exactly what you are in one word — and nothing else."
        )
        classify_messages = [
            {"role":"system", "content": classification_prompt},
            {"role":"user",   "content":[
                {"type":"image_url","image_url":{
                    "url":   public_url or data_url,
                    "detail":"high"
                }}
            ]}
        ]
        classify_resp = client.chat.completions.create(
            model="gpt-4o", messages=classify_messages
        )
        label = classify_resp.choices[0].message.content.strip()

        # 5) Upsert the new label into markers table
        try:
            sb.table("markers").upsert({
                "sessioncode": sessioncode,
                "marker_id":   marker_id,
                "image":       public_url or data_url,
                "label":       label
            }).execute()
        except Exception as db_err:
            print("[DB UPSERT ERROR]", db_err)
        # 5a) Delete the history table corresponding to the old marker/session code conversation
        try:
            # 1) delete all History rows where sessioncode & markerid match
            resp = sb.table("history") \
                .delete() \
                .match({
                    "sessioncode": sessioncode,
                    "markerid":    marker_id
                }) \
                .execute()
        except Exception as e:
            # 3) If anything blows up, write it out verbatim for post-mortem
            with open("history_clear_error.txt", "w") as f:
                f.write(f"[{sessioncode} | {marker_id}] Exception:\n{e}")
            print("[HISTORY CLEAR EXCEPTION] wrote details to history_clear_error.txt")    

        
        # ── fetch the user-selected language for this room ──
        lang_resp = sb.table("sessions") \
            .select("language") \
            .eq("sessioncode", sessioncode) \
            .maybe_single() \
            .execute()
        # fallback to English if something’s missing
        language = (lang_resp.data or {}).get("language", "English")

        # 6) SECOND GPT CALL: your original chat prompt using {label}
        session_id    = str(time.time())
        system_prompt = base_prompt_template.replace("{label}", label).replace("{language}", language)
        chat_msgs     = [
            {"role":"system", "content": system_prompt},
            {"role":"user",   "content":[
                {"type":"image_url","image_url":{
                    "url":   public_url or data_url,
                    "detail":"high"
                }}
            ]}
        ]
        chat_history[session_id] = chat_msgs.copy()
        chat_resp    = client.chat.completions.create(model="gpt-4o", messages=chat_msgs)
        gpt_reply    = chat_resp.choices[0].message.content
        chat_history[session_id].append({"role":"assistant","content":gpt_reply})

        # 7) INSERT that assistant reply into history table
        try:
            sb.table("history").insert({
                "sessioncode":   sessioncode,
                "markerid":      marker_id,
                "timestamp":     datetime.now(timezone.utc).isoformat(),
                "chatgptinput":  system_prompt,
                "chatgptoutput": gpt_reply
            }).execute()
        except Exception as hist_err:
            print("[HISTORY INSERT ERROR]", hist_err)

        # 8) Return both fields for your front-end
        return jsonify({
            "gpt_reply":  gpt_reply,
            "label":      label,
            "session_id": session_id,
            "image_url":  public_url
        })

    except Exception as e:
        print("[CROP ERROR]", e, traceback.format_exc())
        return jsonify({"gpt_reply": f"Error: {e}", "label":"object"}), 500
    

@app.route("/chat", methods=["POST"])
def chat_with_object():
    """
    Handles ongoing chat with the GPT-identified object.

    JSON Body:
        {
            "message": str,
            "session_id": str
        }

    Returns:
        JSON: {
            "reply": str
        }
    """
    data = request.get_json()
    msg  = data.get("message", "")
    sid  = data.get("session_id", "default")     # sessioncode
    marker_id = "marker-5"                       # hardcoded markerid

    # ✅ Basic debug output only
    print(f"[CHAT] sessioncode={sid}, markerid={marker_id}")

    try:
        # 1) Pull full conversation history
        hist_resp = sb.table("history") \
            .select("chatgptinput, chatgptoutput") \
            .eq("sessioncode", sid) \
            .eq("markerid", marker_id) \
            .order("timestamp", desc=False) \
            .execute()

        rows = hist_resp.data if hist_resp.data else []
        chat_msgs = []

        # 2) Inject system prompt if present in first history row
        if rows:
            system_prompt = rows[0].get("chatgptinput")
            if system_prompt:
                chat_msgs.append({"role": "system", "content": system_prompt})
            if rows[0].get("chatgptoutput"):
                chat_msgs.append({"role": "assistant", "content": rows[0]["chatgptoutput"]})
            rows = rows[1:]

        # 3) Add remaining conversation
        for row in rows:
            if row.get("chatgptinput"):
                chat_msgs.append({"role": "user", "content": row["chatgptinput"]})
            if row.get("chatgptoutput"):
                chat_msgs.append({"role": "assistant", "content": row["chatgptoutput"]})

        # 4) Append new user message
        chat_msgs.append({"role": "user", "content": msg})

        # 5) Call GPT
        resp = client.chat.completions.create(model="gpt-4o", messages=chat_msgs)
        reply = resp.choices[0].message.content

        return jsonify({"reply": reply})

    except Exception as e:
        print("[CHAT ERROR]", e, traceback.format_exc())
        return jsonify({"reply": "Oops! Something went wrong."})

    
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
