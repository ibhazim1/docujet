import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from chatbot.core.schemas import TokenUsage

load_dotenv()

DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEFAULT_MODEL = "deepseek-chat"
REASONING_MODELS = {"deepseek-reasoner"}


class LLMResponse(BaseModel):
	"""Wraps a generation result together with its token usage.

	Returned by ``LLM.generate_response()`` only when the ``LLM`` instance was
	created with ``return_token_count=True``. ``output`` holds whatever the plain
	call would have returned (a ``str`` for unstructured calls, or a parsed
	``BaseModel`` for structured ones); ``token_count`` is the call's combined
	input+output total (``response.usage.total_tokens``).

	``output`` is typed ``Any`` on purpose: it may hold an arbitrary ``BaseModel``
	subclass instance (the caller's response schema), which pydantic must store
	as-is rather than try to validate/coerce.

	``usage`` carries the same call's full breakdown — prompt/completion split and
	DeepSeek's context-cache hit/miss counts — which is what cost estimation needs;
	``token_count`` is kept as the pre-existing combined total.
	"""

	output: Any
	token_count: int
	usage: TokenUsage | None = None


class LLM:
	"""Handles connection with the DeepSeek API and executes the prompts given.

	DeepSeek exposes an OpenAI-compatible ``/chat/completions`` endpoint, so the
	official ``openai`` client is reused with a DeepSeek ``base_url``. Note that
	DeepSeek does *not* implement the newer Responses API, hence the chat
	completions calls below.
	"""

	def __init__(
		self,
		api_key: str | None = None,
		base_url: str | None = DEEPSEEK_BASE_URL,
		model: str | None = DEFAULT_MODEL,
		response_schema: type[BaseModel] | None = None,
		return_token_count: bool = False,
	):
		"""Initializes a LLM object

		Args:
			api_key (str | None, optional): The API key for authenticating with DeepSeek.
				Falls back to the DEEPSEEK_API_KEY environment variable.
			base_url (str | None, optional): The base URL for the API. Defaults to https://api.deepseek.com/v1.
			model (str | None, optional): The model to use for generation. Defaults to "deepseek-chat".
			response_schema (type[BaseModel] | None, optional): Pydantic schema for structured responses.
			return_token_count (bool, optional): When True, generate_response() returns an
				LLMResponse (output + token_count) instead of the bare output. Defaults to False.
		"""
		self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
		if not self.api_key:
			raise ValueError("No API key provided and DEEPSEEK_API_KEY is not set.")
		self.base_url = base_url
		self.model = model
		self.response_schema = response_schema
		self.client: OpenAI = OpenAI(api_key=self.api_key, base_url=self.base_url)
		self.return_token_count = return_token_count

	@staticmethod
	def _to_messages(input: Any) -> list[dict[str, Any]]:
		"""Normalizes the input into the chat completions ``messages`` format."""
		if isinstance(input, str):
			return [{"role": "user", "content": input}]
		if isinstance(input, dict):
			return [input]
		return list(input)

	@staticmethod
	def _with_schema_instruction(
		messages: list[dict[str, Any]], schema: type[BaseModel]
	) -> list[dict[str, Any]]:
		"""Appends JSON-schema instructions so the model emits a parseable object.

		DeepSeek's JSON mode only guarantees syntactically valid JSON — it has no
		``json_schema`` response format — so the target schema is described in the
		prompt and the result is validated with pydantic afterwards. The literal
		word "json" must appear in the prompt for JSON mode to be accepted.
		"""
		instruction = (
			"Respond with a single json object and nothing else (no markdown fences, "
			"no commentary). It must conform to this JSON schema:\n"
			f"{json.dumps(schema.model_json_schema(), indent=2)}"
		)
		return messages + [{"role": "system", "content": instruction}]

	def generate_response(
		self,
		input: Any,
		model: str | None = None,
		reasoning: dict | None = None,
		temperature: float | None = 0.7,
		max_output_tokens: int | None = None,
		response_schema: type[BaseModel] | None = None,
	) -> str | BaseModel | LLMResponse | None:
		"""Generates a response from the LLM based on the provided input and parameters.

		Args:
			input (str | dict | list[dict[str, Any]]): The prompt, or chat messages.
			model (str | None, optional): The model to use. Defaults to the LLM instance's model.
			reasoning (dict | None, optional): Accepted for backwards compatibility and
				ignored — DeepSeek has no reasoning-effort knob; use the
				"deepseek-reasoner" model instead to get chain-of-thought behaviour.
			temperature (float | None, optional): Sampling temperature. Ignored for
				reasoning models, which reject it. Defaults to 0.7.
			max_output_tokens (int | None, optional): Maximum number of tokens in the output.
			response_schema (type[BaseModel] | None, optional): Overrides the instance schema.

		Returns:
			str | BaseModel | LLMResponse | None: Normally the generated response text
			(str) or parsed schema instance (BaseModel). If this LLM was created with
			return_token_count=True, instead returns an LLMResponse wrapping that same
			value plus the call's total token count.
		"""
		# Set model to instance default if not provided
		if model is None:
			model = self.model

		# Reasoning models do not accept sampling parameters
		if model in REASONING_MODELS:
			temperature = None

		messages = self._to_messages(input)
		schema = response_schema if response_schema is not None else self.response_schema

		kwargs: dict[str, Any] = {
			"model": model,
			"messages": messages,
			"max_tokens": max_output_tokens,
		}
		if temperature is not None:
			kwargs["temperature"] = temperature

		if schema is not None:
			kwargs["messages"] = self._with_schema_instruction(messages, schema)
			# JSON mode is unsupported on the reasoner, which is prompted-only.
			if model not in REASONING_MODELS:
				kwargs["response_format"] = {"type": "json_object"}

		response = self.client.chat.completions.create(**kwargs)
		content = response.choices[0].message.content
		usage = TokenUsage.from_api_usage(response.usage)
		token_count = usage.total_tokens

		if schema is not None:
			output = schema.model_validate_json(self._strip_fences(content or ""))
		else:
			output = content

		if self.return_token_count:
			return LLMResponse(output=output, token_count=token_count, usage=usage)
		return output

	@staticmethod
	def _strip_fences(text: str) -> str:
		"""Removes ```json fences the model may wrap the object in."""
		text = text.strip()
		if text.startswith("```"):
			text = text.split("\n", 1)[-1]
			if text.endswith("```"):
				text = text[: -len("```")]
		return text.strip()
