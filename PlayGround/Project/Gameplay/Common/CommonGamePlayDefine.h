#pragma once

#define GAME_VIEW_WIDTH		g_screen_size.x
#define GAME_VIEW_WIDTH_H	(g_screen_size.x >> 1)
#define GAME_VIEW_HEIGHT	g_screen_size.y
#define GAME_VIEW_HEIGHT_H	(g_screen_size.y >> 1)

#define GAME_VIEW_CENTER	_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT_H }
#define GAME_VIEW_RECT		_Rect{ _Point{0, 0}, _Size{ GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT } }

#pragma region [ 게임 진행 관련 ]
#define DEFAULT_SPAWN_MARGIN		500
#define DEFAULT_STAGE_DURATION		4.0

#define PROCEED_TO_NEXT_STAGE_HOLD_TIME	2.0
#pragma endregion

#pragma region [ UI 관련 ]
// 공통 버튼 관련 상수들
#define COMMON_BUTTON_CX			200
#define COMMON_BUTTON_CY			50
#define COMMON_BUTTON_SIZE			_Size{ COMMON_BUTTON_CX, COMMON_BUTTON_CY }

// HpBar 관련 상수들
#define DEFAULT_SIZE_HP_BAR			_Size{ 100, 10 }
#define DEFAULT_OFFSET_HP_BAR		_Vector3{ 0.f, -30.f, 0.f }
#define DEFAULT_DURATION_HP_BAR	3.0
#define DEFAULT_FADE_DURATION_HP_BAR	1.0

// DamageFont 관련 상수들
#define DEFAULT_DURATION_DAMAGE_FONT	1.5
#define DEFAULT_MOVE_SPEED_DAMAGE_FONT	20.f
#define DEFAULT_FONT_SIZE_DAMAGE_FONT	20.f
#define DEFAULT_FADE_DURATION_DAMAGE_FONT		1.0
#define DEFAULT_SIZE_DAMAGE_FONT	_Size{ 100, 50 }

// AttributeNode 관련 상수들
#define DEFAULT_SIZE_ATTRIBUTE_NODE _Size{ 40, 40 }
#pragma endregion

#pragma region [ 유닛 관련 ]
// 기본 공격속도
#define DEFAULT_ATTACK_SPEED 4.0

// 
#define ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER 20.f

#define DEFAULT_SPAWN_COUNT 10
#define KILL_COUNT_UNIT_FOR_CLEAR 10
#pragma endregion

#pragma region [ 디버그 관련 ]
#define COLLIDER_DEBUG_COLOR_BODY		Palette::Green
#define COLLIDER_DEBUG_COLOR_ATTACK		Palette::Red
#define COLLIDER_DEBUG_COLOR_COLLECTOR	Palette::Charcoal
#pragma endregion
