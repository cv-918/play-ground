#pragma once
#include "../UIBase.h"

// 그리드 생성자 전달용 구조체 - 필요에 따라 그리드의 행과 열 수, 셀 크기 등을 설정할 수 있도록 확장 가능
struct GridCreateInfo
{
	_int rows = 1; // 그리드의 행 수.
	_int cols = 1; // 그리드의 열 수.
	_Size cell_size = _Size{ 50, 50 }; // 각 셀의 크기.
	_Color line_color = Colors::Black; // 그리드 선의 색상.
	_float line_thickness = 1.0f; // 그리드 선의 두께.
};

class Grid final : public UIBase
{
public:
	explicit Grid(const GridCreateInfo& _info) : info_(_info) {}

	_bool Initialize() override;
	void Render(_double _delta_time) override;

	// 그리드 정보 Getter
	_int GetRows() const { return info_.rows; }
	_int GetCols() const { return info_.cols; }
	_Size GetCellSize() const { return info_.cell_size; }
	
	// 그리드 속성 Setter
	void SetLineColor(const _Color& _color) { info_.line_color = _color; }
	void SetLineThickness(_float _thickness) { info_.line_thickness = _thickness; }

	// 특정 셀의 위치 계산 (추후 셀에 데이터를 넣을 때 활용)
	_Rect GetCellRect(_int _row, _int _col) const;
	_Point GetCellCenter(_int _row, _int _col) const;

private:
	GridCreateInfo info_;
};

