#include "framework.h"
#include "Grid.h"

_bool Grid::Initialize()
{
	if (false == __super::Initialize())
		return false;

	// 그리드 전체 크기를 행/열 수와 셀 크기에 맞춰 자동 설정
	const _int total_width = info_.cols * info_.cell_size.x;
	const _int total_height = info_.rows * info_.cell_size.y;
	SetSize(_Size{ total_width, total_height });

	return true;
}

void Grid::Render(_double _delta_time)
{
	const _Rect grid_rect = GetRect();
	const _Point start_pos = grid_rect.GetLt();

	// 최적화: 한 번의 루프로 가로선과 세로선 모두 그리기
	// 가로선: rows + 1개 (상단 경계선 포함)
	for (_int row = 0; row <= info_.rows; ++row)
	{
		const _int y = start_pos.y + row * info_.cell_size.y;
		const _Point line_start{ start_pos.x, y };
		const _Point line_end{ start_pos.x + grid_rect.Width(), y };
		
		_DrawFunc::DrawLine(line_start, line_end, info_.line_color, info_.line_thickness);
	}

	// 세로선: cols + 1개 (좌측 경계선 포함)
	for (_int col = 0; col <= info_.cols; ++col)
	{
		const _int x = start_pos.x + col * info_.cell_size.x;
		const _Point line_start{ x, start_pos.y };
		const _Point line_end{ x, start_pos.y + grid_rect.Height() };
		
		_DrawFunc::DrawLine(line_start, line_end, info_.line_color, info_.line_thickness);
	}
}

_Rect Grid::GetCellRect(_int _row, _int _col) const
{
	// 범위 검증
	if (_row < 0 || _row >= info_.rows || _col < 0 || _col >= info_.cols)
		return _Rect::Zero();

	const _Point grid_pos = GetPosition();
	const _Point cell_pos = {
		grid_pos.x + _col * info_.cell_size.x,
		grid_pos.y + _row * info_.cell_size.y
	};

	return _Rect{ cell_pos, info_.cell_size };
}

_Point Grid::GetCellCenter(_int _row, _int _col) const
{
	const _Rect cell_rect = GetCellRect(_row, _col);
	return cell_rect.GetCenter();
}
