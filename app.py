import time
import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for the release notes
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECONDS = 600  # 10 minutes

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    
    # Return cached data if valid and force_refresh is False
    if not force_refresh and cache["data"] is not None and (now - cache["last_fetched"] < CACHE_DURATION_SECONDS):
        return cache["data"], "cached"
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            content_elm = entry.find('atom:content', ns)
            
            content_html = content_elm.text if content_elm is not None else ""
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Divide content by h3 elements representing categories
            current_badge = "General"
            current_siblings = []
            
            for element in soup.contents:
                if element.name == 'h3':
                    if current_siblings:
                        html_content = "".join(str(s) for s in current_siblings).strip()
                        text_content = BeautifulSoup(html_content, 'html.parser').get_text(separator=" ").strip()
                        entries.append({
                            'date': date_str,
                            'updated': updated_str,
                            'badge': current_badge,
                            'content_html': html_content,
                            'content_text': text_content
                        })
                        current_siblings = []
                    current_badge = element.get_text().strip()
                elif element.name is not None:
                    current_siblings.append(element)
            
            if current_siblings or current_badge != "General":
                html_content = "".join(str(s) for s in current_siblings).strip()
                text_content = BeautifulSoup(html_content, 'html.parser').get_text(separator=" ").strip()
                if text_content:
                    entries.append({
                        'date': date_str,
                        'updated': updated_str,
                        'badge': current_badge,
                        'content_html': html_content,
                        'content_text': text_content
                    })
        
        cache["data"] = entries
        cache["last_fetched"] = now
        return entries, "fresh"
        
    except Exception as e:
        # If fetch fails but we have cached data, fallback to it
        if cache["data"] is not None:
            return cache["data"], "fallback_cached_error"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "status": status,
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "data": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
