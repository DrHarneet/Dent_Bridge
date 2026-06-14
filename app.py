from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import AzureOpenAI, OpenAI
import httpx
from datetime import datetime, timedelta
import uuid
import json
import re

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)

# ─────────────────────────────────────────────
# Microsoft Azure AI Foundry - Intelligence Layer
# Falls back to GitHub Models (also Azure-hosted) if Foundry creds not set
# ─────────────────────────────────────────────
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_KEY = os.getenv("AZURE_OPENAI_KEY", "")
AZURE_DEPLOYMENT = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o")

try:
    if AZURE_ENDPOINT and AZURE_KEY:
        # Primary: Azure AI Foundry
        client = AzureOpenAI(
            azure_endpoint=AZURE_ENDPOINT,
            api_key=AZURE_KEY,
            api_version="2024-12-01-preview",
            http_client=httpx.Client(
                timeout=30.0,
                limits=httpx.Limits(max_connections=100)
            )
        )
        MODEL = AZURE_DEPLOYMENT
        print("Using Azure AI Foundry (Microsoft Intelligence Layer)")
    else:
        # Fallback: GitHub Models (Microsoft Azure AI Inference API)
        client = OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url="https://models.inference.ai.azure.com",
            http_client=httpx.Client(
                timeout=30.0,
                limits=httpx.Limits(max_connections=100)
            )
        )
        MODEL = "gpt-4o"
        print("Using GitHub Models (Microsoft Azure AI Inference API - fallback)")
except Exception as e:
    print(f"Error initializing client: {e}")
    client = OpenAI(
        api_key=os.getenv('OPENAI_API_KEY'),
        base_url="https://models.inference.ai.azure.com"
    )
    MODEL = "gpt-4o"

# Language mappings
LANGUAGES = {
    'hindi': 'Hindi',
    'marathi': 'Marathi',
    'punjabi': 'Punjabi',
    'telugu': 'Telugu',
    'tamil': 'Tamil',
    'bengali': 'Bengali'
}

# Store sessions for multi-screen navigation
sessions_data = {}

@app.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

@app.route('/api/start-session', methods=['POST'])
def start_session():
    """Initialize a new session"""
    session_id = str(uuid.uuid4())
    sessions_data[session_id] = {
        'language': None,
        'doctor_input': None,
        'questions_count': 0,
        'max_questions': 5,
        'created_at': datetime.now()
    }
    return jsonify({'session_id': session_id, 'success': True})

@app.route('/api/select-language', methods=['POST'])
def select_language():
    """Handle language selection"""
    data = request.json
    session_id = data.get('session_id')
    language = data.get('language', '').lower()
    
    if session_id not in sessions_data:
        return jsonify({'error': 'Invalid session'}), 400
    
    if language not in LANGUAGES:
        return jsonify({'error': 'Invalid language'}), 400
    
    sessions_data[session_id]['language'] = language
    return jsonify({'success': True, 'message': f'Language set to {LANGUAGES[language]}'})

@app.route('/api/parse-doctor-input', methods=['POST'])
def parse_doctor_input():
    """Parse doctor's speech input and extract structured information"""
    data = request.json
    transcript = data.get('transcript', '').strip()
    
    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400
    
    detailed_prompt = f"""You are a medical data parser. Analyze this doctor's input carefully and extract structured information.

Doctor's input: "{transcript}"

Your task:
1. Identify the patient's main problem/complaint
2. Extract the diagnosis
3. Extract the treatment plan
4. Find any cost mentioned (extract numbers only)
5. Find number of appointments (extract numbers only)
6. Find any medications mentioned
7. Extract follow-up instructions

Return ONLY a valid JSON response with these exact fields (use empty string if not mentioned):
{{
    "chief_complaint": "patient's main complaint or symptoms",
    "diagnosis": "the diagnosis",
    "treatment": "the treatment plan",
    "cost": "cost in numbers only",
    "appointments": "number of appointments (numbers only)",
    "medications": "medications to be taken",
    "follow_up": "follow-up instructions"
}}

IMPORTANT: Return ONLY valid JSON with no additional text."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a medical data parser. Extract information from doctor's speech and return ONLY valid JSON with no explanation."},
                {"role": "user", "content": detailed_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Clean up markdown code blocks if present
        if result_text.startswith('```json'):
            result_text = result_text[7:]
        if result_text.startswith('```'):
            result_text = result_text[3:]
        if result_text.endswith('```'):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        parsed_data = json.loads(result_text)
        
        if 'cost' in parsed_data and parsed_data['cost']:
            cost_match = re.search(r'\d+', str(parsed_data['cost']))
            parsed_data['cost'] = cost_match.group() if cost_match else ''
        
        if 'appointments' in parsed_data and parsed_data['appointments']:
            appt_match = re.search(r'\d+', str(parsed_data['appointments']))
            parsed_data['appointments'] = appt_match.group() if appt_match else ''
        
        for field in ['chief_complaint', 'diagnosis', 'treatment', 'cost', 'appointments', 'medications', 'follow_up']:
            if field not in parsed_data:
                parsed_data[field] = ''
        
        return jsonify(parsed_data)
    except Exception as e:
        print(f"Error parsing doctor input: {str(e)}")
        return jsonify({
            'chief_complaint': transcript[:200],
            'diagnosis': '',
            'treatment': '',
            'cost': '',
            'appointments': '',
            'medications': '',
            'follow_up': ''
        })


@app.route('/api/doctor-input', methods=['POST'])
def doctor_input():
    """Handle doctor's input"""
    data = request.json
    session_id = data.get('session_id')
    
    if session_id not in sessions_data:
        return jsonify({'error': 'Invalid session'}), 400
    
    sessions_data[session_id]['doctor_input'] = {
        'chief_complaint': data.get('chief_complaint', ''),
        'diagnosis': data.get('diagnosis', ''),
        'treatment': data.get('treatment', ''),
        'cost': data.get('cost', ''),
        'appointments': data.get('appointments', ''),
        'medications': data.get('medications', ''),
        'follow_up': data.get('follow_up', '')
    }
    
    return jsonify({'success': True, 'message': 'Doctor input received'})

@app.route('/api/generate-explanation', methods=['POST'])
def generate_explanation():
    """Generate AI explanation for patient in selected language"""
    data = request.json
    session_id = data.get('session_id')
    
    if session_id not in sessions_data or not sessions_data[session_id]['doctor_input']:
        return jsonify({'error': 'Invalid session or missing doctor input'}), 400
    
    language = sessions_data[session_id]['language']
    doctor_info = sessions_data[session_id]['doctor_input']
    
    prompt = f"""You are a helpful medical assistant explaining a patient's dental case in simple, non-medical language in {LANGUAGES[language]}.

Doctor's Information:
- Chief Complaint: {doctor_info['chief_complaint']}
- Diagnosis: {doctor_info['diagnosis']}
- Treatment Plan: {doctor_info['treatment']}
- Cost: {doctor_info['cost']}
- Number of Appointments: {doctor_info['appointments']}
- Medications: {doctor_info['medications']}
- Follow-up Instructions: {doctor_info['follow_up']}

Please explain to the patient in {LANGUAGES[language]} using very simple, non-medical language:
1. What is the problem with their teeth (what happened)?
2. Why did this happen?
3. What treatment will be done?
4. How much will it cost?
5. How many times do they need to visit?
6. What medicines/care at home?
7. What to do after treatment?

Make it warm, reassuring, and easy to understand. Use simple words that a patient would know."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"You are a compassionate dental assistant. Always respond in {LANGUAGES[language]} with simple, non-medical language."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        explanation = response.choices[0].message.content
        return jsonify({
            'success': True,
            'explanation': explanation,
            'language': LANGUAGES[language]
        })
    except Exception as e:
        return jsonify({'error': f'Failed to generate explanation: {str(e)}'}), 500

@app.route('/api/patient-question', methods=['POST'])
def patient_question():
    """Handle patient question and generate AI response"""
    data = request.json
    session_id = data.get('session_id')
    question = data.get('question', '')
    
    if session_id not in sessions_data:
        return jsonify({'error': 'Invalid session'}), 400
    
    if sessions_data[session_id]['questions_count'] >= sessions_data[session_id]['max_questions']:
        return jsonify({
            'error': 'Maximum questions reached',
            'questions_remaining': 0
        }), 400
    
    language = sessions_data[session_id]['language']
    doctor_info = sessions_data[session_id]['doctor_input']
    
    prompt = f"""A patient has asked the following question about their dental case in {LANGUAGES[language]}:

Question: {question}

Context:
- Diagnosis: {doctor_info['diagnosis']}
- Treatment: {doctor_info['treatment']}
- Cost: {doctor_info['cost']}

Please provide a helpful, reassuring answer in {LANGUAGES[language]} using simple, non-medical language. Keep the answer concise and easy to understand."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"You are a compassionate dental assistant. Always respond in {LANGUAGES[language]} with simple, non-medical language. Be warm and reassuring."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        answer = response.choices[0].message.content
        sessions_data[session_id]['questions_count'] += 1
        questions_remaining = sessions_data[session_id]['max_questions'] - sessions_data[session_id]['questions_count']
        
        return jsonify({
            'success': True,
            'answer': answer,
            'questions_remaining': questions_remaining,
            'language': LANGUAGES[language]
        })
    except Exception as e:
        return jsonify({'error': f'Failed to generate answer: {str(e)}'}), 500

@app.route('/api/closing-message', methods=['POST'])
def closing_message():
    """Generate closing message in patient's language"""
    data = request.json
    session_id = data.get('session_id')
    
    if session_id not in sessions_data:
        return jsonify({'error': 'Invalid session'}), 400
    
    language = sessions_data[session_id]['language']
    
    prompt = f"""Generate a warm, encouraging closing message for a patient who just finished their dental consultation in {LANGUAGES[language]}. 
    
The message should:
1. Thank them for their time
2. Encourage them to follow the treatment plan
3. Remind them they can ask any questions
4. Wish them good health
5. Be warm and personal

Keep it short (2-3 sentences) and in very simple language in {LANGUAGES[language]}."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"You are a warm, compassionate dental assistant. Always respond in {LANGUAGES[language]}."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        message = response.choices[0].message.content
        return jsonify({
            'success': True,
            'message': message,
            'language': LANGUAGES[language]
        })
    except Exception as e:
        return jsonify({'error': f'Failed to generate message: {str(e)}'}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech in selected language"""
    data = request.json
    text = data.get('text', '')
    language = data.get('language', 'hindi')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    return jsonify({
        'success': True,
        'message': 'Text-to-speech ready (integration with Google Cloud TTS recommended)',
        'text': text,
        'language': language
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'intelligence_layer': 'Azure AI Foundry (gpt-4o)' if (AZURE_ENDPOINT and AZURE_KEY) else 'GitHub Models - Microsoft Azure AI Inference API'
    })

@app.route('/api/tts-url', methods=['POST'])
def get_tts_url():
    import urllib.parse
    data = request.json
    text = data.get('text', '')
    language = data.get('language', 'hindi')
    
    text = re.sub(r'[#*\[\]()]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = text[:200]
    
    lang_map = {
        'hindi': 'hi',
        'marathi': 'mr',
        'punjabi': 'pa',
        'telugu': 'te',
        'tamil': 'ta',
        'bengali': 'bn'
    }
    
    lang_code = lang_map.get(language, 'hi')
    encoded_text = urllib.parse.quote(text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded_text}&tl={lang_code}&client=tw-ob"
    
    return jsonify({'success': True, 'url': url})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
