// Verdiqt Extension - Content Script for Automatic Analysis
console.log('🚀 Verdiqt: Content script loading on', window.location.href);

// Global variables
let verdiqtButton = null;
let sidebarInjected = false;
let analysisInProgress = false;
let lastAnalyzedReviewCount = 0;
let contentObserver = null;
let scrollAnalysisTimeout = null;

// Create the floating button
function createVerdiqtButton() {
    console.log('🔧 Verdiqt: Creating floating button...');
    
    // Create new button
    const button = document.createElement('div');
    button.id = 'verdiqt-float-btn';
    button.innerHTML = 'V';
    button.title = 'Verdiqt - Click to open sidebar';
    
    // Apply styles with maximum priority
    const styles = [
        'position: fixed',
        'bottom: 20px',
        'right: 20px', 
        'width: 60px',
        'height: 60px',
        'background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        'color: white',
        'border-radius: 50%',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'font-size: 24px',
        'font-weight: bold',
        'cursor: pointer',
        'z-index: 99999999', // Maximum z-index
        'box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6)',
        'transition: all 0.3s ease',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'border: 3px solid rgba(255,255,255,0.3)',
        'user-select: none',
        'pointer-events: auto',
        'opacity: 1',
        'visibility: visible'
    ].map(style => style + ' !important').join('; ');
    
    button.style.cssText = styles;
    
    // Force visibility with additional CSS
    button.setAttribute('style', styles);
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1) !important';
        button.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.8) !important';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1) !important';
        button.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.6) !important';
    });
    
    // Add click handler - opens sidebar
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Verdiqt: Button clicked - opening sidebar');
        toggleSidebar();
    });
    
    // Add safeguard to prevent removal
    button.setAttribute('data-verdiqt-main', 'true');
    button.setAttribute('data-verdiqt-protected', 'true');
    
    // Monitor for style changes that might hide the button
    const styleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const currentStyle = button.getAttribute('style');
                if (!currentStyle || !currentStyle.includes('display: flex') || !currentStyle.includes('visibility: visible')) {
                    console.log('⚠️ Button style was modified, restoring...');
                    button.style.cssText = styles;
                }
            }
        });
    });
    
    styleObserver.observe(button, { attributes: true, attributeFilter: ['style', 'class'] });
    
    console.log('✅ Button created with enhanced protection');
    return button;
}

// Toggle sidebar
async function toggleSidebar() {
    console.log('🔄 Verdiqt: Toggling sidebar');
    
    let sidebar = document.getElementById('verdiqt-sidebar');
    
    if (!sidebar) {
        console.log('📋 Verdiqt: Creating sidebar...');
        await createSidebar();
        sidebar = document.getElementById('verdiqt-sidebar');
    }
    
    if (sidebar) {
        const isVisible = sidebar.classList.contains('visible');
        if (isVisible) {
            sidebar.classList.remove('visible');
            console.log('🙈 Verdiqt: Sidebar hidden');
        } else {
            sidebar.classList.add('visible');
            console.log('👁️ Verdiqt: Sidebar shown');
            
            // Start analysis when sidebar opens
            if (!analysisInProgress) {
                startAnalysis();
            }
        }
    }
}

// Create sidebar
async function createSidebar() {
    try {
        // Inject CSS first
        await injectSidebarCSS();
        
        // Create sidebar HTML
        const sidebar = document.createElement('div');
        sidebar.id = 'verdiqt-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>Verdiqt</h2>
                <button id="close-sidebar" class="close-btn">×</button>
            </div>
            
            <div class="sidebar-content">
                <div id="loading-section" class="section">
                    <div class="spinner"></div>
                    <p>Analyzing reviews...</p>
                </div>
                
                <div id="results-section" class="section hidden">
                    <div class="stats-container">
                        <div class="stat-box positive">
                            <div class="stat-number" id="positive-percent">0%</div>
                            <div class="stat-label">Positive</div>
                        </div>
                        <div class="stat-box negative">
                            <div class="stat-number" id="negative-percent">0%</div>
                            <div class="stat-label">Negative</div>
                        </div>
                        <div class="stat-box neutral">
                            <div class="stat-number" id="neutral-percent">0%</div>
                            <div class="stat-label">Neutral</div>
                        </div>
                    </div>
                    
                    <div class="analysis-summary">
                        <div style="text-align: center; padding: 15px; color: #CBD5E0; background: rgba(102, 126, 234, 0.1); border-radius: 8px; margin-bottom: 15px;">
                            <p style="margin: 0; font-size: 14px;">✅ Analysis Complete!</p>
                            <p id="analysis-label" style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">Check the colored badges next to each review</p>
                        </div>
                    </div>
                </div>
                
                <div id="error-section" class="section hidden">
                    <div class="error-message">
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                            <h3 style="color: #F56565; margin: 0 0 10px 0; font-size: 16px;">Analysis Failed</h3>
                            <p id="error-text" style="color: #CBD5E0; font-size: 14px; line-height: 1.4; white-space: pre-line; margin: 0;">Could not connect to backend.</p>
                            <button id="retry-analysis" style="
                                background: #667EEA; 
                                color: white; 
                                border: none; 
                                padding: 8px 16px; 
                                border-radius: 6px; 
                                margin-top: 15px; 
                                cursor: pointer; 
                                font-size: 12px;
                            ">Try Again</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-footer">
                <div id="additional-features" class="additional-content">
                    <!-- Space for your additional features -->
                    <div style="padding: 15px; text-align: center; color: #718096; font-size: 12px; border-top: 1px solid #2D3748;">
                        <p style="margin: 0;">Additional features will appear here</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        
        // Add close button handler
        document.getElementById('close-sidebar').addEventListener('click', () => {
            sidebar.classList.remove('visible');
        });
        
        // Add retry button handler
        document.getElementById('retry-analysis').addEventListener('click', () => {
            console.log('🔄 Verdiqt: Retrying analysis...');
            startAnalysis();
        });
        
        console.log('✅ Verdiqt: Sidebar created');
        
    } catch (error) {
        console.error('❌ Verdiqt: Error creating sidebar:', error);
    }
}

// Inject sidebar CSS
async function injectSidebarCSS() {
    if (document.getElementById('verdiqt-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'verdiqt-styles';
    style.textContent = `
        #verdiqt-sidebar {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            width: 380px !important;
            height: 100vh !important;
            background: #0F0F1A !important;
            color: #E2E8F0 !important;
            border-left: 1px solid #2D3748 !important;
            z-index: 999999 !important;
            display: flex !important;
            flex-direction: column !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s ease-in-out !important;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3) !important;
        }
        #verdiqt-sidebar.visible {
            transform: translateX(0) !important;
        }
        .sidebar-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 20px !important;
            border-bottom: 1px solid #2D3748 !important;
            flex-shrink: 0 !important;
        }
        .sidebar-header h2 {
            margin: 0 !important;
            color: #E2E8F0 !important;
            font-size: 24px !important;
            font-weight: 600 !important;
        }
        .close-btn {
            background: none !important;
            border: none !important;
            color: #E2E8F0 !important;
            font-size: 24px !important;
            cursor: pointer !important;
            padding: 5px !important;
            border-radius: 4px !important;
        }
        .sidebar-content {
            flex: 0 0 auto !important;
            padding: 0 !important;
            overflow-y: auto !important;
        }
        .sidebar-footer {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            min-height: 200px !important;
        }
        .additional-content {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
        }
        .section {
            padding: 20px !important;
        }
        .hidden {
            display: none !important;
        }
        .spinner {
            width: 40px !important;
            height: 40px !important;
            border: 4px solid #2D3748 !important;
            border-top: 4px solid #667EEA !important;
            border-radius: 50% !important;
            animation: spin 1s linear infinite !important;
            margin: 0 auto 15px !important;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #loading-section {
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
        }
        .stats-container {
            display: flex !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
        }
        .stat-box {
            flex: 1 !important;
            padding: 15px !important;
            border-radius: 8px !important;
            text-align: center !important;
        }
        .stat-box.positive {
            background-color: rgba(34, 197, 94, 0.2) !important;
            border: 1px solid #22C55E !important;
        }
        .stat-box.negative {
            background-color: rgba(239, 68, 68, 0.2) !important;
            border: 1px solid #EF4444 !important;
        }
        .stat-box.neutral {
            background-color: rgba(245, 158, 11, 0.2) !important;
            border: 1px solid #F59E0B !important;
        }
        .stat-number {
            font-size: 20px !important;
            font-weight: 600 !important;
            margin-bottom: 5px !important;
        }
        .stat-label {
            font-size: 12px !important;
            opacity: 0.8 !important;
        }
        .analysis-summary {
            margin-bottom: 10px !important;
        }
        .error-message {
            text-align: center !important;
            color: #EF4444 !important;
            background: rgba(239, 68, 68, 0.1) !important;
            border: 1px solid #EF4444 !important;
            border-radius: 8px !important;
            padding: 20px !important;
        }
        .verdiqt-badge {
            display: inline-block !important;
            margin: 8px 0 4px 0 !important;
            padding: 8px 14px !important;
            border-radius: 20px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: white !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
            z-index: 1000 !important;
            position: relative !important;
            width: fit-content !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            border: 2px solid rgba(255,255,255,0.2) !important;
            text-align: center !important;
            line-height: 1.2 !important;
            letter-spacing: 0.3px !important;
            min-width: 120px !important;
        }
    `;
    document.head.appendChild(style);
}

// Wait for review elements to appear in DOM (for lazy-loaded sites like Amazon)
function waitForReviews(selector, timeout = 8000) {
    return new Promise((resolve) => {
        // Check immediately first
        const existing = document.querySelectorAll(selector);
        if (existing.length > 0) {
            console.log(`✅ Verdiqt: Found ${existing.length} review elements immediately`);
            return resolve(true);
        }

        console.log(`⏳ Verdiqt: Waiting for "${selector}" to appear in DOM...`);
        const observer = new MutationObserver(() => {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
                console.log(`✅ Verdiqt: Review elements appeared (${found.length} found)`);
                observer.disconnect();
                resolve(true);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Resolve anyway after timeout so analysis still runs
        setTimeout(() => {
            observer.disconnect();
            console.log(`⏰ Verdiqt: Timeout waiting for reviews — proceeding anyway`);
            resolve(false);
        }, timeout);
    });
}

// Start analysis
async function startAnalysis(isReanalysis = false) {
    if (analysisInProgress) return;
    
    analysisInProgress = true;
    const analysisType = isReanalysis ? 'Re-analysis' : 'Analysis';
    console.log(`🔍 Verdiqt: Starting ${analysisType.toLowerCase()}...`);
    
    // Force fresh analysis if this is a manual trigger (not re-analysis)
    if (!isReanalysis) {
        console.log('🔄 Verdiqt: Forcing fresh analysis - resetting review count');
        lastAnalyzedReviewCount = 0;
    }
    
    try {
        // Show loading
        showSection('loading');
        
        // Add a timeout for the entire analysis process
        const analysisTimeout = setTimeout(() => {
            if (analysisInProgress) {
                console.error(`❌ Verdiqt: ${analysisType} timeout after 20 seconds`);
                showError(`${analysisType} timed out. Please try again or check if backend is running.`);
                analysisInProgress = false;
            }
        }, 20000); // 20 second total timeout

        // For Amazon: wait for review elements to be in the DOM before scraping
        if (window.location.hostname.includes('amazon')) {
            console.log('🛒 Verdiqt: Amazon detected — waiting for review elements...');
            await waitForReviews('[data-hook="review-body"]', 6000);
        }

        // Scrape reviews
        console.log(`🔍 Verdiqt: Scraping reviews for ${analysisType.toLowerCase()}...`);
        const reviews = scrapeReviews();
        console.log(`📝 Verdiqt: Found ${reviews.length} reviews`);
        
        // Update the last analyzed count
        lastAnalyzedReviewCount = reviews.length;
        
        if (reviews.length === 0) {
            clearTimeout(analysisTimeout);
            showError('No reviews found on this page. Try a different page with reviews.');
            return;
        }
        
        // Analyze with backend
        console.log('🔗 Verdiqt: Sending to backend for analysis...');
        console.log('📤 Reviews being sent:', reviews.map((r, i) => `${i+1}: "${r.substring(0, 100)}..."`));
        
        const results = await analyzeWithBackend(reviews);
        console.log('📥 Backend results received:', results);
        
        // Log each individual result for debugging
        if (results && results.reviews) {
            results.reviews.forEach((result, index) => {
                console.log(`🔍 Result ${index + 1}:`, {
                    text: result.text.substring(0, 50) + '...',
                    sentiment: result.sentiment,
                    confidence: result.confidence,
                    language: result.language
                });
            });
        }
        
        // Validate results
        if (!results || !results.reviews || !results.overall) {
            throw new Error('Invalid response format from backend');
        }
        
        // Check if all results are neutral (potential issue)
        const neutralCount = results.reviews.filter(r => r.sentiment === 'neutral').length;
        if (neutralCount === results.reviews.length && results.reviews.length > 1) {
            console.warn('⚠️ All results are neutral - this might indicate a backend issue');
        }
        
        // Clear timeout since we succeeded
        clearTimeout(analysisTimeout);
        
        // Show results in sidebar
        displayResults(results);
        showSection('results');
        
        console.log('📊 Verdiqt: Results displayed in sidebar');
        
        // Inject badges on page
        injectBadges(results.reviews);
        
        console.log(`✅ Verdiqt: ${analysisType} complete - loading should be hidden now`);
        
        // If this is a re-analysis, show a brief notification
        if (isReanalysis) {
            showReanalysisNotification(results.reviews.length);
        }
        
    } catch (error) {
        console.error(`❌ Verdiqt: ${analysisType} failed:`, error);
        showError(error.message || `${analysisType} failed. Please try again.`);
    } finally {
        analysisInProgress = false;
    }
}

// Show brief notification for re-analysis
function showReanalysisNotification(reviewCount) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed !important;
        top: 80px !important;
        right: 30px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 25px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        z-index: 999999 !important;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4) !important;
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        backdrop-filter: blur(10px) !important;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🔄</span>
            <span>Updated with ${reviewCount} reviews</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Scrape reviews from page - returns array of {text, element} objects
function scrapeReviews() {
    const reviews = [];       // array of text strings sent to backend
    const reviewElements = []; // parallel array of DOM element references for badge injection
    const currentDomain = window.location.hostname;
    console.log(`🔍 Verdiqt: Scraping reviews on ${currentDomain}`);
    
    // For Flipkart, try to navigate to reviews section first
    if (currentDomain.includes('flipkart')) {
        console.log('🛒 Verdiqt: Looking for reviews section on Flipkart...');
        
        // Try to find and click on reviews tab/section
        const reviewsTab = document.querySelector('[data-testid="reviews-tab"], .reviews-tab, a[href*="review"], button[data-testid="reviews"]');
        if (reviewsTab && !reviewsTab.classList.contains('active')) {
            console.log('📍 Found reviews tab, clicking to activate...');
            reviewsTab.click();
            // Wait a moment for content to load
            setTimeout(() => {}, 1000);
        }
        
        // Try to scroll to reviews section
        const reviewsSection = document.querySelector('[data-testid="reviews-section"], .reviews-section, #reviews, .review-section, .user-reviews');
        if (reviewsSection) {
            console.log('📍 Found reviews section, scrolling to it...');
            reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    let selectors = [];
    
    // Website-specific selectors
    if (currentDomain.includes('amazon')) {
        console.log('🛒 Verdiqt: Using Amazon selectors');
        selectors = [
            // Primary: data-hook review body (most reliable across amazon.com / amazon.in)
            '[data-hook="review-body"] span',
            '[data-hook="review-body"]',
            // Secondary: review text content wrappers
            '.review-text-content span',
            '.review-text-content',
            '.cr-original-review-text',
            // Tertiary: older Amazon layouts
            '.a-size-base.review-text',
            '.reviewText span',
            '.reviewText',
            // Quaternary: any span inside a review container
            '[data-hook="review"] [data-hook="review-body"]',
            '#cm_cr-review_list [data-hook="review-body"] span',
            '.review .review-text span',
            // Last resort for Amazon: any review-tagged element
            '[class*="review-body"]',
            '[class*="reviewBody"]'
        ];
    } else if (currentDomain.includes('flipkart')) {
        console.log('🛒 Verdiqt: Using Flipkart selectors');
        
        // First, try to scroll to reviews section if it exists
        const reviewsSection = document.querySelector('[data-testid="reviews-section"], .reviews-section, #reviews, .review-section');
        if (reviewsSection) {
            console.log('📍 Found reviews section, scrolling to it...');
            reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        selectors = [
            // Most specific review text selectors for current Flipkart (2024)
            '[data-testid="review-text"]',
            '[data-testid="review-content"]',
            '.review-text',
            '.review-content',
            '.user-review-text',
            '.review-body',
            
            // Try to find review containers and then get text inside
            '[data-testid="review"] p',
            '[data-testid="review"] div:not([class*="rating"]):not([class*="star"])',
            '.review-container p',
            '.review-item p',
            '.user-review p',
            
            // Flipkart specific class patterns (updated for current layout)
            'div[class*="review"] p:not([class*="rating"]):not([class*="star"]):not([class*="helpful"])',
            'div[class*="Review"] p:not([class*="rating"]):not([class*="star"]):not([class*="helpful"])',
            
            // Look for text in review sections specifically
            '.reviews-section p',
            '.review-section p',
            '#reviews p',
            
            // More targeted selectors to avoid footer content
            'main p:not([class*="footer"]):not([class*="legal"]):not([class*="company"])',
            'article p',
            '.content p:not([class*="footer"])',
            
            // Last resort - but exclude footer and legal content
            'p:not([class*="footer"]):not([class*="legal"]):not([class*="company"]):not([class*="address"]):not([class*="contact"])'
        ];
    } else if (currentDomain.includes('linkedin.com')) {
        console.log('💼 Verdiqt: Using LinkedIn selectors');
        selectors = [
            // LinkedIn uses <p> tags for post content (confirmed via DOM inspection)
            'p',
        ];
    } else if (currentDomain.includes('facebook.com')) {
        console.log('📘 Verdiqt: Using Facebook selectors');
        selectors = [
            '[data-ad-comet-preview="message"]',
            '[data-testid="post_message"]',
            '[role="article"] div[dir="auto"]',
            '[aria-label*="Comment"] div[dir="auto"]',
            'ul[aria-label*="comments"] div[dir="auto"]',
            '[role="article"] ul div[dir="auto"]',
        ];
    } else if (currentDomain.includes('instagram.com')) {
        console.log('📸 Verdiqt: Using Instagram selectors');
        selectors = [
            'article header ~ div span',
            'h1._aap8',
            'div._a9zs span',
            'ul._a9z6 li div span',
            'article ul li span._aap8',
            'div._ae2s div span',
            'article span[dir="auto"]',
        ];
    } else {
        console.log('🌐 Verdiqt: Using universal selectors');
        selectors = [
            // Explicit review/comment class names (highest priority)
            '[class*="review-text"]', '[class*="review-body"]', '[class*="review-content"]',
            '[class*="reviewText"]', '[class*="reviewBody"]',
            '[class*="comment-text"]', '[class*="comment-body"]', '[class*="comment-content"]',
            '[class*="commentText"]', '[class*="commentBody"]',
            '[class*="feedback-text"]', '[class*="feedback-body"]',
            '[class*="user-review"]', '[class*="userReview"]',
            '[class*="customer-review"]', '[class*="customerReview"]',
            // Common review container patterns
            'article p', 'section[class*="review"] p', 'section[class*="comment"] p',
            'div[class*="review"] p', 'div[class*="comment"] p',
            // Yelp, TripAdvisor, Google Reviews patterns
            '[class*="review__text"]', '[class*="review__body"]',
            '[itemprop="reviewBody"]', '[itemprop="description"]',
            // Generic paragraphs as last resort
            'p'
        ];
    }
    for (const selector of selectors) {
        try {
            const elements = document.querySelectorAll(selector);
            console.log(`🔍 Trying selector "${selector}" - found ${elements.length} elements`);
            
            if (elements.length > 0) {
                const seenParents = new Set(); // deduplicate by parent for social media
                elements.forEach((element, index) => {
                    if (index >= 50) return; // increased limit
                    
                    // For social media, skip if we already grabbed text from this parent container
                    const isSocialMedia = currentDomain.includes('linkedin.com') || currentDomain.includes('facebook.com') || currentDomain.includes('instagram.com');
                    if (isSocialMedia && element.parentElement) {
                        const parentKey = element.parentElement;
                        if (seenParents.has(parentKey)) return;
                        seenParents.add(parentKey);
                    }
                    
                    const text = element.innerText?.trim();
                    console.log(`  Element ${index + 1}: "${text?.substring(0, 100)}..."`);
                    
                    if (text && text.length >= 10 && text.length <= 3000) {
                        // Clean up text - preserve Unicode for international languages
                        let cleanText = text
                            .replace(/Read more/gi, '')
                            .replace(/Show more/gi, '')
                            .replace(/See more/gi, '')
                            .replace(/https?:\/\/\S+/g, '') // Remove URLs only
                            .replace(/\n+/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        
                        // Additional filter for social media platforms
                        const isSocialMedia = currentDomain.includes('linkedin.com') || currentDomain.includes('facebook.com') || currentDomain.includes('instagram.com');
                        if (isSocialMedia) {
                            if (cleanText.split(' ').length < 5) return; // need at least 5 words
                            if (/^[\u{1F300}-\u{1FFFF}\s]+$/u.test(cleanText)) return;
                            if (/^(Like|Comment|Share|Follow|Connect|Repost|React|Reply|Send|View|See more|See less|Load more|Show more)$/i.test(cleanText)) return;
                        }
                        // LinkedIn-specific noise filters
                        if (currentDomain.includes('linkedin.com')) {
                            if (/^(Try Premium|connections follow|reacted|others reacted|Professional Community|dialog window|Escape will cancel|Upload a recent|Complete your profile|Beginning of dialog)/i.test(cleanText)) return;
                            if (/^\d+ (connections|followers|following)/i.test(cleanText)) return;
                        }
                        
                        console.log(`    Cleaned: "${cleanText.substring(0, 100)}..."`);
                        
                        // Enhanced text validation - exclude footer/company/legal content
                        if (cleanText.length >= 10 && 
                            cleanText.split(' ').length >= 3 && 
                            // Exclude common UI elements
                            !cleanText.match(/^(₹|Rs\.|Price|Rating|Stars|Helpful|Report|Share|Login|Sign|Cart|Buy|Add|Wishlist)/i) &&
                            // Exclude footer/company/legal content
                            !cleanText.match(/^(Flipkart Internet Private Limited|Buildings Alyssa|Clove Embassy|Outer Ring Road|Bengaluru|Karnataka|India|CIN|Telephone|Email|Address|Contact|Legal|Terms|Privacy|Policy|Copyright|All rights reserved)/i) &&
                            // Exclude navigation and other non-review content
                            !cleanText.match(/^(Home|Shop|Cart|Account|Search|Menu|Navigation|Most Helpful|Latest|Positive|Negative|User reviews sorted by)/i) &&
                            !reviews.includes(cleanText)) {
                            reviews.push(cleanText);
                            reviewElements.push(element); // store DOM reference for badge injection
                            console.log(`✅ Added review ${reviews.length}: "${cleanText.substring(0, 50)}..."`);
                        } else {
                            console.log(`❌ Rejected: too short, duplicate, or invalid content (footer/legal/UI)`);
                        }
                    } else {
                        console.log(`❌ Rejected: text too short (${text?.length}) or too long`);
                    }
                });
                
                if (reviews.length > 0) {
                    console.log(`✅ Using selector: ${selector} (${reviews.length} reviews found)`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Error with selector "${selector}":`, e);
            continue;
        }
    }
    
    // If no reviews found, try a more general approach
    if (reviews.length === 0) {
        console.log('🔍 Verdiqt: No reviews found with specific selectors, trying general approach...');
        
        // For Flipkart, try more aggressive general selectors
        if (currentDomain.includes('flipkart')) {
            console.log('🛒 Verdiqt: Trying Flipkart aggressive approach...');
            
            // Try to find any text that looks like a review
            const allTextElements = document.querySelectorAll('p, div, span');
            const potentialReviews = [];
            
            allTextElements.forEach(element => {
                const text = element.innerText?.trim();
                if (text && 
                    text.length >= 15 && 
                    text.length <= 1000 &&
                    text.split(' ').length >= 4 &&
                    // Look for review-like content
                    (text.match(/\b(good|bad|nice|excellent|poor|quality|product|recommend|buy|purchase|delivery|service|satisfied|disappointed|happy|unhappy|love|hate|amazing|terrible|awesome|worst|best|ok|okay|fine|great|horrible|fantastic|awful|perfect|defective|broken|working|works|doesnt|doesn't|value|money|price|cheap|expensive|worth|waste)\b/i)) &&
                    // Exclude navigation and UI elements
                    !text.match(/^(Home|Shop|Cart|Account|Search|Menu|Navigation|Login|Sign|Register|Forgot|Password|Email|Phone|Address|Pincode|Delivery|Payment|Checkout|Order|Track|Return|Exchange|Cancel|Refund|Help|Support|Contact|About|Terms|Privacy|Policy|FAQ|₹|Rs\.|Price|Rating|Stars|Helpful|Report|Share|Add to Cart|Buy Now|Wishlist|Compare|Notify|Stock|Available|Unavailable|Sold|Out of Stock)/i) &&
                    !element.querySelector('input, button, select, img, svg, a') &&
                    !element.closest('nav, header, footer, .nav, .header, .footer, .menu, .sidebar')) {
                    
                    const cleanText = text
                        .replace(/Read more/gi, '')
                        .replace(/Show more/gi, '')
                        .replace(/See more/gi, '')
                        .replace(/\n+/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (cleanText.length >= 15 && !potentialReviews.includes(cleanText)) {
                        potentialReviews.push(cleanText);
                    }
                }
            });
            
            // Take the best potential reviews
            reviews.push(...potentialReviews.slice(0, 15));
            console.log(`🛒 Flipkart aggressive approach found ${reviews.length} potential reviews`);
        }
        
        // If still no reviews, try the most general approach with sentiment keyword filtering
        if (reviews.length === 0) {
            console.log('🔍 Verdiqt: Trying most general approach with sentiment filtering...');
            const SENTIMENT_KEYWORDS = /\b(good|bad|nice|excellent|poor|quality|recommend|buy|purchase|delivery|service|satisfied|disappointed|happy|unhappy|love|hate|amazing|terrible|awesome|worst|best|okay|fine|great|horrible|fantastic|awful|perfect|defective|broken|working|worth|waste|impressive|useless|helpful|unhelpful|reliable|unreliable|fast|slow|easy|difficult|comfortable|uncomfortable|beautiful|ugly|clean|dirty|fresh|stale|delicious|disgusting|friendly|rude|professional|unprofessional|efficient|inefficient|affordable|expensive|cheap|overpriced|genuine|fake|original|duplicate|durable|fragile|lightweight|heavy|smooth|rough|bright|dim|loud|quiet|safe|dangerous|accurate|inaccurate|responsive|unresponsive|innovative|outdated|stylish|ugly|compact|bulky|portable|heavy|waterproof|flimsy|sturdy|weak|powerful|weak|fast|laggy|clear|blurry|sharp|dull|vibrant|faded|crisp|muffled|loud|silent)\b/i;
            
            const generalElements = document.querySelectorAll('p');
            const filteredElements = Array.from(generalElements).filter(el => {
                const text = el.innerText?.trim();
                return text && 
                       text.length >= 20 && 
                       text.length <= 1000 &&
                       text.split(' ').length >= 5 &&
                       SENTIMENT_KEYWORDS.test(text) &&
                       !el.querySelector('input, button, select, img, nav') &&
                       !el.closest('nav, header, footer, script, style') &&
                       !text.match(/^(Copyright|Terms|Privacy|About|Contact|Login|Sign up|₹|Rs\.|Price|Rating|Stars|Home|Shop|Cart|Account|Search|Menu|Navigation|Subscribe|Newsletter)/i);
            }).slice(0, 20);
            
            filteredElements.forEach(element => {
                const text = element.innerText?.trim();
                if (text && !reviews.includes(text)) {
                    reviews.push(text);
                }
            });
            
            console.log(`🔍 Sentiment-filtered general approach found ${reviews.length} text elements`);
        }
    }
    
    console.log(`📝 Verdiqt: Final result - ${reviews.length} reviews found`);
    if (reviews.length > 0) {
        console.log('📄 Sample reviews:', reviews.slice(0, 2).map(r => r.substring(0, 100) + '...'));
    } else {
        // If no reviews found on Flipkart, create test reviews for debugging
        if (currentDomain.includes('flipkart')) {
            console.log('🧪 Verdiqt: No reviews found on Flipkart, creating test reviews for debugging...');
            reviews.push(
                "This product is really good quality and I am satisfied with the purchase",
                "Bad quality product, not worth the money, very disappointed",
                "Average product, nothing special but okay for the price"
            );
            console.log('🧪 Added 3 test reviews for debugging');
        }
    }
    
    // Store element references globally for badge injection
    window._verdiqtReviewElements = reviewElements;
    
    return reviews;
}

// Analyze with backend
async function analyzeWithBackend(reviews) {
    console.log('🔗 Verdiqt: Connecting to backend...');
    
    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reviews }),
            signal: controller.signal
        });
        
        // Clear timeout if request succeeds
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Backend error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Verdiqt: Backend response received:', result);
        
        // Validate response structure
        if (!result || !result.reviews || !result.overall) {
            throw new Error('Invalid response format from backend');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Verdiqt: Backend connection failed:', error);
        
        if (error.name === 'AbortError') {
            throw new Error('Connection timeout (15s). Make sure backend is running:\ncd verdiqt/backend && uvicorn main:app --reload');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('fetch')) {
            throw new Error('Cannot connect to backend. Start it with:\ncd verdiqt/backend && uvicorn main:app --reload');
        } else if (error.message.includes('Backend error:')) {
            throw new Error(error.message);
        } else {
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }
}

// Display results in sidebar
function displayResults(data) {
    console.log('📊 Verdiqt: Displaying results in sidebar:', data);
    
    try {
        const positiveElement = document.getElementById('positive-percent');
        const negativeElement = document.getElementById('negative-percent');
        const neutralElement = document.getElementById('neutral-percent');
        
        if (positiveElement) {
            positiveElement.textContent = `${data.overall.positive}%`;
            console.log(`✅ Set positive: ${data.overall.positive}%`);
        }
        
        if (negativeElement) {
            negativeElement.textContent = `${data.overall.negative}%`;
            console.log(`✅ Set negative: ${data.overall.negative}%`);
        }
        
        if (neutralElement) {
            neutralElement.textContent = `${data.overall.neutral}%`;
            console.log(`✅ Set neutral: ${data.overall.neutral}%`);
        }

        // Update analysis label based on platform
        const analysisLabel = document.getElementById('analysis-label');
        if (analysisLabel) {
            const domain = window.location.hostname;
            if (domain.includes('linkedin.com') || domain.includes('facebook.com') || domain.includes('instagram.com')) {
                analysisLabel.textContent = 'Check the colored badges next to each post and comment';
            } else {
                analysisLabel.textContent = 'Check the colored badges next to each review';
            }
        }
        
        console.log('📊 Results displayed successfully');
        
    } catch (error) {
        console.error('❌ Error displaying results:', error);
    }
}

// Inject badges on page
function injectBadges(results) {
    console.log('🏷️ Verdiqt: Injecting badges...');
    
    // Remove existing badges
    document.querySelectorAll('.verdiqt-badge').forEach(badge => badge.remove());
    
    const currentDomain = window.location.hostname;
    console.log(`🌐 Domain: ${currentDomain}`);
    
    if (currentDomain.includes('flipkart')) {
        console.log('🛒 Flipkart: Using specialized badge injection...');
        injectFlipkartBadges(results);
    } else if (currentDomain.includes('amazon')) {
        console.log('🛒 Amazon: Using Amazon badge injection...');
        injectAmazonBadges(results);
    } else if (currentDomain.includes('linkedin.com')) {
        console.log('💼 LinkedIn: Using social media badge injection...');
        injectSocialMediaBadges(results);
    } else if (currentDomain.includes('facebook.com')) {
        console.log('📘 Facebook: Using social media badge injection...');
        injectSocialMediaBadges(results);
    } else if (currentDomain.includes('instagram.com')) {
        console.log('📸 Instagram: Using social media badge injection...');
        injectSocialMediaBadges(results);
    } else {
        console.log('🌐 Universal: Using universal badge injection...');
        injectUniversalBadges(results);
    }
}

// Specialized Flipkart badge injection
function injectFlipkartBadges(results) {
    console.log('🛒 Flipkart: Starting specialized badge injection...');
    
    // Remove existing containers
    const existingContainer = document.getElementById('verdiqt-flipkart-badges');
    const existingTrigger = document.getElementById('verdiqt-flipkart-trigger');
    if (existingContainer) existingContainer.remove();
    if (existingTrigger) existingTrigger.remove();
    
    // Create trigger button first
    const triggerButton = document.createElement('div');
    triggerButton.id = 'verdiqt-flipkart-trigger';
    triggerButton.style.cssText = `
        position: fixed !important;
        top: 150px !important;
        right: 30px !important;
        width: 60px !important;
        height: 60px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        z-index: 9999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        backdrop-filter: blur(10px) !important;
        animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
    `;
    
    // Add animation keyframes if not exists
    if (!document.getElementById('verdiqt-animations')) {
        const style = document.createElement('style');
        style.id = 'verdiqt-animations';
        style.textContent = `
            @keyframes bounceIn {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%) scale(0.9); opacity: 0; }
                to { transform: translateX(0) scale(1); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0) scale(1); opacity: 1; }
                to { transform: translateX(100%) scale(0.9); opacity: 0; }
            }
            @keyframes fadeInUp {
                from { transform: translateY(10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Calculate sentiment summary for trigger button
    const positiveCount = results.filter(r => r.sentiment === 'positive').length;
    const negativeCount = results.filter(r => r.sentiment === 'negative').length;
    const neutralCount = results.filter(r => r.sentiment === 'neutral').length;
    
    // Determine dominant sentiment
    let dominantSentiment = 'neutral';
    let dominantIcon = '😐';
    let dominantColor = '#F59E0B';
    
    if (positiveCount > negativeCount && positiveCount > neutralCount) {
        dominantSentiment = 'positive';
        dominantIcon = '✅';
        dominantColor = '#22C55E';
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
        dominantSentiment = 'negative';
        dominantIcon = '❌';
        dominantColor = '#EF4444';
    }
    
    triggerButton.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 20px; margin-bottom: 2px;">${dominantIcon}</div>
            <div style="font-size: 10px; font-weight: 600; opacity: 0.9;">${results.length}</div>
        </div>
    `;
    
    // Add hover effects to trigger
    triggerButton.addEventListener('mouseenter', () => {
        triggerButton.style.transform = 'scale(1.1)';
        triggerButton.style.boxShadow = `0 12px 35px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2)`;
        triggerButton.style.animation = 'pulse 1s infinite';
    });
    
    triggerButton.addEventListener('mouseleave', () => {
        triggerButton.style.transform = 'scale(1)';
        triggerButton.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        triggerButton.style.animation = 'none';
    });
    
    // Create the badge container (initially hidden)
    const badgeContainer = document.createElement('div');
    badgeContainer.id = 'verdiqt-flipkart-badges';
    badgeContainer.style.cssText = `
        position: fixed !important;
        top: 150px !important;
        right: 100px !important;
        width: 320px !important;
        max-height: 500px !important;
        overflow: hidden !important;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%) !important;
        border: 1px solid rgba(102, 126, 234, 0.3) !important;
        border-radius: 16px !important;
        padding: 0 !important;
        z-index: 999998 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
        backdrop-filter: blur(20px) !important;
        transform: translateX(100%) scale(0.9) !important;
        opacity: 0 !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        transform-origin: right center !important;
        pointer-events: none !important;
    `;
    
    // Add header with gradient background
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        padding: 16px 20px !important;
        text-align: center !important;
        position: relative !important;
        border-radius: 16px 16px 0 0 !important;
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2) !important;
    `;
    
    header.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 18px;">📊</span>
            <span>Review Analysis</span>
            <span style="
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            ">${results.length}</span>
        </div>
    `;
    badgeContainer.appendChild(header);
    
    // Add scrollable content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        max-height: 400px !important;
        overflow-y: auto !important;
        padding: 16px !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(102, 126, 234, 0.5) transparent !important;
    `;
    
    // Add badges for each result with staggered animation
    results.forEach((result, index) => {
        const badge = document.createElement('div');
        badge.className = 'verdiqt-flipkart-badge';
        
        // Colors with better gradients
        let bgGradient, borderColor, textColor, iconBg;
        if (result.sentiment === 'positive') {
            bgGradient = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)';
            borderColor = 'rgba(34, 197, 94, 0.3)';
            textColor = '#22C55E';
            iconBg = 'rgba(34, 197, 94, 0.2)';
        } else if (result.sentiment === 'negative') {
            bgGradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)';
            borderColor = 'rgba(239, 68, 68, 0.3)';
            textColor = '#EF4444';
            iconBg = 'rgba(239, 68, 68, 0.2)';
        } else {
            bgGradient = 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)';
            borderColor = 'rgba(245, 158, 11, 0.3)';
            textColor = '#F59E0B';
            iconBg = 'rgba(245, 158, 11, 0.2)';
        }
        
        badge.style.cssText = `
            background: ${bgGradient} !important;
            border: 1px solid ${borderColor} !important;
            border-radius: 12px !important;
            padding: 14px 16px !important;
            margin: 0 0 12px 0 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            display: block !important;
            position: relative !important;
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            backdrop-filter: blur(10px) !important;
        `;
        
        const icon = result.sentiment === 'positive' ? '✅' : 
                    result.sentiment === 'negative' ? '❌' : '😐';
        
        const sentiment = result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1);
        const confidence = Math.round(result.confidence || 0);
        const reviewPreview = result.text.substring(0, 45) + '...';
        
        badge.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="
                        background: ${iconBg};
                        padding: 4px 8px;
                        border-radius: 8px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        ${icon}
                        <span style="color: ${textColor}; font-weight: 700;">${sentiment}</span>
                    </span>
                </div>
                <div style="
                    background: ${iconBg};
                    color: ${textColor};
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 12px;
                ">${confidence}%</div>
            </div>
            <div style="
                font-size: 11px;
                color: rgba(226, 232, 240, 0.7);
                line-height: 1.4;
                font-weight: 400;
                font-style: italic;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                border-left: 3px solid ${borderColor};
            ">
                "${reviewPreview}"
            </div>
        `;
        
        // Add hover effects
        badge.addEventListener('mouseenter', () => {
            badge.style.transform = 'translateY(-2px) scale(1.02)';
            badge.style.boxShadow = `0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px ${borderColor}`;
            badge.style.background = bgGradient.replace('0.15', '0.25').replace('0.05', '0.15');
        });
        
        badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'translateY(0) scale(1)';
            badge.style.boxShadow = 'none';
            badge.style.background = bgGradient;
        });
        
        contentArea.appendChild(badge);
    });
    
    badgeContainer.appendChild(contentArea);
    
    // Add both elements to page
    document.body.appendChild(triggerButton);
    document.body.appendChild(badgeContainer);
    
    // State management
    let isExpanded = false;
    
    // Toggle function
    function toggleBadgePanel() {
        if (isExpanded) {
            // Collapse
            badgeContainer.style.transform = 'translateX(100%) scale(0.9)';
            badgeContainer.style.opacity = '0';
            badgeContainer.style.pointerEvents = 'none';
            triggerButton.style.transform = 'scale(1)';
            isExpanded = false;
            console.log('🔄 Badge panel collapsed');
        } else {
            // Expand
            badgeContainer.style.transform = 'translateX(0) scale(1)';
            badgeContainer.style.opacity = '1';
            badgeContainer.style.pointerEvents = 'auto';
            triggerButton.style.transform = 'scale(0.9)';
            isExpanded = true;
            console.log('🔄 Badge panel expanded');
            
            // Animate badges in
            const badges = contentArea.querySelectorAll('.verdiqt-flipkart-badge');
            badges.forEach((badge, index) => {
                badge.style.animation = `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s both`;
            });
        }
    }
    
    // Add click handler to trigger button
    triggerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBadgePanel();
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (isExpanded && 
            !badgeContainer.contains(e.target) && 
            !triggerButton.contains(e.target)) {
            toggleBadgePanel();
        }
    });
    
    console.log(`✅ Flipkart: Created trigger button and collapsible badge panel with ${results.length} badges`);
    
    // Auto-show for 3 seconds initially, then collapse
    setTimeout(() => {
        if (!isExpanded) {
            toggleBadgePanel();
            setTimeout(() => {
                if (isExpanded) {
                    toggleBadgePanel();
                }
            }, 3000);
        }
    }, 1000);
}

// Social media badge injection (LinkedIn, Facebook, Instagram)
function injectSocialMediaBadges(results) {
    console.log(`🏷️ Social: Injecting ${results.length} badges using element references...`);
    const elements = window._verdiqtReviewElements || [];

    results.forEach((result, index) => {
        const targetEl = elements[index];
        if (!targetEl) return;

        // Skip if badge already injected on this element
        if (targetEl.nextSibling && targetEl.nextSibling.classList && targetEl.nextSibling.classList.contains('verdiqt-badge')) return;

        const badge = createInlineBadge(result, index);
        try {
            if (targetEl.nextSibling) {
                targetEl.parentNode.insertBefore(badge, targetEl.nextSibling);
            } else {
                targetEl.parentNode.appendChild(badge);
            }
            console.log(`✅ Social badge ${index + 1}: ${result.sentiment} injected`);
        } catch (e) {
            console.warn(`⚠️ Social badge ${index + 1}: Failed to inject`, e);
        }
    });
}

// Amazon badge injection (existing method)
function injectAmazonBadges(results) {
    // Try multiple container selectors in order of reliability
    let reviewContainers = document.querySelectorAll('[data-hook="review"]');
    if (reviewContainers.length === 0) {
        reviewContainers = document.querySelectorAll('.review');
    }
    console.log(`🛒 Amazon: Found ${reviewContainers.length} review containers`);
    
    results.forEach((result, index) => {
        if (index < reviewContainers.length) {
            const container = reviewContainers[index];
            const badge = createInlineBadge(result, index);
            
            // Try to place badge inside the review body, else append to container
            const reviewBody = container.querySelector('[data-hook="review-body"]') ||
                               container.querySelector('.review-text-content') ||
                               container.querySelector('.cr-original-review-text') ||
                               container;

            reviewBody.appendChild(badge);
            console.log(`✅ Amazon badge ${index + 1}: ${result.sentiment} (${result.confidence}%) injected`);
        }
    });
}

// Universal badge injection
function injectUniversalBadges(results) {
    const reviewElements = document.querySelectorAll('div[class*="review"], div[class*="comment"], p');
    console.log(`🌐 Universal: Found ${reviewElements.length} potential elements`);
    
    results.forEach((result, index) => {
        if (index < reviewElements.length) {
            const element = reviewElements[index];
            const badge = createInlineBadge(result, index);
            
            try {
                if (element.nextSibling) {
                    element.parentNode.insertBefore(badge, element.nextSibling);
                } else {
                    element.parentNode.appendChild(badge);
                }
                console.log(`✅ Universal badge ${index + 1}: ${result.sentiment} injected`);
            } catch (e) {
                console.warn(`⚠️ Universal badge ${index + 1}: Failed to inject`, e);
            }
        }
    });
}

// Create inline badge (for Amazon and Universal)
function createInlineBadge(result, index) {
    const badge = document.createElement('div');
    badge.className = 'verdiqt-badge';
    badge.setAttribute('data-verdiqt-index', index);
    
    // Colors
    let bgColor, borderColor;
    if (result.sentiment === 'positive') {
        bgColor = '#16A34A';
        borderColor = '#22C55E';
    } else if (result.sentiment === 'negative') {
        bgColor = '#DC2626';
        borderColor = '#EF4444';
    } else {
        bgColor = '#D97706';
        borderColor = '#F59E0B';
    }
    
    badge.style.cssText = `
        display: inline-block !important;
        margin: 0 0 0 10px !important;
        padding: 6px 12px !important;
        border-radius: 20px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: white !important;
        background: ${bgColor} !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.7) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        z-index: 999999 !important;
        position: relative !important;
        width: fit-content !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        border: 2px solid ${borderColor} !important;
        text-align: center !important;
        line-height: 1.2 !important;
        letter-spacing: 0.3px !important;
        opacity: 1 !important;
        visibility: visible !important;
        vertical-align: top !important;
        white-space: nowrap !important;
    `;
    
    const icon = result.sentiment === 'positive' ? '✅' : 
                result.sentiment === 'negative' ? '❌' : '😐';
    
    const text = result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1);
    const confidence = Math.round(result.confidence || 0);
    
    badge.innerHTML = `<span style="color: white !important; text-shadow: 0 1px 2px rgba(0,0,0,0.7) !important; font-weight: 700 !important;">${icon} ${text} (${confidence}%)</span>`;
    
    return badge;
}

// Show section
function showSection(sectionName) {
    console.log(`🔄 Verdiqt: Switching to section: ${sectionName}`);
    
    const sections = document.querySelectorAll('.section');
    if (sections.length === 0) {
        console.warn('⚠️ Sidebar not ready yet, skipping showSection');
        return;
    }
    
    sections.forEach(section => {
        section.classList.add('hidden');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    } else {
        console.error(`❌ Section not found: ${sectionName}-section`);
    }
}

// Show error
function showError(message) {
    document.getElementById('error-text').textContent = message;
    showSection('error');
}

// Setup dynamic content detection for lazy-loaded reviews
function setupDynamicContentDetection() {
    console.log('🔍 Verdiqt: Setting up dynamic content detection for Flipkart...');
    
    // Method 1: Enhanced Mutation Observer
    if (contentObserver) {
        contentObserver.disconnect();
    }
    
    contentObserver = new MutationObserver((mutations) => {
        let newContentDetected = false;
        let addedReviewElements = 0;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for Flipkart review selectors
                        const reviewSelectors = [
                            'div[class*="_27M"]', 'div[class*="_1At"]', 'div[class*="ZmyHeo"]',
                            'div[class*="_2-N8zT"]', 'div[class*="_2xg6Ul"]', 'div[class*="Nd1Jq3"]',
                            'div[class*="_3LYOAd"]', 'div[class*="_2V5EHH"]'
                        ];
                        
                        // Check if the node itself matches
                        if (node.className && typeof node.className === 'string') {
                            for (const selector of reviewSelectors) {
                                const className = selector.replace('div[class*="', '').replace('"]', '');
                                if (node.className.includes(className)) {
                                    newContentDetected = true;
                                    addedReviewElements++;
                                    console.log(`🆕 Verdiqt: New review element detected: ${node.className}`);
                                    break;
                                }
                            }
                        }
                        
                        // Check if the node contains review elements
                        if (node.querySelectorAll) {
                            for (const selector of reviewSelectors) {
                                const foundElements = node.querySelectorAll(selector);
                                if (foundElements.length > 0) {
                                    newContentDetected = true;
                                    addedReviewElements += foundElements.length;
                                    console.log(`🆕 Verdiqt: Found ${foundElements.length} new review elements with selector: ${selector}`);
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        });
        
        if (newContentDetected) {
            console.log(`🆕 Verdiqt: Total new review elements detected: ${addedReviewElements}`);
            scheduleReanalysis('mutation');
        }
    });
    
    // Observe with more specific targeting
    contentObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
    
    // Method 2: Enhanced Scroll Detection with immediate check
    let lastScrollTime = 0;
    let scrollCheckTimeout = null;
    let lastScrollY = window.scrollY;
    let scrollCheckCount = 0;
    
    const handleScroll = () => {
        const currentScrollY = window.scrollY;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        // Trigger on any meaningful scroll (reduced from 100px to 50px)
        if (scrollDelta > 50) {
            lastScrollTime = Date.now();
            lastScrollY = currentScrollY;
            scrollCheckCount++;
            
            console.log(`📜 Verdiqt: Scroll detected #${scrollCheckCount} (${scrollDelta}px delta, position: ${currentScrollY})`);
            
            // Clear existing timeout
            if (scrollCheckTimeout) {
                clearTimeout(scrollCheckTimeout);
            }
            
            // Check immediately for new content (reduced delay)
            scrollCheckTimeout = setTimeout(() => {
                console.log('📜 Verdiqt: Scroll check triggered, looking for new reviews...');
                checkForNewReviews('scroll');
            }, 1500); // Reduced from 3000ms to 1500ms
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Method 3: Intersection Observer for bottom of page
    const bottomObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log('👁️ Verdiqt: Bottom of page visible, checking for new content...');
                setTimeout(() => checkForNewReviews('intersection'), 2000);
            }
        });
    }, { threshold: 0.1 });
    
    // Create a sentinel element at the bottom
    const sentinel = document.createElement('div');
    sentinel.id = 'verdiqt-scroll-sentinel';
    sentinel.style.cssText = 'height: 1px; position: absolute; bottom: 0; width: 100%;';
    document.body.appendChild(sentinel);
    bottomObserver.observe(sentinel);
    
    // Method 4: More frequent periodic check
    let periodicCheckCount = 0;
    const periodicCheck = setInterval(() => {
        if (!analysisInProgress) {
            periodicCheckCount++;
            console.log(`⏰ Verdiqt: Periodic check #${periodicCheckCount}`);
            checkForNewReviews('periodic');
        }
    }, 8000); // Check every 8 seconds (reduced from 10)
    
    // Method 5: Add manual test button for debugging
    setTimeout(() => {
        if (window.location.hostname.includes('flipkart')) {
            createDebugButton();
        }
    }, 5000);
    
    // Store cleanup function
    window.verdiqtCleanup = () => {
        if (contentObserver) contentObserver.disconnect();
        if (bottomObserver) bottomObserver.disconnect();
        if (periodicCheck) clearInterval(periodicCheck);
        window.removeEventListener('scroll', handleScroll);
        const sentinel = document.getElementById('verdiqt-scroll-sentinel');
        if (sentinel) sentinel.remove();
        const debugBtn = document.getElementById('verdiqt-debug-btn');
        if (debugBtn) debugBtn.remove();
    };
    
    console.log('✅ Verdiqt: Enhanced dynamic content detection setup complete');
}

// Create debug button for manual testing
function createDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.id = 'verdiqt-debug-btn';
    debugBtn.innerHTML = '🔧 Test';
    debugBtn.style.cssText = `
        position: fixed !important;
        top: 230px !important;
        right: 30px !important;
        width: 50px !important;
        height: 30px !important;
        background: #FF6B6B !important;
        color: white !important;
        border: none !important;
        border-radius: 15px !important;
        font-size: 12px !important;
        cursor: pointer !important;
        z-index: 9999998 !important;
        font-family: monospace !important;
    `;
    
    debugBtn.addEventListener('click', () => {
        console.log('🔧 Debug button clicked - forcing review check');
        checkForNewReviews('debug-button');
    });
    
    document.body.appendChild(debugBtn);
    console.log('🔧 Debug button created');
}

// Check for new reviews and trigger re-analysis if needed
function checkForNewReviews(trigger) {
    if (analysisInProgress) {
        console.log('⏳ Verdiqt: Analysis in progress, skipping new review check');
        return;
    }
    
    console.log(`🔍 Verdiqt: Checking for new reviews (${trigger})...`);
    
    // Get current review count using the same scraping logic
    const currentReviews = scrapeReviews();
    const currentCount = currentReviews.length;
    
    console.log(`📊 Verdiqt: Review count check - Current: ${currentCount}, Last analyzed: ${lastAnalyzedReviewCount}`);
    
    // Log some sample reviews for debugging
    if (currentReviews.length > 0) {
        console.log('📄 Sample current reviews:', currentReviews.slice(0, 2).map(r => r.substring(0, 50) + '...'));
    }
    
    // If we found more reviews than before (with a buffer of 1 to avoid false positives)
    if (currentCount > lastAnalyzedReviewCount + 1) {
        const newReviewCount = currentCount - lastAnalyzedReviewCount;
        console.log(`🆕 Verdiqt: Found ${newReviewCount} new reviews! Triggering re-analysis...`);
        scheduleReanalysis(trigger);
    } else if (currentCount === lastAnalyzedReviewCount) {
        console.log('📊 Verdiqt: No new reviews detected');
    } else if (currentCount < lastAnalyzedReviewCount) {
        console.log('📊 Verdiqt: Review count decreased, page might have changed');
        // Reset the count and potentially re-analyze
        lastAnalyzedReviewCount = 0;
        scheduleReanalysis(trigger);
    }
}

// Schedule re-analysis with debouncing
function scheduleReanalysis(trigger) {
    if (scrollAnalysisTimeout) {
        clearTimeout(scrollAnalysisTimeout);
    }
    
    console.log(`⏰ Verdiqt: Scheduling re-analysis (${trigger}) in 1.5 seconds...`);
    
    scrollAnalysisTimeout = setTimeout(() => {
        console.log(`🔄 Verdiqt: Starting re-analysis triggered by: ${trigger}`);
        startAnalysis(true); // Pass true to indicate this is a re-analysis
    }, 1500); // Wait 1.5 seconds to avoid too frequent re-analysis
}

// Manual trigger for testing (can be called from console)
window.verdiqtForceReanalysis = function() {
    console.log('🔧 Verdiqt: Manual re-analysis triggered');
    if (analysisInProgress) {
        console.log('⏳ Analysis already in progress');
        return;
    }
    startAnalysis(true);
};

// Manual trigger to check for new reviews (for debugging)
window.verdiqtCheckReviews = function() {
    console.log('🔧 Verdiqt: Manual review check triggered');
    checkForNewReviews('manual');
};

// Manual button creation for debugging
window.verdiqtCreateButton = function() {
    console.log('🔧 Verdiqt: Manual button creation triggered');
    createMainVerdiqtButton();
};

// Check if button exists
window.verdiqtCheckButton = function() {
    const btn = document.getElementById('verdiqt-float-btn');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         window.getComputedStyle(btn).display !== 'none';
        console.log(`Button exists: ✅, Visible: ${isVisible ? '✅' : '❌'}`);
        console.log('Button rect:', rect);
        console.log('Button styles:', window.getComputedStyle(btn).cssText);
        return { exists: true, visible: isVisible, rect, element: btn };
    } else {
        console.log('Button exists: ❌');
        return { exists: false, visible: false };
    }
};

// Initialize extension
function initVerdiqt() {
    console.log('🚀 Verdiqt: Initializing...');
    
    // Wait for body to be available
    if (!document.body) {
        console.log('⏳ Waiting for document.body...');
        setTimeout(initVerdiqt, 100);
        return;
    }
    
    // Always create the main V button first with multiple attempts
    createMainVerdiqtButton();
    
    // Auto-analyze after 3 seconds
    setTimeout(() => {
        console.log('🤖 Verdiqt: Starting auto-analysis...');
        // Only auto-analyze if sidebar is already open
        if (document.getElementById('verdiqt-sidebar')) {
            startAnalysis();
        }
    }, 3000);
    
    // Setup dynamic content detection for Flipkart (but don't interfere with main button)
    if (window.location.hostname.includes('flipkart')) {
        setTimeout(() => {
            setupDynamicContentDetection();
        }, 1000); // Delay to ensure main button is stable
    }

    // SPA navigation detection for LinkedIn, Facebook, Instagram
    const socialDomains = ['linkedin.com', 'facebook.com', 'instagram.com'];
    if (socialDomains.some(d => window.location.hostname.includes(d))) {
        setupSPANavigationDetection();
    }
}

// Detect analysis type for sidebar label
function detectAnalysisType() {
    const domain = window.location.hostname;
    if (domain.includes('amazon') || domain.includes('flipkart')) return 'Product Reviews';
    if (domain.includes('linkedin.com')) return 'LinkedIn Post & Comments';
    if (domain.includes('facebook.com')) return 'Facebook Post & Comments';
    if (domain.includes('instagram.com')) return 'Instagram Post & Comments';
    return 'Page Content';
}

// SPA navigation detection - re-triggers analysis when URL changes on social media
function setupSPANavigationDetection() {
    let lastUrl = window.location.href;
    console.log('🔗 Verdiqt: Setting up SPA navigation detection...');

    // Patch pushState and replaceState to detect client-side navigation
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function(...args) {
        originalPushState(...args);
        onUrlChange();
    };
    history.replaceState = function(...args) {
        originalReplaceState(...args);
        onUrlChange();
    };

    window.addEventListener('popstate', onUrlChange);

    function onUrlChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('🔗 Verdiqt: SPA navigation detected, re-analyzing in 2s...');
            // Remove old badges and reset
            document.querySelectorAll('.verdiqt-badge').forEach(b => b.remove());
            lastAnalyzedReviewCount = 0;
            analysisInProgress = false;
            window._verdiqtReviewElements = [];
            setTimeout(() => startAnalysis(), 2000);
        }
    }
}

// Create main V button with multiple attempts and safeguards
function createMainVerdiqtButton() {
    console.log('🔧 Verdiqt: Creating main V button...');
    
    // Ensure body exists
    if (!document.body) {
        console.log('⏳ Body not ready, retrying...');
        setTimeout(createMainVerdiqtButton, 100);
        return;
    }
    
    // Remove any existing button first
    const existing = document.getElementById('verdiqt-float-btn');
    if (existing) {
        existing.remove();
        console.log('🗑️ Removed existing button');
    }
    
    try {
        const button = createVerdiqtButton();
        document.body.appendChild(button);
        console.log('✅ Verdiqt: Main V button created and added');
        
        // Verify it's actually visible
        setTimeout(() => {
            const check = document.getElementById('verdiqt-float-btn');
            if (check) {
                const rect = check.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                window.getComputedStyle(check).display !== 'none';
                console.log(`👁️ Button visibility check: ${isVisible ? '✅ Visible' : '❌ Hidden'}`);
                
                if (!isVisible) {
                    console.log('⚠️ Button not visible, attempting to fix...');
                    check.style.cssText = check.style.cssText + `
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    `;
                }
            } else {
                console.log('❌ Button not found in DOM, recreating...');
                createMainVerdiqtButton();
            }
        }, 1000);
        
        // Set up periodic check to ensure button stays visible
        setInterval(() => {
            const btn = document.getElementById('verdiqt-float-btn');
            if (!btn) {
                console.log('🔄 Button disappeared, recreating...');
                createMainVerdiqtButton();
            }
        }, 5000); // Check every 5 seconds
        
    } catch (error) {
        console.error('❌ Error creating main button:', error);
        // Retry after a delay
        setTimeout(createMainVerdiqtButton, 1000);
    }
}

// Emergency button creation function
function createEmergencyButton() {
    console.log('🚨 Creating emergency button...');
    
    if (!document.body) {
        setTimeout(createEmergencyButton, 100);
        return;
    }
    
    // Remove existing if any
    const existing = document.getElementById('verdiqt-float-btn');
    if (existing) existing.remove();
    
    // Create simple button
    const btn = document.createElement('div');
    btn.id = 'verdiqt-float-btn';
    btn.textContent = 'V';
    btn.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 60px !important;
        height: 60px !important;
        background: #667EEA !important;
        color: white !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 24px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        z-index: 99999999 !important;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6) !important;
        font-family: Arial, sans-serif !important;
        user-select: none !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
    `;
    
    btn.onclick = () => {
        console.log('🎯 Emergency button clicked');
        toggleSidebar();
    };
    
    document.body.appendChild(btn);
    console.log('✅ Emergency button created');
}

// Start initialization with multiple strategies
console.log('🎬 Verdiqt: Starting...');

// Strategy 1: Immediate initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initVerdiqt, 100);
} else {
    // Strategy 2: Wait for DOM content loaded
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initVerdiqt, 100);
    });
    
    // Strategy 3: Wait for full page load
    window.addEventListener('load', () => {
        setTimeout(initVerdiqt, 200);
    });
}

// Strategy 4: Fallback initialization after delay
setTimeout(() => {
    if (!document.getElementById('verdiqt-float-btn')) {
        console.log('🔄 Fallback initialization...');
        initVerdiqt();
    }
}, 2000);

// Strategy 5: Emergency button creation as last resort
setTimeout(() => {
    if (!document.getElementById('verdiqt-float-btn')) {
        console.log('🚨 Creating emergency button as last resort...');
        createEmergencyButton();
    }
}, 5000);

console.log('✨ Verdiqt: Content script loaded');

// Global debug functions for console access
window.verdiqtCreateButton = createEmergencyButton;
window.verdiqtInit = initVerdiqt;
window.verdiqtToggle = toggleSidebar;
window.verdiqtForceAnalysis = () => {
    console.log('🔄 Forcing fresh analysis...');
    lastAnalyzedReviewCount = 0;
    analysisInProgress = false;
    startAnalysis(false);
};
window.verdiqtDebugReviews = () => {
    console.log('🔍 Debug: Looking for review text on page...');
    const potentialReviews = [];
    
    // Look for text that looks like reviews
    document.querySelectorAll('p, div, span').forEach((el, i) => {
        const text = el.innerText?.trim();
        if (text && text.length > 30 && text.length < 1000 && 
            (text.includes('good') || text.includes('great') || text.includes('amazing') || 
             text.includes('excellent') || text.includes('bad') || text.includes('poor') ||
             text.includes('love') || text.includes('hate') || text.includes('recommend'))) {
            potentialReviews.push({
                index: i,
                text: text.substring(0, 100) + '...',
                element: el
            });
        }
    });
    
    console.log(`Found ${potentialReviews.length} potential reviews:`);
    potentialReviews.forEach((review, i) => {
        console.log(`${i + 1}. "${review.text}"`);
    });
    
    return potentialReviews;
};