#pragma once

namespace InGameViewRenderUtils
{
    inline void DrawDimmedBackground(_ubyte _alpha = 128)
    {
        static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
        _DrawFunc::FillRectangle(rt, _Color(_alpha, 0, 0, 0));
    }
}
