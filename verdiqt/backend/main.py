# FastAPI backend for Verdiqt Chrome extension with multilingual sentiment analysis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from langdetect import detect, LangDetectException
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Language mapping - Indian regional + international languages
LANGUAGE_MAP = {
    # Indian languages
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "ur": "Urdu",
    # East Asian languages
    "ko": "Korean",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "zh": "Chinese",
    "ja": "Japanese",
    # European languages
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "pt": "Portuguese",
    "it": "Italian",
    "nl": "Dutch",
    "ru": "Russian",
    "pl": "Polish",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "tr": "Turkish",
    # Middle Eastern / African
    "ar": "Arabic",
    "fa": "Persian",
    "he": "Hebrew",
    "sw": "Swahili",
    # Southeast Asian
    "id": "Indonesian",
    "ms": "Malay",
    "th": "Thai",
    "vi": "Vietnamese",
    "tl": "Filipino",
}

def detect_language(text):
    """Detect language of the given text"""
    try:
        code = detect(text)
        return LANGUAGE_MAP.get(code, "Other")
    except LangDetectException:
        return "Unknown"

# Load multilingual sentiment analysis model once on startup
try:
    # This model supports 100+ languages including all Indian languages
    sentiment_pipeline = pipeline(
        "text-classification",
        model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
        return_all_scores=False  # Changed to False to get single best prediction
    )
    logger.info("Multilingual sentiment analysis model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load sentiment model: {e}")
    sentiment_pipeline = None

class ReviewsInput(BaseModel):
    reviews: List[str]

class ReviewResult(BaseModel):
    text: str
    sentiment: str
    confidence: float
    language: str

class AnalysisResponse(BaseModel):
    reviews: List[ReviewResult]
    overall: dict
    languages_detected: List[str]

@app.get("/health")
def health_check():
    models_loaded = sentiment_pipeline is not None
    return {"status": "ok", "models_loaded": models_loaded}

@app.get("/test")
def test_analysis():
    """Test endpoint to verify sentiment analysis is working"""
    test_reviews = [
        "This product is amazing and I love it!",
        "Terrible quality, waste of money, very disappointed",
        "It's okay, nothing special but works fine"
    ]
    
    if sentiment_pipeline is None:
        return {"error": "Sentiment pipeline not loaded"}
    
    results = []
    for review in test_reviews:
        try:
            prediction = sentiment_pipeline(review)
            results.append({
                "text": review,
                "raw_prediction": prediction,
                "type": str(type(prediction))
            })
        except Exception as e:
            results.append({
                "text": review,
                "error": str(e)
            })
    
    return {"test_results": results}

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_reviews(input_data: ReviewsInput):
    print(f"Received analyze request with {len(input_data.reviews)} reviews")
    
    try:
        if sentiment_pipeline is None:
            raise HTTPException(status_code=500, detail="Sentiment analysis model not available")
        
        results = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        languages_detected = set()
        
        for review_text in input_data.reviews:
            try:
                # Detect language
                detected_language = detect_language(review_text)
                languages_detected.add(detected_language)
                print(f"Verdiqt: Detected language: {detected_language}")
                
                # Get sentiment predictions
                predictions = sentiment_pipeline(review_text)
                print(f"Verdiqt: Raw prediction for '{review_text[:50]}...': {predictions}")
                
                # Handle different response formats more robustly
                best_prediction = None
                
                if isinstance(predictions, list) and len(predictions) > 0:
                    if isinstance(predictions[0], dict):
                        # Single prediction format: [{'label': 'POSITIVE', 'score': 0.9}]
                        best_prediction = predictions[0]
                    elif isinstance(predictions[0], list) and len(predictions[0]) > 0:
                        # Multiple predictions format: [[{'label': 'POSITIVE', 'score': 0.9}, ...]]
                        best_prediction = max(predictions[0], key=lambda x: x['score'])
                    else:
                        # Fallback
                        best_prediction = predictions[0] if predictions[0] else None
                elif isinstance(predictions, dict):
                    # Direct prediction format: {'label': 'POSITIVE', 'score': 0.9}
                    best_prediction = predictions
                else:
                    print(f"Verdiqt: Unexpected prediction format: {type(predictions)} - {predictions}")
                    best_prediction = None
                
                if best_prediction is None:
                    raise Exception("Could not parse prediction result")
                
                # Map model labels to our format with more robust mapping
                original_label = str(best_prediction.get('label', ''))
                label = original_label.upper()
                score = float(best_prediction.get('score', 0))
                
                print(f"Verdiqt: Parsed - Original: {original_label}, Upper: {label}, Score: {score}")
                
                # Enhanced label mapping - check both original and uppercase
                if (any(pos in label for pos in ['POSITIVE', 'POS', 'LABEL_2']) or 
                    original_label.lower() == 'positive'):
                    sentiment = "positive"
                elif (any(neg in label for neg in ['NEGATIVE', 'NEG', 'LABEL_0']) or 
                      original_label.lower() == 'negative'):
                    sentiment = "negative"
                elif (any(neu in label for neu in ['NEUTRAL', 'NEU', 'LABEL_1']) or 
                      original_label.lower() == 'neutral'):
                    sentiment = "neutral"
                else:
                    # If we can't determine sentiment from label, use score
                    if score > 0.6:
                        sentiment = "positive"
                    elif score < 0.4:
                        sentiment = "negative"
                    else:
                        sentiment = "neutral"
                    print(f"Verdiqt: Used score-based mapping for unknown label '{original_label}': {sentiment}")
                
                confidence = round(score * 100, 1)
                
                print(f"Verdiqt: Final result - Sentiment: {sentiment}, Confidence: {confidence}%, Language: {detected_language}")
                
                results.append(ReviewResult(
                    text=review_text,
                    sentiment=sentiment,
                    confidence=confidence,
                    language=detected_language
                ))
                
                sentiment_counts[sentiment] += 1
                
            except Exception as e:
                logger.error(f"Error processing review: {e}")
                # Default to neutral if processing fails
                detected_language = detect_language(review_text)
                languages_detected.add(detected_language)
                
                results.append(ReviewResult(
                    text=review_text,
                    sentiment="neutral",
                    confidence=0.0,
                    language=detected_language
                ))
                sentiment_counts["neutral"] += 1
        
        # Calculate overall percentages
        total_reviews = len(input_data.reviews)
        overall = {
            "positive": round((sentiment_counts["positive"] / total_reviews) * 100) if total_reviews > 0 else 0,
            "negative": round((sentiment_counts["negative"] / total_reviews) * 100) if total_reviews > 0 else 0,
            "neutral": round((sentiment_counts["neutral"] / total_reviews) * 100) if total_reviews > 0 else 0
        }
        
        # Convert languages set to sorted list
        languages_list = sorted(list(languages_detected))
        
        return AnalysisResponse(
            reviews=results, 
            overall=overall,
            languages_detected=languages_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_reviews: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")