# KnownAsNeo Portfolio — redesign preview

This branch contains the portfolio redesign and the Neo AI assistant frontend/backend.

## Safe preview
1. Open PR #1: https://github.com/nathanielclintsuyod0-collab/game/pull/1
2. Preview the static site locally first, or connect the repository to a separate Netlify site and use the PR Deploy Preview. Do not change the GitHub Pages production source or DNS while reviewing.
3. If you want a simple local preview, download the branch and run a static server from the project directory, for example \`python -m http.server 8000\`, then visit \`http://localhost:8000\`.

## GitHub Pages + Netlify Function
GitHub Pages only serves static files. The OpenAI API call must go through a server-side function.

1. Create a separate Netlify site connected to this repository. Keep its production branch set to \`main\`; do not change the domain or DNS for hyterion.xyz.
2. In Netlify build settings, set the base directory to the repository root, publish directory to \`.\`, and use the included \`netlify.toml\` to discover \`netlify/functions\`.
3. Enable Deploy Previews for pull requests. Netlify gives the PR a separate preview URL. It can also run the function at \`/.netlify/functions/chat\`.
4. Add \`OPENAI_API_KEY\` through Netlify Site configuration → Environment variables, with Functions scope if that scope is available. Never put the key in GitHub, HTML, CSS, or browser JavaScript. Add \`OPENAI_MODEL\` optionally if you want to select another model supported by your account.
5. Set \`ALLOWED_ORIGINS\` to a comma-separated list of exact origins that may call the function, without trailing slashes. For production, use \`https://hyterion.xyz,https://www.hyterion.xyz\`. To test a Netlify Deploy Preview, add that exact preview origin temporarily as well. To test locally, add \`http://localhost:8000\` temporarily. Remove temporary origins afterward.
6. Redeploy after changing environment variables. Netlify applies variable changes to new deploys.
7. Once the backend URL is available, edit \`script.js\` and replace \`https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/chat\` with your actual Netlify function URL. This URL is public by design; the API key is not.
8. Deploy the updated static files through the existing GitHub Pages workflow only after reviewing the pull request. No domain changes are needed.

## Contact form
Replace \`YOUR_EMAIL@example.com\` in \`script.js\` with the contact email you want visitors to use. The form opens the visitor's email app; it is not a server-side form processor.

## Before public launch
- Verify all project and social links and check the website on desktop/mobile.
- Test successful chat, missing API key, rate limits, and disallowed origins.
- Add request rate limiting / abuse protection before advertising the public AI endpoint. CORS is not authentication and cannot prevent direct API requests.
- Use a separate, tightly budgeted OpenAI project/key for the portfolio if possible and monitor usage.
- Merge PR #1 only after review. This branch does not update the live site by itself.


## Monetization preview (manual, not live payments)
- The Services section is positioned for custom project inquiries and quote-first work; no prices or delivery guarantees are invented.
- The Support section lets visitors select a suggested amount (₱50, ₱100, ₱250, or custom) and pre-fills the contact form to request current GCash instructions. It does not accept payments, collect financial credentials, or verify transfers.
- The partnership card offers directly negotiated, clearly disclosed sponsored placements. No third-party ad network or tracking code is enabled.
- Before launch, replace `YOUR_EMAIL@example.com` in `script.js` with a contact email you control. The contact form uses the visitor's email app and will not work until this is configured.
- For manual GCash transactions, share payment details privately after discussing the request; verify the transfer in your own GCash account before confirming support or starting paid work. Do not collect OTPs, PINs, or passwords.
- For automated ads later, apply to a suitable ad provider and follow its approval, consent, and disclosure requirements. Keep ad scripts disabled until approved.
- This work is committed only to `redesign/neo-ai-portfolio`; do not merge PR #1 or change GitHub Pages production settings without explicit approval.


### Service pricing (feature branch preview)
The Services section displays these introductory starting estimates in PHP:
- Minecraft Server Setup — ₱500 per setup
- Custom Skript Development — ₱150 per small script
- Fixes and Debugging — ₱100 per small fix
- Maintenance — ₱500 per month
- Web Development — ₱800 per landing page
- Discord Bot Development — ₱500 per basic bot feature

These are example starting prices, not guaranteed fixed quotes. Confirm the scope, delivery, included revisions, third-party costs, and payment terms with the client before accepting work. The service cards animate on hover and prefill the contact form; the form still requires a real recipient email in `script.js` to be configured before it can be used.
