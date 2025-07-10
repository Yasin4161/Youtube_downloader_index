class YouTubeDownloader {
    constructor() {
        this.downloadForm = document.getElementById('downloadForm');
        this.progressSection = document.getElementById('progressSection');
        this.downloadSection = document.getElementById('downloadSection');
        this.errorSection = document.getElementById('errorSection');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        
        this.downloadLink = document.getElementById('downloadLink');
        this.downloadTitle = document.getElementById('downloadTitle');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.formatSelect = document.getElementById('format');
        this.qualitySelect = document.getElementById('quality');
        
        this.currentDownloadId = null;
        this.statusCheckInterval = null;
        
        this.initEventListeners();
        this.updateQualityOptions();
    }
    
    initEventListeners() {
        this.downloadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startDownload();
        });
        
        this.formatSelect.addEventListener('change', () => {
            this.updateQualityOptions();
        });
    }
    
    updateQualityOptions() {
        const format = this.formatSelect.value;
        const quality = this.qualitySelect;
        
        // Clear existing options
        quality.innerHTML = '';
        
        if (format === 'mp3') {
            quality.innerHTML = `
                <option value="320">320 kbps (Best)</option>
                <option value="256">256 kbps</option>
                <option value="192">192 kbps</option>
                <option value="128">128 kbps</option>
                <option value="96">96 kbps (Smallest)</option>
            `;
        } else {
            quality.innerHTML = `
                <option value="best">Best Quality</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
                <option value="360">360p</option>
                <option value="worst">Fastest Download</option>
            `;
        }
    }
    
    async startDownload() {
        const url = document.getElementById('url').value.trim();
        const format = this.formatSelect.value;
        const quality = this.qualitySelect.value;
        
        if (!url) {
            this.showError('Please enter a YouTube URL');
            return;
        }
        
        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }
        
        this.hideAllSections();
        this.setButtonState(true);
        
        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    format: format,
                    quality: quality
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Download failed');
            }
            
            const data = await response.json();
            this.currentDownloadId = data.download_id;
            
            this.showProgress();
            this.startStatusCheck();
            
        } catch (error) {
            console.error('Download error:', error);
            this.showError(error.message || 'Failed to start download');
            this.setButtonState(false);
        }
    }
    
    startStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        this.statusCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/status/${this.currentDownloadId}`);
                const status = await response.json();
                
                this.updateProgress(status);
                
                if (status.status === 'completed') {
                    this.showDownloadReady(status);
                    clearInterval(this.statusCheckInterval);
                } else if (status.status === 'error') {
                    this.showError(status.error || 'Download failed');
                    clearInterval(this.statusCheckInterval);
                }
                
            } catch (error) {
                console.error('Status check error:', error);
                this.showError('Failed to check download status');
                clearInterval(this.statusCheckInterval);
            }
        }, 1000);
    }
    
    updateProgress(status) {
        const progress = Math.min(status.progress || 0, 100);
        
        this.progressBar.style.width = `${progress}%`;
        this.progressBar.setAttribute('aria-valuenow', progress);
        this.progressPercent.textContent = `${Math.round(progress)}%`;
        this.progressText.textContent = status.message || 'Processing...';
    }
    
    showProgress() {
        this.hideAllSections();
        this.progressSection.style.display = 'block';
        this.updateProgress({ progress: 0, message: 'Starting download...' });
    }
    
    showDownloadReady(status) {
        this.hideAllSections();
        this.downloadSection.style.display = 'block';
        
        this.downloadTitle.textContent = status.title || 'Your download';
        this.downloadLink.href = `/download/${this.currentDownloadId}`;
        this.downloadLink.onclick = () => {
            // Reset form after download starts
            setTimeout(() => {
                this.resetForm();
            }, 1000);
        };
        
        this.setButtonState(false);
    }
    
    showError(message) {
        this.hideAllSections();
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
        this.setButtonState(false);
        
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
    }
    
    hideAllSections() {
        this.progressSection.style.display = 'none';
        this.downloadSection.style.display = 'none';
        this.errorSection.style.display = 'none';
    }
    
    setButtonState(loading) {
        if (loading) {
            this.downloadBtn.disabled = true;
            this.downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            this.downloadBtn.classList.add('loading');
        } else {
            this.downloadBtn.disabled = false;
            this.downloadBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download';
            this.downloadBtn.classList.remove('loading');
        }
    }
    
    resetForm() {
        this.downloadForm.reset();
        this.hideAllSections();
        this.setButtonState(false);
        this.currentDownloadId = null;
        
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        // Reset quality options
        this.updateQualityOptions();
    }
    
    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/,
            /^https?:\/\/youtu\.be\/.+/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/.+/,
            /^https?:\/\/(www\.)?youtube\.com\/v\/.+/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeDownloader();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    location.reload();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    // Any cleanup if needed
});
