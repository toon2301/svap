"""Collision-proof cache version tokens for version-bumped caches.

A version-bumped cache stores a per-target token in a version key and embeds
that token in the data cache key; writing a *new* token on invalidation makes
the previously cached entries unreachable (they expire via their own TTL).

``str(time_ns())`` alone can repeat when two invalidations land in the same
clock tick (observed in fast test sequences, and possible in production under
rapid back-to-back invalidations). A repeated token means the second bump does
not change the version, so a stale entry cached between the two bumps stays
reachable. This token avoids that while staying process-safe:

* ``time_ns()`` never rewinds, so tokens keep moving forward across process
  restarts and cache eviction — a reset can never re-mint an older token.
* ``os.getpid()`` disambiguates concurrent worker processes that read the same
  nanosecond; the Railway deployment runs multiple workers.
* a process-local ``itertools.count`` disambiguates same-process calls within a
  single tick, including across threads (``next()`` on ``count`` is atomic in
  CPython).

The value is treated as an opaque string by the cache-key builders, so callers
need no other change.
"""

from __future__ import annotations

import itertools
import os
from time import time_ns

_version_counter = itertools.count()


def next_cache_version_token() -> str:
    """Return a unique, forward-moving cache version token."""
    return f"{time_ns()}:{os.getpid()}:{next(_version_counter)}"
