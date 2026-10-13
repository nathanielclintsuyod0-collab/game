# KnownAsNeo Portfolio — redesign preview

This branch contains a premium editorial redesign for Hyterion.xyz and the frontend for the Neo AI portfolio assistant.

## Files changed
- \`index.html\` — redesigned single-page portfolio and chat widget
- \`style.css\` — responsive styling and reduced-motion support
- \`script.js\` — navigation, contact form, and AI chat UI
- \`netlify/functions/chat.js\` — server-side OpenAI API proxy
- \`netlify.toml\` — Netlify Functions configuration

## Preview safely
1. Open a pull request from \`redesign/neo-ai-portfolio\` into \`main\`.
2. If Netlify is connected to this repository, enable Deploy Previews and open the preview URL from the pull request.
3. Otherwise, download this branch and serve it locally with a static server. The portfolio works without the AI function; the AI requires the serverless function.

## Configure Neo AI
The OpenAI API key must only be stored as a server-side environment variable. Never add it to \`index.html\`, \`script.js\`, or any other public file.

For Netlify:
1. Open Site configuration → Environment variables.
2. Add \`OPENAI_API_KEY\` with your secret API key.
3. Optionally add \`OPENAI_MODEL\` with a model available to your account; the function defaults to \`gpt-5-mini\`.
4. Ensure Functions are deployed from \`netlify/functions\`, then redeploy the preview.
5. Test by opening the assistant and asking about a project.

If your current host only serves static GitHub Pages files, the function will not run there. Keep the static site on GitHub Pages and deploy the function on a serverless host, then update the chat endpoint in \`script.js\` to that function URL and configure its allowed origin.

## Before production
- Verify every project link and the public Discord invite.
- Set the actual contact email in \`script.js\` instead of the placeholder.
- Check the site on desktop and mobile.
- Test chat errors, rate limits, keyboard navigation, and reduced motion.
- Merge the pull request only after reviewing the preview. This branch does not update the live site by itself.
