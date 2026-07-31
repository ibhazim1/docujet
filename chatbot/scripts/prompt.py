"""Small CLI for prompting the DeepSeek model through the LLM wrapper.

Run from the project root so the ``chatbot`` package is importable:

	python -m chatbot.scripts.prompt "What is retrieval augmented generation?"
	python -m chatbot.scripts.prompt                    # interactive chat, Ctrl-C or "exit" to quit
	python -m chatbot.scripts.prompt -m deepseek-reasoner "Solve 17 * 23 step by step"
	python -m chatbot.scripts.prompt --tokens "Say hi"  # also print the call's token usage

For questions answered from the Documation knowledge base, use
``chatbot.scripts.ask`` instead — this script talks to the model unguarded.
"""

import argparse
import sys

from chatbot.core.llm import DEFAULT_MODEL, LLM


def main() -> int:
	parser = argparse.ArgumentParser(description="Prompt the DeepSeek model.")
	parser.add_argument("prompt", nargs="*", help="Prompt text. Omit for interactive chat.")
	parser.add_argument("-m", "--model", default=DEFAULT_MODEL, help=f"Model name (default: {DEFAULT_MODEL})")
	parser.add_argument("-t", "--temperature", type=float, default=0.7, help="Sampling temperature")
	parser.add_argument("--max-tokens", type=int, default=None, help="Max tokens in the reply")
	parser.add_argument("--tokens", action="store_true", help="Print token usage for each reply")
	parser.add_argument("--system", default=None, help="Optional system prompt")
	args = parser.parse_args()

	llm = LLM(model=args.model, return_token_count=args.tokens)

	def ask(messages: list[dict[str, str]]) -> str:
		result = llm.generate_response(
			messages,
			temperature=args.temperature,
			max_output_tokens=args.max_tokens,
		)
		if args.tokens:
			print(f"[{result.token_count} tokens]", file=sys.stderr)
			return result.output
		return result

	messages: list[dict[str, str]] = []
	if args.system:
		messages.append({"role": "system", "content": args.system})

	# One-shot mode: prompt given on the command line.
	if args.prompt:
		messages.append({"role": "user", "content": " ".join(args.prompt)})
		print(ask(messages))
		return 0

	# Interactive mode: keep the conversation history across turns.
	print(f"Chatting with {args.model}. Type 'exit' or Ctrl-C to quit.\n")
	while True:
		try:
			user_input = input("you> ").strip()
		except (EOFError, KeyboardInterrupt):
			print()
			return 0
		if not user_input:
			continue
		if user_input.lower() in {"exit", "quit"}:
			return 0

		messages.append({"role": "user", "content": user_input})
		reply = ask(messages)
		messages.append({"role": "assistant", "content": reply})
		print(f"\n{args.model}> {reply}\n")


if __name__ == "__main__":
	raise SystemExit(main())
