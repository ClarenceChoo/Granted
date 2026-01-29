#!/bin/bash

# Script to tear down all Firebase Functions
# This will delete all deployed functions from Firebase
# Use with caution - this action cannot be undone!

echo "🔥 Firebase Functions Teardown Script"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will DELETE all Firebase Functions!"
echo "    This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Teardown cancelled."
    exit 0
fi

echo ""
echo "📋 List of functions to delete:"
echo "================================"

# Show the functions list
firebase functions:list

echo ""
echo "🗑️  Starting deletion process..."
echo ""

# Delete all functions using a simple command
echo "Running: firebase functions:delete --force --region asia-southeast1"
echo ""

firebase functions:delete \
  create_npo \
  deactivate_npo \
  get_grant \
  get_matches \
  get_npo \
  get_saved_grants \
  healthcheck \
  login_npo \
  match_grants_daily \
  match_grants_manual \
  on_grant_change \
  on_npo_change \
  save_grant \
  search_grants \
  send_grant_emails_manual \
  send_hello_world_email \
  send_weekly_grant_emails \
  sync_grants_daily \
  sync_grants_manual \
  unsave_grant \
  update_npo \
  --force \
  --region asia-southeast1

echo ""
echo "======================================"
echo "🎉 Teardown complete!"
echo ""
echo "Note: The ext-firestore-send-email-processqueue function"
echo "is a Firebase Extension and needs to be uninstalled separately:"
echo "  firebase ext:uninstall firestore-send-email"
echo ""
