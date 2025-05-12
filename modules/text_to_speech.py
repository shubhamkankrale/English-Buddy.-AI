import os
import base64
import tempfile
import sounddevice as sd
import soundfile as sf
import numpy as np
from scipy.io import wavfile
import requests

def text_to_speech(text):
    """
    Convert text to speech using a basic synthesis approach.
    For a production system, you would want to use a more sophisticated TTS service
    like Google Cloud TTS, Amazon Polly, or similar.
    
    Here we'll implement a simplified approach using a fallback to a free TTS API
    
    Args:
        text: Text to convert to speech
        
    Returns:
        Base64 encoded audio data
    """
    try:
        # For demo purposes, we'll use a free TTS API
        # In production, replace with a more reliable service
        url = "https://api.streamelements.com/kappa/v2/speech"
        params = {
            "voice": "en-US-Standard-C",  # Female voice
            "text": text
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            # Save audio to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            temp_file.write(response.content)
            temp_file.close()
            
            # Generate a temp WAV file for consistency
            wav_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            wav_temp.close()
            
            # Use soundfile to convert mp3 to wav
            data, sample_rate = sf.read(temp_file.name)
            sf.write(wav_temp.name, data, sample_rate)
            
            # Read wav file and encode to base64
            with open(wav_temp.name, "rb") as wav_file:
                encoded_string = base64.b64encode(wav_file.read()).decode('utf-8')
            
            # Clean up temp files
            os.unlink(temp_file.name)
            os.unlink(wav_temp.name)
            
            return encoded_string
        
        else:
            # Fallback to a simple tone generation
            return _generate_fallback_speech()
            
    except Exception as e:
        print(f"Error in text_to_speech: {e}")
        # Fallback to simple tone
        return _generate_fallback_speech()

def _generate_fallback_speech():
    """Generate a simple audio tone as fallback"""
    try:
        # Generate a simple tone
        sample_rate = 44100
        duration = 1  # seconds
        frequency = 440  # Hz - A4 note
        
        # Generate time array
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        
        # Generate sine wave
        tone = np.sin(2 * np.pi * frequency * t) * 0.5
        
        # Apply fade in/out
        fade_duration = 0.1  # seconds
        fade_samples = int(fade_duration * sample_rate)
        
        fade_in = np.linspace(0, 1, fade_samples)
        fade_out = np.linspace(1, 0, fade_samples)
        
        tone[:fade_samples] *= fade_in
        tone[-fade_samples:] *= fade_out
        
        # Convert to 16-bit PCM
        audio_data = (tone * 32767).astype(np.int16)
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_file.close()
        
        wavfile.write(temp_file.name, sample_rate, audio_data)
        
        # Read and encode to base64
        with open(temp_file.name, "rb") as wav_file:
            encoded_string = base64.b64encode(wav_file.read()).decode('utf-8')
        
        # Clean up
        os.unlink(temp_file.name)
        
        return encoded_string
        
    except Exception as e:
        print(f"Error generating fallback speech: {e}")
        # Return empty string if all else fails
        return ""