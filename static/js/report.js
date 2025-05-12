/**
 * Functions for generating and displaying the evaluation report
 */

/**
 * Generate HTML content for the evaluation report
 * @param {Object} reportData - Report data from the backend
 * @returns {string} HTML content
 */
function generateReportHTML(reportData) {
    if (!reportData || reportData.error) {
        return `<div class="error">
            <p>Could not generate report: ${reportData?.error || 'No data available'}</p>
        </div>`;
    }

    // Format vocabulary richness as a percentage
    const vocabularyRichness = reportData.vocabulary_richness || 0;
    
    // Create a level indicator
    const levelIndicator = getLevelIndicator(reportData.level);
    
    // Format common mistakes
    const mistakesHTML = reportData.common_mistakes && reportData.common_mistakes.length > 0
        ? `<ul>${reportData.common_mistakes.map(mistake => `<li>${mistake}</li>`).join('')}</ul>`
        : '<p>No common mistakes detected.</p>';
    
    // Build the HTML
    const html = `
        <div class="report-section">
            <h3>Level</h3>
            <div>${levelIndicator}</div>
        </div>
        
        <div class="report-section">
            <h3>Speaking Metrics</h3>
            <div class="metric">
                <span>Total Words Spoken:</span>
                <span><strong>${reportData.word_count || 0}</strong></span>
            </div>
            <div class="metric">
                <span>Avg. Words Per Response:</span>
                <span><strong>${reportData.avg_words_per_message || 0}</strong></span>
            </div>
            <div class="metric">
                <span>Vocabulary Richness:</span>
                <span><strong>${vocabularyRichness}%</strong></span>
            </div>
        </div>
        
        <div class="report-section">
            <h3>Common Mistakes</h3>
            ${mistakesHTML}
        </div>
        
        <div class="report-section">
            <h3>Detailed Evaluation</h3>
            <div>${reportData.detailed_evaluation || 'No detailed evaluation available.'}</div>
        </div>
    `;
    
    return html;
}

/**
 * Generate a visual level indicator
 * @param {string} level - User's English level
 * @returns {string} HTML for level indicator
 */
function getLevelIndicator(level) {
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const levelIndex = levels.indexOf(level);
    
    if (levelIndex === -1) return `<span>${level || 'Unknown'}</span>`;
    
    const indicators = levels.map((lvl, idx) => {
        const active = idx <= levelIndex ? 'active' : '';
        return `<span class="level-dot ${active}" title="${lvl}"></span>`;
    }).join('');
    
    const styles = `
        <style>
            .level-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .level-text {
                font-weight: bold;
                color: #2c3e50;
            }
            .level-dots {
                display: flex;
                gap: 5px;
            }
            .level-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #e0e0e0;
            }
            .level-dot.active {
                background-color: #27ae60;
            }
        </style>
    `;
    
    return `
        ${styles}
        <div class="level-indicator">
            <span class="level-text">${level}</span>
            <div class="level-dots">
                ${indicators}
            </div>
        </div>
    `;
}

// Export the functions
window.Report = {
    generateReportHTML
};