# YouTube Downloader Application

## Overview

This is a Flask-based web application that allows users to download YouTube videos in MP3 or MP4 format. The application uses yt-dlp (a YouTube-dl fork) for video extraction and provides a clean, responsive web interface built with Bootstrap and vanilla JavaScript.

## System Architecture

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Video Processing**: yt-dlp library for YouTube video extraction and download
- **Threading**: Multi-threaded downloads to prevent blocking the main application
- **Session Management**: Flask sessions with configurable secret key
- **Proxy Support**: ProxyFix middleware for deployment behind reverse proxies

### Frontend Architecture
- **UI Framework**: Bootstrap 5.3.0 for responsive design
- **Styling**: Custom black and white minimalist theme
- **Icons**: Font Awesome 6.4.0 for visual elements
- **JavaScript**: Vanilla ES6 classes for download management and progress tracking

### File Structure
```
/
├── app.py              # Main Flask application
├── main.py             # Application entry point
├── templates/
│   └── index.html      # Single-page application template
├── static/
│   ├── css/
│   │   └── style.css   # Custom black/white theme
│   └── js/
│       └── app.js      # Frontend download logic
└── downloads/          # Auto-created directory for downloaded files
```

## Key Components

### Download Management System
- **Progress Tracking**: Real-time download progress with percentage and status updates
- **Unique Sessions**: UUID-based download identification for concurrent downloads
- **Status Storage**: In-memory dictionary for tracking download states
- **Thread Safety**: Separate threads for each download operation

### Video Processing Pipeline
1. URL validation using regex patterns for various YouTube URL formats
2. Video ID extraction from different YouTube URL structures
3. Format and quality selection (MP3/MP4 with various quality options)
4. yt-dlp configuration and execution
5. File management and cleanup

### User Interface Components
- **Download Form**: URL input, format selection (MP3/MP4), quality options
- **Progress Display**: Real-time progress bar with percentage and status text
- **Download Links**: Direct file download links upon completion
- **Error Handling**: User-friendly error messages and validation

## Data Flow

1. **User Input**: User enters YouTube URL and selects format/quality preferences
2. **Validation**: Frontend and backend validate URL format and extract video ID
3. **Download Initiation**: Backend creates unique download ID and starts threaded download
4. **Progress Monitoring**: Frontend polls backend for download status updates
5. **File Delivery**: Upon completion, user receives download link for the processed file
6. **Cleanup**: Downloaded files are managed in the local downloads directory

## External Dependencies

### Python Packages
- **Flask**: Web framework for HTTP handling and templating
- **yt-dlp**: YouTube video extraction and download library
- **Werkzeug**: WSGI utilities including ProxyFix middleware

### Frontend Libraries (CDN)
- **Bootstrap 5.3.0**: CSS framework for responsive design
- **Font Awesome 6.4.0**: Icon library for UI elements

### System Requirements
- Python 3.x runtime environment
- Write permissions for downloads directory
- Internet connectivity for video downloads

## Deployment Strategy

### Development Setup
- Flask development server with debug mode enabled
- Host: 0.0.0.0 (accessible from any network interface)
- Port: 5000 (configurable)
- Auto-reload on code changes

### Production Considerations
- ProxyFix middleware configured for reverse proxy deployment
- Environment variable support for session secrets
- Configurable logging levels
- Directory auto-creation for downloads

### Environment Variables
- `SESSION_SECRET`: Flask session secret key (defaults to development key)

## Changelog
- July 04, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.