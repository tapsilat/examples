import hashlib
import os
import re
import time
from datetime import datetime


class Utils:
    """Utility class for application helpers"""

    @staticmethod
    def generate_reference_id(prefix="ORDER"):
        """Generate a unique reference ID"""
        timestamp = str(int(time.time()))
        unique_hash = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        return f"{prefix}_{timestamp}_{unique_hash}"

    @staticmethod
    def format_price(price, currency="TRY"):
        """Format price for display"""
        symbol = "₺" if currency == "TRY" else currency
        return f"{symbol}{price:,.2f}"

    @staticmethod
    def validate_turkish_phone(phone):
        """Validate Turkish phone number"""
        # Remove all non-digit characters
        clean = re.sub(r"[^0-9]", "", phone)

        # Check if it starts with country code
        if len(clean) == 13 and clean.startswith("90"):
            return f"+{clean}"

        # Check if it starts with 0
        if len(clean) == 11 and clean.startswith("0"):
            return f"+90{clean[1:]}"

        # Check if it's 10 digits (without leading 0)
        if len(clean) == 10:
            return f"+90{clean}"

        raise ValueError("Geçersiz telefon numarası formatı")

    @staticmethod
    def validate_turkish_id(id_number):
        """Validate Turkish ID number"""
        id_clean = re.sub(r"[^0-9]", "", str(id_number))

        # TC kimlik numarası 11 haneli olmalı
        if len(id_clean) != 11:
            return False

        # İlk hane 0 olamaz
        if id_clean[0] == "0":
            return False

        # TC kimlik numarası algoritması
        total = sum(int(digit) for digit in id_clean[:10])
        return (total % 10) == int(id_clean[10])

    @staticmethod
    def sanitize_input(data):
        """Sanitize input data"""
        if isinstance(data, dict):
            return {key: Utils.sanitize_input(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [Utils.sanitize_input(item) for item in data]
        elif isinstance(data, str):
            return data.strip()
        return data

    @staticmethod
    def log_error(message, context=None):
        """Log error to file"""
        log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
        log_file = os.path.join(log_dir, "error.log")

        # Create logs directory if it doesn't exist
        os.makedirs(log_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        context_str = f" | Context: {context}" if context else ""
        log_entry = f"[{timestamp}] {message}{context_str}\n"

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
