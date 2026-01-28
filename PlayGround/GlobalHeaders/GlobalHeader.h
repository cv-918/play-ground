#pragma once

#include "../framework.h"

#include "GlobalInc.h"
#include "GlobalDef.h"
#include "GlobalUdt.h"

// 이것들도 D3DMgr 처럼 매니저로 빼줘야 한다
extern HWND g_hWnd;
extern HDC     dc_;
extern HDC     back_dc_;
extern HBITMAP back_bmp_;
extern HBITMAP old_back_bmp_;