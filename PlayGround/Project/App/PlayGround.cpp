#include "framework.h"
#include "PlayGround.h"

#include "EngineSystems/Render/RenderChain.h"
#include "EngineSystems/Physics/CollisionManager.h"
#include "GamePlaySystems/SceneManager.h"

#include "GamePlaySystems/EnemyDataManager.h"

_bool PlayGround::Initialize()
{
	_Timer.Initialize();
	_Random.Initialize();

	_RenderChain.Initialize();

	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerBody, CollisionLayer::EnemyBody, true);
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerAttack, CollisionLayer::EnemyBody, true);

	_SceneMgr.Initialize();

	if (false == _EnemyDataMgr.Load("Data/test.json"))
	{
		// json 파일 읽기 에러
		return false;
	}

	return true;
}

_int PlayGround::Update(_double _delta_time)
{
	_SceneMgr.Update(_delta_time);
	_SceneMgr.LateUpdate(_delta_time);

	_ColMgr.Update();

	// Update 루프의 마지막에 처리할 애들을 모아두는 클래스를 만들고
	// 등록된 애들은 일괄 처리

	return 0;
}

void PlayGround::Render(_double _delta_time)
{
	// 1) Clear (단색)
	_RenderChain.Clear();

	// 2) Render
	_SceneMgr.Render(_delta_time);

	// 3) Present
	_RenderChain.Present();
}

LRESULT PlayGround::WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam)
{
	switch (_msg)
	{
	case WM_MOUSEMOVE:
		_InputMgr.OnMouseMove(_wparam, _lparam);
		break;

	case WM_MOUSEWHEEL:
		_InputMgr.OnMouseWheel(_wparam, _lparam);
		break;

	case WM_LBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_LBUTTON, _lparam); break;
	case WM_LBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_LBUTTON, _lparam); break;

	case WM_RBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_RBUTTON, _lparam); break;
	case WM_RBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_RBUTTON, _lparam); break;

	case WM_MBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_MBUTTON, _lparam); break;
	case WM_MBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_MBUTTON, _lparam); break;

		// X 버튼(4/5번 버튼)
	case WM_XBUTTONDOWN:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		_InputMgr.OnMouseButtonDown(vk, _lparam);
		break;
	}
	case WM_XBUTTONUP:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		_InputMgr.OnMouseButtonUp(vk, _lparam);
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

		_InputMgr.OnKeyDown(_wparam, _lparam);
		break;

	case WM_KEYUP:
	case WM_SYSKEYUP:
		_InputMgr.OnKeyUp(_wparam, _lparam);
		break;

	case WM_CHAR:
		_InputMgr.OnChar(s_tchar(_wparam));
		break;

	case WM_KILLFOCUS:
		_InputMgr.ResetAll();
		break;
	}

	return 0;
}
