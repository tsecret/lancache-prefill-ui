#!/bin/sh
# Entrypoint script to inject BACKEND_HOST environment variable into the built HTML
# This allows runtime configuration without rebuilding the Docker image

BACKEND_URL="${BACKEND_HOST:-http://localhost:3000}"

# Ensure BACKEND_URL doesn't have a trailing slash
BACKEND_URL=$(echo "$BACKEND_URL" | sed 's|/$||')

HTML_FILE="/usr/share/nginx/html/index.html"

# Check if index.html exists
if [ ! -f "$HTML_FILE" ]; then
    echo "ERROR: $HTML_FILE not found!"
    exit 1
fi

echo "Injecting BACKEND_HOST: ${BACKEND_URL} into $HTML_FILE"

# Show original content for debugging
echo "Before replacement:"
grep -A 2 -B 2 "__API_BASE_URL__" "$HTML_FILE" || echo "No __API_BASE_URL__ found in original file"

# Replace the assignment line (simpler pattern now)
# Using | as delimiter to avoid issues with / in URLs
sed -i "s|window\\.__API_BASE_URL__ = 'http://localhost:3000';|window.__API_BASE_URL__ = '${BACKEND_URL}';|g" "$HTML_FILE"

# Also replace just the localhost URL as a fallback (in case HTML format is different)
# Only escape & if it exists in the URL (since & means "matched text" in sed replacement)
if echo "$BACKEND_URL" | grep -q '&'; then
    ESCAPED_URL=$(echo "$BACKEND_URL" | sed 's|&|\\&|g')
    sed -i "s|http://localhost:3000|${ESCAPED_URL}|g" "$HTML_FILE"
else
    sed -i "s|http://localhost:3000|${BACKEND_URL}|g" "$HTML_FILE"
fi

# Pattern 3: If the script tag doesn't exist, add it before the closing head tag
if ! grep -q "__API_BASE_URL__" "$HTML_FILE"; then
    echo "Adding __API_BASE_URL__ script tag..."
    sed -i "s|</head>|<script>window.__API_BASE_URL__ = '${BACKEND_URL}';</script></head>|g" "$HTML_FILE"
fi

# Verify the replacement worked
echo "After replacement:"
if grep -q "__API_BASE_URL__" "$HTML_FILE"; then
    echo "Successfully injected BACKEND_HOST"
    grep "__API_BASE_URL__" "$HTML_FILE" | head -1
else
    echo "WARNING: Could not find __API_BASE_URL__ in HTML file after replacement"
fi

# Start nginx
exec nginx -g "daemon off;"
