import smtplib
from email.message import EmailMessage
from typing import List
import os 
from dotenv import load_dotenv
load_dotenv()


class EmailService:
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USER = os.getenv("EMAIL_USERNAME")
    SMTP_PASSWORD = os.getenv("APP_PASSWORD")

    @staticmethod
    def send_email(
        to: List[str],
        subject: str,
        body: str,
        html: bool = False
    ):
        try:
            msg = EmailMessage()
            msg["From"] = EmailService.SMTP_USER
            msg["To"] = ", ".join(to)
            msg["Subject"] = subject

            if html:
                msg.add_alternative(body, subtype="html")
            else:
                msg.set_content(body)

            with smtplib.SMTP(
                EmailService.SMTP_HOST,
                EmailService.SMTP_PORT
            ) as server:
                server.starttls()
                server.login(
                    EmailService.SMTP_USER,
                    EmailService.SMTP_PASSWORD
                )
                server.send_message(msg)

        except Exception as e:
            print("Email failed:", str(e))
            raise
