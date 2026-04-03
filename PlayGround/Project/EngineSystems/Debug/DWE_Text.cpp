#include "framework.h"
#include "DWE_Text.h"

_Vector2 DWE_Text::Measure() const
{
	return _DrawFunc::MeasureString(
		data_.text_,
		data_.font_size_,
		data_.style_bitmask_);
}

void DWE_Text::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	_DrawFunc::DrawString(
		rect_,
		data_.text_,
		data_.color_,
		data_.font_size_,
		data_.style_bitmask_,
		data_.alignment_horizontal_,
		data_.alignment_vertical_,
		true);
}