"""Trafiora Cryptographic Vault & Security Module.

Implements versioned AES-256-GCM envelope encryption for database credentials,
ensuring master keys are maintained strictly external to the database.
"""
import base64
import os
import re
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .config import settings


class CredentialVault:
    """AES-256-GCM Envelope Encryption for database credentials."""

    def __init__(self, master_key_hex: str | None = None) -> None:
        key_hex = master_key_hex or settings.TRAFIORA_MASTER_KEY
        # Convert hex key to 32 bytes
        try:
            self._key = bytes.fromhex(key_hex)
            if len(self._key) != 32:
                raise ValueError("Master key must be exactly 32 bytes (64 hex characters)")
        except ValueError:
            # Fallback for development if invalid hex passed
            self._key = key_hex.encode("utf-8").ljust(32, b"0")[:32]
        self._aesgcm = AESGCM(self._key)

    def encrypt(self, plaintext: str, version: str = "v1") -> str:
        """Encrypts plaintext string using AES-256-GCM.
        
        Returns envelope string: version:nonce_b64:ciphertext_b64
        """
        nonce = os.urandom(12)  # 96-bit standard nonce for AES-GCM
        data = plaintext.encode("utf-8")
        ciphertext = self._aesgcm.encrypt(nonce, data, None)
        
        nonce_b64 = base64.b64encode(nonce).decode("utf-8")
        ct_b64 = base64.b64encode(ciphertext).decode("utf-8")
        return f"{version}:{nonce_b64}:{ct_b64}"

    def decrypt(self, envelope: str) -> str:
        """Decrypts a versioned envelope string."""
        parts = envelope.split(":")
        if len(parts) != 3:
            raise ValueError("Malformed ciphertext envelope. Expected version:nonce:ciphertext")
        
        _version, nonce_b64, ct_b64 = parts
        nonce = base64.b64decode(nonce_b64)
        ciphertext = base64.b64decode(ct_b64)
        
        plaintext_bytes = self._aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode("utf-8")


def mask_connection_string(conn_str: str) -> str:
    """Masks database passwords in connection URIs for safe client serialization."""
    # Pattern matching :password@ in database URIs
    return re.sub(r":([^@/:?]+)@", ":********@", conn_str)


# Global singleton vault
vault = CredentialVault()
