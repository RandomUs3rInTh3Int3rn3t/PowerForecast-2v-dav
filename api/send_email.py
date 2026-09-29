import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

def get_resend_api_key():
    """
    Retrieves the Resend API Key from environment variables.
    """
    key = os.environ.get('RESEND_API_KEY') or os.environ.get('VITE_RESEND_API_KEY') or ''
    return key.strip().strip('"').strip("'")

def get_sender_email():
    """
    Retrieves the configured sender email or defaults to Resend development onboarding domain.
    """
    sender = os.environ.get('RESEND_FROM_EMAIL') or os.environ.get('VITE_RESEND_FROM_EMAIL') or ''
    sender = sender.strip().strip('"').strip("'")
    if not sender:
        return 'PowerForecast <onboarding@resend.dev>'
    return sender

def render_template(template_type, data):
    """
    Renders responsive, branded PowerForecast HTML emails for supported transactional types.
    """
    brand_blue = "#00d2ff"
    brand_dark = "#0b0f17"
    card_bg = "#131b26"
    border_color = "#1e293b"
    text_muted = "#94a3b8"

    base_header = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: {brand_dark}; color: #e2e8f0; margin: 0; padding: 28px 16px;">
      <div style="max-width: 540px; margin: 0 auto; background: {card_bg}; border: 1px solid {border_color}; border-radius: 14px; padding: 36px 28px; box-shadow: 0 12px 30px rgba(0,0,0,0.5);">
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 800; color: {brand_blue}; letter-spacing: 0.5px;">⚡ PowerForecast</span>
          <span style="font-size: 11px; background: rgba(0,210,255,0.12); color: {brand_blue}; padding: 3px 8px; border-radius: 999px; margin-left: 10px; font-weight: 700;">Energy Intelligence</span>
        </div>
    """

    base_footer = f"""
        <div style="border-top: 1px solid {border_color}; margin-top: 28px; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
          This is an automated operational notification dispatched via PowerForecast SMTP & Resend Delivery Engine.<br>
          © 2026 PowerForecast Refine. Energy Optimization & Telemetry.
        </div>
      </div>
    </div>
    """

    if template_type == 'household_invite':
        inviter_name = data.get('inviterName', 'A household member')
        invite_code = data.get('inviteCode', 'PF-HH-0000')
        invite_link = data.get('inviteLink', 'https://powerforecast.ph')
        
        subject = f"⚡ You've been invited by {inviter_name} to join PowerForecast Household"
        content = f"""
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Household Energy Team Invitation</h2>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            <strong style="color: #ffffff;">{inviter_name}</strong> has invited you to join their smart household energy profile on PowerForecast.
          </p>
          <div style="background: rgba(0, 210, 255, 0.06); border: 1px dashed rgba(0, 210, 255, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px;">Your Household Join Code</div>
            <div style="font-size: 24px; font-weight: 800; color: {brand_blue}; letter-spacing: 3px;">{invite_code}</div>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="{invite_link}" style="display: inline-block; background: linear-gradient(135deg, #00d2ff 0%, #0070f3 100%); color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,210,255,0.3);">
              Accept Invitation & Join
            </a>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
            Or navigate to the link below:<br>
            <a href="{invite_link}" style="color: {brand_blue}; word-break: break-all;">{invite_link}</a>
          </p>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'budget_alert':
        user_name = data.get('userName', 'User')
        current_kwh = data.get('currentKwh', '0')
        budget_limit_kwh = data.get('budgetLimitKwh', '0')
        percent_consumed = data.get('percentConsumed', '80%')
        projected_bill = data.get('projectedBill', '₱0.00')

        subject = f"⚠️ Alert: PowerForecast Monthly Budget Threshold Reached ({percent_consumed})"
        content = f"""
          <div style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #ef4444; font-size: 14px;">ENERGY BUDGET THRESHOLD WARNING</strong>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Hello {user_name},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            Your household electricity consumption has reached <strong style="color: #f87171;">{percent_consumed}</strong> of your monthly target.
          </p>
          <div style="background: #1a2332; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Current Accumulated Usage:</td>
                <td style="color: #ffffff; font-weight: 700; text-align: right;">{current_kwh} kWh</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Monthly Target Budget:</td>
                <td style="color: #ffffff; font-weight: 700; text-align: right;">{budget_limit_kwh} kWh</td>
              </tr>
              <tr style="border-top: 1px solid #2d3748;">
                <td style="color: #94a3b8; padding: 8px 0 2px 0;">Projected End-of-Month Bill:</td>
                <td style="color: {brand_blue}; font-weight: 800; font-size: 16px; text-align: right; padding-top: 8px;">{projected_bill}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            💡 <strong>Smart Tip:</strong> Shifting major inductive loads (air conditioner, washing machine, water heater) away from peak hours (1:00 PM – 4:00 PM) can reduce excess generation charges.
          </p>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'surge_alert':
        current_watts = data.get('currentWatts', '2500')
        threshold_watts = data.get('thresholdWatts', '2000')
        timestamp = data.get('timestamp', 'Just now')

        subject = f"⚡ Critical Surge Alert: {current_watts}W Wattage Spike Detected"
        content = f"""
          <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #fbbf24; font-size: 14px;">HIGH CONCURRENT POWER SURGE</strong>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Active Load Warning</h2>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            Your active telemetry monitor registered concurrent appliance wattage of <strong style="color: #fbbf24;">{current_watts} Watts</strong> at {timestamp}, exceeding your safety threshold of {threshold_watts} Watts.
          </p>
          <div style="background: #1a2332; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 14px; color: #e2e8f0;">
            Please check high-draw equipment such as induction stoves, multiple air conditioning units, or electric ovens running simultaneously.
          </div>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'test_email':
        recipient = data.get('recipient', 'Administrator')
        timestamp = data.get('timestamp', 'Now')
        note = data.get('note', 'Resend SMTP & Delivery Test Successful')

        subject = "⚡ PowerForecast SMTP & Resend Delivery Test Successful"
        content = f"""
          <div style="background: rgba(34, 197, 94, 0.12); border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #22c55e; font-size: 14px;">✓ SMTP DELIVERY TEST PASSED</strong>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Connection Verified!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            This test email confirms that your <strong>PowerForecast Resend Delivery Engine</strong> and <strong>SMTP configurations</strong> are operational and ready for production dispatch.
          </p>
          <div style="background: #1a2332; border-radius: 8px; padding: 18px; margin-bottom: 24px; font-size: 13px;">
            <div style="margin-bottom: 6px;"><strong style="color: #94a3b8;">Target Recipient:</strong> <span style="color: #ffffff;">{recipient}</span></div>
            <div style="margin-bottom: 6px;"><strong style="color: #94a3b8;">Dispatched At:</strong> <span style="color: #ffffff;">{timestamp}</span></div>
            <div><strong style="color: #94a3b8;">Diagnostics Note:</strong> <span style="color: {brand_blue};">{note}</span></div>
          </div>
        """
        return subject, base_header + content + base_footer

    # Default fallback
    subject = data.get('subject', 'PowerForecast Notification')
    content = f"""
      <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">{subject}</h2>
      <div style="font-size: 15px; line-height: 1.6; color: {text_muted};">
        {data.get('content', 'Notification from PowerForecast.')}
      </div>
    """
    return subject, base_header + content + base_footer


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        api_key = get_resend_api_key()
        has_key = bool(api_key and len(api_key) > 5)
        sender = get_sender_email()

        res = {
            "status": "ok",
            "hasApiKey": has_key,
            "senderEmail": sender,
            "service": "Resend SMTP & REST Dispatcher",
            "supportedTemplates": ["household_invite", "budget_alert", "surge_alert", "test_email", "custom"]
        }
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''

        try:
            payload = json.loads(raw_body) if raw_body else {}
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": f"Invalid JSON body: {str(e)}"}).encode('utf-8'))
            return

        api_key = get_resend_api_key()
        if not api_key:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "RESEND_API_KEY is not configured on the server. Please add your Resend API key to environment variables.",
                "code": "MISSING_RESEND_API_KEY"
            }).encode('utf-8'))
            return

        to_recipient = payload.get('to')
        if not to_recipient:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": "Missing 'to' recipient parameter."}).encode('utf-8'))
            return

        recipients = [to_recipient] if isinstance(to_recipient, str) else to_recipient
        from_email = payload.get('from') or get_sender_email()
        template_type = payload.get('type')
        template_data = payload.get('data', {})

        if template_type:
            computed_subject, computed_html = render_template(template_type, template_data)
            subject = payload.get('subject') or computed_subject
            html = payload.get('html') or computed_html
        else:
            subject = payload.get('subject', 'Notification from PowerForecast')
            html = payload.get('html', f"<p>{payload.get('text', 'No content provided.')}</p>")

        resend_payload = {
            "from": from_email,
            "to": recipients,
            "subject": subject,
            "html": html,
        }

        if payload.get('text'):
            resend_payload["text"] = payload.get('text')

        # Forward request to Resend API
        req_data = json.dumps(resend_payload).encode('utf-8')
        req = urllib.request.Request(
            'https://api.resend.com/emails',
            data=req_data,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'PowerForecast-Refine/3.4'
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body) if res_body else {}
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "id": res_json.get("id"),
                    "recipient": recipients,
                    "subject": subject
                }).encode('utf-8'))

        except urllib.error.HTTPError as http_err:
            error_body = http_err.read().decode('utf-8') if http_err.fp else str(http_err)
            try:
                error_json = json.loads(error_body)
            except Exception:
                error_json = {"message": error_body}

            self.send_response(http_err.code if http_err.code in [400, 401, 403, 422, 500] else 500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": error_json.get("message") or f"Resend API error: {http_err.reason}",
                "details": error_json,
                "code": "RESEND_HTTP_ERROR"
            }).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": f"Internal email dispatcher error: {str(e)}",
                "code": "DISPATCHER_ERROR"
            }).encode('utf-8'))
