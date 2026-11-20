#!/bin/sh
# Cách dùng: ./extract.sh <file prompt> <file schema> <file văn bản>
# In ra structured_output (JSON) của một lượt trích xuất.
claude -p "$(cat "$1")

<document>
$(cat "$3")
</document>" --model haiku --output-format json --json-schema "$(cat "$2")" < /dev/null | jq '.structured_output'
