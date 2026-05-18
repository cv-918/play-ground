// PlayGround.cpp : 애플리케이션에 대한 진입점을 정의합니다.
//

#include "framework.h"
#include "EntryPoint.h"

#include "App/DataUpdateService.h"
#include "App/PlayGround.h"

#include <chrono>
#include <limits>
#include <mmsystem.h>
#include <thread>

#pragma comment(lib, "winmm.lib")

PlayGround pg;

#define MAX_LOADSTRING 100

// 전역 변수:
HINSTANCE hInst;                                // 현재 인스턴스입니다.
WCHAR szTitle[MAX_LOADSTRING];                  // 제목 표시줄 텍스트입니다.
WCHAR szWindowClass[MAX_LOADSTRING];            // 기본 창 클래스 이름입니다.

namespace
{
	struct FrameLimitSettings
	{
		bool enabled = true;
		_double target_fps = 60.0;

		_double TargetFrameTime() const
		{
			return (enabled && target_fps > 0.0) ? (1.0 / target_fps) : 0.0;
		}
	};

	class TimerResolutionScope
	{
	public:
		explicit TimerResolutionScope(UINT _period_ms)
			: period_ms_(_period_ms)
		{
			active_ = (timeBeginPeriod(period_ms_) == TIMERR_NOERROR);
		}

		~TimerResolutionScope()
		{
			if (active_)
				timeEndPeriod(period_ms_);
		}

	private:
		UINT period_ms_ = 1;
		bool active_ = false;
	};

	FrameLimitSettings g_frame_limit_settings;

	void ConfigureFrameLimit(bool enabled, _double target_fps)
	{
		g_frame_limit_settings.enabled = enabled;
		g_frame_limit_settings.target_fps = target_fps;
	}

	void ConfigureFrameLimit(const VideoSettings& settings)
	{
		ConfigureFrameLimit(settings.frame_limit_enabled, s_cast(_double, settings.target_fps));
	}
}

// 이 코드 모듈에 포함된 함수의 선언을 전달합니다:
ATOM                MyRegisterClass(HINSTANCE hInstance);
BOOL                InitInstance(HINSTANCE, int);
LRESULT CALLBACK    WndProc(HWND, UINT, WPARAM, LPARAM);
INT_PTR CALLBACK    About(HWND, UINT, WPARAM, LPARAM);

int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
	_In_opt_ HINSTANCE hPrevInstance,
	_In_ LPWSTR    lpCmdLine,
	_In_ int       nCmdShow)
{
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);

#ifdef _DEBUG
	_CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF);
#endif // _DEBUG

	// 전역 문자열을 초기화합니다.
	LoadStringW(hInstance, IDS_APP_TITLE, szTitle, MAX_LOADSTRING);
	LoadStringW(hInstance, IDC_PLAYGROUND, szWindowClass, MAX_LOADSTRING);
	MyRegisterClass(hInstance);

	// 애플리케이션 초기화를 수행합니다:
	if (!InitInstance(hInstance, nCmdShow))
	{
		return FALSE;
	}

	HACCEL hAccelTable = LoadAccelerators(hInstance, MAKEINTRESOURCE(IDC_PLAYGROUND));

	MSG msg = {};
	DataUpdateService::RunStartupUpdateCheck();

	if (!pg.Initialize())
	{
		_DEBUG_MSGBOX(L"PlayGround 초기화 실패");
		pg.Shutdown();
		return FALSE;
	}

	TimerResolutionScope timer_resolution_scope(1);

	while (msg.message != WM_QUIT)
	{
		const auto frame_begin = std::chrono::steady_clock::now();

		static uint64_t applied_video_revision = std::numeric_limits<uint64_t>::max();
		const uint64_t current_video_revision = _VideoSettingsMgr.AppliedRevision();
		if (applied_video_revision != current_video_revision)
		{
			ConfigureFrameLimit(_VideoSettingsMgr.Applied());
			applied_video_revision = current_video_revision;
		}

		_InputMgr.BeginFrame();
		_Timer.Update();

		while (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE))
		{
			if (msg.message == WM_QUIT)
				break;

			if (!TranslateAccelerator(msg.hwnd, hAccelTable, &msg))
			{
				TranslateMessage(&msg);
				DispatchMessage(&msg);
			}
		}

		if (msg.message == WM_QUIT)
			break;

		const auto dt = _Timer.DeltaTime();

		_InputMgr.SyncActionStates(dt);

		pg.Update(dt);
		pg.Render(dt);

		const _double target_frame_time = g_frame_limit_settings.TargetFrameTime();
		if (target_frame_time > 0.0)
		{
         const auto frame_end_target = frame_begin + std::chrono::duration_cast<std::chrono::steady_clock::duration>(std::chrono::duration<_double>(target_frame_time));
			auto now = std::chrono::steady_clock::now();
			if (now < frame_end_target)
			{
             constexpr auto coarse_sleep_margin = std::chrono::milliseconds(1);
				auto remain = frame_end_target - now;
				if (remain > coarse_sleep_margin)
				{
					std::this_thread::sleep_for(remain - coarse_sleep_margin);
				}

				while (std::chrono::steady_clock::now() < frame_end_target)
				{
					std::this_thread::yield();
				}
			}
		}
	}

	pg.Shutdown();
	return (int)msg.wParam;
}



//
//  함수: MyRegisterClass()
//
//  용도: 창 클래스를 등록합니다.
//
ATOM MyRegisterClass(HINSTANCE hInstance)
{
	WNDCLASSEXW wcex;

	wcex.cbSize = sizeof(WNDCLASSEX);

	wcex.style = CS_HREDRAW | CS_VREDRAW;
	wcex.lpfnWndProc = WndProc;
	wcex.cbClsExtra = 0;
	wcex.cbWndExtra = 0;
	wcex.hInstance = hInstance;
	wcex.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_PLAYGROUND));
	wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
	wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
	wcex.lpszMenuName = nullptr/*MAKEINTRESOURCEW(IDC_PLAYGROUND)*/;
	wcex.lpszClassName = szWindowClass;
	wcex.hIconSm = LoadIcon(wcex.hInstance, MAKEINTRESOURCE(IDI_SMALL));

	return RegisterClassExW(&wcex);
}

//
//   함수: InitInstance(HINSTANCE, int)
//
//   용도: 인스턴스 핸들을 저장하고 주 창을 만듭니다.
//
//   주석:
//
//        이 함수를 통해 인스턴스 핸들을 전역 변수에 저장하고
//        주 프로그램 창을 만든 다음 표시합니다.
//
BOOL InitInstance(HINSTANCE hInstance, int nCmdShow)
{
	hInst = hInstance; // 인스턴스 핸들을 전역 변수에 저장합니다.

	HWND hWnd = CreateWindowW(szWindowClass, szTitle, WS_OVERLAPPEDWINDOW,
		CW_USEDEFAULT, 0, WINCX, WINCY, nullptr, nullptr, hInstance, nullptr);

	if (!hWnd)
	{
		return FALSE;
	}

	// 1) 스타일에서 최소/최대화 버튼 제거
	LONG style = GetWindowLong(hWnd, GWL_STYLE);
	style &= ~WS_MINIMIZEBOX;
	style &= ~WS_MAXIMIZEBOX;

	// 2) 사이즈 조절 막기
	style &= ~WS_THICKFRAME;   // 창 테두리 드래그 리사이즈 제거
	style &= ~WS_SIZEBOX;      // (WS_THICKFRAME과 동일 의미로 쓰이기도 함)

	SetWindowLong(hWnd, GWL_STYLE, style);

	// 3) 스타일 변경 반영
	SetWindowPos(hWnd, nullptr, 0, 0, 0, 0,
		SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);

	// 4) 크기 및 위치 조정
	RECT wr{ 0, 0, WINCX, WINCY };
	AdjustWindowRectEx(&wr, WS_OVERLAPPEDWINDOW, FALSE, 0);

	int w = wr.right - wr.left;
	int h = wr.bottom - wr.top;

	SetWindowPos(hWnd, nullptr, 0, 0, w, h,
		SWP_NOMOVE | SWP_NOZORDER);

	g_hwnd = hWnd; // 전역 변수에 저장

	ShowWindow(hWnd, nCmdShow);
	UpdateWindow(hWnd);

	return TRUE;
}

//
//  함수: WndProc(HWND, UINT, WPARAM, LPARAM)
//
//  용도: 주 창의 메시지를 처리합니다.
//
//  WM_COMMAND  - 애플리케이션 메뉴를 처리합니다.
//  WM_PAINT    - 주 창을 그립니다.
//  WM_DESTROY  - 종료 메시지를 게시하고 반환합니다.
//
//
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	LRESULT ret = 0;
	if (ret = pg.HandleWindowMessage(hWnd, message, wParam, lParam))
		return ret;

	switch (message)
	{
	case WM_DESTROY:
		PostQuitMessage(0);
		break;
	}

	return DefWindowProc(hWnd, message, wParam, lParam);
}

// 정보 대화 상자의 메시지 처리기입니다.
INT_PTR CALLBACK About(HWND hDlg, UINT message, WPARAM wParam, LPARAM lParam)
{
	UNREFERENCED_PARAMETER(lParam);
	switch (message)
	{
	case WM_INITDIALOG:
		return (INT_PTR)TRUE;

	case WM_COMMAND:
		if (LOWORD(wParam) == IDOK || LOWORD(wParam) == IDCANCEL)
		{
			EndDialog(hDlg, LOWORD(wParam));
			return (INT_PTR)TRUE;
		}
		break;
	}
	return (INT_PTR)FALSE;
}
