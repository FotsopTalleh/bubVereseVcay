import os
import smtplib
from email.mime.text import MIMEText


def send_email(to: str, subject: str, body: str) -> None:
    """Sends plain-text mail via Gmail SMTP using an account App Password
    (not the real Gmail password — generated under Google Account > Security
    > App passwords, requires 2-Step Verification to be enabled)."""
    user = os.environ.get("GMAIL_SMTP_USER")
    app_password = os.environ.get("GMAIL_SMTP_APP_PASSWORD")
    if not user or not app_password:
        raise RuntimeError(
            "Email is not configured — set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD."
        )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(user, app_password)
        server.sendmail(user, [to], msg.as_string())
