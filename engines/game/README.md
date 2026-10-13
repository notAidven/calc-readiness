# @cr/game  (Evan's lane)

City-builder lane (the renderer is React Three Fiber, and lives in `apps/web/src/city`; this package stays framework-free): rendering, neighborhoods, buildings, storm battles, cosmetic economy. READS mastery/placement to render; the ONLY thing it writes is `neighborhood_checkpoint_cleared` (set when a storm is beaten, and only attemptable once all the neighborhood's required nodes are already mastered). The storm does NOT master nodes or submit evidence. No decay in v1 (mastery monotonic).

Stay in this dir. Build against frozen shared interfaces + the read-only state client.
