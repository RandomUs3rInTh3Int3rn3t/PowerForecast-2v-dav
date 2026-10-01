import unittest
import json
import re
from unittest.mock import patch, MagicMock

# Import handler module
import api.analyze as analyze

class TestAnalyzeHandlerInputValidation(unittest.TestCase):
    def setUp(self):
        self.mock_wfile = MagicMock()
        self.handler = analyze.handler.__new__(analyze.handler)
        self.handler.headers = {'Content-Length': '0'}
        self.handler.rfile = MagicMock()
        self.handler.wfile = self.mock_wfile
        self.handler.send_response = MagicMock()
        self.handler.send_header = MagicMock()
        self.handler.end_headers = MagicMock()

    @patch('api.analyze.get_gemini_api_keys', return_value=['fake_key_123'])
    @patch('urllib.request.urlopen')
    def test_input_validation_defaults_and_sanitization(self, mock_urlopen, mock_keys):
        # Setup mock response for urlopen
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({
            "candidates": [{
                "content": {
                    "parts": [{"text": "```json\n{\"brand\": \"TestBrand\"}\n```"}]
                }
            }]
        }).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        # Payload with invalid preset, dangerous model name, invalid mimeType, and extra-long prompt
        body_data = {
            "preset": "<script>alert(1)</script>",
            "model": "gemini-2.0-flash/../etc/passwd",
            "mimeType": "application/x-executable",
            "prompt": "A" * 3000,
            "imageBase64": "data:image/jpeg;base64,12345"
        }
        json_bytes = json.dumps(body_data).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(json_bytes))}
        self.handler.rfile.read.return_value = json_bytes

        self.handler.do_POST()

        # Check urlopen call
        self.assertTrue(mock_urlopen.called)
        req = mock_urlopen.call_args[0][0]
        # Model should fall back to gemini-2.5-flash (disallowing path traversal)
        self.assertIn("/models/gemini-2.5-flash:generateContent", req.full_url)

        req_body = json.loads(req.data.decode('utf-8'))
        parts = req_body["contents"][0]["parts"]

        # Prompt should be capped to 2000 characters
        custom_prompt = parts[0]["text"]
        self.assertEqual(len(custom_prompt), 2000)

        # Inline data mime_type should default to image/jpeg because application/x-executable was rejected
        inline_data = parts[1]["inline_data"]
        self.assertEqual(inline_data["mime_type"], "image/jpeg")

    @patch('api.analyze.get_gemini_api_keys', return_value=['fake_key_123'])
    @patch('urllib.request.urlopen')
    def test_preset_sanitization_in_default_prompt(self, mock_urlopen, mock_keys):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"candidates": []}).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        # Preset invalid, no prompt supplied (so default prompt is built)
        body_data = {
            "preset": "malicious_preset_injection",
            "imageBase64": "12345"
        }
        json_bytes = json.dumps(body_data).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(json_bytes))}
        self.handler.rfile.read.return_value = json_bytes

        self.handler.do_POST()

        req = mock_urlopen.call_args[0][0]
        req_body = json.loads(req.data.decode('utf-8'))
        parts = req_body["contents"][0]["parts"]
        default_prompt_text = parts[0]["text"]

        # Disallowed preset should fall back to 'specs'
        self.assertIn("### 5. PRESET MODE: specs", default_prompt_text)
        self.assertNotIn("malicious_preset_injection", default_prompt_text)

if __name__ == '__main__':
    unittest.main()
