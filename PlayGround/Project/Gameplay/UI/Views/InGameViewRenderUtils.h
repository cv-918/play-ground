#pragma once

#include "EngineSystems/Render/ScreenSystem.h"

namespace InGameViewRenderUtils
{
    inline void DrawDimmedBackground(_ubyte _alpha = 128)
    {
        const Resolution resolution = _ScreenSystem.WindowResolution();
        const _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } };
        _DrawFunc::FillRectangle(rt, _Color(_alpha, 0, 0, 0));
    }
}
