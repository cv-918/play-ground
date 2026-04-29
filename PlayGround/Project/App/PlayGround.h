#pragma once

class PlayGround final
{
public:
	_bool Initialize();
	void Shutdown();
	_int Update(_double _delta_time);
	void Render(_double _delta_time);

	// 윈도우 메시지 처리 메서드. 필요에 따라 입력 처리, 창 이벤트 처리 등 다양한 메시지를 처리할 수 있도록 구현할 수 있습니다.
	LRESULT HandleWindowMessage(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);

private:
	// 렌더 체인에 대한 포인터. 필요에 따라 렌더링 관련 로직을 구현할 수 있습니다.
	class RenderChain* render_chain_ = nullptr;

	// 씬 매니저에 대한 포인터. 필요에 따라 씬 매니저와 상호작용하는 로직을 구현할 수 있습니다.
	class SceneManager* scene_manager_ = nullptr;

	// 입력 매니저에 대한 포인터. 필요에 따라 입력 처리 로직을 구현할 수 있습니다.
	class InputManager* input_manager_ = nullptr;
};
