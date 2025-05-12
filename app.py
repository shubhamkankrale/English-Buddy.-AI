from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import json
import tempfile
import base64
import time

# Import our modules
from modules.transcription import transcribe_audio
from modules.llm_interface import get_llm_response
from modules.text_to_speech import text_to_speech
from modules.evaluator import evaluate_conversation

app = Flask(__name__)
CORS(app)

# Store conversation history and user profile
conversation_history = []
user_profile = {
    "level": None,
    "transcriptions": [],
    "task_responses": {}
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/set_level', methods=['POST'])
def set_level():
    data = request.json
    level = data.get('level')
    
    if level not in ['Beginner', 'Intermediate', 'Advanced']:
        return jsonify({"error": "Invalid level"}), 400
    
    # Reset conversation for new level
    global conversation_history, user_profile
    conversation_history = []
    user_profile = {
        "level": level,
        "transcriptions": [],
        "task_responses": {}
    }
    
    # Get initial greeting based on level
    system_prompt = f"You are an English conversation practice assistant for {level} level English learners. Start with a friendly greeting and ask a simple question to begin the conversation. Your Name is Sam"
    response = get_llm_response(system_prompt, [])
    
    # Convert to speech
    audio_base64 = text_to_speech(response)
    
    # Add to conversation history
    conversation_history.append({
        "role": "assistant",
        "content": response
    })
    
    return jsonify({
        "response": response,
        "audio": audio_base64
    })

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    audio_file = request.files['audio']
    
    # Save temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    audio_file.save(temp_file.name)
    temp_file.close()
    
    try:
        # Transcribe audio
        transcription = transcribe_audio(temp_file.name)
        user_profile["transcriptions"].append(transcription)
        
        # Add to conversation history
        conversation_history.append({
            "role": "user",
            "content": transcription
        })
        
        # Check if this is a task response
        is_task_response = False
        for task_id, task in user_profile["task_responses"].items():
            if task["status"] == "assigned":
                user_profile["task_responses"][task_id]["response"] = transcription
                user_profile["task_responses"][task_id]["status"] = "completed"
                is_task_response = True
                break
        
        # Generate assistant response based on level and conversation history
        system_prompt = generate_system_prompt(user_profile["level"], is_task_response)
        response = get_llm_response(system_prompt, conversation_history)
        
        # Check if response contains a task
        if "TASK:" in response:
            task_parts = response.split("TASK:")
            response = task_parts[0].strip()
            task_description = task_parts[1].strip()
            
            # Register the task
            task_id = f"task_{len(user_profile['task_responses']) + 1}"
            user_profile["task_responses"][task_id] = {
                "description": task_description,
                "status": "assigned",
                "response": None
            }
        
        # Add to conversation history
        conversation_history.append({
            "role": "assistant",
            "content": response
        })
        
        # Convert to speech
        audio_base64 = text_to_speech(response)
        
        return jsonify({
            "transcription": transcription,
            "response": response,
            "audio": audio_base64
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temp file
        os.unlink(temp_file.name)

@app.route('/end_conversation', methods=['POST'])
def end_conversation():
    # Generate evaluation report
    evaluation = evaluate_conversation(user_profile, conversation_history)
    
    return jsonify({
        "report": evaluation
    })

def generate_system_prompt(level, is_task_response=False):
    """Generate appropriate system prompt based on user level and context"""
    if is_task_response:
        return f"""You are an English conversation practice assistant for {level} level English learners.
        The user just completed a speaking task you assigned. Give positive feedback first, then 1-2 specific improvement suggestions.
        Keep your response friendly, encouraging and concise. Don't assign a new task yet."""
    
    task_probability = {
        "Beginner": 0.2,
        "Intermediate": 0.3,
        "Advanced": 0.4
    }
    
    # Determine if we should assign a task based on conversation length
    should_assign_task = len(conversation_history) >= 4 and len(user_profile["task_responses"]) < 2
    assign_task_directive = ""
    
    if should_assign_task:
        assign_task_directive = """
        In your response, include a speaking task for the user by adding "TASK:" followed by the task description.
        For Beginner: Simple tasks like "Describe your family" or "Talk about your daily routine"
        For Intermediate: Moderate tasks like "Explain the plot of your favorite movie" or "Describe a problem in your city"
        For Advanced: Complex tasks like "Argue for or against remote work" or "Discuss the impact of AI on society"
        """
    
    base_prompt = f"""You are an English conversation practice assistant for {level} level English learners.
    Adjust your vocabulary and sentence complexity to match their {level} level.
    
    Beginner: Use simple vocabulary, short sentences, and basic grammar.
    Intermediate: Use moderate vocabulary, varied sentence structures, and introduce some idioms.
    Advanced: Use sophisticated vocabulary, complex sentences, idioms, and discuss abstract topics.
    
    Keep the conversation natural, engaging and flowing. Ask follow-up questions to encourage the user to speak more.
    {assign_task_directive}
    
    Important:
    - Keep your responses concise (3-5 sentences)
    - Don't summarize the conversation
    - Don't mention that you're an AI unless the user asks
    - Focus on having a natural conversation"""
    
    return base_prompt

if __name__ == '__main__':
    # Create directories if they don't exist
    for directory in ['static/js', 'static/css', 'templates', 'modules']:
        os.makedirs(directory, exist_ok=True)
    
    app.run(debug=True, port=5000)