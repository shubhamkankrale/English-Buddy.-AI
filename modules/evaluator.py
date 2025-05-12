import re
from modules.llm_interface import get_llm_response

def evaluate_conversation(user_profile, conversation_history):
    """
    Evaluate the user's English speaking skills based on the conversation history
    
    Args:
        user_profile: User profile with level and transcriptions
        conversation_history: Complete conversation history
    
    Returns:
        Detailed evaluation report
    """
    level = user_profile["level"]
    transcriptions = user_profile["transcriptions"]
    
    if not transcriptions:
        return {
            "error": "No speech detected to evaluate"
        }
    
    # Extract only the user's messages from conversation history
    user_messages = [msg["content"] for msg in conversation_history if msg["role"] == "user"]
    
    # Basic metrics
    word_count = count_words(" ".join(user_messages))
    avg_words_per_message = word_count / len(user_messages) if user_messages else 0
    
    # Calculate vocabulary richness (unique words / total words)
    unique_words = count_unique_words(" ".join(user_messages))
    vocabulary_richness = unique_words / word_count if word_count > 0 else 0
    
    # Extract common grammar mistakes using pattern matching
    common_mistakes = extract_common_mistakes(" ".join(user_messages))
    
    # Use LLM for detailed evaluation
    llm_evaluation = get_detailed_evaluation(level, user_messages)
    
    # Combine metrics and LLM evaluation
    report = {
        "level": level,
        "word_count": word_count,
        "avg_words_per_message": round(avg_words_per_message, 1),
        "vocabulary_richness": round(vocabulary_richness * 100, 1),
        "common_mistakes": common_mistakes,
        "detailed_evaluation": llm_evaluation
    }
    
    return report

def count_words(text):
    """Count the number of words in text"""
    words = re.findall(r'\b\w+\b', text.lower())
    return len(words)

def count_unique_words(text):
    """Count the number of unique words in text"""
    words = re.findall(r'\b\w+\b', text.lower())
    return len(set(words))

def extract_common_mistakes(text):
    """
    Extract common grammar mistakes using pattern matching
    This is a simplified version - for production use, consider more sophisticated NLP
    """
    mistakes = []
    
    # Check for common ESL mistakes (simplified patterns)
    patterns = [
        (r'\bi am (agree|disagree)', "Using 'I am agree' instead of 'I agree'"),
        (r'\bthe\s+([a-z]+ing)\b', "Potentially incorrect use of 'the' with gerund"),
        (r'\b(make|makes|made)\s+fun\b', "Using 'make fun' instead of 'have fun'"),
        (r'\b(is|are|was|were)\s+consist', "Using 'is consist of' instead of 'consists of'"),
        (r'\bdiscuss\s+about\b', "Using 'discuss about' instead of just 'discuss'"),
        (r'\badvice\s+(to|for)\s+\w+\b', "Using 'advice to' instead of 'advise'"),
        (r'\b(look|looks|looked)\s+forward\s+to\s+([a-z]+ing)', "Correct use of 'look forward to' + gerund"),
        (r'\b(look|looks|looked)\s+forward\s+to\s+(\w+[^ing\s])\b', "Incorrect use of 'look forward to' without gerund"),
    ]
    
    for pattern, description in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            mistakes.append(description)
    
    # Limit to top 3 unique mistakes
    return list(set(mistakes))[:3]

def get_detailed_evaluation(level, user_messages):
    """
    Get detailed evaluation using LLM
    
    Args:
        level: User's English level
        user_messages: List of user's messages
    
    Returns:
        Detailed evaluation
    """
    # Prepare prompt for the LLM
    all_user_text = "\n".join([f"- {msg}" for msg in user_messages])
    
    prompt = f"""You are an expert English language teacher evaluating a {level} level English learner.
    
    Here are all the learner's spoken responses (transcribed):
    {all_user_text}
    
    Please provide a detailed but concise evaluation covering:
    1. Fluency (smoothness of speech, hesitations)
    2. Pronunciation (any noticeable patterns or issues)
    3. Grammar usage (strengths and weaknesses)
    4. Vocabulary richness (variety and appropriateness)
    5. Three specific suggestions for improvement
    
    Keep your evaluation constructive, encouraging, and appropriate for a {level} level learner.
    Format your response as a structured evaluation without mentioning that you're an AI.
    Limit your response to approximately 300 words.
    """
    
    # Get evaluation from LLM
    evaluation = get_llm_response(prompt, [])
    
    return evaluation