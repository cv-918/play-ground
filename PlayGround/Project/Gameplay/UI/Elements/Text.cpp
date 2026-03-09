#include "framework.h"
#include "Text.h"

void Text::Render(_double _delta_time)
{
	_DrawFunc::DrawString(GetPosition(), text_, color_, font_size_, is_center_);
}
