// Set VITE_N8N_WEBHOOK_URL in .env.local to go live. Empty = mock mode.
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() || '';

export async function analyzeItem(images) {
  if (!WEBHOOK_URL) return mockAnalyze(images);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// --- Mock backend (matches docs/CONTRACT.md response shape exactly) ---

const SAMPLES = [
  {
    title: "Levi's 501 Straight Leg Jeans W32 L32",
    category: "Men's Jeans",
    brand: "Levi's",
    condition_grade: 'B',
    defects: ['Light fading at knees', 'Small scuff on back pocket'],
    description:
      "Classic Levi's 501s in a mid-wash blue. Honest wear consistent with age — sturdy denim with plenty of life left. Button fly, straight leg.",
    suggested_price_gbp: 24,
    price_reasoning: '501s in wearable condition typically resell for £20–30.',
  },
  {
    title: 'Burberry Nova Check Cotton Shirt, M',
    category: "Men's Shirts",
    brand: 'Burberry',
    condition_grade: 'A',
    defects: [],
    description:
      'Genuine Burberry shirt in the signature nova check. Crisp cotton, no visible flaws — presents nearly new. Collar and cuffs clean.',
    suggested_price_gbp: 58,
    price_reasoning: 'Authentic Burberry shirts in grade-A condition hold £50–70.',
  },
  {
    title: 'Vintage Wool Fisherman Jumper, Cream, L',
    category: 'Knitwear',
    brand: null,
    condition_grade: 'C',
    defects: ['Small hole at left cuff', 'Slight bobbling overall'],
    description:
      'Heavy cream fisherman knit with a proper cable pattern. A mendable cuff hole and light bobbling keep the price friendly — great winter piece.',
    suggested_price_gbp: 14,
    price_reasoning: 'Unbranded vintage knits with visible flaws move fastest under £15.',
  },
  {
    title: 'Nike Vintage Track Jacket, Navy/White, S',
    category: 'Sportswear',
    brand: 'Nike',
    condition_grade: 'B',
    defects: ['Zip pull slightly stiff'],
    description:
      '90s-style Nike track jacket in navy with white piping. Clean panels, embroidered swoosh, minor stiffness in the zip that works fine.',
    suggested_price_gbp: 22,
    price_reasoning: 'Vintage Nike track tops in this condition list at £18–28.',
  },
];

let cursor = 0;

function mockAnalyze() {
  const sample = SAMPLES[cursor++ % SAMPLES.length];
  return new Promise((resolve) => setTimeout(() => resolve({ ...sample }), 1600));
}
