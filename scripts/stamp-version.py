#!/usr/bin/env python3
"""Stamp the HTML served by Pages with a Europe/Madrid build timestamp."""
import argparse
from datetime import datetime
from pathlib import Path
import re
from zoneinfo import ZoneInfo


def stamp(html, instant):
    version = instant.astimezone(ZoneInfo('Europe/Madrid')).strftime('%y%m%d.%H%M%S')
    html, count = re.subn(
        r'(<span id="appVersion">)Version \d{6}\.\d{6}(</span>)',
        lambda match: match[1] + 'Version ' + version + match[2],
        html,
    )
    if count != 1:
        raise ValueError('Expected exactly one appVersion element')
    return html, version


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('weights.html'))
    parser.add_argument('--output', type=Path)
    parser.add_argument('--timestamp', help='Optional ISO 8601 timestamp with timezone')
    args = parser.parse_args()
    instant = datetime.fromisoformat(args.timestamp.replace('Z', '+00:00')) if args.timestamp else datetime.now(ZoneInfo('Europe/Madrid'))
    if instant.tzinfo is None:
        parser.error('--timestamp must include a timezone')
    html, version = stamp(args.source.read_text(encoding='utf-8'), instant)
    output = args.output or args.source
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(version)


if __name__ == '__main__':
    main()
