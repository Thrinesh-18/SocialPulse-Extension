# Verdiqt — Complete Project Explanation

## What is Verdiqt?

Verdiqt is a **Chrome browser extension** that analyzes the sentiment of text on any webpage in real time. You visit a website — say Amazon reviews, Reddit posts, or a news article — click the purple **"V"** button, and Verdiqt tells you whether the content is **positive**, **negative**, or **neutral**, along with the language it's written in.

It works for **100+ languages**, including English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, and many more.

---

## How the Project is Structured

```
Verdiqt/
├── verdiqt/
│   ├── backend/          ← Python server (the brain)
│   │   ├── main.py       ← FastAPI app with sentiment analysis logic
│   │   └── requirements.txt
│   └── extension/        ← Chrome extension (the face)
│       ├── manifest.json ← Extension config
│       ├── content.js    ← Runs on every webpage, scrapes text
│       ├── sidebar.html  ← The panel that shows results
│       ├── sidebar.js    ← Sends text to backend, displays results
│       └── popup.html    ← Small popup when you click the extension icon
```

There are two main parts:

1. **The Chrome Extension** — lives in your browser, grabs text from the page, shows results
2. **The Python Backend** — runs locally on your machine, does the actual AI analysis

---

## How It Works — Step by Step

```
User visits a webpage
        ↓
Chrome extension (content.js) scrapes text from the page
        ↓
User clicks the "V" button → sidebar opens
        ↓
sidebar.js sends the text to http://localhost:8000/analyze
        ↓
Python backend (FastAPI) receives the text
        ↓
langdetect figures out what language each piece of text is in
        ↓
The AI model (XLM-RoBERTa) classifies each text as positive / negative / neutral
        ↓
Results sent back to the extension
        ↓
Sidebar shows sentiment percentages + colored badges on the page
```

---

## The AI Model — The Core of Verdiqt

### Which model is used?

Verdiqt uses **`cardiffnlp/twitter-xlm-roberta-base-sentiment`**, created by researchers at Cardiff NLP (Cardiff University, UK).

This model is loaded using HuggingFace's `transformers` library with a single line:

```python
sentiment_pipeline = pipeline(
    "text-classification",
    model="cardiffnlp/twitter-xlm-roberta-base-sentiment"
)
```

---

## Understanding the Model — From Scratch

### Step 1: What is XLM-RoBERTa? (The Base)

Before understanding the sentiment model, you need to understand what it's built on.

**XLM-RoBERTa** (Cross-Lingual Language Model - Robustly Optimized BERT Approach) is a large language model created by **Facebook AI Research** in 2019. It is the multilingual version of RoBERTa, which itself is an improved version of BERT.

Think of it like this:
- **BERT** → learned to understand English text
- **RoBERTa** → same idea but trained better and longer
- **XLM-RoBERTa** → same idea but trained on **100 languages at once**

#### Architecture (what's inside the model)

XLM-RoBERTa-base has:
- **12 Transformer encoder layers** stacked on top of each other
- **768 hidden dimensions** (the size of internal representations)
- **12 attention heads** per layer (each head looks at different parts of the sentence)
- **3,072 feed-forward size** in each layer
- **~125 million parameters** total (numbers the model learned)
- A **SentencePiece tokenizer** with a vocabulary of 250,000 tokens covering 100 languages

The Transformer encoder is the key building block. It uses **self-attention** — a mechanism that lets every word in a sentence look at every other word to understand context. For example, in "The bank was steep", the word "bank" looks at "steep" to understand it means a riverbank, not a financial bank.

---

### Step 2: How Was XLM-RoBERTa Pre-trained?

#### Dataset used for pre-training

XLM-RoBERTa was pre-trained on **CommonCrawl data** — a massive collection of text scraped from the internet across 100 languages. The training corpus contains:

| Language Group | Approximate Size |
|---|---|
| Total data | ~2.5 TB of filtered text |
| Number of languages | 100 |
| English portion | ~55 GB |
| Other languages | Varying sizes |

#### Training method: Masked Language Modeling (MLM)

The model was trained using a technique called **Masked Language Modeling (MLM)**. Here's how it works in simple terms:

1. Take a sentence: `"The movie was really good"`
2. Randomly hide (mask) 15% of the words: `"The movie was [MASK] good"`
3. Ask the model to predict the hidden word
4. The model guesses: `"really"` ✓
5. If wrong, adjust the model's weights to do better next time
6. Repeat this billions of times across all 100 languages

This forces the model to deeply understand grammar, meaning, and context — because to predict a missing word correctly, you need to understand the whole sentence.

This is called **self-supervised learning** — no human labels are needed. The training data labels itself (the original word is the label).

---

### Step 3: Twitter-Specific Pre-training (XLM-T)

The base XLM-RoBERTa was then further pre-trained specifically on **Twitter data** by Cardiff NLP, creating **XLM-T** (XLM-Roberta for Twitter).

#### Dataset: ~198 Million Multilingual Tweets

The model was trained on approximately **198 million tweets** collected from Twitter across multiple languages. Tweets are very different from normal text:
- Short (max 280 characters)
- Informal language, slang, abbreviations
- Emojis, hashtags, @mentions
- Spelling mistakes and creative punctuation

By training on tweets specifically, the model learns the quirks of social media language — which is exactly the kind of text you find in product reviews, comments, and forum posts.

This step is called **domain-adaptive pre-training** — taking a general model and making it better at a specific domain (social media text) using the same MLM technique.

---

### Step 4: Sentiment Fine-tuning (The Final Step)

After the Twitter pre-training, the model was **fine-tuned** specifically for sentiment analysis.

#### What is fine-tuning?

Fine-tuning means taking a pre-trained model (which already understands language) and training it a little more on a specific task with labeled examples. It's like hiring someone who already speaks 10 languages and then giving them a short course on customer service.

#### Dataset: TweetEval Sentiment Benchmark

Fine-tuning was done using the **TweetEval benchmark** — a standardized dataset for evaluating Twitter NLP models. For sentiment specifically, it contains labeled tweets in **8 languages**:

| Language | Code |
|---|---|
| Arabic | Ar |
| English | En |
| French | Fr |
| German | De |
| Hindi | Hi |
| Italian | It |
| Spanish | Sp |
| Portuguese | Pt |

Each tweet in the dataset is labeled as one of three classes:
- **0 → Negative**
- **1 → Neutral**
- **2 → Positive**

#### How fine-tuning works

1. A small **classification head** (a simple neural network layer) is added on top of XLM-RoBERTa
2. The model reads a tweet and produces a vector (a list of numbers representing meaning)
3. The classification head converts that vector into 3 probability scores (one per sentiment)
4. The model's prediction is compared to the true label
5. The error (called **cross-entropy loss**) is calculated
6. **Backpropagation** adjusts the model's weights to reduce the error
7. This repeats over thousands of labeled examples until the model is accurate

#### Why does it work on more than 8 languages?

Even though fine-tuning only used 8 languages, the model works on 100+ languages. This is called **zero-shot cross-lingual transfer** — because XLM-RoBERTa learned a shared multilingual representation during pre-training, sentiment patterns learned in one language transfer to others automatically.

---

## The Three-Stage Training Pipeline (Summary)

```
Stage 1: XLM-RoBERTa Pre-training
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data:    CommonCrawl (2.5 TB, 100 languages)
Method:  Masked Language Modeling (MLM)
Goal:    Learn general language understanding
Output:  A model that understands 100 languages

         ↓

Stage 2: Twitter Domain Pre-training (XLM-T)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data:    ~198 million multilingual tweets
Method:  Masked Language Modeling (MLM) again
Goal:    Adapt to informal social media language
Output:  A model that understands tweets

         ↓

Stage 3: Sentiment Fine-tuning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data:    TweetEval benchmark (8 languages, labeled)
Method:  Supervised classification (cross-entropy loss)
Goal:    Classify text as positive / negative / neutral
Output:  cardiffnlp/twitter-xlm-roberta-base-sentiment ✅
```

---

## Language Detection — How Does Verdiqt Know the Language?

Verdiqt uses a separate Python library called **`langdetect`** (a port of Google's language detection library) to identify the language of each piece of text before sending it to the sentiment model.

It works by analyzing character patterns and n-grams (sequences of characters) and comparing them against statistical profiles of 55 languages. It's fast and lightweight — no neural network needed for this part.

```python
from langdetect import detect
detect("यह उत्पाद बहुत अच्छा है")  # Returns: "hi" (Hindi)
detect("This is great")             # Returns: "en" (English)
```

---

## The Backend API — How the Server Works

The backend is built with **FastAPI**, a modern Python web framework. It exposes three endpoints:

| Endpoint | Method | What it does |
|---|---|---|
| `/health` | GET | Check if server is running and model is loaded |
| `/test` | GET | Run a quick test with 3 sample sentences |
| `/analyze` | POST | Analyze a list of text inputs, return sentiments |

### Example request to `/analyze`:

```json
{
  "reviews": [
    "This product is amazing!",
    "Terrible quality, waste of money.",
    "यह ठीक है, कुछ खास नहीं।"
  ]
}
```

### Example response:

```json
{
  "reviews": [
    { "text": "This product is amazing!", "sentiment": "positive", "confidence": 93.8, "language": "English" },
    { "text": "Terrible quality, waste of money.", "sentiment": "negative", "confidence": 95.5, "language": "English" },
    { "text": "यह ठीक है, कुछ खास नहीं।", "sentiment": "neutral", "confidence": 61.2, "language": "Hindi" }
  ],
  "overall": { "positive": 33, "negative": 33, "neutral": 33 },
  "languages_detected": ["English", "Hindi"]
}
```

---

## The Chrome Extension — How It Talks to the Backend

The extension has **CORS** (Cross-Origin Resource Sharing) fully enabled on the backend, which allows the browser to make requests to `localhost:8000` from any webpage.

Flow:
1. `content.js` injects a floating "V" button into every webpage
2. When clicked, it creates an iframe that loads `sidebar.html`
3. `sidebar.js` scrapes text from the page (paragraphs, reviews, comments)
4. It sends a `POST` request to `http://localhost:8000/analyze`
5. Results come back and colored badges (🟢 positive, 🔴 negative, ⚪ neutral) are placed next to each piece of text

---

## Key Technologies Used

| Technology | Purpose |
|---|---|
| **XLM-RoBERTa** | Base multilingual transformer model |
| **HuggingFace Transformers** | Library to load and run the model |
| **FastAPI** | Python web framework for the backend API |
| **Uvicorn** | ASGI server that runs FastAPI |
| **langdetect** | Language identification |
| **PyTorch** | Deep learning framework that runs the model |
| **Chrome Extension (MV3)** | Browser integration |
| **SentencePiece** | Tokenizer for the multilingual model |

---

## What Verdiqt Does NOT Do

- It does **not train any model itself** — it uses a pre-trained model from HuggingFace
- It does **not send your data to any cloud** — everything runs locally on your machine
- It does **not require a GPU** — runs on CPU (slower but works fine)
- The model was trained by Cardiff NLP researchers, not by this project

---

## In Simple Words

> Verdiqt is like hiring a very smart multilingual reader who has read 198 million tweets and learned to tell if something sounds happy, sad, or neutral — in almost any language. You point it at a webpage, and it reads everything and gives you a quick emotional summary.

The "smart reader" is the XLM-RoBERTa model. The Chrome extension is the interface. The FastAPI server is the bridge between them.
