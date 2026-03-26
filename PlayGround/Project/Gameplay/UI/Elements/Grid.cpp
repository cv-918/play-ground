#include "framework.h"
#include "Grid.h"
#include "Button.h"

Grid::~Grid()
{
	for (auto& cell : cells_)
	{
		SAFE_DELETE(cell.button);
	}
}

_bool Grid::Initialize()
{
	if (!__super::Initialize())
		return false;

	if (info_.rows <= 0)
		info_.rows = 1;

	if (info_.cols <= 0)
		info_.cols = 1;

	// 그리드 전체 크기를 행/열 수와 셀 크기에 맞춰 자동 설정
	const _int total_width = info_.cols * info_.cell_size.x;
	const _int total_height = info_.rows * info_.cell_size.y;
	SetSize(_Size{ total_width, total_height });

	cells_.clear();
	cells_.resize(info_.rows * info_.cols);

	return true;
}

_int Grid::Update(_double _delta_time)
{
	if (!IsEnable())
		return UPDATE_CONTINUE;

	_SyncCellButtonsLayout();

	for (auto& cell : cells_)
	{
		if (nullptr == cell.button)
			continue;

		cell.button->SetEnable(IsEnable());
		cell.button->SetVisible(IsVisible());
		cell.button->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void Grid::Render(_double _delta_time)
{
  if (!IsVisible())
		return;

	const _Rect grid_rect = GetRect();
	const _Point start_pos = grid_rect.GetLt();

	for (_int row = 0; row < info_.rows; ++row)
	{
		for (_int col = 0; col < info_.cols; ++col)
		{
			const _int cell_index = ToCellIndex(row, col);
			const auto& cell = cells_[cell_index];
			const _Rect cell_rect = GetCellRect(row, col);

			if (cell.has_fill_color)
			{
				_DrawFunc::FillRectangle(cell_rect, cell.fill_color);
			}

			if (cell.button)
			{
				cell.button->Render(_delta_time);
			}
			else if (cell.has_text)
			{
				_DrawFunc::DrawString(cell_rect.GetCenter(), cell.text, cell.text_color, cell.text_font_size);
			}
		}
	}

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

void Grid::SetCellText(_int _row, _int _col, const std::wstring& _text, const _Color& _text_color, _float _font_size)
{
	if (!IsValidCell(_row, _col))
		return;

	auto& cell = cells_[ToCellIndex(_row, _col)];
	cell.has_text = true;
	cell.text = _text;
	cell.text_color = _text_color;
	cell.text_font_size = _font_size;
}

void Grid::ClearCellText(_int _row, _int _col)
{
	if (!IsValidCell(_row, _col))
		return;

	auto& cell = cells_[ToCellIndex(_row, _col)];
	cell.has_text = false;
	cell.text.clear();
}

void Grid::SetCellFillColor(_int _row, _int _col, const _Color& _fill_color)
{
	if (!IsValidCell(_row, _col))
		return;

	auto& cell = cells_[ToCellIndex(_row, _col)];
	cell.has_fill_color = true;
	cell.fill_color = _fill_color;
}

void Grid::ClearCellFillColor(_int _row, _int _col)
{
	if (!IsValidCell(_row, _col))
		return;

	auto& cell = cells_[ToCellIndex(_row, _col)];
	cell.has_fill_color = false;
	cell.fill_color = Colors::Transparent;
}

Button* Grid::AddCellButton(_int _row, _int _col, const std::wstring& _text, const std::function<void()>& _on_click)
{
	if (!IsValidCell(_row, _col))
		return nullptr;

	auto& cell = cells_[ToCellIndex(_row, _col)];

	if (nullptr == cell.button)
	{
		cell.button = new Button();
		if (!cell.button->Initialize())
		{
			SAFE_DELETE(cell.button);
			return nullptr;
		}
	}

	cell.button->SetText(_text);
	cell.button->SetOnClick(_on_click);
	cell.button->SetRect(GetCellRect(_row, _col));

	return cell.button;
}

void Grid::RemoveCellButton(_int _row, _int _col)
{
	if (!IsValidCell(_row, _col))
		return;

	auto& cell = cells_[ToCellIndex(_row, _col)];
	SAFE_DELETE(cell.button);
}

Button* Grid::GetCellButton(_int _row, _int _col)
{
	if (!IsValidCell(_row, _col))
		return nullptr;

	return cells_[ToCellIndex(_row, _col)].button;
}

const Button* Grid::GetCellButton(_int _row, _int _col) const
{
	if (!IsValidCell(_row, _col))
		return nullptr;

	return cells_[ToCellIndex(_row, _col)].button;
}

_bool Grid::IsValidCell(_int _row, _int _col) const
{
	return (_row >= 0 && _row < info_.rows && _col >= 0 && _col < info_.cols);
}

_int Grid::ToCellIndex(_int _row, _int _col) const
{
	return _row * info_.cols + _col;
}

void Grid::_SyncCellButtonsLayout()
{
	for (_int row = 0; row < info_.rows; ++row)
	{
		for (_int col = 0; col < info_.cols; ++col)
		{
			auto& cell = cells_[ToCellIndex(row, col)];
			if (nullptr == cell.button)
				continue;

			cell.button->SetRect(GetCellRect(row, col));
		}
	}
}
