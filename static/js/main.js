document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let releaseNotes = [];
    let activeFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const feedLoading = document.getElementById('feed-loading');
    const feedEmpty = document.getElementById('feed-empty');
    const feedError = document.getElementById('feed-error');
    const cardsGrid = document.getElementById('cards-grid');
    const errorMessageEl = document.getElementById('error-message');
    
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const lastUpdatedTimeEl = document.getElementById('last-updated-time');
    const entriesCountEl = document.getElementById('entries-count');
    
    const inputSearch = document.getElementById('input-search');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnRetry = document.getElementById('btn-retry');

    // Track currently visible (filtered) notes for CSV export
    let visibleNotes = [];

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountEl = document.getElementById('char-count');
    const progressCircle = document.getElementById('progress-circle');
    const btnPostTweet = document.getElementById('btn-post-tweet');

    // Circle progress properties
    let circumference = 0;
    if (progressCircle) {
        const radius = progressCircle.r.baseVal.value;
        circumference = radius * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    // Load initial feed
    fetchReleaseNotes(false);

    // Event Listeners
    btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    btnRetry.addEventListener('click', () => fetchReleaseNotes(true));
    btnExportCsv.addEventListener('click', exportCSV);
    
    // Search input handler with basic debounce
    let searchDebounceTimeout;
    inputSearch.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimeout);
        searchQuery = e.target.value.trim().toLowerCase();
        
        if (searchQuery.length > 0) {
            btnClearSearch.style.display = 'block';
        } else {
            btnClearSearch.style.display = 'none';
        }
        
        searchDebounceTimeout = setTimeout(filterAndRender, 150);
    });

    // Clear search button
    btnClearSearch.addEventListener('click', () => {
        inputSearch.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        filterAndRender();
        inputSearch.focus();
    });

    // Reset filters empty state button
    btnResetFilters.addEventListener('click', () => {
        inputSearch.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        
        filterPills.forEach(p => p.classList.remove('active'));
        const allPill = Array.from(filterPills).find(p => p.dataset.filter === 'all');
        if (allPill) allPill.classList.add('active');
        activeFilter = 'all';
        
        filterAndRender();
    });

    // Category Filter Pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            filterAndRender();
        });
    });

    // Modal Close
    btnCloseModal.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Tweet text area character counters
    tweetTextarea.addEventListener('input', updateCharCount);

    // Open Tweet Composer modal
    window.openTweetComposer = function(date, badge, textContent) {
        // Clean text content (remove excessive spaces, newlines)
        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        
        // Build prefilled tweet
        const tag = badge ? ` [${badge}]` : '';
        const dateTag = date ? `(${date})` : '';
        const link = "https://cloud.google.com/bigquery/docs/release-notes";
        
        // Tweet header: "BigQuery Update (June 15): [Feature] "
        const header = `BigQuery Update ${dateTag}:${tag} `;
        const footer = `\n\nMore: ${link}`;
        
        // Calculate max description length
        // Standard limit 280
        const reservedLen = header.length + footer.length;
        const maxDescLen = 280 - reservedLen;
        
        let desc = cleanText;
        if (desc.length > maxDescLen) {
            desc = desc.substring(0, maxDescLen - 3) + "...";
        }
        
        const fullTweet = `${header}${desc}${footer}`;
        
        tweetTextarea.value = fullTweet;
        updateCharCount();
        
        tweetModal.classList.add('open');
        tweetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock background scroll
        
        // Focus textarea
        setTimeout(() => tweetTextarea.focus(), 100);
    };

    function closeTweetModal() {
        tweetModal.classList.remove('open');
        setTimeout(() => {
            tweetModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restore scroll
        }, 300);
    }

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCountEl.textContent = len;
        
        // Colors warning / error
        if (len >= 280) {
            charCountEl.style.color = 'var(--badge-issue)';
            tweetTextarea.style.borderColor = 'var(--badge-issue)';
        } else if (len >= 250) {
            charCountEl.style.color = 'var(--badge-changed)';
            tweetTextarea.style.borderColor = 'var(--badge-changed)';
        } else {
            charCountEl.style.color = 'var(--text-secondary)';
            tweetTextarea.style.borderColor = 'var(--border-color)';
        }
        
        // Update SVG circle
        if (progressCircle) {
            const percent = Math.min(100, (len / 280) * 100);
            const offset = circumference - (percent / 100 * circumference);
            progressCircle.style.strokeDashoffset = offset;
            
            // Circle Color
            if (len >= 280) {
                progressCircle.style.stroke = 'var(--badge-issue)';
            } else if (len >= 250) {
                progressCircle.style.stroke = 'var(--badge-changed)';
            } else {
                progressCircle.style.stroke = 'var(--color-twitter)';
            }
        }
    }

    // Submit tweet to Twitter/X
    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank');
        closeTweetModal();
    });

    // Fetch API function
    function fetchReleaseNotes(forceRefresh = false) {
        showState('loading');
        if (forceRefresh) {
            btnRefresh.classList.add('loading');
            btnRefresh.disabled = true;
        }

        const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';

        fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(response => {
                if (response.success) {
                    releaseNotes = response.data;
                    
                    // Update header timestamp
                    lastUpdatedTimeEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Cached: ${response.last_fetched}`;
                    
                    filterAndRender();
                } else {
                    throw new Error(response.error || 'Server reported failure');
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                errorMessageEl.textContent = err.message;
                showState('error');
            })
            .finally(() => {
                btnRefresh.classList.remove('loading');
                btnRefresh.disabled = false;
            });
    }

    // Filtering and Rendering logic
    function filterAndRender() {
        const filtered = releaseNotes.filter(note => {
            // Apply category pill filter
            const matchesCategory = activeFilter === 'all' || 
                note.badge.toLowerCase() === activeFilter.toLowerCase();
            
            // Apply search filter
            const matchesSearch = !searchQuery || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.badge.toLowerCase().includes(searchQuery) ||
                note.content_text.toLowerCase().includes(searchQuery);
            
            return matchesCategory && matchesSearch;
        });

        visibleNotes = filtered;
        renderNotes(filtered);
    }

    function renderNotes(notes) {
        if (notes.length === 0) {
            showState('empty');
            entriesCountEl.textContent = `Showing 0 updates`;
            return;
        }

        showState('grid');
        entriesCountEl.textContent = `Showing ${notes.length} updates`;
        
        cardsGrid.innerHTML = '';
        
        notes.forEach((note, index) => {
            const card = document.createElement('div');
            card.className = 'note-card';
            
            // Setup style variable for left accent border dynamically
            let badgeClass = 'badge-general';
            let accentColor = '#3b82f6';
            
            const badgeType = note.badge.toLowerCase();
            if (badgeType === 'feature') {
                badgeClass = 'badge-feature';
                accentColor = 'var(--badge-feature)';
            } else if (badgeType === 'issue') {
                badgeClass = 'badge-issue';
                accentColor = 'var(--badge-issue)';
            } else if (badgeType === 'changed') {
                badgeClass = 'badge-changed';
                accentColor = 'var(--badge-changed)';
            } else if (badgeType === 'deprecated') {
                badgeClass = 'badge-deprecated';
                accentColor = 'var(--badge-deprecated)';
            }
            
            card.style.setProperty('--accent-color', accentColor);
            card.style.animationDelay = `${index * 0.04}s`; // Stagger animation

            // Prevent script tags from executing and escape HTML correctly for text attributes
            const safeTextContent = escapeHtml(note.content_text);

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="card-badge ${badgeClass}">${note.badge}</span>
                        <span class="card-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${note.content_html}
                </div>
                <div class="card-footer">
                    <button class="btn-copy-action" data-index="${index}" title="Copy to clipboard">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="btn-tweet-action" onclick="openTweetComposer('${escapeHtml(note.date)}', '${escapeHtml(note.badge)}', \`${escapeBackticks(note.content_text)}\`)">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Tweet</span>
                    </button>
                </div>
            `;

            // Attach copy button listener after innerHTML is set
            const copyBtn = card.querySelector('.btn-copy-action');
            copyBtn.addEventListener('click', () => copyToClipboard(note, copyBtn));
            
            cardsGrid.appendChild(card);
        });
    }

    // Helper functions
    function showState(state) {
        feedLoading.style.display = state === 'loading' ? 'flex' : 'none';
        feedEmpty.style.display = state === 'empty' ? 'flex' : 'none';
        feedError.style.display = state === 'error' ? 'flex' : 'none';
        cardsGrid.style.display = state === 'grid' ? 'flex' : 'none';
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeBackticks(str) {
        return str
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$");
    }

    // ── Copy to Clipboard ──────────────────────────────────────────────────
    function copyToClipboard(note, btn) {
        const plainText = `BigQuery Release Note — ${note.date} [${note.badge}]\n\n${note.content_text.replace(/\s+/g, ' ').trim()}\n\nhttps://cloud.google.com/bigquery/docs/release-notes`;

        navigator.clipboard.writeText(plainText).then(() => {
            const icon = btn.querySelector('i');
            const label = btn.querySelector('span');

            // Visual feedback
            icon.className = 'fa-solid fa-check';
            label.textContent = 'Copied!';
            btn.classList.add('copied');

            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                label.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = plainText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    // ── Export to CSV ──────────────────────────────────────────────────────
    function exportCSV() {
        if (visibleNotes.length === 0) return;

        const csvEscapeField = (val) => {
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const header = ['Date', 'Category', 'Content', 'Release Notes URL'];
        const rows = visibleNotes.map(note => [
            csvEscapeField(note.date),
            csvEscapeField(note.badge),
            csvEscapeField(note.content_text.replace(/\s+/g, ' ').trim()),
            csvEscapeField('https://cloud.google.com/bigquery/docs/release-notes')
        ]);

        const csvContent = [header.map(csvEscapeField), ...rows]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `bq-release-notes-${timestamp}.csv`);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Brief button feedback
        const icon = btnExportCsv.querySelector('i');
        const label = btnExportCsv.querySelector('span');
        icon.className = 'fa-solid fa-check btn-icon';
        label.textContent = 'Exported!';
        setTimeout(() => {
            icon.className = 'fa-solid fa-download btn-icon';
            label.textContent = 'Export CSV';
        }, 2000);
    }
});
