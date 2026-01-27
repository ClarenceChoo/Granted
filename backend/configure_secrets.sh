#!/bin/bash

# Usage: ./configure_secrets.sh .env

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    exit 1
fi

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    # Remove possible quotes and whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs | sed 's/^"\(.*\)"$/\1/')
    # Set the secret using Firebase CLI
    firebase functions:secrets:set "$key" --data="$value"
done < "$ENV_FILE"