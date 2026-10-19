# Support triage agent

One paragraph: what your agent does, for whom, and what it never does on its own.

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...   # or the key for the model you use
python agent.py "I can't export my notes to PDF"
```

## Architecture

- **Tools:** list each tool, what it does and its permissions.
- **MCP server:** what `mcp_server.py` exposes and why it is a server rather than a plain function.
- **Retrieval:** where the knowledge base comes from and how answers cite it.
- **Human approval:** which actions wait for a person, and how (`agent.py::ask_human`).
- **Limits:** step, time and cost caps, and what the user sees when one is hit.
- **Tracing:** what each span records (see `traces/example.json`).

## Design decisions

Three to five decisions and why you made them, for example: why one agent instead of several,
why a tool is read-only, how you chose the eval tasks.

## Evals

`python evals/run_evals.py` runs the tasks in `evals/tasks.jsonl` and writes `eval_report.json`.
Current pass rate: __ / __.
