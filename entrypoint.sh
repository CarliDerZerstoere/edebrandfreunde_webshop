#!/bin/sh
export RSA_PRIVATE_KEY="$(cat /run/secrets/rsa.pem)"
exec "$@"
