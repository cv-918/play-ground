# QA Request: Attribute Node Tooltip Bounds

## Handoff

Handoff ID: HANDOFF-20260528-010-attribute-tooltip-bounds
Title: Attribute Node Tooltip Bounds

## QA Goal

Confirm that Attribute Node tooltips stay visible near screen or board edges and do not break existing interaction.

## Checklist

- Hover a node near the right edge and confirm the tooltip stays visible.
- Hover a node near the bottom edge and confirm the tooltip stays visible.
- Hover a node near the top or left edge if reachable and confirm the tooltip is not clipped badly.
- Confirm tooltip text/background still render normally.
- Confirm left-click node interaction still works.
- Confirm right-click node interaction still works.
- Confirm panning still works.
- Confirm panning does not leave stale or incorrect tooltip state.

## Pass Criteria

- Tooltip remains practically visible near edges.
- Existing hover, tooltip, click, right-click, and panning behavior still works.
