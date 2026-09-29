import unittest
from api.send_email import render_template, get_sender_email

class TestSendEmailAPI(unittest.TestCase):

    def test_household_invite_template(self):
        data = {
            "inviterName": "Juan Dela Cruz",
            "inviteCode": "PF-HH-9921",
            "inviteLink": "https://powerforecast.ph/#/signup?invite=PF-HH-9921"
        }
        subject, html = render_template("household_invite", data)
        self.assertIn("Juan Dela Cruz", subject)
        self.assertIn("PF-HH-9921", html)
        self.assertIn("Power", html)
        self.assertIn("Forecast", html)
        self.assertIn("https://raw.githubusercontent.com/hAizen-Nibba/PowerForecast-2v/main/public/Assets/LOGO.png", html)

    def test_budget_alert_template(self):
        data = {
            "userName": "Maria",
            "currentKwh": "215",
            "budgetLimitKwh": "250",
            "percentConsumed": "86%",
            "projectedBill": "₱3,150.00"
        }
        subject, html = render_template("budget_alert", data)
        self.assertIn("86%", subject)
        self.assertIn("Maria", html)
        self.assertIn("215 kWh", html)
        self.assertIn("₱3,150.00", html)

    def test_surge_alert_template(self):
        data = {
            "currentWatts": "3200",
            "thresholdWatts": "2500",
            "timestamp": "14:30 PM"
        }
        subject, html = render_template("surge_alert", data)
        self.assertIn("3200W", subject)
        self.assertIn("3200 Watts", html)
        self.assertIn("2500 Watts", html)

    def test_test_email_template(self):
        data = {
            "recipient": "admin@example.com",
            "timestamp": "2026-09-29 20:00:00",
            "note": "Unit test check"
        }
        subject, html = render_template("test_email", data)
        self.assertIn("Delivery Test Successful", subject)
        self.assertIn("admin@example.com", html)
        self.assertIn("Unit test check", html)

    def test_default_sender_email(self):
        sender = get_sender_email()
        self.assertTrue(len(sender) > 0)
        self.assertIn("@", sender)

if __name__ == '__main__':
    unittest.main()
