import whisper
import tempfile
import os

# Load the whisper model (this will download it if not already cached)
# Using "base" model for balance of accuracy and speed
model = None

def load_model():
    global model
    if model is None:
        model = whisper.load_model("base")
    return model

def transcribe_audio(audio_path):
    """
    Transcribe audio using Whisper
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Transcribed text
    """
    try:
        # Load model if not already loaded
        model = load_model()
        
        # Transcribe audio
        result = model.transcribe(audio_path)
        
        return result["text"].strip()
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        raise e