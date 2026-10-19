# CX Toolkit Messenger Runtime v4

Static HTTPS runtime for the CX Toolkit Chrome extension. v4 waits for the Genesys `MessagingService.conversationCleared` event after `MessagingService.clearConversation` before acknowledging Toolkit teardown. This is intended to end the active web-messaging test conversation before the hosted runtime is destroyed or switched.
