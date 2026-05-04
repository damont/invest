import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from api.config import get_settings

logger = logging.getLogger(__name__)


def _build_html(title: str, intro: str, button_label: str, url: str, footer: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0; padding:20px; font-family:Arial, sans-serif; background-color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:8px; padding:32px;">
<tr><td>
<h2 style="margin:0 0 16px 0; color:#333;">{title}</h2>
<p style="color:#555; line-height:1.5;">{intro}</p>
<p style="text-align:center; margin:24px 0;">
<a href="{url}" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#4f46e5; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">{button_label}</a>
</p>
<p style="color:#888; font-size:13px; line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
<p style="font-size:13px; word-break:break-all;"><a href="{url}" target="_blank" style="color:#4f46e5; text-decoration:underline;">{url}</a></p>
<p style="color:#888; font-size:13px; margin-top:24px;">{footer}</p>
</td></tr>
</table>
</body>
</html>"""


async def _send_message(to_email: str, subject: str, text: str, html: str) -> None:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_email
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain", _charset="utf-8"))
    msg.attach(MIMEText(html, "html", _charset="utf-8"))

    def _send():
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_email, settings.smtp_app_password)
            server.sendmail(settings.smtp_email, to_email, msg.as_string())

    await asyncio.to_thread(_send)


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    settings = get_settings()

    if not settings.smtp_email or not settings.smtp_app_password:
        if "localhost" in settings.frontend_base_url:
            logger.warning("SMTP not configured — logging reset link (dev only)")
            logger.info("Password reset link for %s: %s", to_email, reset_url)
            return
        raise RuntimeError("SMTP not configured")

    text = f"Reset your password by visiting:\n\n{reset_url}\n\nThis link expires in 1 hour."
    html = _build_html(
        title="Reset Your Password",
        intro="Click the button below to reset your password:",
        button_label="Reset Password",
        url=reset_url,
        footer="This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    )
    await _send_message(to_email, "Reset Your Password", text, html)


async def send_verification_email(to_email: str, verify_url: str) -> None:
    settings = get_settings()
    hours = max(1, settings.email_verification_expire_minutes // 60)
    expires_wording = f"{hours} hours" if hours != 1 else "1 hour"

    if not settings.smtp_email or not settings.smtp_app_password:
        if "localhost" in settings.frontend_base_url:
            logger.warning("SMTP not configured — logging verification link (dev only)")
            logger.info("Email verification link for %s: %s", to_email, verify_url)
            return
        raise RuntimeError("SMTP not configured")

    text = (
        f"Welcome to invest! Activate your account by visiting:\n\n{verify_url}\n\n"
        f"This link expires in {expires_wording}."
    )
    html = _build_html(
        title="Verify Your Email",
        intro="Welcome to invest! Confirm your email to finish setting up your account:",
        button_label="Verify Email",
        url=verify_url,
        footer=f"This link expires in {expires_wording}. If you didn't create this account, you can ignore this email.",
    )
    await _send_message(to_email, "invest — Verify Your Email Address", text, html)
