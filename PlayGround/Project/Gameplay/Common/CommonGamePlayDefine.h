#pragma once

#define GAME_VIEW_WIDTH		g_screen_size.x
#define GAME_VIEW_WIDTH_H	(g_screen_size.x >> 1)
#define GAME_VIEW_HEIGHT	g_screen_size.y
#define GAME_VIEW_HEIGHT_H	(g_screen_size.y >> 1)

#define GAME_VIEW_CENTER	_Point(GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT_H)
#define GAME_VIEW_RECT		_Rect(_Point(0, 0), GAME_VIEW_SIZE)

#define COMMON_BUTTON_CX			200
#define COMMON_BUTTON_CY			50
#define COMMON_BUTTON_SIZE			_Size(COMMON_BUTTON_CX, COMMON_BUTTON_CY)

#define DEFAULT_SIZE_HP_BAR			_Size(100, 10)
#define DEFAULT_OFFSET_HP_BAR		_Vector3(0.f, -30.f, 0.f)