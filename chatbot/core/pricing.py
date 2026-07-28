"""DeepSeek rate card and cost computation.

Prices move, so they are data rather than constants baked into call sites: the
defaults below can be overridden per-model through environment variables, and
the Streamlit app exposes them as editable fields so a live demo always shows
what the audience believes today's rate to be.
"""

import os

from chatbot.core.schemas import CostEstimate, TokenUsage

#: USD per 1,000,000 tokens. Verify against https://api-docs.deepseek.com/quick_start/pricing
#: before quoting these figures to anyone — DeepSeek has repriced several times.
DEFAULT_RATES: dict[str, dict[str, float]] = {
	"deepseek-chat": {
		"cache_hit_per_1m": 0.028,
		"cache_miss_per_1m": 0.28,
		"output_per_1m": 0.42,
	},
	"deepseek-reasoner": {
		"cache_hit_per_1m": 0.028,
		"cache_miss_per_1m": 0.28,
		"output_per_1m": 0.42,
	},
}

#: Used when a model name is not in the rate card, so an unknown model still
#: produces a number instead of silently costing zero.
FALLBACK_RATE = DEFAULT_RATES["deepseek-chat"]


class RateCard:
	"""Per-model token prices, in USD per 1M tokens."""

	def __init__(self, rates: dict[str, dict[str, float]] | None = None):
		self.rates = {model: dict(values) for model, values in (rates or DEFAULT_RATES).items()}

	@classmethod
	def from_env(cls) -> "RateCard":
		"""Loads the rate card, applying any ``DEEPSEEK_PRICE_*`` overrides.

		Recognised variables (all USD per 1M tokens, applied to every model):
		``DEEPSEEK_PRICE_CACHE_HIT``, ``DEEPSEEK_PRICE_CACHE_MISS``,
		``DEEPSEEK_PRICE_OUTPUT``.
		"""
		card = cls()
		overrides = {
			"cache_hit_per_1m": os.getenv("DEEPSEEK_PRICE_CACHE_HIT"),
			"cache_miss_per_1m": os.getenv("DEEPSEEK_PRICE_CACHE_MISS"),
			"output_per_1m": os.getenv("DEEPSEEK_PRICE_OUTPUT"),
		}
		for key, raw in overrides.items():
			if raw is None:
				continue
			try:
				value = float(raw)
			except ValueError:
				continue
			for model in card.rates:
				card.rates[model][key] = value
		return card

	def for_model(self, model: str) -> dict[str, float]:
		return self.rates.get(model, FALLBACK_RATE)

	def set_model_rates(
		self,
		model: str,
		cache_hit_per_1m: float,
		cache_miss_per_1m: float,
		output_per_1m: float,
	) -> None:
		"""Replaces one model's prices — used by the app's editable rate fields."""
		self.rates[model] = {
			"cache_hit_per_1m": cache_hit_per_1m,
			"cache_miss_per_1m": cache_miss_per_1m,
			"output_per_1m": output_per_1m,
		}

	def estimate(self, usage: TokenUsage, model: str) -> CostEstimate:
		"""Converts token counts into a USD cost estimate for ``model``."""
		rate = self.for_model(model)
		cache_hit = usage.cache_hit_tokens / 1_000_000 * rate["cache_hit_per_1m"]
		cache_miss = usage.cache_miss_tokens / 1_000_000 * rate["cache_miss_per_1m"]
		output = usage.completion_tokens / 1_000_000 * rate["output_per_1m"]
		return CostEstimate(
			cache_hit_cost_usd=cache_hit,
			cache_miss_cost_usd=cache_miss,
			output_cost_usd=output,
			total_cost_usd=cache_hit + cache_miss + output,
		)


def estimate_tokens(text: str) -> int:
	"""Rough token count for text that has not been sent to the API yet.

	DeepSeek's tokenizer is not available offline, so this uses their published
	rule of thumb (~0.3 tokens per English character, ~0.6 per CJK character).
	Only ever used for pre-flight display; every billed figure in the app comes
	from the API's own usage report.
	"""
	if not text:
		return 0
	cjk = sum(1 for ch in text if "一" <= ch <= "鿿")
	return int(cjk * 0.6 + (len(text) - cjk) * 0.3) + 1
