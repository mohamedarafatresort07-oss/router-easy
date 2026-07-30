#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tiny APK Signature Scheme v2 signer for QuizMed X.

This is intentionally small and self-contained so the Arena sandbox can produce
an Android 7+/8+ installable APK even when Java/Gradle/apksigner are not
available locally. It creates an RSA debug cert with OpenSSL, computes the APK
v2 content digest, signs the v2 signed-data block, inserts the APK Signing Block
before the ZIP central directory, and updates the EOCD central-directory offset.
"""
from __future__ import annotations
import base64
import hashlib
import os
import pathlib
import struct
import subprocess
import sys
import tempfile

APK_SIG_BLOCK_MAGIC = b"APK Sig Block 42"
APK_SIGNATURE_SCHEME_V2_BLOCK_ID = 0x7109871A
SIG_ALG_RSA_PKCS1_V1_5_WITH_SHA256 = 0x0103
CHUNK_SIZE = 1024 * 1024


def u32(n: int) -> bytes:
    return struct.pack("<I", n)


def u64(n: int) -> bytes:
    return struct.pack("<Q", n)


def lp(data: bytes) -> bytes:
    return u32(len(data)) + data


def find_eocd(data: bytes) -> int:
    # EOCD is in the last 65535 + 22 bytes for non-Zip64 APKs.
    min_pos = max(0, len(data) - (65535 + 22))
    sig = b"PK\x05\x06"
    for i in range(len(data) - 22, min_pos - 1, -1):
        if data[i:i+4] == sig:
            comment_len = struct.unpack_from("<H", data, i + 20)[0]
            if i + 22 + comment_len == len(data):
                return i
    raise ValueError("ZIP End Of Central Directory not found")


def content_digest(sections: list[bytes]) -> bytes:
    chunk_digests: list[bytes] = []
    for section in sections:
        for off in range(0, len(section), CHUNK_SIZE):
            chunk = section[off:off + CHUNK_SIZE]
            chunk_digests.append(hashlib.sha256(b"\xA5" + u32(len(chunk)) + chunk).digest())
    return hashlib.sha256(b"\x5A" + u32(len(chunk_digests)) + b"".join(chunk_digests)).digest()


def openssl(*args: str, input_data: bytes | None = None) -> bytes:
    res = subprocess.run(["openssl", *args], input=input_data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return res.stdout


def make_cert_and_signature(signed_data: bytes) -> tuple[bytes, bytes, bytes]:
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        key = td / "debug-key.pem"
        cert_pem = td / "debug-cert.pem"
        cert_der = td / "debug-cert.der"
        pub_der = td / "debug-pub.der"
        signed_data_path = td / "signed-data.bin"
        sig_path = td / "signature.bin"

        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key), "-out", str(cert_pem), "-days", "10000", "-nodes",
            "-sha256", "-subj", "/CN=QuizMed X Debug/O=QuizMed X/C=EG",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        subprocess.run(["openssl", "x509", "-in", str(cert_pem), "-outform", "DER", "-out", str(cert_der)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["openssl", "x509", "-in", str(cert_pem), "-pubkey", "-noout", "-out", str(td / "pub.pem")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["openssl", "pkey", "-pubin", "-in", str(td / "pub.pem"), "-outform", "DER", "-out", str(pub_der)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        signed_data_path.write_bytes(signed_data)
        subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(key), "-out", str(sig_path), str(signed_data_path)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return cert_der.read_bytes(), pub_der.read_bytes(), sig_path.read_bytes()


def build_v2_value(apk_data: bytes, cd_offset: int, eocd_offset: int) -> bytes:
    central_dir = apk_data[cd_offset:eocd_offset]
    eocd_for_digest = bytearray(apk_data[eocd_offset:])
    # For v2 verification the EOCD cd offset is treated as the signing-block offset.
    struct.pack_into("<I", eocd_for_digest, 16, cd_offset)
    digest = content_digest([apk_data[:cd_offset], central_dir, bytes(eocd_for_digest)])

    digest_record = lp(u32(SIG_ALG_RSA_PKCS1_V1_5_WITH_SHA256) + lp(digest))
    digests = lp(digest_record)

    # Build signed_data first, sign it, then build signer.
    # certificates and public key are derived from a generated debug cert.
    placeholder_cert = b""
    signed_data_no_cert = digests + lp(lp(placeholder_cert)) + lp(b"")
    # Need real cert before signing, so generate key/cert once with a provisional
    # signed_data rebuilt below. The signature only signs the final signed_data.
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        key = td / "debug-key.pem"
        cert_pem = td / "debug-cert.pem"
        cert_der_path = td / "debug-cert.der"
        pub_der_path = td / "debug-pub.der"
        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key), "-out", str(cert_pem), "-days", "10000", "-nodes",
            "-sha256", "-subj", "/CN=QuizMed X Debug/O=QuizMed X/C=EG",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        subprocess.run(["openssl", "x509", "-in", str(cert_pem), "-outform", "DER", "-out", str(cert_der_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        subprocess.run(["openssl", "x509", "-in", str(cert_pem), "-pubkey", "-noout", "-out", str(td / "pub.pem")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        subprocess.run(["openssl", "pkey", "-pubin", "-in", str(td / "pub.pem"), "-outform", "DER", "-out", str(pub_der_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        cert_der = cert_der_path.read_bytes()
        pub_der = pub_der_path.read_bytes()
        signed_data = digests + lp(lp(cert_der)) + lp(b"")
        sd_path = td / "signed-data.bin"
        sig_path = td / "sig.bin"
        sd_path.write_bytes(signed_data)
        subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(key), "-out", str(sig_path), str(sd_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        signature = sig_path.read_bytes()

    sig_record = lp(u32(SIG_ALG_RSA_PKCS1_V1_5_WITH_SHA256) + lp(signature))
    signatures = lp(sig_record)
    signer = lp(signed_data) + signatures + lp(pub_der)
    signers = lp(lp(signer))
    return signers


def sign_apk_v2(unsigned_apk: str, out_apk: str) -> None:
    data = pathlib.Path(unsigned_apk).read_bytes()
    eocd_offset = find_eocd(data)
    cd_size = struct.unpack_from("<I", data, eocd_offset + 12)[0]
    cd_offset = struct.unpack_from("<I", data, eocd_offset + 16)[0]
    if cd_offset + cd_size != eocd_offset:
        raise ValueError("ZIP central directory layout is not supported")

    v2_value = build_v2_value(data, cd_offset, eocd_offset)
    pair = u64(4 + len(v2_value)) + u32(APK_SIGNATURE_SCHEME_V2_BLOCK_ID) + v2_value
    size = len(pair) + 8 + len(APK_SIG_BLOCK_MAGIC)
    signing_block = u64(size) + pair + u64(size) + APK_SIG_BLOCK_MAGIC

    new_eocd = bytearray(data[eocd_offset:])
    struct.pack_into("<I", new_eocd, 16, cd_offset + len(signing_block))
    out = data[:cd_offset] + signing_block + data[cd_offset:eocd_offset] + bytes(new_eocd)
    pathlib.Path(out_apk).write_bytes(out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: sign_apk_v2.py unsigned.apk signed.apk")
    sign_apk_v2(sys.argv[1], sys.argv[2])
