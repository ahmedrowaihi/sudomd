# ADR 0001: Delayed orphan asset cleanup

## Status

Accepted

## Context

Assets can be referenced by more than one note, removed briefly by editor undo/cut/paste, or observed out of order during sync. Deleting blobs on the first save that removes a reference can destroy data that is still recoverable or valid elsewhere.

## Decision

Treat unreferenced assets as orphan candidates first. A maintenance mutation marks candidates with `orphanedAt`; a later explicit cleanup mutation deletes only candidates that are still unreferenced after a caller-provided grace period.

Explicit asset deletion remains immediate.

## Consequences

Cleanup requires two passes or a scheduled maintenance flow. Storage usage may lag behind edits by the grace period, but valid shared or temporarily unreferenced assets are less likely to be deleted.
