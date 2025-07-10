import os
import logging
import threading
import time
import uuid
from urllib.parse import urlparse, parse_qs
import re

from flask import Flask, render_template, request, jsonify, send_file, abort
import yt_dlp
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key-here")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Create downloads directory if it doesn't exist
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Store download progress and results
download_status = {}

def extract_video_id(url):
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def is_valid_youtube_url(url):
    """Validate if URL is a valid YouTube URL"""
    return extract_video_id(url) is not None

def download_video(download_id, url, format_type, quality):
    """Download video in a separate thread"""
    try:
        download_status[download_id] = {
            'status': 'downloading',
            'progress': 0,
            'message': 'Starting download...',
            'filename': None,
            'error': None
        }
        
        # Configure yt-dlp options based on format
        if format_type == 'mp3':
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(DOWNLOAD_DIR, f'{download_id}.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality,
                }],
                'progress_hooks': [lambda d: progress_hook(d, download_id)],
            }
        else:  # mp4
            if quality == 'best':
                format_selector = 'best[ext=mp4]/best'
            elif quality == 'worst':
                format_selector = 'worst[ext=mp4]/worst'
            else:
                format_selector = f'best[height<={quality}][ext=mp4]/best[height<={quality}]/best[ext=mp4]/best'
            
            ydl_opts = {
                'format': format_selector,
                'outtmpl': os.path.join(DOWNLOAD_DIR, f'{download_id}.%(ext)s'),
                'progress_hooks': [lambda d: progress_hook(d, download_id)],
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info first
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            
            download_status[download_id]['message'] = f'Downloading: {title}'
            
            # Download the video
            ydl.download([url])
            
            # Find the downloaded file
            for file in os.listdir(DOWNLOAD_DIR):
                if file.startswith(download_id):
                    download_status[download_id] = {
                        'status': 'completed',
                        'progress': 100,
                        'message': 'Download completed!',
                        'filename': file,
                        'title': title,
                        'error': None
                    }
                    break
            else:
                raise Exception("Downloaded file not found")
                
    except Exception as e:
        logging.error(f"Download error for {download_id}: {str(e)}")
        download_status[download_id] = {
            'status': 'error',
            'progress': 0,
            'message': 'Download failed',
            'filename': None,
            'error': str(e)
        }

def progress_hook(d, download_id):
    """Update download progress"""
    if d['status'] == 'downloading':
        if 'total_bytes' in d:
            progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
        elif 'total_bytes_estimate' in d:
            progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
        else:
            progress = 0
        
        download_status[download_id]['progress'] = min(progress, 95)  # Keep some room for post-processing
        download_status[download_id]['message'] = f"Downloading... {progress:.1f}%"
    
    elif d['status'] == 'finished':
        download_status[download_id]['progress'] = 95
        download_status[download_id]['message'] = "Processing..."

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def start_download():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        format_type = data.get('format', 'mp4')
        quality = data.get('quality', 'best')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        if not is_valid_youtube_url(url):
            return jsonify({'error': 'Please enter a valid YouTube URL'}), 400
        
        # Generate unique download ID
        download_id = str(uuid.uuid4())
        
        # Start download in separate thread
        thread = threading.Thread(target=download_video, args=(download_id, url, format_type, quality))
        thread.daemon = True
        thread.start()
        
        return jsonify({'download_id': download_id})
        
    except Exception as e:
        logging.error(f"Error starting download: {str(e)}")
        return jsonify({'error': 'Failed to start download'}), 500

@app.route('/status/<download_id>')
def get_status(download_id):
    status = download_status.get(download_id, {'status': 'not_found'})
    return jsonify(status)

@app.route('/download/<download_id>')
def download_file(download_id):
    status = download_status.get(download_id)
    
    if not status or status['status'] != 'completed':
        abort(404)
    
    filename = status['filename']
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    
    if not os.path.exists(filepath):
        abort(404)
    
    # Clean up old downloads after serving
    def cleanup():
        time.sleep(60)  # Wait 1 minute
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
            if download_id in download_status:
                del download_status[download_id]
        except:
            pass
    
    cleanup_thread = threading.Thread(target=cleanup)
    cleanup_thread.daemon = True
    cleanup_thread.start()
    
    return send_file(filepath, as_attachment=True, download_name=filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
