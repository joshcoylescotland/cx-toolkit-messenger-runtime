# CX Toolkit Messenger Runtime v6

Static HTTPS Messenger host for CX Toolkit. v6 adds an idle/prewarmed mode: the page can load before a deployment is launched, then receives environment/deployment/participant data from the extension via postMessage. This keeps the genuine Genesys Messenger runtime on a normal HTTPS origin while moving GitHub page-load latency out of the user's Launch action.
