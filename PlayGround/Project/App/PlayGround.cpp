#include "framework.h"
#include "PlayGround.h"

#include "EngineSystems/Render/RenderChain.h"
#include "EngineSystems/Physics/CollisionManager.h"
#include "GamePlaySystems/SceneManager.h"

#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"
#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"
#include "GamePlaySystems/Json/AttributeNodeDataManager.h"
#include "GamePlaySystems/Json/UserDataManager.h"
#include "GamePlaySystems/Json/StageJsonDataManager.h"

_bool PlayGround::Initialize()
{
	// --- 시스템 초기화 ---
	_Timer.Initialize();
	_Random.Initialize();

	render_chain_ = &_RenderChain;
	render_chain_->Initialize();

	scene_manager_ = &_SceneMgr;
	scene_manager_->Initialize();

	input_manager_ = &_InputMgr;

	// --- 게임 데이터 로드 ---
	if (!_CharacterDagaMgr.Load("Data/PlayableCharacter.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load playable character data from JSON."));
		return false;
	}

	if (!_SkillDataMgr.Load("Data/Skill.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load skill data from JSON."));
		return false;
	}

	if (!_EnemyDataMgr.Load("Data/Enemy.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load enemy data from JSON."));
		return false;
	}

	if (!_AttributeNodeDataMgr.Load("Data/AttributeNode.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load attribute node data from JSON."));
		return false;
	}

	if (!_StageDataMgr.Load("Data/Stage.json", "Data/SpawnPool.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load stage data from JSON."));
		return false;
	}

	if (!_UserDataMgr.Load("Data/UserData.json"))
	{
		_DEBUG_MSGBOX(_T("Failed to load user data from JSON."));
		return false;
	}

	// --- 충돌 레이어 설정 ---
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerBody, CollisionLayer::EnemyAttack, true);
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerBody, CollisionLayer::EnemyBullet, true);
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerAttack, CollisionLayer::EnemyBody, true);
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerCollector, CollisionLayer::PropsBody, true);

	return true;
}

_int PlayGround::Update(_double _delta_time)
{
	if (input_manager_->Down(VK_F3))
	{
		_GameState.debug_mode_ = !_GameState.debug_mode_;
		_SYSTEM_LOG_INFO("Debug mode %s", _GameState.debug_mode_ ? "enabled" : "disabled");

		return UPDATE_CONTINUE;
	}

	scene_manager_->Update(_delta_time);
	scene_manager_->LateUpdate(_delta_time);

	return UPDATE_CONTINUE;
}

void PlayGround::Render(_double _delta_time)
{
	render_chain_->Clear();
	scene_manager_->Render(_delta_time);
	render_chain_->Present();
}

LRESULT PlayGround::HandleWindowMessage(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam)
{
	switch (_msg)
	{
	case WM_MOUSEMOVE:
		input_manager_->OnMouseMove(_wparam, _lparam);
		break;

	case WM_MOUSEWHEEL:
		input_manager_->OnMouseWheel(_wparam, _lparam);
		break;

	case WM_LBUTTONDOWN: input_manager_->OnMouseButtonDown(VK_LBUTTON, _lparam); break;
	case WM_LBUTTONUP:   input_manager_->OnMouseButtonUp(VK_LBUTTON, _lparam); break;

	case WM_RBUTTONDOWN: input_manager_->OnMouseButtonDown(VK_RBUTTON, _lparam); break;
	case WM_RBUTTONUP:   input_manager_->OnMouseButtonUp(VK_RBUTTON, _lparam); break;

	case WM_MBUTTONDOWN: input_manager_->OnMouseButtonDown(VK_MBUTTON, _lparam); break;
	case WM_MBUTTONUP:   input_manager_->OnMouseButtonUp(VK_MBUTTON, _lparam); break;

		// X 버튼(4/5번 버튼)
	case WM_XBUTTONDOWN:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		input_manager_->OnMouseButtonDown(vk, _lparam);
		break;
	}
	case WM_XBUTTONUP:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		input_manager_->OnMouseButtonUp(vk, _lparam);
		break;
	}

	case WM_KEYDOWN:
	case WM_SYSKEYDOWN:
		// 1. F4 키가 눌렸는지 확인
		if (_wparam == VK_F4)
		{
			// 2. Alt 키가 함께 눌렸는지 확인 (LPARAM의 29번째 비트가 1이면 Alt가 눌린 상태)
			if (_lparam & (1 << 29))
			{
				// 게임 종료 메시지 발송
				PostQuitMessage(0);
				return 0;
			}
		}

		input_manager_->OnKeyDown(_wparam, _lparam);
		break;

	case WM_KEYUP:
	case WM_SYSKEYUP:
		input_manager_->OnKeyUp(_wparam, _lparam);
		break;

	case WM_CHAR:
		input_manager_->OnChar(s_tchar(_wparam));
		break;

	case WM_KILLFOCUS:
		input_manager_->ResetAll();
		break;

	case WM_SYSCOMMAND:
		// Alt 키나 F10으로 메뉴바에 포커스가 가는 것을 방지
		if ((_wparam & 0xFFF0) == SC_KEYMENU)
			return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}
