# QA Request: Attribute Tree Render Bounds

## Target

Confirm the out-game attribute tree stays visually inside the dark gray board area.

## Korean Summary

아웃게임 어트리뷰트 화면에서 트리 노드와 연결선이 짙은 회색 보드 영역 밖으로 보이지 않는지 확인한다.

## Checks

- Open the out-game attribute view.
- Check the top edge of the board: upper nodes and lines should not appear outside the dark gray area.
- Check the bottom edge of the board: lower nodes and lines should not appear outside the dark gray area.
- Confirm buttons and the dust currency panel still appear usable.
- Confirm panning/zooming still works well enough for the tree view.

## Report Format

Please report:

- Pass or fail.
- Resolution or window size used.
- Whether any node or connection line still visibly escapes the board area.
- Any interaction issue with zoom, pan, buttons, or node selection.
