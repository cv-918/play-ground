#pragma once

#define GAME_VIEW_WIDTH		g_screen_size.x
#define GAME_VIEW_WIDTH_H	(g_screen_size.x >> 1)
#define GAME_VIEW_HEIGHT	g_screen_size.y
#define GAME_VIEW_HEIGHT_H	(g_screen_size.y >> 1)

#define GAME_VIEW_CENTER	_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT_H }
#define GAME_VIEW_RECT		_Rect{ _Point{0, 0}, _Size{ GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT } }

#define COMMON_BUTTON_CX			200
#define COMMON_BUTTON_CY			50
#define COMMON_BUTTON_SIZE			_Size{ COMMON_BUTTON_CX, COMMON_BUTTON_CY }

#define DEFAULT_SIZE_HP_BAR			_Size{ 100, 10 }
#define DEFAULT_OFFSET_HP_BAR		_Vector3{ 0.f, -30.f, 0.f }

// HpBar 관련 상수들
#define DEFAULT_DURATION_HP_BAR	3.0
#define DEFAULT_FADE_DURATION_HP_BAR	1.0

// damage font 관련 상수들
#define DEFAULT_DURATION_DAMAGE_FONT	1.5
#define DEFAULT_MOVE_SPEED_DAMAGE_FONT	20.f
#define DEFAULT_FONT_SIZE_DAMAGE_FONT	36.f
#define DEFAULT_FADE_DURATION_DAMAGE_FONT		1.0
#define DEFAULT_SIZE_DAMAGE_FONT	_Size{ 100, 50 }

// 
#define ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER 20.f

#define DEFAULT_SPAWN_MARGIN	500