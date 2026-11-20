#!/usr/bin/env python3
"""Hook InstructionsLoaded: ghi lại file chỉ dẫn nào được nạp và vì sao.

Mỗi lần Claude Code nạp một CLAUDE.md hoặc một file trong .claude/rules/,
hook này thêm một dòng vào out/instructions.log. Hook chỉ để quan sát,
nó không chặn hay sửa được việc nạp.
"""
import json
import os
import sys

event = json.load(sys.stdin)
project = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
home = os.path.expanduser("~")


def short(path):
    """Rút gọn đường dẫn: tương đối với dự án, hoặc bắt đầu bằng ~."""
    if not path:
        return ""
    real, root = os.path.realpath(path), os.path.realpath(project)
    if real == root or real.startswith(root + os.sep):
        return os.path.relpath(real, root)
    if path.startswith(home):
        return "~" + path[len(home):]
    return path


line = "{:<16} {:<8} {}".format(
    event.get("load_reason", "?"),
    event.get("memory_type", "?"),
    short(event.get("file_path")),
)
trigger = event.get("trigger_file_path")
if trigger:
    line += "   (do đọc {})".format(short(trigger))

log_path = os.path.join(project, "out", "instructions.log")
with open(log_path, "a", encoding="utf-8") as log:
    log.write(line + "\n")
