import os
import groq
import time

# You'll need to set your Groq API key as an environment variable
# os.environ["GROQ_API_KEY"] = "your-api-key-here"

# Initialize Groq client
client = groq.Client(api_key="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")

def get_llm_response(system_prompt, conversation_history):
    """
    Get a response from the Groq LLM
    
    Args:
        system_prompt: System prompt to guide the model's behavior
        conversation_history: List of previous conversation messages
    
    Returns:
        Generated text response
    """
    try:
        # Format conversation history for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        for msg in conversation_history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Call Groq API with LLama2-70b for good balance of performance and cost
                response = client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500,
                    top_p=0.9,
                )
                
                # Extract and return the generated text
                return response.choices[0].message.content
                
            except Exception as e:
                if attempt < max_retries - 1:
                    # Exponential backoff
                    wait_time = 2 ** attempt
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise e
                    
    except Exception as e:
        print(f"Error getting LLM response: {e}")
        # Fallback response
        return "I'm sorry, I'm having trouble generating a response right now. Could you please repeat what you said?"