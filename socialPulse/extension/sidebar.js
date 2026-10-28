// JavaScript for Social Pulse extension sidebar functionality
console.log('Social Pulse sidebar loaded');

class SocialPulseSidebar {
    constructor() {
        console.log('Social Pulse: Initializing sidebar class...');
        
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            this.initialize();
        }, 100);
    }

    initialize() {
        console.log('Social Pulse: Finding sidebar elements...');
        
        this.sidebar = document.getElementById('social-pulse-sidebar');
        this.loadingSection = document.getElementById('loading-section');
        this.resultsSection = document.getElementById('results-section');
        this.errorSection = document.getElementById('error-section');
        this.reviewsList = document.getElementById('reviews-list');
        
        console.log('Social Pulse: Sidebar element:', !!this.sidebar);
        console.log('Social Pulse: Loading section:', !!this.loadingSection);
        
        if (!this.sidebar || !this.loadingSection) {
            console.error('Social Pulse: Sidebar elements not found! Retrying...');
            setTimeout(() => this.initialize(), 200);
            return;
        }
        
        this.initEventListeners();
        this.setupMessageListener();
        
        // Start analysis automatically when sidebar opens
        console.log('Social Pulse: Starting automatic analysis...');
        this.loadAndAnalyze();
    }

    initEventListeners() {
        console.log('Social Pulse: Setting up event listeners...');
        
        const closeBtn = document.getElementById('close-sidebar');
        const reanalyzeBtn = document.getElementById('reanalyze-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideSidebar();
            });
        }

        if (reanalyzeBtn) {
            reanalyzeBtn.addEventListener('click', () => {
                this.loadAndAnalyze();
            });
        }
    }

    setupMessageListener() {
        console.log('Social Pulse: Setting up message listener...');
        
        // Listen for messages from content script
        window.addEventListener("message", (event) => {
            if (event.data.source === "SOCIAL_PULSE_CONTENT") {
                console.log('Social Pulse: Received message from content:', event.data.action);
                
                if (event.data.action === "REVIEWS_DATA") {
                    this.handleReviewsData(event.data.reviews);
                }
            }
        });
    }

    showSection(sectionName) {
        console.log('Social Pulse: Showing section:', sectionName);
        
        // Hide all sections
        if (this.loadingSection) this.loadingSection.classList.add('hidden');
        if (this.resultsSection) this.resultsSection.classList.add('hidden');
        if (this.errorSection) this.errorSection.classList.add('hidden');

        // Show requested section
        switch(sectionName) {
            case 'loading':
                if (this.loadingSection) this.loadingSection.classList.remove('hidden');
                break;
            case 'results':
                if (this.resultsSection) this.resultsSection.classList.remove('hidden');
                break;
            case 'error':
                if (this.errorSection) this.errorSection.classList.remove('hidden');
                break;
        }
    }

    async loadAndAnalyze() {
        console.log('Social Pulse: Starting analysis...');
        this.showSection('loading');

        try {
            // Step 1: Request reviews from content script
            console.log('Social Pulse: Requesting reviews from content script...');
            await this.scrapeReviews();

        } catch (error) {
            console.error('Social Pulse: Analysis failed:', error);
            this.showError(error.message);
        }
    }

    async scrapeReviews() {
        return new Promise((resolve, reject) => {
            console.log('Social Pulse: Sending SCRAPE_REVIEWS message...');
            
            // Send message to content script to scrape reviews
            window.postMessage({ 
                source: "SOCIAL_PULSE_SIDEBAR", 
                action: "SCRAPE_REVIEWS" 
            }, "*");

            // Set timeout for response
            const timeout = setTimeout(() => {
                console.error('Social Pulse: Timeout waiting for reviews');
                reject(new Error('Timeout waiting for reviews. Make sure you are on a product page with reviews.'));
            }, 10000);

            // Store resolve/reject for use in message handler
            this.scrapePromise = { resolve, reject, timeout };
        });
    }

    async handleReviewsData(reviews) {
        try {
            console.log('Social Pulse: Handling reviews data...');
            console.log('Social Pulse: Current domain:', window.location.hostname);
            console.log('Social Pulse: User agent:', navigator.userAgent);
            
            // Clear timeout
            if (this.scrapePromise?.timeout) {
                clearTimeout(this.scrapePromise.timeout);
            }

            console.log(`Social Pulse: Found ${reviews.length} reviews`);
            
            if (!reviews || reviews.length === 0) {
                this.showError('No reviews found on this page. Make sure you are on a page with text content to analyze.');
                return;
            }

            // Log sample reviews for debugging
            console.log('Social Pulse: Sample reviews:', reviews.slice(0, 2).map(r => r.substring(0, 100) + '...'));

            // Step 2: Analyze reviews with backend
            console.log('Social Pulse: Calling backend...');
            const analysisResult = await this.analyzeReviews(reviews);
            
            console.log('Social Pulse: Got results:', analysisResult);
            
            // Step 3: Show results in sidebar
            this.displayResults(analysisResult);
            this.showSection('results');

            // Step 4: Send results to content script for badge injection
            console.log('Social Pulse: Sending badge injection message...');
            window.postMessage({
                source: "SOCIAL_PULSE_SIDEBAR",
                action: "INJECT_BADGES", 
                results: analysisResult.reviews
            }, "*");

            // Resolve the scrape promise
            if (this.scrapePromise?.resolve) {
                this.scrapePromise.resolve(reviews);
            }

        } catch (error) {
            console.error('Social Pulse: Error handling reviews data:', error);
            console.error('Social Pulse: Error occurred on domain:', window.location.hostname);
            this.showError(error.message);
            
            if (this.scrapePromise?.reject) {
                this.scrapePromise.reject(error);
            }
        }
    }

    async analyzeReviews(reviews) {
        // Create AbortController for 30 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            console.log('Social Pulse: Fetching from backend with', reviews.length, 'reviews');
            console.log('Social Pulse: Current URL:', window.location.href);
            console.log('Social Pulse: Current domain:', window.location.hostname);
            
            // Try multiple backend URLs in order of preference
            const backendUrls = [
                'http://localhost:8000',
                'http://127.0.0.1:8000',
                'http://0.0.0.0:8000'
            ];
            
            let workingUrl = null;
            
            // Test which backend URL works
            for (const url of backendUrls) {
                try {
                    console.log(`Social Pulse: Testing backend URL: ${url}`);
                    
                    const healthResponse = await fetch(`${url}/health`, {
                        method: 'GET',
                        mode: 'cors',
                        credentials: 'omit',
                        signal: controller.signal
                    });
                    
                    if (healthResponse.ok) {
                        workingUrl = url;
                        console.log(`Social Pulse: Found working backend URL: ${url}`);
                        break;
                    }
                } catch (e) {
                    console.log(`Social Pulse: Backend URL ${url} failed:`, e.message);
                    continue;
                }
            }
            
            if (!workingUrl) {
                throw new Error('Cannot connect to backend on any URL. Make sure backend is running: cd backend && uvicorn main:app --reload');
            }
            
            console.log('Social Pulse: Backend health check passed, proceeding with analysis...');
            
            const response = await fetch(`${workingUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reviews }),
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Social Pulse: Backend error response:', errorText);
                throw new Error(`Backend returned error (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('Social Pulse: Backend response:', result);
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Social Pulse: Backend error:', error);
            console.error('Social Pulse: Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                const domain = window.location.hostname;
                if (domain.includes('reddit.com') || domain.includes('flipkart.com') || domain.includes('facebook.com')) {
                    throw new Error(`${domain} is blocking the connection to backend. This is a security restriction. Try using the extension on Amazon or other sites.`);
                } else {
                    throw new Error('Cannot connect to backend. Make sure Social Pulse backend is running: cd backend && uvicorn main:app --reload');
                }
            }
            if (error.message.includes('CORS')) {
                throw new Error('CORS error. Backend is running but browser is blocking the request.');
            }
            throw error;
        }
    }

    displayResults(data) {
        console.log('Social Pulse: Displaying results...');
        
        // Update overall stats
        const positivePercent = document.getElementById('positive-percent');
        const negativePercent = document.getElementById('negative-percent');
        const neutralPercent = document.getElementById('neutral-percent');
        
        if (positivePercent) positivePercent.textContent = `${data.overall.positive}%`;
        if (negativePercent) negativePercent.textContent = `${data.overall.negative}%`;
        if (neutralPercent) neutralPercent.textContent = `${data.overall.neutral}%`;

        // Show summary message with language information
        if (this.reviewsList) {
            const languagesList = data.languages_detected || [];
            const languageBadges = languagesList.map(lang => 
                `<span class="language-pill">🌐 ${lang}</span>`
            ).join('');
            
            this.reviewsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #CBD5E0;">
                    <p style="font-size: 16px; margin-bottom: 10px;">✅ Analysis Complete!</p>
                    <p style="font-size: 14px; margin-bottom: 15px;">Analyzed ${data.reviews.length} reviews</p>
                    
                    ${languagesList.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <p style="font-size: 12px; margin-bottom: 8px; opacity: 0.8;">Languages Detected:</p>
                            <div class="languages-container">
                                ${languageBadges}
                            </div>
                        </div>
                    ` : ''}
                    
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">Sentiment badges are now visible beside each review on the page</p>
                </div>
            `;
        }
    }

    renderReviews(reviews) {
        console.log('Social Pulse: Rendering', reviews.length, 'reviews');
        
        if (!this.reviewsList) {
            console.error('Social Pulse: Reviews list element not found');
            return;
        }
        
        this.reviewsList.innerHTML = '';

        reviews.forEach(review => {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';

            const sentimentIcon = this.getSentimentIcon(review.sentiment);
            const sentimentText = review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1);

            reviewCard.innerHTML = `
                <div class="review-header">
                    <span class="sentiment-badge ${review.sentiment}">
                        ${sentimentIcon} ${sentimentText}
                    </span>
                </div>
                <div class="review-text">${review.text.substring(0, 200)}${review.text.length > 200 ? '...' : ''}</div>
                <div class="confidence">Confidence: ${review.confidence}%</div>
            `;

            this.reviewsList.appendChild(reviewCard);
        });
        
        console.log('Social Pulse: Reviews rendered successfully');
    }

    getSentimentIcon(sentiment) {
        switch(sentiment) {
            case 'positive': return '✅';
            case 'negative': return '❌';
            case 'neutral': return '😐';
            default: return '😐';
        }
    }

    showError(message) {
        console.log('Social Pulse: Showing error:', message);
        
        const errorText = document.getElementById('error-text');
        if (errorText) {
            // Add retry button for connection errors
            if (message.includes('Cannot connect') || message.includes('CORS')) {
                errorText.innerHTML = `
                    <div style="text-align: center; padding: 10px;">
                        <p style="margin-bottom: 15px; color: #EF4444; font-size: 14px;">${message}</p>
                        <button onclick="window.socialPulseSidebar.retryConnection()" style="
                            background: #22D3EE !important;
                            color: white !important;
                            border: none !important;
                            padding: 10px 20px !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                            font-size: 13px !important;
                            margin-right: 10px !important;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                            font-weight: 500 !important;
                        ">🔄 Retry Connection</button>
                        <button onclick="window.socialPulseSidebar.testBackend()" style="
                            background: #22C55E !important;
                            color: white !important;
                            border: none !important;
                            padding: 10px 20px !important;
                            border-radius: 6px !important;
                            cursor: pointer !important;
                            font-size: 13px !important;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                            font-weight: 500 !important;
                        ">🧪 Test Backend</button>
                    </div>
                `;
            } else {
                errorText.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 10px;">${message}</p>`;
            }
        }
        this.showSection('error');
    }

    async retryConnection() {
        console.log('Social Pulse: Retrying connection...');
        this.loadAndAnalyze();
    }

    async testBackend() {
        console.log('Social Pulse: Testing backend directly...');
        try {
            const response = await fetch('http://localhost:8000/health');
            const data = await response.json();
            alert(`Backend Test Result:\n${JSON.stringify(data, null, 2)}`);
        } catch (error) {
            alert(`Backend Test Failed:\n${error.message}`);
        }
    }

    hideSidebar() {
        console.log('Social Pulse: Hiding sidebar');
        
        if (this.sidebar) {
            this.sidebar.classList.remove('visible');
        }
        
        // Send message to content script to hide sidebar
        window.postMessage({
            source: "SOCIAL_PULSE_SIDEBAR",
            action: "HIDE_SIDEBAR"
        }, "*");
    }

    showSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.add('visible');
        }
    }
}

// Initialize sidebar immediately (not waiting for DOMContentLoaded)
console.log('Social Pulse: Creating sidebar instance...');
window.socialPulseSidebar = new SocialPulseSidebar();