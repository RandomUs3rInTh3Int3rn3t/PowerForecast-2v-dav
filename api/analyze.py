import json
import os
import re
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

def get_gemini_api_keys():
    keys = []
    
    def add_key(val):
        if not val or not isinstance(val, str):
            return
        if any(c in val for c in [',', ';', '\n', '\r']):
            for sub in re.split(r'[,;\n\r]+', val):
                add_key(sub)
            return
        clean = val.strip().strip('"').strip("'")
        if clean and clean not in keys:
            keys.append(clean)

    add_key(os.environ.get('GEMINI_API_KEYS', ''))

    prefixes = [
        'GEMINI_API_KEY',
        'GEMINI_API_KEY_FALLBACK',
        'GEMINI_API_KEY_BACKUP',
        'GEMINI_API_BACKUP_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_GEMINI_API_KEY'
    ]
    for p in prefixes:
        add_key(os.environ.get(p, ''))
        for i in range(1, 11):
            add_key(os.environ.get(f"{p}_{i}", ''))

    for k, v in os.environ.items():
        if re.match(r'^(GEMINI|GOOGLE)_.*API_?KEY.*$', k, re.IGNORECASE):
            add_key(v)

    return keys

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))

        # Enforce serverless payload boundary (3MB hard cap)
        if content_length > 3 * 1024 * 1024:
            self.send_response(413)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Payload Too Large: Maximum allowed upload is 3 MB. Please capture a single compressed photo."
            }).encode('utf-8'))
            return

        body = self.rfile.read(content_length).decode('utf-8')

        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        raw_images = payload.get('images', [])
        # Strictly enforce single photo scan limit
        images = raw_images[:1] if isinstance(raw_images, list) else []
        image_base64 = payload.get('imageBase64')
        raw_mime_type = payload.get('mimeType', 'image/jpeg')
        raw_prompt = payload.get('prompt')
        raw_preset = payload.get('preset', 'specs')
        raw_category = payload.get('category') or payload.get('categoryHint')
        raw_model = payload.get('model', 'gemini-2.5-flash')

        # Input Validation & Sanitization
        allowed_presets = {
            'specs', 'specs mode', 'auto-detect from photo',
            'air conditioners', 'refrigerators & freezers', 'television sets',
            'electric fans', 'clothes washing machines', 'lighting products',
            'kitchen appliances', 'water heaters & pumps', 'computers & laptops',
            'computers & office', 'other'
        }
        candidate_preset = str(raw_category or raw_preset or 'specs').strip()
        if candidate_preset.lower() in allowed_presets:
            preset = candidate_preset
        else:
            preset = 'specs'

        if isinstance(raw_model, str) and re.match(r'^[a-zA-Z0-9.\-_]{1,50}$', raw_model):
            model = raw_model
        else:
            model = 'gemini-2.5-flash'

        allowed_mime_types = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'}
        mime_type = raw_mime_type if isinstance(raw_mime_type, str) and raw_mime_type in allowed_mime_types else 'image/jpeg'

        prompt = None
        if isinstance(raw_prompt, str) and raw_prompt.strip():
            # Cap prompt length to 8000 chars to support comprehensive energy audit telemetry
            prompt = raw_prompt.strip()[:8000]

        api_keys = get_gemini_api_keys()

        if not api_keys:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "No Gemini API key configured on server. Please add GEMINI_API_KEY to your Vercel Environment Variables."
            }).encode('utf-8'))
            return

        # Prepare multimodal parts
        parts = []
        if prompt:
            parts.append({"text": prompt})
        else:
            default_prompt = (
                "You are ApplianceSpec AI, an elite electrical engineer and energy auditor specializing in Philippine Department of Energy (DOE) PELP standards, Energy Guide yellow labels, and electrical appliance specification nameplates (e.g. Carrier, Condura, Panasonic, LG, Samsung, Sharp, Daikin, Asahi, Astron, Standard, Hanabishi, TCL, Midea, Kolin, Haier, etc.).\n\n"
                "Examine all uploaded appliance photo(s). Extract real, high-precision technical data visible across the image(s) following these strict engineering rules:\n\n"
                "### 1. POWER & UNIT DISAMBIGUATION (CRITICAL)\n"
                "- DO NOT confuse Cooling Capacity (kJ/h, BTU/h, HP, or cooling kW) with Electrical Power Input (Watts).\n"
                "  * If the label shows 'Cooling Capacity: 9500 kJ/h' or '10,000 BTU/h', that is THERMAL capacity, NOT electric power consumption.\n"
                "  * Look for 'Rated Power Input (W)', 'Power Consumption (W)', 'Input (W)', 'Total Input (W)', or 'Rated Input'.\n"
                "  * If electric power (Watts) is not explicitly printed, calculate: Power (W) = Voltage (V) × Current (A) × Power Factor (0.9 for motors/compressors, 1.0 for heaters).\n"
                "  * Realistic electric input wattage ranges for Philippine residential units:\n"
                "    - Air Conditioners (Window/Split): 450W - 2200W (NEVER 5000W - 18000W; values >3500W indicate thermal kJ/h or BTU was misread!)\n"
                "    - Refrigerators & Freezers: 60W - 250W\n"
                "    - Electric Fans (Desk/Stand/Ceiling/Orbit): 35W - 110W\n"
                "    - Television Sets (32\"-75\" LED/OLED): 30W - 180W\n"
                "    - Clothes Washing Machines: 250W - 650W (Motor/Spin), 1200W-2000W (Heater if present)\n\n"
                "### 2. PHILIPPINE DOE ENERGY GUIDE & PELP EXTRACTION\n"
                "- Look for the yellow Philippine DOE Energy Guide label:\n"
                "  * Extract exact 'Monthly Energy Consumption: [X] kWh/month' directly from the yellow label test result box.\n"
                "  * Extract Star Rating (1 to 5 stars displayed on the top yellow banner).\n"
                "  * Extract CSPF (Cooling Seasonal Performance Factor) or EER (Energy Efficiency Ratio) if visible.\n\n"
                "### 3. TECHNOLOGY & INVERTER DETECTION\n"
                "- Check if the appliance has Inverter technology ('Inverter', 'Dual Inverter', 'DC Inverter', 'Digital Inverter', 'Smart Inverter', 'Direct Drive Inverter'). Set 'is_inverter': true if detected.\n\n"
                "### 4. CATEGORY NORMALIZATION\n"
                "Categorize strictly as one of:\n"
                "- 'Air Conditioners'\n"
                "- 'Refrigerators & Freezers'\n"
                "- 'Television Sets'\n"
                "- 'Electric Fans'\n"
                "- 'Clothes Washing Machines'\n"
                "- 'Lighting Products'\n"
                "- 'Kitchen Appliances'\n"
                "- 'Water Heaters & Pumps'\n"
                "- 'Computers & Office'\n"
                "- 'Other'\n\n"
                "### 5. PRESET MODE: " + str(preset) + "\n\n"
                "Respond ONLY with a valid JSON object inside a ```json ``` code block with these keys:\n"
                "{\n"
                '  "brand": "Exact brand string (e.g. Astron, Standard, Asahi, Carrier, Panasonic, LG, Sharp, Daikin, Samsung, Condura, etc.)",\n'
                '  "model": "Exact model number/code visible on label (e.g. WCONX008EEV, BRONCO 18, etc.)",\n'
                '  "category": "Standard category name from list above",\n'
                '  "power_watts": number (e.g. 70 for fan, 850 for AC, 110 for refrigerator),\n'
                '  "voltage": number (e.g. 230),\n'
                '  "current_amps": number or null,\n'
                '  "is_inverter": boolean,\n'
                '  "inverter_type": "string (e.g. Dual Inverter Compressor, DC Inverter, Digital Inverter, or Fixed Speed)",\n'
                '  "cruising_watts": number or null (recommended cruising/running power draw once setpoint reached: ~35-45% for AC, ~30-35% for fridge),\n'
                '  "cooling_capacity_kj_h": number or null,\n'
                '  "cooling_capacity_btu": number or null,\n'
                '  "cspf": number or null,\n'
                '  "eer": number or null,\n'
                '  "monthly_kwh": number (e.g. 16.8 for fan @ 10h/day, 160 for 850W inverter AC @ 8h/day, 28 for inverter refrigerator),\n'
                '  "energy_rating": "e.g. 5-Star DOE Certified, Inverter, CSPF 5.85, or PS Mark",\n'
                '  "star_rating": number between 1 and 5,\n'
                '  "room_location": "Living Room | Master Bedroom | Kitchen | Laundry Area | Home Office",\n'
                '  "confidence": "high | medium | low",\n'
                '  "notes": "Detailed engineering audit notes: detected rated power, cruising power, voltage, current, frequency (60Hz), serial number, PELP registration, and energy efficiency summary."\n'
                "}\n"
            )
            parts.append({"text": default_prompt})

        if images and isinstance(images, list):
            for img in images:
                if not isinstance(img, dict):
                    continue
                b64 = img.get('base64', '')
                mt = img.get('mimeType', 'image/jpeg')
                if not isinstance(mt, str) or mt not in allowed_mime_types:
                    mt = 'image/jpeg'
                if isinstance(b64, str) and b64:
                    clean_b64 = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', b64)
                    parts.append({
                        "inline_data": {
                            "mime_type": mt,
                            "data": clean_b64
                        }
                    })
        elif image_base64:
            clean_b64 = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', image_base64)
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": clean_b64
                }
            })

        req_body = json.dumps({
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }).encode('utf-8')

        # Multi-model and Multi-key fallback execution
        models_to_try = [model, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        # Deduplicate while preserving order
        ordered_models = []
        for m in models_to_try:
            if m and m not in ordered_models:
                ordered_models.append(m)

        last_error = None
        for current_model in ordered_models:
            for key in api_keys:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={key}"
                req = urllib.request.Request(url, data=req_body, headers={'Content-Type': 'application/json'})
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        resp_data = resp.read().decode('utf-8')
                        parsed = json.loads(resp_data)
                        raw_text = parsed.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
                        
                        # Parse extracted JSON
                        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', raw_text)
                        clean_json_str = json_match.group(1) if json_match else raw_text
                        extracted_data = {}
                        try:
                            extracted_data = json.loads(clean_json_str)
                        except Exception:
                            pass

                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": True,
                            "source": "gemini_multimodal_api",
                            "model_used": current_model,
                            "raw_markdown": raw_text,
                            "data": extracted_data
                        }).encode('utf-8'))
                        return
                except Exception as e:
                    last_error = str(e)
                    continue

        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        # Secure error response: do not expose internal error details or stack traces to clients
        self.wfile.write(json.dumps({"error": "Failed to analyze image with Google Gemini API. Please try again later."}).encode('utf-8'))
