#!/usr/bin/env python3
"""Patch Command Code Desktop so GET_CLI_MODELS includes BYOK providers."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

APP = Path("/Applications/Command Code.app")
TARGET = APP / "Contents/Resources/app/out/main/index.js"
BACKUP = TARGET.with_suffix(".js.pre-byok")
PATCH = Path(__file__).resolve().parent.parent / "patches" / "desktop-byok-picker.js"

OLD = """async function fetchModels() {
  return getModelGroupsInOrder().flatMap(
    (group) => group.models.map((option) => ({
      id: option.id,
      label: option.label ?? option.name ?? option.id,
      description: option.description,
      category: group.label,
      reasoningEfforts: option.reasoningEfforts ? [...option.reasoningEfforts] : void 0,
      outputTokenLimit: getMaxOutputTokenLimit(option.id),
      vision: option.inputModalities ? option.inputModalities.includes("image") : inferVision(option.id, option.provider ?? ""),
      zdr: modelSupportsZdr(option.id),
      badge: option.badge
    }))
  );
}"""


def resign() -> None:
    subprocess.run(
        [
            "codesign",
            "--force",
            "--sign",
            "-",
            "--preserve-metadata=entitlements,flags,runtime",
            str(APP),
        ],
        check=True,
    )


def apply() -> int:
    if not TARGET.exists():
        print(f"missing {TARGET}", file=sys.stderr)
        return 1
    source = TARGET.read_text()
    replacement = PATCH.read_text().rstrip() + "\n"
    if "function loadByokProvidersFromDisk()" in source:
        print("already patched")
        return 0
    if OLD not in source:
        print("fetchModels() not found in expected form — app version mismatch?", file=sys.stderr)
        return 1
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
    TARGET.write_text(source.replace(OLD, replacement, 1))
    resign()
    print(f"patched {TARGET}")
    return 0


def revert() -> int:
    if not BACKUP.exists():
        print(f"missing backup {BACKUP}", file=sys.stderr)
        return 1
    shutil.copy2(BACKUP, TARGET)
    resign()
    print(f"reverted {TARGET}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()
    return revert() if args.revert else apply()


if __name__ == "__main__":
    raise SystemExit(main())
