from flask import Flask, render_template, request, jsonify, session, send_from_directory
import os
import json
import openai
from datetime import datetime
from dotenv import load_dotenv
import tempfile

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management

# OpenAI configuration - load API key from environment variable
# openai.api_key = os.getenv("OPENAI_API_KEY")
openai.api_key = "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"

# Register data directory for serving static files
@app.route('/static/data/<path:filename>')
def serve_data(filename):
    return send_from_directory(os.path.join(app.root_path, 'data'), filename)

# Load patient cases from JSON
def load_patient_cases():
    with open('data/patient_cases.json', 'r') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/cases')
def cases():
    patient_cases = load_patient_cases()
    return render_template('cases.html', cases=patient_cases)

@app.route('/simulation/<case_id>')
def simulation(case_id):
    patient_cases = load_patient_cases()
    case = next((c for c in patient_cases if c['id'] == case_id), None)
    
    if not case:
        return "Case not found", 404
    # test
    # Initialize session data for this simulation
    session['case_id'] = case_id
    session['phase'] = 'learn'
    session['start_time'] = datetime.now().isoformat()
    session['interactions'] = []
    
    return render_template('simulation.html', case=case)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    phase = session.get('phase', 'learn')
    case_id = session.get('case_id')
    
    # Load the patient case
    patient_cases = load_patient_cases()
    case = next((c for c in patient_cases if c['id'] == case_id), None)
    
    if not case:
        return jsonify({"error": "Case not found"}), 404
    
    # Track this interaction
    session['interactions'] = session.get('interactions', []) + [
        {"role": "user", "content": user_message, "timestamp": datetime.now().isoformat()}
    ]
    
    # Generate AI response based on phase
    try:
        if phase == 'learn':
            # AI acts as patient
            system_prompt = f"You are a patient named {case['name']} with the following condition: {case['condition']}. " + \
                           f"You have these symptoms: {', '.join(case['symptoms'])}. " + \
                           "Answer as if you are the patient being interviewed by a medical student. " + \
                           "Only reveal information when specifically asked about it. " + \
                           "Be realistic in your responses, with appropriate concern level for your condition."
            
            # Add additional context for complex cases
            if 'history' in case:
                system_prompt += f" Your medical history includes: {case['history']}."
            
            if 'physical_exam' in case:
                system_prompt += f" Your physical examination showed: {case['physical_exam']}."
        else:  # diagnosis phase
            # AI acts as doctor
            system_prompt = "You are an experienced medical doctor helping a medical student with differential diagnosis. " + \
                           f"The patient has the following symptoms: {', '.join(case['symptoms'])}. " + \
                           f"The correct diagnosis is {case['diagnosis']}. " + \
                           "Guide the student through the diagnostic reasoning process without immediately revealing the diagnosis. " + \
                           "Keep your responses short and conversational, and only go into detail if the student asks for it. " + \
                           "Offer hints if they seem stuck and validate correct reasoning."
            
            # Add differential diagnosis if available
            if 'differential_diagnosis' in case:
                system_prompt += f" The differential diagnosis to consider includes: {', '.join(case['differential_diagnosis'])}."
        
        # Call the OpenAI API
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            ).choices[0].message.content
        except Exception as e:
            # Fallback responses if API call fails
            if phase == 'learn':
                response = f"I'm {case['name']}, and I've been experiencing {case['chief_complaint']}. What else would you like to know?"
            else:
                response = "Let's think about the symptoms. What patterns do you notice in the patient's presentation?"
        
        # Track AI response
        session['interactions'] = session.get('interactions', []) + [
            {"role": "assistant", "content": response, "timestamp": datetime.now().isoformat()}
        ]
        return jsonify({"response": response})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Endpoint to transcribe speech to text using OpenAI Whisper API
    """
    try:
        # Check if audio file was provided
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        # Save the audio file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        try:
            # Use OpenAI's Whisper API for transcription
            with open(temp_audio_path, 'rb') as audio:
                transcript = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio
                )
            
            # Clean up temporary file
            os.unlink(temp_audio_path)
            
            return jsonify({"text": transcript.text})
            
        except Exception as e:
            # Clean up temporary file in case of error
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
            
            print(f"OpenAI API error: {str(e)}")
            return jsonify({"error": "Failed to transcribe audio", "details": str(e)}), 500
    
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """
    Endpoint to convert text to speech using OpenAI TTS API
    """
    try:
        data = request.json
        text = data.get('text')
        voice = data.get('voice', 'onyx')  # Default to onyx voice
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Call OpenAI's TTS API
        response = openai.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_audio:
            response.stream_to_file(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        # Return the audio file
        return send_from_directory(
            os.path.dirname(temp_audio_path),
            os.path.basename(temp_audio_path),
            as_attachment=True,
            download_name="response.mp3",
            mimetype="audio/mpeg"
        )
    
    except Exception as e:
        print(f"TTS error: {str(e)}")
        return jsonify({"error": "Failed to generate speech", "details": str(e)}), 500

@app.route('/api/transition', methods=['POST'])
def transition_phase():
    # Transition from learn to diagnosis phase
    session['phase'] = 'diagnosis'
    return jsonify({"success": True, "phase": "diagnosis"})

def get_clinical_reasoning_score(case, interactions):
    """
    Get a clinical reasoning score from the AI based on the student's interactions.
    
    Args:
        case: The patient case data
        interactions: List of all interactions from the student's session
    
    Returns:
        An integer score from 0-100
    """
    try:
        # Create a system prompt that asks the AI to evaluate clinical reasoning
        system_prompt = (
            "You are an experienced medical educator evaluating a medical student's clinical reasoning skills. "
            "Review the following conversation between the student and patient/doctor, then provide a single "
            "numerical score from 0-100 that reflects the student's clinical reasoning ability. "
            f"The patient has: {', '.join(case['symptoms'])}. "
            f"The correct diagnosis is: {case['diagnosis']}. "
            "Provide ONLY the numerical score as your response, with no additional text."
        )
        
        # Create a list of messages for the API call
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add the conversation history
        for interaction in interactions:
            messages.append({
                "role": "user" if interaction["role"] == "user" else "assistant",
                "content": interaction["content"]
            })
            
        # Add a final message asking for the score
        messages.append({
            "role": "user", 
            "content": "Based on this conversation, what numerical score from 0-100 would you give for the student's clinical reasoning skills? Provide only the number."
        })
        
        # Call the OpenAI API
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3  # Lower temperature for more consistent scoring
        ).choices[0].message.content
        
        # Extract the score from the response
        # Try to parse the response as an integer
        try:
            # Remove any non-numeric characters and convert to int
            score = int(''.join(filter(str.isdigit, response)))
            # Ensure score is within 0-100 range
            score = min(100, max(0, score))
            print(f"AI Clinical Reasoning Score: {score}, Raw response: {response}")
            return score
        except ValueError:
            # If parsing fails, return a default score
            print(f"Failed to parse AI score response: {response}")
            return 75  # Default score
            
    except Exception as e:
        print(f"Error getting clinical reasoning score: {str(e)}")
        # Return a default score if the API call fails
        return 75  # Default score

@app.route('/results/<case_id>')
def results(case_id):
    # Calculate and display results
    start_time = datetime.fromisoformat(session.get('start_time', datetime.now().isoformat()))
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds() / 60  # in minutes
    
    interactions = session.get('interactions', [])
    user_messages = [i for i in interactions if i['role'] == 'user']
    
    # Load the patient case for displaying the correct diagnosis and data
    patient_cases = load_patient_cases()
    case = next((c for c in patient_cases if c['id'] == case_id), None)
    
    if not case:
        return "Case not found", 404
    
    # Get clinical reasoning score from AI
    clinical_reasoning_score = get_clinical_reasoning_score(case, interactions)
    
    results_data = {
        "duration": round(duration, 1),
        "num_questions": len(user_messages),
        "efficiency_score": min(100, max(0, 100 - (len(user_messages) - 10) * 5)),  # Simple efficiency score based on number of questions
        "clinical_reasoning_score": clinical_reasoning_score,  # AI-generated clinical reasoning score
        "case": case  # Pass the entire case for display in the results page
    }
    
    return render_template('results.html', results=results_data)

if __name__ == '__main__':
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    os.makedirs('data/case1', exist_ok=True)
    
    # Create a sample patient case file if it doesn't exist
    if not os.path.exists('data/patient_cases.json'):
        sample_cases = [
            {
                "id": "case001",
                "name": "Alicia Smith",
                "age": 33,
                "gender": "Female",
                "chief_complaint": "Right lower quadrant pain",
                "condition": "Appendicitis",
                "symptoms": [
                    "Right lower quadrant pain",
                    "Mild anorexia",
                    "No nausea",
                    "Low-grade fever"
                ],
                "history": "No significant past medical history",
                "diagnosis": "Acute appendicitis",
                "imaging_needed": "CT scan of abdomen"
            },
            {
                "id": "case002",
                "name": "James Wilson",
                "age": 57,
                "gender": "Male",
                "chief_complaint": "Chest pain and shortness of breath",
                "condition": "Myocardial Infarction",
                "symptoms": [
                    "Substernal chest pain",
                    "Pain radiating to left arm",
                    "Shortness of breath",
                    "Diaphoresis"
                ],
                "history": "Hypertension, Hyperlipidemia, Smoker",
                "diagnosis": "Acute myocardial infarction",
                "imaging_needed": "ECG, Cardiac enzymes"
            }
        ]
        
        with open('data/patient_cases.json', 'w') as f:
            json.dump(sample_cases, f, indent=2)
    
    app.run(debug=True) 