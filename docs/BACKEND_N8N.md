# Backend — n8n Workflow

One n8n Cloud workflow, one OpenAI vision request per garment, and no database.

```
Webhook (POST /scan-item)
    → Validate and prepare 1–5 images
    → OpenAI vision analysis
    → Parse and validate listing JSON
    → Respond to Webhook
```

The preparation node is required because the frontend sends an array of base64 data URIs while the current n8n OpenAI image node expects named binary fields. Pricing, grading, defects, and listing copy still come from one OpenAI call.

## Fast setup: import the prepared workflow

1. Create an account at **n8n.cloud** and open a workspace.
2. Create an OpenAI API key at <https://platform.openai.com/api-keys>. Ensure API billing is enabled.
3. In n8n, open **Credentials → Add credential → OpenAI API**.
4. Paste the API key. Leave Organization ID empty unless the OpenAI account uses multiple organizations.
5. In n8n, choose **Import from File** and import `docs/FLEEK_N8N_WORKFLOW.json`.
6. Open **Analyze Garment** and select the OpenAI credential created above.
7. Confirm the model is `gpt-4o-mini`, then save the workflow.

The imported workflow contains:

- **Scan Item Webhook** — receives `{ "images": [...] }` at `POST /scan-item` and enables CORS.
- **Validate and Prepare Images** — checks the 1–5 image contract and converts the data URIs to n8n binary fields.
- **Analyze Garment** — sends every photo in one `gpt-4o-mini` vision request.
- **Parse and Validate Listing** — parses JSON and verifies all fields from `docs/CONTRACT.md`.
- **Return Listing** — returns JSON with the required CORS header.

## Test before connecting the app

The request must contain a real image. A placeholder base64 string is not a valid OpenAI image.

1. In the webhook node, select **Listen for test event** and copy its **Test URL**.
2. Put a JPEG named `test-item.jpg` in the repository root.
3. From PowerShell in the repository root, run:

```powershell
$bytes = [IO.File]::ReadAllBytes((Resolve-Path ".\test-item.jpg"))
$image = "data:image/jpeg;base64,$([Convert]::ToBase64String($bytes))"
$body = @{ images = @($image) } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "<TEST_URL>" -ContentType "application/json" -Body $body
```

Expected response:

```json
{
  "title": "string",
  "category": "string",
  "brand": "string or null",
  "condition_grade": "A|B|C|D",
  "defects": [],
  "description": "string",
  "suggested_price_gbp": 12.5,
  "price_reasoning": "string"
}
```

If testing fails, open the n8n execution and inspect the first red node. Common causes are invalid OpenAI credentials, disabled OpenAI billing, or an unsupported/invalid image.

## Activate and connect the frontend

1. Turn the workflow **Active**. The Test URL only works while n8n is listening; the app needs the **Production URL**.
2. Copy the webhook node's Production URL.
3. In the repository root, copy `.env.example` to `.env.local`.
4. Set:

```dotenv
VITE_N8N_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/scan-item
```

5. Restart `npm run dev`. Vite only reads environment variables when it starts.
6. Capture a garment and select **Analyze Item**.
7. Confirm the returned listing appears in the review screen and then in the dashboard.

To return to the mock backend, remove the variable's value and restart Vite.

## Troubleshooting

- **Browser says network error, but n8n works manually:** activate the workflow, use the Production URL, and confirm Allowed Origins is `*`.
- **404 from webhook:** the workflow is inactive or the Test URL was used outside test-listening mode.
- **401/429 from OpenAI:** check the n8n credential, API billing, and quota.
- **`parse_failed`:** inspect the raw OpenAI output in the Parse and Validate Listing node.
- **Request times out:** inspect the n8n execution. n8n Cloud webhooks have a 100-second limit, but one `gpt-4o-mini` vision request should normally finish well within it.
- **Environment variable seems ignored:** restart the Vite development server.

## Explicitly out of scope

- No database; the Zustand store holds items for the current browser session.
- No direct OpenAI call from the browser; the secret remains in n8n.
- No separate pricing call; one model request performs the complete analysis.
- No real eBay/Vinted posting; posting remains a client-side demo action.
